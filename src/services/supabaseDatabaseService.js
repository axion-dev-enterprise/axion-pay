import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

let supabaseInstance = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = config.supabase?.url;
  const key = config.supabase?.secretKey || config.supabase?.publishableKey;

  if (!url || !key) {
    logger.warn("Credenciais do Supabase não configuradas no AXION Pay.");
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: { persistSession: false }
  });
  return supabaseInstance;
}

/**
 * Salva uma nova transação no banco relacional PostgreSQL do Supabase
 */
export async function saveTransactionToSupabase(transaction) {
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: "client_null" };

  try {
    const payload = {
      amount_cents: transaction.amount_cents || Math.round((transaction.amount || 0) * 100),
      currency: transaction.currency || "BRL",
      provider: transaction.provider || "stripe",
      provider_reference: transaction.providerReference || transaction.id,
      status: transaction.status || "pending",
      metadata: transaction.metadata || {}
    };

    const { data, error } = await client.from("transactions").insert(payload).select().single();

    if (error) {
      logger.error({ error: error.message }, "Erro ao inserir transação no Supabase");
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    logger.error({ err: err.message }, "Exceção ao persistir transação no Supabase");
    return { success: false, error: err.message };
  }
}
