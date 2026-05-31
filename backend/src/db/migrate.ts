import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Running database migrations...');
  for (const file of files) {
    console.log(`  → ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
  }
  console.log('Migrations completed successfully.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
