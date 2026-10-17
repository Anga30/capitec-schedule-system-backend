ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE email_outbox
  DROP CONSTRAINT IF EXISTS email_outbox_status_check;

ALTER TABLE email_outbox
  ADD CONSTRAINT email_outbox_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

DROP INDEX IF EXISTS email_outbox_pending_idx;
CREATE INDEX email_outbox_pending_idx
  ON email_outbox (next_attempt_at, created_at)
  WHERE status = 'pending';
