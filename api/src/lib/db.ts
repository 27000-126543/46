import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;

function createPool(): Pool {
  const poolConfig: PoolConfig = {
    connectionString: config.DATABASE_URL,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  const newPool = new Pool(poolConfig);

  newPool.on('error', (err) => {
    console.error('PostgreSQL 池错误:', err);
    process.exit(-1);
  });

  newPool.on('connect', () => {
    if (config.NODE_ENV !== 'production') {
      console.log('已连接到 PostgreSQL 数据库');
    }
  });

  return newPool;
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const dbPool = getPool();
  const start = Date.now();

  try {
    const result = await dbPool.query<T>(text, params);
    if (config.NODE_ENV !== 'production') {
      const duration = Date.now() - start;
      console.log(`[DB] ${text.split(' ')[0]} - ${result.rowCount} 行 - ${duration}ms`);
    }
    return result;
  } catch (error) {
    console.error('[DB] 查询错误:', error);
    throw error;
  }
}

export async function getClient() {
  const dbPool = getPool();
  return await dbPool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
