import { readFile } from 'node:fs/promises';
import { Agent, request } from 'undici';
import type { AccountSnapshot } from '../core/types.js';

type OpenFinanceConfig = {
  apiBase: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  certPath: string;
  keyPath: string;
  caPath?: string;
  accountsPath?: string;
  transactionsPathTemplate?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

export class OpenFinanceProvider {
  public readonly name = 'open-finance';
  private dispatcher?: Agent;
  private token?: TokenCache;

  constructor(private readonly cfg: OpenFinanceConfig) {}

  private async getDispatcher(): Promise<Agent> {
    if (this.dispatcher) return this.dispatcher;

    const [cert, key, ca] = await Promise.all([
      readFile(this.cfg.certPath),
      readFile(this.cfg.keyPath),
      this.cfg.caPath ? readFile(this.cfg.caPath) : Promise.resolve(undefined),
    ]);

    this.dispatcher = new Agent({
      connect: {
        cert,
        key,
        ca,
        rejectUnauthorized: true,
      },
    });

    return this.dispatcher;
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.accessToken;
    }

    const dispatcher = await this.getDispatcher();

    const form = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.cfg.clientId,
    });

    if (this.cfg.clientSecret) {
      form.set('client_secret', this.cfg.clientSecret);
    }

    const response = await request(this.cfg.tokenUrl, {
      method: 'POST',
      dispatcher,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: form.toString(),
    });

    const body = (await response.body.json()) as any;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `Open Finance token ${response.statusCode}: ${JSON.stringify(body)}`,
      );
    }

    const accessToken = body.access_token;
    const expiresIn = Number(body.expires_in ?? 300);

    if (!accessToken) {
      throw new Error('Authorization Server não retornou access_token.');
    }

    this.token = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return accessToken;
  }

  async call<T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const dispatcher = await this.getDispatcher();
    const accessToken = await this.getAccessToken();

    const response = await request(new URL(path, this.cfg.apiBase), {
      method: init.method ?? 'GET',
      dispatcher,
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const body = (await response.body.json()) as T;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `Open Finance ${response.statusCode}: ${JSON.stringify(body)}`,
      );
    }

    return body;
  }

  async listAccounts(): Promise<unknown> {
    if (!this.cfg.accountsPath) {
      throw new Error(
        'OPEN_FINANCE_ACCOUNTS_PATH não configurado. Use o endpoint do seu participante/agregador.',
      );
    }

    return this.call(this.cfg.accountsPath);
  }

  async listTransactions(accountId: string): Promise<unknown> {
    if (!this.cfg.transactionsPathTemplate) {
      throw new Error(
        'OPEN_FINANCE_TRANSACTIONS_PATH_TEMPLATE não configurado.',
      );
    }

    const path = this.cfg.transactionsPathTemplate.replace(
      '{accountId}',
      encodeURIComponent(accountId),
    );

    return this.call(path);
  }

  async snapshot(accountId?: string): Promise<AccountSnapshot> {
    const raw = accountId
      ? await this.listTransactions(accountId)
      : await this.listAccounts();

    return {
      source: this.name,
      capturedAt: new Date().toISOString(),
      raw,
    };
  }
}
