import { pool } from '../../db/pool.js';

export async function findActiveDepartments() {
  const { rows } = await pool.query(
    'SELECT id, name FROM departments WHERE active = true ORDER BY name',
  );
  return rows;
}

export async function isActiveDepartment(client, departmentId) {
  const { rowCount } = await client.query(
    'SELECT 1 FROM departments WHERE id = $1 AND active = true',
    [departmentId],
  );
  return rowCount > 0;
}
