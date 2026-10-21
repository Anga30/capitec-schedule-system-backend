import { pool } from '../../../db/pool.js';

export async function findAvailableSlots(branchId, date) {
  const { rows } = await pool.query(
    `SELECT slot.id, slot.starts_at AS "startsAt", slot.ends_at AS "endsAt"
     FROM appointment_slots AS slot
     JOIN branches AS branch ON branch.id = slot.branch_id AND branch.active = true
     JOIN branch_operating_hours AS hours
       ON hours.branch_id = branch.id
       AND hours.weekday = EXTRACT(ISODOW FROM slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::smallint
     WHERE slot.branch_id = $1 AND slot.status = 'available' AND slot.starts_at > now()
       AND slot.starts_at >= ($2::date::timestamp AT TIME ZONE 'Africa/Johannesburg')
       AND slot.starts_at < (($2::date + 1)::timestamp AT TIME ZONE 'Africa/Johannesburg')
       AND (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::time >= hours.opens_at
       AND (slot.ends_at AT TIME ZONE 'Africa/Johannesburg')::time <= hours.closes_at
       AND slot.ends_at - slot.starts_at = hours.slot_duration_minutes * interval '1 minute'
       AND NOT EXISTS (
         SELECT 1 FROM branch_closures AS closure
         WHERE closure.closure_date = (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::date
           AND (closure.branch_id IS NULL OR closure.branch_id = branch.id)
       )
     ORDER BY slot.starts_at`,
    [branchId, date],
  );
  return rows;
}

export async function findAvailableDates(branchId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT to_char(slot.starts_at AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD') AS date
     FROM appointment_slots AS slot
     JOIN branches AS branch ON branch.id = slot.branch_id AND branch.active = true
     JOIN branch_operating_hours AS hours
       ON hours.branch_id = branch.id
       AND hours.weekday = EXTRACT(ISODOW FROM slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::smallint
     WHERE slot.branch_id = $1 AND slot.status = 'available' AND slot.starts_at > now()
       AND slot.starts_at >= (((now() AT TIME ZONE 'Africa/Johannesburg')::date + 1)::timestamp AT TIME ZONE 'Africa/Johannesburg')
       AND (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::time >= hours.opens_at
       AND (slot.ends_at AT TIME ZONE 'Africa/Johannesburg')::time <= hours.closes_at
       AND slot.ends_at - slot.starts_at = hours.slot_duration_minutes * interval '1 minute'
       AND NOT EXISTS (
         SELECT 1 FROM branch_closures AS closure
         WHERE closure.closure_date = (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::date
           AND (closure.branch_id IS NULL OR closure.branch_id = branch.id)
       )
     ORDER BY date`,
    [branchId],
  );
  return rows.map(({ date }) => date);
}
