import { HttpError } from '../../../shared/errors/http-error.js';
import { makeBooking } from '../services/bookings.service.js';
import { validateBookingInput } from '../validation/booking.validation.js';

export async function createBooking(req, res, next) {
  const input = validateBookingInput(req.body);
  if (!input) {
    return next(new HttpError(400, 'Provide a valid slot, department, name, and email address.'));
  }

  try {
    const booking = await makeBooking(input);
    res.status(201).json({
      booking,
      message: 'Your appointment is confirmed. A confirmation email is being prepared.',
    });
  } catch (error) {
    next(error);
  }
}
