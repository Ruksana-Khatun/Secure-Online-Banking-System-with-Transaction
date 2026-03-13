import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { initiatePpiTransaction } from "../controllers/digikhataPpi.controller.js";
import {
  recipientAdd,
  recipientAddBank,
  recipientList,
  senderInfo,
  senderOnboard,
  senderValidateAadhaar,
  senderValidatePan,
  senderVerifyOtp,
  txnInquiry,
  txnInitiate,
  txnSendOtp,
} from "../controllers/ppiDigikhata.controller.js";

const router = Router();

router.use(requireAuth);

// Backward-compatible demo endpoint used by current UI tab
router.post("/transactions", initiatePpiTransaction);

// Sender APIs
router.post("/sender/onboard", senderOnboard);
// Prevent confusion in Postman: OTP verify is POST-only
router.get("/sender/verify-otp", (req, res) =>
  res.status(405).json({ success: false, message: "Use POST /api/ppi/sender/verify-otp" })
);
router.post("/sender/verify-otp", senderVerifyOtp);
router.post("/sender/:customerId/aadhaar", senderValidateAadhaar);
router.post("/sender/:customerId/pan", senderValidatePan);
// IMPORTANT: keep dynamic routes last so they don't catch static paths like "verify-otp"
router.get("/sender/:customerId", senderInfo);

// Recipient APIs
router.get("/recipients/:customerId", recipientList);
router.post("/recipients/:customerId", recipientAdd);
router.post("/recipients/:customerId/bank", recipientAddBank);

// Transaction APIs (step-by-step flow)
router.post("/transactions/:customerId/send-otp", txnSendOtp);
router.post("/transactions/:customerId/initiate", txnInitiate);
router.get("/transactions/inquiry/:clientRefId", txnInquiry);

export default router;

 