import { pool } from '../../../db/pool.js';

export async function claimNextJob(maxAttempts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE email_outbox
       SET status = 'failed', last_error = COALESCE(last_error, 'Maximum delivery attempts exceeded'), processing_started_at = NULL
       WHERE status = 'processing' AND attempts >= $1
         AND processing_started_at < now() - interval '5 minutes'`,
      [maxAttempts],
    );
    const { rows } = await client.query(`WITH next_job AS (
      SELECT id FROM email_outbox
      WHERE (status = 'pending' AND next_attempt_at <= now() AND attempts < $1)
         OR (status = 'processing' AND processing_started_at < now() - interval '5 minutes' AND attempts < $1)
      ORDER BY next_attempt_at, created_at LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE email_outbox job SET status = 'processing', attempts = attempts + 1, processing_started_at = now()
    FROM next_job WHERE job.id = next_job.id RETURNING job.id, job.payload`, [maxAttempts]);
    await client.query('COMMIT');
    return rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function markJobSent(id) {
  await pool.query(
    "UPDATE email_outbox SET status = 'sent', processed_at = now(), processing_started_at = NULL, last_error = NULL WHERE id = $1",
    [id],
  );
}

export async function retryJob(id, errorMessage, maxAttempts) {
  await pool.query(
    `UPDATE email_outbox
     SET status = CASE WHEN attempts >= $3 THEN 'failed' ELSE 'pending' END,
         next_attempt_at = CASE
           WHEN attempts >= $3 THEN next_attempt_at
           ELSE now() + LEAST(power(2, GREATEST(attempts - 1, 0)) * interval '30 seconds', interval '6 hours')
         END,
         last_error = left($2, 1000), processing_started_at = NULL
     WHERE id = $1`,
    [id, errorMessage, maxAttempts],
  );
}
