import type { Pool } from 'pg';

export type ApiLogEntryInput = {
  merchantId: string;
  apiKeyId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
  requestHeaders?: Record<string, unknown> | null;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string | null;
};

export type ApiLog = {
  id: string;
  merchantId: string;
  apiKeyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  idempotencyKey: string | null;
  requestHeaders: Record<string, unknown>;
  requestBody: unknown;
  responseBody: unknown;
  errorMessage: string | null;
  createdAt: string;
};

export type ApiLogMetrics = {
  totalRequests24h: number;
  successRate: number;
  avgLatencyMs: number;
  clientErrors24h: number;
  serverErrors24h: number;
};

const SENSITIVE_KEY_REGEX = /(?:password|secret|token|authorization|auth|cvv|cvc|card_number|number|api[-_]?key)/i;

export function sanitizePayload(data: unknown, depth = 0): unknown {
  if (depth > 6 || data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (data.length > 4096) return data.slice(0, 4096) + '... [TRUNCATED]';
    return data;
  }
  if (Array.isArray(data)) {
    return data.slice(0, 50).map((item) => sanitizePayload(item, depth + 1));
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizePayload(value, depth + 1);
      }
    }
    return sanitized;
  }
  return data;
}

export async function recordApiLog(
  database: Pick<Pool, 'query'>,
  entry: ApiLogEntryInput,
): Promise<void> {
  try {
    const sanitizedReqHeaders = entry.requestHeaders ? sanitizePayload(entry.requestHeaders) : {};
    const sanitizedReqBody = entry.requestBody ? sanitizePayload(entry.requestBody) : {};
    const sanitizedResBody = entry.responseBody ? sanitizePayload(entry.responseBody) : {};

    await database.query(
      `INSERT INTO merchant_api_logs (
        merchant_id, api_key_id, method, path, status_code, latency_ms,
        ip_address, user_agent, idempotency_key,
        request_headers, request_body, response_body, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())`,
      [
        entry.merchantId,
        entry.apiKeyId || null,
        entry.method.toUpperCase(),
        entry.path,
        entry.statusCode,
        Math.max(0, Math.round(entry.latencyMs)),
        entry.ipAddress || null,
        entry.userAgent ? entry.userAgent.slice(0, 255) : null,
        entry.idempotencyKey || null,
        JSON.stringify(sanitizedReqHeaders),
        JSON.stringify(sanitizedReqBody),
        JSON.stringify(sanitizedResBody),
        entry.errorMessage ? entry.errorMessage.slice(0, 1000) : null,
      ],
    );
  } catch (err) {
    console.error('[ApiLogsService] Failed to record API log:', err);
  }
}

export async function listMerchantApiLogs(
  database: Pick<Pool, 'query'>,
  merchantId: string,
  options: {
    limit?: number;
    offset?: number;
    method?: string;
    statusCode?: number | string;
    search?: string;
  } = {},
): Promise<{
  logs: ApiLog[];
  metrics: ApiLogMetrics;
  pagination: { total: number; limit: number; offset: number };
}> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const offset = Math.max(0, options.offset ?? 0);

  const conditions: string[] = ['merchant_id = $1'];
  const values: unknown[] = [merchantId];
  let paramIdx = 2;

  if (options.method && options.method !== 'ALL') {
    conditions.push('method = $' + paramIdx++);
    values.push(options.method.toUpperCase());
  }

  if (options.statusCode) {
    if (options.statusCode === '2xx') {
      conditions.push('status_code >= 200 AND status_code < 300');
    } else if (options.statusCode === '4xx') {
      conditions.push('status_code >= 400 AND status_code < 500');
    } else if (options.statusCode === '5xx') {
      conditions.push('status_code >= 500');
    } else if (Number.isInteger(Number(options.statusCode))) {
      conditions.push('status_code = $' + paramIdx++);
      values.push(Number(options.statusCode));
    }
  }

  if (options.search && options.search.trim()) {
    conditions.push('(path ILIKE $' + paramIdx + ' OR idempotency_key ILIKE $' + paramIdx + ')');
    values.push('%' + options.search.trim() + '%');
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const limitParam = '$' + paramIdx++;
  const offsetParam = '$' + paramIdx++;

  const [logsRes, countRes, metricsRes] = await Promise.all([
    database.query<any>(
      `SELECT id, merchant_id, api_key_id, method, path, status_code, latency_ms,
              ip_address, user_agent, idempotency_key, request_headers, request_body,
              response_body, error_message, created_at
         FROM merchant_api_logs
        WHERE ` + whereClause + `
        ORDER BY created_at DESC
        LIMIT ` + limitParam + ` OFFSET ` + offsetParam,
      [...values, limit, offset],
    ),
    database.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM merchant_api_logs WHERE ` + whereClause,
      values,
    ),
    database.query<{
      total: string;
      success: string;
      avg_latency: string | null;
      client_errors: string;
      server_errors: string;
    }>(
      `SELECT
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::text as success,
        AVG(latency_ms)::numeric(10,1)::text as avg_latency,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::text as client_errors,
        COUNT(*) FILTER (WHERE status_code >= 500)::text as server_errors
       FROM merchant_api_logs
      WHERE merchant_id = $1
        AND created_at >= now() - interval '24 hours'`,
      [merchantId],
    ),
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const mRow = metricsRes.rows[0];
  const total24h = parseInt(mRow?.total || '0', 10);
  const success24h = parseInt(mRow?.success || '0', 10);
  const avgLatency = mRow?.avg_latency ? parseFloat(mRow.avg_latency) : 0;
  const clientErrors = parseInt(mRow?.client_errors || '0', 10);
  const serverErrors = parseInt(mRow?.server_errors || '0', 10);

  const metrics: ApiLogMetrics = {
    totalRequests24h: total24h,
    successRate: total24h > 0 ? Math.round((success24h / total24h) * 1000) / 10 : 100,
    avgLatencyMs: Math.round(avgLatency),
    clientErrors24h: clientErrors,
    serverErrors24h: serverErrors,
  };

  const logs: ApiLog[] = logsRes.rows.map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    apiKeyId: row.api_key_id,
    method: row.method,
    path: row.path,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    idempotencyKey: row.idempotency_key,
    requestHeaders: row.request_headers || {},
    requestBody: row.request_body || {},
    responseBody: row.response_body || {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));

  return {
    logs,
    metrics,
    pagination: { total, limit, offset },
  };
}

export async function getMerchantApiLogById(
  database: Pick<Pool, 'query'>,
  merchantId: string,
  logId: string,
): Promise<ApiLog | null> {
  const res = await database.query<any>(
    `SELECT id, merchant_id, api_key_id, method, path, status_code, latency_ms,
            ip_address, user_agent, idempotency_key, request_headers, request_body,
            response_body, error_message, created_at
       FROM merchant_api_logs
      WHERE merchant_id = $1 AND id = $2`,
    [merchantId, logId],
  );

  if (!res.rows[0]) return null;
  const row = res.rows[0];

  return {
    id: row.id,
    merchantId: row.merchant_id,
    apiKeyId: row.api_key_id,
    method: row.method,
    path: row.path,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    idempotencyKey: row.idempotency_key,
    requestHeaders: row.request_headers || {},
    requestBody: row.request_body || {},
    responseBody: row.response_body || {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export async function clearMerchantApiLogs(
  database: Pick<Pool, 'query'>,
  merchantId: string,
): Promise<{ deleted: number }> {
  const res = await database.query(
    `DELETE FROM merchant_api_logs WHERE merchant_id = $1`,
    [merchantId],
  );
  return { deleted: res.rowCount || 0 };
}
