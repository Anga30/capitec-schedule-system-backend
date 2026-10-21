import { Router } from 'express';
import { listAvailableDates, listSlots } from '../controllers/slots.controller.js';

const router = Router();
router.get('/available-dates', listAvailableDates);
router.get('/', listSlots);
export default router;
