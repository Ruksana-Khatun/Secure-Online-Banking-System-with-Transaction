import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { transfer, history } from '../controllers/transaction.controller.js';


const router = Router();
router.use(requireAuth);
router.post('/transfer', transfer);
router.get('/history', history);
export default router;

