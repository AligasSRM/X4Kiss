import pg from "pg";

const { Pool } = pg;

function toPostgresPlaceholders(sql) {
  return sql.replace(/\?(\d+)/g, (_, n) => "$" + n);
}

class PostgresStatement {
  constructor(pool, sql) {
    this.pool = pool;
    this.sql = toPostgresPlaceholders(sql);
    this.params = [];
  }

  bind(...params) {
    const statement = new PostgresStatement(this.pool, this.sql);
    statement.params = params;
    return statement;
  }

  async first() {
    const result = await this.pool.query(this.sql, this.params);
    return result.rows[0] ?? null;
  }

  async all() {
    const result = await this.pool.query(this.sql, this.params);
    return { success: true, results: result.rows, meta: { changes: result.rowCount ?? 0 } };
  }

  async run() {
    const result = await this.pool.query(this.sql, this.params);
    return { success: true, meta: { changes: result.rowCount ?? 0 } };
  }
}

/**
 * Minimal Cloudflare D1-compatible adapter for the repository's existing SQL
 * call sites. It intentionally implements only the methods used by X4Kiss.
 */
export function createPostgresBindings(connectionString) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  const db = {
    prepare(sql) {
      return new PostgresStatement(pool, sql);
    },
    async batch(statements) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const statement of statements) {
          const result = await client.query(statement.sql, statement.params);
          results.push({ success: true, meta: { changes: result.rowCount ?? 0 } });
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };

  return { db, pool };
}
