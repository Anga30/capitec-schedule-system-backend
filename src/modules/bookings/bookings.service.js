import { pool } from '../../db/pool.js';
import { HttpError } from '../../shared/errors/http-error.js';
import { reserveSlot, insertBooking, findBookingDetails, insertConfirmationOutboxEvent } from './bookings.repository.js';
import { isActiveDepartment } from '../departments/departments.repository.js';
import { checkWorkerHeartbeat } from '../health/health.repository.js';

export async function makeBooking({ slotId, departmentId, customerName, customerEmail, isCapitecClient }) {
  if (!await checkWorkerHeartbeat()) {
    throw new HttpError(503, 'Our service is temporarily unavailable. Please try again shortly.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await isActiveDepartment(client, departmentId)) {
      throw new HttpError(400, 'Choose an available department.');
    }
    const reserved = await reserveSlot(client, slotId);
    if (!reserved) {
      throw new HttpError(409, 'That slot is no longer available. Please choose another time.');
    }

    const insertedBooking = await insertBooking(client, { slotId, departmentId, customerName, customerEmail, isCapitecClient });
    const bookingDetails = await findBookingDetails(client, insertedBooking.id);
    await insertConfirmationOutboxEvent(client, bookingDetails);
    await client.query('COMMIT');
    const publicBooking = { ...bookingDetails };
    delete publicBooking.customerEmail;
    return publicBooking;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
