CREATE TABLE IF NOT EXISTS worker_heartbeat (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  heartbeat_at timestamptz NOT NULL
);
