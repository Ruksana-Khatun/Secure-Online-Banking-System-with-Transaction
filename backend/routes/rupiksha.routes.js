import express from 'express';
import rateLimit from 'express-rate-limit';
import { merchantOnboard } from '../controllers/rupiksha.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    message: 'Too many onboarding requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


router.post('/onboard', 
  requireAuth,           
  onboardingLimiter,   
  merchantOnboard       
);

export default router;
