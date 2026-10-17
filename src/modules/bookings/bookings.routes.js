import { Router } from 'express';
import { createBooking } from './bookings.controller.js';

const router = Router();
router.post('/', createBooking);
export default router;
