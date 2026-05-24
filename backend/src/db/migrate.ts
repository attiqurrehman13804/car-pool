import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Running database migrations...');
  await pool.query(sql);
  console.log('Migrations completed successfully.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
