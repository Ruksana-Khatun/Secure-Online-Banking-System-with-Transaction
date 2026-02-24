import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requestOtp, verifyOtp } from "../controllers/otp.controller.js";

const router = Router();

// limit OTP spamming
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

// Backwards-compatible endpoint:
// - If body contains otpId+code, treat as verify
// - Otherwise treat as request
router.post("/", otpLimiter, (req, res, next) => {
  if (req.body?.otpId && req.body?.code) return verifyOtp(req, res, next);
  return requestOtp(req, res, next);
});

router.post("/request", otpLimiter, requestOtp);   // LOGIN: send userId in body; TRANSFER: must be auth
router.post("/verify", otpLimiter, verifyOtp);

export default router;
