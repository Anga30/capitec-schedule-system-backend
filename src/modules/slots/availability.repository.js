import { pool } from '../../db/pool.js';

const BOOKING_WINDOW_DAYS = 90;

export async function ensureOpenSlots() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM appointment_slots AS slot
       WHERE slot.status = 'available'
         AND (slot.ends_at <= now() OR (
           slot.starts_at > now()
           AND NOT EXISTS (
             SELECT 1
             FROM branches AS branch
             JOIN branch_operating_hours AS hours ON hours.branch_id = branch.id
             WHERE branch.id = slot.branch_id
               AND branch.active = true
               AND hours.weekday = EXTRACT(ISODOW FROM slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::smallint
               AND (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::time >= hours.opens_at
               AND (slot.ends_at AT TIME ZONE 'Africa/Johannesburg')::time <= hours.closes_at
               AND slot.ends_at - slot.starts_at = hours.slot_duration_minutes * interval '1 minute'
               AND NOT EXISTS (
                 SELECT 1 FROM branch_closures AS closure
                 WHERE closure.closure_date = (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::date
                   AND (closure.branch_id IS NULL OR closure.branch_id = branch.id)
               )
           )
         ))`,
    );

    const { rowCount } = await client.query(
    `INSERT INTO appointment_slots (branch_id, starts_at, ends_at)
     WITH days AS (
       SELECT service_day::date AS service_day
       FROM generate_series(
         ((now() AT TIME ZONE 'Africa/Johannesburg')::date + 1)::timestamp,
         ((now() AT TIME ZONE 'Africa/Johannesburg')::date + $1::int)::timestamp,
         interval '1 day'
       ) AS generated_days(service_day)
     ), branch_days AS (
       SELECT branch.id AS branch_id, days.service_day, hours.opens_at, hours.closes_at,
         hours.slot_duration_minutes
       FROM branches AS branch
       JOIN branch_operating_hours AS hours ON hours.branch_id = branch.id
       CROSS JOIN days
       WHERE branch.active = true
         AND hours.weekday = EXTRACT(ISODOW FROM days.service_day)::smallint
         AND NOT EXISTS (
           SELECT 1 FROM branch_closures AS closure
           WHERE closure.closure_date = days.service_day
             AND (closure.branch_id IS NULL OR closure.branch_id = branch.id)
         )
     )
     SELECT branch_days.branch_id,
       (branch_days.service_day + branch_days.opens_at
         + indexes.slot_index * branch_days.slot_duration_minutes * interval '1 minute') AT TIME ZONE 'Africa/Johannesburg',
       (branch_days.service_day + branch_days.opens_at
         + (indexes.slot_index + 1) * branch_days.slot_duration_minutes * interval '1 minute') AT TIME ZONE 'Africa/Johannesburg'
     FROM branch_days
     CROSS JOIN LATERAL generate_series(
       0,
       (EXTRACT(EPOCH FROM (branch_days.closes_at - branch_days.opens_at)) / 60
         / branch_days.slot_duration_minutes)::int - 1
     ) AS indexes(slot_index)
     ON CONFLICT (branch_id, starts_at) DO NOTHING`,
      [BOOKING_WINDOW_DAYS],
    );

    await client.query('COMMIT');
    return rowCount;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
