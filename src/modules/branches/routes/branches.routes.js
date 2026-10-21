import { Router } from 'express';
import { listBranches } from '../controllers/branches.controller.js';

const router = Router();
router.get('/', listBranches);
export default router;
