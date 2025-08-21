import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAccount, myAccounts, getAccountById } from '../controllers/account.controller.js';


const router = Router();
router.use(requireAuth);
router.post('/', createAccount);
router.get('/', myAccounts);
router.get('/:id', getAccountById);




export default router;
