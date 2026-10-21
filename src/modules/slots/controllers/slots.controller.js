import { HttpError } from '../../../shared/errors/http-error.js';
import { isCalendarDate, isUuid } from '../../../shared/validation.js';
import { getAvailableDates, getAvailableSlots } from '../services/slots.service.js';

export async function listAvailableDates(req, res, next) {
  const { branchId } = req.query;
  if (!isUuid(branchId)) {
    return next(new HttpError(400, 'A valid branchId is required.'));
  }

  try {
    res.json(await getAvailableDates(branchId));
  } catch (error) {
    next(error);
  }
}

export async function listSlots(req, res, next) {
  const { branchId, date } = req.query;
  if (!isUuid(branchId) || !isCalendarDate(date)) {
    return next(new HttpError(400, 'Provide a valid branchId and calendar date (YYYY-MM-DD).'));
  }

  try {
    res.json(await getAvailableSlots(branchId, date));
  } catch (error) {
    next(error);
  }
}
