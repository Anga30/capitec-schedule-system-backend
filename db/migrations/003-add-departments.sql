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

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);

UPDATE bookings
SET department_id = (
  SELECT id FROM departments WHERE name = 'General Enquiries'
)
WHERE department_id IS NULL;

ALTER TABLE bookings
  ALTER COLUMN department_id SET NOT NULL;
