import type { Pool } from 'pg';
import { db } from '../db.js';
import type { AccountSnapshot } from '../core/types.js';

export class ReconciliationService {
  constructor(private readonly database: Pick<Pool, 'query'> = db) {}

  async persistSnapshot(snapshot: AccountSnapshot, accountRef?: string) {
    const result = await this.database.query(
      `
        INSERT INTO reconciliation_snapshots (
          source,
          account_ref,
          balance_cents,
          snapshot
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      [
        snapshot.source,
        accountRef ?? null,
        snapshot.balanceCents ?? null,
        JSON.stringify(snapshot.raw),
      ],
    );

    return result.rows[0];
  }
}
