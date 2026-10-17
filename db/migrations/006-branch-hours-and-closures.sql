CREATE TABLE IF NOT EXISTS branch_operating_hours (
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  slot_duration_minutes smallint NOT NULL DEFAULT 30 CHECK (slot_duration_minutes BETWEEN 1 AND 180),
  PRIMARY KEY (branch_id, weekday),
  CHECK (closes_at > opens_at)
);

CREATE TABLE IF NOT EXISTS branch_closures (
  id bigserial PRIMARY KEY,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  closure_date date NOT NULL,
  reason text NOT NULL,
  CHECK (length(trim(reason)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_closures_global_date_idx
  ON branch_closures (closure_date) WHERE branch_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS branch_closures_branch_date_idx
  ON branch_closures (branch_id, closure_date) WHERE branch_id IS NOT NULL;

INSERT INTO branch_operating_hours (branch_id, weekday, opens_at, closes_at, slot_duration_minutes)
SELECT branch.id, weekday, time '09:00', time '16:00', 30
FROM branches AS branch
CROSS JOIN generate_series(1, 5) AS weekdays(weekday)
WHERE branch.active = true
ON CONFLICT (branch_id, weekday) DO NOTHING;

-- Source: South African Government public holiday calendar and 2026 election holiday declaration.
INSERT INTO branch_closures (branch_id, closure_date, reason)
SELECT NULL, holiday.closure_date::date, holiday.reason
FROM (VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-03-21', 'Human Rights Day'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-06', 'Family Day'),
  ('2026-04-27', 'Freedom Day'),
  ('2026-05-01', 'Workers'' Day'),
  ('2026-06-16', 'Youth Day'),
  ('2026-08-09', 'National Women''s Day'),
  ('2026-08-10', 'National Women''s Day observed'),
  ('2026-09-24', 'Heritage Day'),
  ('2026-11-04', 'Election Day public holiday'),
  ('2026-12-16', 'Day of Reconciliation'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Day of Goodwill'),
  ('2027-01-01', 'New Year''s Day'),
  ('2027-03-21', 'Human Rights Day'),
  ('2027-03-22', 'Human Rights Day observed'),
  ('2027-03-26', 'Good Friday'),
  ('2027-03-29', 'Family Day'),
  ('2027-04-27', 'Freedom Day'),
  ('2027-05-01', 'Workers'' Day'),
  ('2027-06-16', 'Youth Day'),
  ('2027-08-09', 'National Women''s Day'),
  ('2027-09-24', 'Heritage Day'),
  ('2027-12-16', 'Day of Reconciliation'),
  ('2027-12-25', 'Christmas Day'),
  ('2027-12-26', 'Day of Goodwill'),
  ('2027-12-27', 'Day of Goodwill observed')
) AS holiday(closure_date, reason)
WHERE NOT EXISTS (
  SELECT 1 FROM branch_closures AS existing
  WHERE existing.branch_id IS NULL AND existing.closure_date = holiday.closure_date::date
);

DELETE FROM appointment_slots AS slot
WHERE slot.status = 'available'
  AND slot.starts_at > now()
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
  );
