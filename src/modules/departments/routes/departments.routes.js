import { Router } from 'express';
import { listDepartments } from '../controllers/departments.controller.js';

const router = Router();
router.get('/', listDepartments);
export default router;
