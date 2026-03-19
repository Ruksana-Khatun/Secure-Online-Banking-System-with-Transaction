import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";

// ✅ Bug Fix #3: Sahi file naam se import
import {
  registerAepsAgent,
  getAepsAgentProfile,
  checkAgentStatus,
  sendAepsOtp,
  authenticateAepsAgent,
  cashWithdrawal,
  getAepsTransactions,
  getCommissionReport,
} from "../controllers/aepsAgent.controller.js";

const router = Router();

// ✅ Rate limiter — fake registrations rokne ke liye
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per IP
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,                   // 3 OTP attempts
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 5 minutes.",
  },
});

// ─────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────

// ✅ Rate limited registration
router.post("/agent/register", registerLimiter, registerAepsAgent);

// ─────────────────────────────────────────────
// Protected Routes (Auth Required)
// ─────────────────────────────────────────────

// ✅ Bug Fix #1: OTP + Authenticate ko auth ke andar rakha
router.post("/send-otp", requireAuth, otpLimiter, sendAepsOtp);
router.post("/authenticate", requireAuth, authenticateAepsAgent);

// ✅ Bug Fix #2: Status check bhi protected
router.get("/agent/status/:agentId", requireAuth, checkAgentStatus);

router.get("/agent/profile", requireAuth, getAepsAgentProfile);
router.post("/withdrawal", requireAuth, cashWithdrawal);
router.get("/transactions", requireAuth, getAepsTransactions);
router.get("/reports/commission", requireAuth, getCommissionReport);

export default router;