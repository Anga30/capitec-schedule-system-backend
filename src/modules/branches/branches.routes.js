import { Router } from 'express';
import { listBranches } from './branches.controller.js';

const router = Router();
router.get('/', listBranches);
export default router;
