import { Router } from 'express';
import { listDepartments } from './departments.controller.js';

const router = Router();
router.get('/', listDepartments);
export default router;
