export async function reserveSlot(client, slotId) {
  const { rowCount } = await client.query(
    `UPDATE appointment_slots AS slot SET status = 'booked'
     FROM branches AS branch
     JOIN branch_operating_hours AS hours ON hours.branch_id = branch.id
     WHERE slot.id = $1 AND slot.status = 'available' AND slot.starts_at > now()
       AND branch.id = slot.branch_id AND branch.active = true
       AND hours.weekday = EXTRACT(ISODOW FROM slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::smallint
       AND (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::time >= hours.opens_at
       AND (slot.ends_at AT TIME ZONE 'Africa/Johannesburg')::time <= hours.closes_at
       AND slot.ends_at - slot.starts_at = hours.slot_duration_minutes * interval '1 minute'
       AND NOT EXISTS (
         SELECT 1 FROM branch_closures AS closure
         WHERE closure.closure_date = (slot.starts_at AT TIME ZONE 'Africa/Johannesburg')::date
           AND (closure.branch_id IS NULL OR closure.branch_id = branch.id)
       )
     RETURNING slot.id`,
    [slotId],
  );
  return rowCount > 0;
}

export async function insertBooking(client, { slotId, departmentId, customerName, customerEmail, isCapitecClient }) {
  const { rows } = await client.query(
    `INSERT INTO bookings(slot_id, department_id, customer_name, customer_email, is_capitec_client) VALUES($1, $2, $3, $4, $5)
     RETURNING id, slot_id AS "slotId", department_id AS "departmentId", customer_name AS "customerName", is_capitec_client AS "isCapitecClient", status`,
    [slotId, departmentId, customerName, customerEmail, isCapitecClient],
  );
  return rows[0];
}

export async function findBookingDetails(client, bookingId) {
  const { rows } = await client.query(
    `SELECT booking.id, booking.slot_id AS "slotId", booking.department_id AS "departmentId",
       booking.customer_name AS "customerName", booking.customer_email AS "customerEmail",
       booking.is_capitec_client AS "isCapitecClient", booking.status,
       branch.name AS "branchName", branch.address AS "branchAddress",
       department.name AS "departmentName", slot.starts_at AS "startsAt", slot.ends_at AS "endsAt"
     FROM bookings AS booking
     JOIN appointment_slots AS slot ON slot.id = booking.slot_id
     JOIN branches AS branch ON branch.id = slot.branch_id
     JOIN departments AS department ON department.id = booking.department_id
     WHERE booking.id = $1`,
    [bookingId],
  );
  return rows[0];
}

export async function insertConfirmationOutboxEvent(client, bookingDetails) {
  await client.query(
    'INSERT INTO email_outbox(booking_id, payload) VALUES($1, $2::jsonb)',
    [bookingDetails.id, JSON.stringify(bookingDetails)],
  );
}
