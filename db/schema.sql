CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  address text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO departments (id, name) VALUES
 ('20000000-0000-4000-8000-000000000001','Everyday Banking'),
 ('20000000-0000-4000-8000-000000000002','Credit'),
 ('20000000-0000-4000-8000-000000000003','Business Banking'),
 ('20000000-0000-4000-8000-000000000004','General Enquiries')
ON CONFLICT (name) DO NOTHING;
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
CREATE TABLE IF NOT EXISTS appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked')),
  CHECK (ends_at > starts_at), UNIQUE (branch_id, starts_at)
);
CREATE INDEX IF NOT EXISTS slots_branch_start_available_idx ON appointment_slots (branch_id, starts_at) WHERE status = 'available';
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL UNIQUE REFERENCES appointment_slots(id),
  department_id uuid NOT NULL REFERENCES departments(id),
  customer_name text NOT NULL, customer_email text NOT NULL,
  is_capitec_client boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id bigserial PRIMARY KEY, booking_id uuid NOT NULL REFERENCES bookings(id),
  event_type text NOT NULL DEFAULT 'booking.confirmed', payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error text,
  processing_started_at timestamptz, processed_at timestamptz
);
CREATE TABLE IF NOT EXISTS worker_heartbeat (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  heartbeat_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON email_outbox (next_attempt_at, created_at) WHERE status = 'pending';
INSERT INTO branches (id,name,address) VALUES
 ('10000000-0000-4000-8000-000000000001','Cape Town CBD','12 Adderley Street, Cape Town'),
 ('10000000-0000-4000-8000-000000000002','Johannesburg Sandton','5 Rivonia Road, Sandton')
ON CONFLICT (id) DO NOTHING;
