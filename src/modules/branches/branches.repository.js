import { pool } from '../../db/pool.js';

export async function findActiveBranches() {
  const { rows } = await pool.query(
    'SELECT id, name, address FROM branches WHERE active = true ORDER BY name',
  );
  return rows;
}
