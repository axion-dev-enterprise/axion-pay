from __future__ import annotations

import json
import secrets
import shlex
import sys
import tarfile
from pathlib import Path

import paramiko


ROOT = Path(__file__).resolve().parents[1]
VAULT_FILE = Path(r"D:\WORKSPACE\SECURE\VAULT\tokens\servidores\vps_spaceship_jd769.json")
ARCHIVE = Path(r"C:\Users\AXION\AppData\Local\Temp\axion-pay-core-deploy-20260830.tgz")
REMOTE_DIR = "/opt/axion-pay-core"
REMOTE_ARCHIVE = "/tmp/axion-pay-core-deploy.tgz"


def run(ssh: paramiko.SSHClient, command: str, input_text: str | None = None) -> tuple[int, str, str]:
    stdin, stdout, stderr = ssh.exec_command(command)
    if input_text is not None:
        stdin.write(input_text)
        stdin.channel.shutdown_write()
    status = stdout.channel.recv_exit_status()
    return status, stdout.read().decode("utf-8", errors="replace").strip(), stderr.read().decode("utf-8", errors="replace").strip()


def psql(ssh: paramiko.SSHClient, sql: str) -> tuple[int, str, str]:
    command = "docker exec -i axion-postgres sh -lc 'psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -v ON_ERROR_STOP=1'"
    return run(ssh, command, sql)


def main() -> None:
    credentials = json.loads(VAULT_FILE.read_text(encoding="utf-8"))
    api_secret = secrets.token_urlsafe(32)
    db_password = secrets.token_urlsafe(32)
    db_user = "axion_pay_gateway"
    db_name = "axion_pay_gateway"

    ssh = paramiko.SSHClient()
    ssh.load_system_host_keys()
    ssh.set_missing_host_key_policy(paramiko.RejectPolicy())
    ssh.connect(
        # Prefer the verified Tailscale address over the public address from the vault.
        hostname="100.95.86.83",
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
            raise RuntimeError(error or "falha ao identificar o host")

        if len(sys.argv) > 1 and sys.argv[1] == "--inspect":
            status, inventory, error = run(
                ssh,
                "hostname; uptime; nproc; free -h; df -h /; docker ps --format '{{.Names}} {{.Image}} {{.Status}}'; "
                "docker network ls --format '{{.Name}}'; ss -ltn 2>/dev/null",
            )
            if status != 0:
                raise RuntimeError(error or "falha ao coletar inventário")
            print(json.dumps({"host": hostname, "inventory": inventory}))
            return

        if len(sys.argv) > 1 and sys.argv[1] == "--topology":
            status, topology, error = run(
                ssh,
                "docker network inspect axion-edge-net 2>/dev/null || true; "
                "docker ps --format '{{.Names}} {{.Networks}}'; "
                "find /opt -maxdepth 3 -type f \( -iname 'docker-compose*.yml' -o -iname 'compose*.yaml' \) 2>/dev/null | head -60",
            )
            if status != 0:
                raise RuntimeError(error or "falha ao coletar topologia")
            print(json.dumps({"host": hostname, "topology": topology}))
            return

        if len(sys.argv) > 1 and sys.argv[1] == "--edge-config":
            status, config_text, error = run(ssh, "cat /opt/axion/vps1-edge/docker-compose.yml")
            if status != 0:
                raise RuntimeError(error or "falha ao ler configuração do edge")
            print(json.dumps({"host": hostname, "config": config_text}))
            return

        status, _, error = run(ssh, f"mkdir -p {shlex.quote(REMOTE_DIR)}")
        if status != 0:
            raise RuntimeError(error or "falha ao criar diretório remoto")

        sftp = ssh.open_sftp()
        try:
            sftp.put(str(ARCHIVE), REMOTE_ARCHIVE)
        finally:
            sftp.close()

        status, _, error = run(
            ssh,
            f"tar -xzf {shlex.quote(REMOTE_ARCHIVE)} -C {shlex.quote(REMOTE_DIR)} --strip-components=1",
        )
        if status != 0:
            raise RuntimeError(error or "falha ao extrair o release")

        status, db_info, error = run(
            ssh,
            "docker exec axion-postgres sh -lc 'printf \"%s\\n%s\\n\" \"$POSTGRES_USER\" \"$POSTGRES_DB\"'",
        )
        if status != 0 or len(db_info.splitlines()) < 2:
            raise RuntimeError(error or "não foi possível descobrir o usuário do PostgreSQL")
        admin_user, admin_db = db_info.splitlines()[:2]

        quoted_password = db_password.replace("'", "''")
        role_sql = (
            f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{db_user}') "
            f"THEN CREATE ROLE {db_user} LOGIN PASSWORD '{quoted_password}'; "
            f"ELSE ALTER ROLE {db_user} WITH LOGIN PASSWORD '{quoted_password}'; END IF; END $$;\n"
        )
        status, _, error = psql(ssh, role_sql)
        if status != 0:
            raise RuntimeError(error or "falha ao preparar o usuário do PostgreSQL")

        status, _, error = run(
            ssh,
            "docker exec axion-postgres sh -lc 'psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -Atc "
            f"\"SELECT 1 FROM pg_database WHERE datname = '{db_name}'\"' | grep -q 1",
        )
        if status != 0:
            status, _, error = run(
                ssh,
                "docker exec axion-postgres sh -lc 'psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -v ON_ERROR_STOP=1 "
                f"-c \"CREATE DATABASE {db_name} OWNER {db_user}\"'",
            )
            if status != 0:
                raise RuntimeError(error or "falha ao criar o banco do gateway")

        env_text = "\n".join(
            [
                "NODE_ENV=development",
                "PORT=3333",
                f"DATABASE_URL=postgres://{db_user}:{db_password}@axion-postgres:5432/{db_name}",
                "REDIS_URL=redis://axion-redis:6379",
                "PAYMENT_PROVIDER=woovi",
                f"AXION_API_KEYS={api_secret}:merchant-axion:charges:read,charges:write",
                "RATE_LIMIT_PER_MINUTE=120",
                "WOOVI_API_BASE=https://api.woovi-sandbox.com",
                "WOOVI_WEBHOOK_PUBLIC_KEYS_URL=https://api.woovi-sandbox.com/api/v1/webhook/public-keys",
                "ENABLE_BANK_RECONCILIATION=false",
                "",
            ]
        )
        compose_text = """services:
  api:
    build: .
    container_name: axion-pay
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3333:3333"
    networks:
      - axion-agent-net
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s

networks:
  axion-agent-net:
    external: true
"""

        sftp = ssh.open_sftp()
        try:
            with sftp.file(f"{REMOTE_DIR}/.env", "w") as handle:
                handle.write(env_text)
            sftp.chmod(f"{REMOTE_DIR}/.env", 0o600)
            with sftp.file(f"{REMOTE_DIR}/docker-compose.vps.yml", "w") as handle:
                handle.write(compose_text)
        finally:
            sftp.close()

        status, _, error = run(
            ssh,
            f"docker compose -f {REMOTE_DIR}/docker-compose.vps.yml up -d --build",
        )
        if status != 0:
            raise RuntimeError(error or "falha ao subir o contêiner axion-pay")

        status, health, error = run(
            ssh,
            "for i in $(seq 1 20); do state=$(docker inspect --format '{{.State.Health.Status}}' axion-pay 2>/dev/null || true); "
            "if [ \"$state\" = healthy ]; then printf '%s' healthy; exit 0; fi; sleep 3; done; "
            "docker logs --tail 80 axion-pay; exit 1",
        )
        if status != 0:
            raise RuntimeError(error or "healthcheck do axion-pay não ficou saudável")

        status, health_http, error = run(ssh, "curl -fsS http://127.0.0.1:3333/health")
        if status != 0:
            raise RuntimeError(error or "health HTTP falhou")

        print(json.dumps({"host": hostname, "container": "axion-pay", "health": health, "http": health_http}))
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
