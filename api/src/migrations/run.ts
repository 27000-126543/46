import fs from 'fs';
import path from 'path';
import { getPool, closePool, getClient } from '../lib/db';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('没有找到迁移文件');
    return;
  }

  console.log(`找到 ${files.length} 个迁移文件`);
  console.log('='.repeat(50));

  const pool = getPool();
  const client = await getClient();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    for (const file of files) {
      const version = file.replace('.sql', '');

      if (appliedVersions.has(version)) {
        console.log(`⏭️  跳过: ${file} (已执行)`);
        continue;
      }

      console.log(`▶️  执行: ${file}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        console.log(`✅ 完成: ${file}`);
      } catch (error) {
        console.error(`❌ 失败: ${file}`);
        console.error(error);
        throw error;
      }
    }

    await client.query('COMMIT');
    console.log('='.repeat(50));
    console.log('所有迁移执行成功！');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('迁移执行失败，已回滚');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

runMigrations().catch((err) => {
  console.error('迁移脚本异常:', err);
  process.exit(1);
});
