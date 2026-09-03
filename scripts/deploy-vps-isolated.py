from __future__ import annotations

import json
import secrets
import shlex
from pathlib import Path

import paramiko


ROOT = Path(__file__).resolve().parents[1]
VAULT_FILE = Path(r"D:\WORKSPACE\SECURE\VAULT\tokens\servidores\vps_spaceship_jd769.json")
WOOVI_VAULT_FILE = Path(r"D:\WORKSPACE\SECURE\VAULT\tokens\pagamentos\woovi_axion-pay.env")
ARCHIVE = Path(r"C:\Users\AXION\AppData\Local\Temp\axion-pay-core-deploy-20260830.tgz")
REMOTE_DIR = "/opt/axion-pay-core"
REMOTE_ARCHIVE = "/tmp/axion-pay-core-deploy.tgz"
TAILSCALE_HOST = "100.95.86.83"


def run(ssh: paramiko.SSHClient, command: str) -> tuple[int, str, str]:
    stdin, stdout, stderr = ssh.exec_command(command)
    status = stdout.channel.recv_exit_status()
    return status, stdout.read().decode(errors="replace").strip(), stderr.read().decode(errors="replace").strip()


def make_archive() -> None:
    if not ARCHIVE.exists():
        raise RuntimeError(f"arquivo de release não encontrado: {ARCHIVE}")
    # The archive is produced outside the SSH session so no credential enters shell history.


def parse_env(value: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in value.splitlines():
        if not line or line.lstrip().startswith('#') or '=' not in line:
            continue
        key, item = line.split('=', 1)
        result[key.strip()] = item.strip()
    return result


def main() -> None:
    credentials = json.loads(VAULT_FILE.read_text(encoding="utf-8"))
    woovi_credentials = (
        parse_env(WOOVI_VAULT_FILE.read_text(encoding="utf-8"))
        if WOOVI_VAULT_FILE.exists()
        else {}
    )
    make_archive()

    ssh = paramiko.SSHClient()
    ssh.load_system_host_keys()
    ssh.set_missing_host_key_policy(paramiko.RejectPolicy())
    ssh.connect(
        hostname=TAILSCALE_HOST,
        port=int(credentials["port"]),
        username=credentials["user"],
        password=credentials["password"],
        look_for_keys=False,
        allow_agent=False,
        timeout=20,
    )

    try:
        status, hostname, error = run(ssh, "hostname")
        if status != 0:
            raise RuntimeError(error or "não foi possível identificar a VPS")

        # Preserve stateful credentials on redeploy. New credentials exist only
        # for the first provision, never for an ordinary release update.
        existing_env: dict[str, str] = {}
        sftp = ssh.open_sftp()
        try:
            try:
                with sftp.file(f"{REMOTE_DIR}/.env", "r") as handle:
                    existing_env = parse_env(handle.read().decode())
            except IOError:
                pass
        finally:
            sftp.close()
        db_password = existing_env.get("POSTGRES_PASSWORD", secrets.token_urlsafe(36))
        api_keys = existing_env.get(
            "AXION_API_KEYS",
            f"{secrets.token_urlsafe(36)}:merchant-axion:charges:read,charges:write",
        )
        woovi_app_id = woovi_credentials.get("WOOVI_APP_ID", existing_env.get("WOOVI_APP_ID", ""))
        woovi_activated = bool(woovi_credentials.get("WOOVI_APP_ID"))
        payments_enabled = "true" if woovi_activated else existing_env.get("PAYMENTS_ENABLED", "false")
        woovi_api_base = (
            "https://api.woovi.com"
            if woovi_activated
            else existing_env.get("WOOVI_API_BASE", "https://api.woovi-sandbox.com")
        )
        woovi_public_keys_url = (
            "https://api.woovi.com/api/v1/webhook/public-keys"
            if woovi_activated
            else existing_env.get(
                "WOOVI_WEBHOOK_PUBLIC_KEYS_URL",
                "https://api.woovi-sandbox.com/api/v1/webhook/public-keys",
            )
        )

        env_text = "\n".join(
            [
                "NODE_ENV=production",
                "PORT=3333",
                f"PAYMENTS_ENABLED={payments_enabled}",
                f"POSTGRES_PASSWORD={db_password}",
                f"DATABASE_URL=postgres://axion:{db_password}@axion-pay-postgres:5432/axion_pay",
                f"REDIS_URL={existing_env.get('REDIS_URL', 'redis://axion-pay-redis:6379')}",
                f"PAYMENT_PROVIDER={existing_env.get('PAYMENT_PROVIDER', 'woovi')}",
                f"AXION_API_KEYS={api_keys}",
                f"RATE_LIMIT_PER_MINUTE={existing_env.get('RATE_LIMIT_PER_MINUTE', '120')}",
                f"KYC_REVIEWER_AUTH_USER_IDS={existing_env.get('KYC_REVIEWER_AUTH_USER_IDS', '')}",
                f"WOOVI_API_BASE={woovi_api_base}",
                f"WOOVI_APP_ID={woovi_app_id}",
                f"WOOVI_WEBHOOK_PUBLIC_KEYS_URL={woovi_public_keys_url}",
                f"ENABLE_BANK_RECONCILIATION={existing_env.get('ENABLE_BANK_RECONCILIATION', 'false')}",
                "",
            ]
        )
        compose_text = """services:
  postgres:
    image: postgres:17-alpine
    container_name: axion-pay-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: axion
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: axion_pay
    volumes:
      - axion_pay_pg:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d:ro
    networks:
      - axion-pay-private
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U axion -d axion_pay"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:8-alpine
    container_name: axion-pay-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - axion_pay_redis:/data
    networks:
      - axion-pay-private
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

  api:
    build: .
    container_name: axion-pay
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgres://axion:${POSTGRES_PASSWORD}@axion-pay-postgres:5432/axion_pay
      REDIS_URL: redis://axion-pay-redis:6379
    ports:
      - "127.0.0.1:3333:3333"
    networks:
      - axion-pay-private
      - axion-edge-net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 3s
      retries: 12
      start_period: 20s
    read_only: true
    tmpfs:
      - /tmp
    labels:
      traefik.enable: "true"
      traefik.docker.network: axion-edge-net
      traefik.http.routers.axion-pay.rule: Host(`api.axionenterprise.cloud`)
      traefik.http.routers.axion-pay.entrypoints: web
      traefik.http.services.axion-pay.loadbalancer.server.port: "3333"
      traefik.http.routers.axion-pay-secure.rule: Host(`api.axionenterprise.cloud`)
      traefik.http.routers.axion-pay-secure.entrypoints: websecure
      traefik.http.routers.axion-pay-secure.tls: "true"
      traefik.http.routers.axion-pay-secure.service: axion-pay

networks:
  axion-pay-private:
    name: axion-pay-private
  axion-edge-net:
    external: true

volumes:
  axion_pay_pg:
  axion_pay_redis:
"""

        sftp = ssh.open_sftp()
        try:
            sftp.put(str(ARCHIVE), REMOTE_ARCHIVE)
            sftp.close()
            status, _, error = run(ssh, f"mkdir -p {shlex.quote(REMOTE_DIR)} && tar -xzf {shlex.quote(REMOTE_ARCHIVE)} -C {shlex.quote(REMOTE_DIR)}")
            if status != 0:
                raise RuntimeError(error or "falha ao extrair o release")
            sftp = ssh.open_sftp()
            with sftp.file(f"{REMOTE_DIR}/.env", "w") as handle:
                handle.write(env_text)
            sftp.chmod(f"{REMOTE_DIR}/.env", 0o600)
            with sftp.file(f"{REMOTE_DIR}/docker-compose.vps.yml", "w") as handle:
                handle.write(compose_text)
        finally:
            sftp.close()

        status, output, error = run(ssh, f"docker compose -f {REMOTE_DIR}/docker-compose.vps.yml up -d --build")
        if status != 0:
            raise RuntimeError(error or output or "falha ao subir o stack")
        status, health, error = run(
            ssh,
            "for i in $(seq 1 30); do state=$(docker inspect --format '{{.State.Health.Status}}' axion-pay 2>/dev/null || true); "
            "if [ \"$state\" = healthy ]; then printf healthy; exit 0; fi; sleep 3; done; "
            "docker compose -f /opt/axion-pay-core/docker-compose.vps.yml ps; docker logs --tail 80 axion-pay; exit 1",
        )
        if status != 0:
            raise RuntimeError(error or health or "healthcheck do axion-pay não ficou saudável")
        status, health_http, error = run(ssh, "curl -fsS http://127.0.0.1:3333/health")
        if status != 0:
            raise RuntimeError(error or "health HTTP falhou")
        status, route_http, error = run(ssh, "curl -fsS -H 'Host: api.axionenterprise.cloud' http://127.0.0.1/health")
        if status != 0:
            raise RuntimeError(error or "roteamento Traefik HTTP falhou")
        print(json.dumps({"host": hostname, "container": "axion-pay", "health": health, "api_health": health_http, "edge_health": route_http}))
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
