import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requestOtp, verifyOtp } from "../controllers/otp.controller.js";

const router = Router();

// limit OTP spamming
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

router.post("/request", otpLimiter, requestOtp);   // LOGIN: send userId in body; TRANSFER: must be auth
router.post("/verify", otpLimiter, verifyOtp);

export default router;
