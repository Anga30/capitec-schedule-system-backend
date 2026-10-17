ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_capitec_client boolean NOT NULL DEFAULT false;
