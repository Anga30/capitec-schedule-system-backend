import { pool } from '../../db/pool.js';

export async function checkConnection() {
  await pool.query('SELECT 1');
}

export async function checkWorkerHeartbeat(timeoutMs = Number(process.env.WORKER_HEARTBEAT_TIMEOUT_MS || 15000)) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM worker_heartbeat
      WHERE id = true AND heartbeat_at > now() - ($1 * interval '1 millisecond')
    ) AS available`,
    [timeoutMs],
  );
  return rows[0].available;
}
