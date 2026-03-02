import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requestOtp, verifyOtp } from "../controllers/otp.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// limit OTP spamming
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

function requireAuthIfTransfer(req, res, next) {
  if (req.body?.purpose === "TRANSFER") return requireAuth(req, res, next);
  return next();
}

// Backwards-compatible endpoint:
// - If body contains otpId+code, treat as verify
// - Otherwise treat as request
router.post("/", otpLimiter, (req, res, next) => {
  if (req.body?.otpId && req.body?.code) return verifyOtp(req, res, next);
  return requireAuthIfTransfer(req, res, () => requestOtp(req, res, next));
});

router.post("/request", otpLimiter, requireAuthIfTransfer, requestOtp); // LOGIN: send userId in body; TRANSFER: requires auth
router.post("/verify", otpLimiter, verifyOtp);

export default router;
