import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";

import { 
  initiatePpiTransaction,
} from "../controllers/digikhataPpi.controller.js";

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
  deletePpiWallet,
  updateCustomerId,
  getWalletDetails,
  listAllWallets,
  reloadWalletBalance,
  getWalletBalanceInfo,
} from "../controllers/ppiDigikhata.controller.js";


const router = Router();


// Apply authentication middleware to all routes

router.use(requireAuth);



// Simple PPI transaction endpoint (backward compatible)

router.post("/transactions", initiatePpiTransaction);



// Sender APIs

router.post("/sender/onboard", senderOnboard);

// Prevent confusion in Postman: OTP verify is POST-only

// router.get("/sender/verify-otp", (req, res) =>

//   res.status(405).json({ success: false, message: "Use POST /api/ppi/sender/verify-otp" })

// );

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



// Wallet Management APIs

router.get("/wallet", getWalletDetails);  // Get current user's wallet

router.get("/wallet/:customerId", getWalletDetails);  // Get specific wallet (admin/owner)

router.get("/wallet/:customerId/balance-info", getWalletBalanceInfo);  // Detailed balance info with recommendations

router.put("/wallet/:oldCustomerId/update-customer-id", updateCustomerId);  // Update Customer ID

router.delete("/wallet/:customerId", deletePpiWallet);  // Delete wallet



// Admin APIs

router.get("/admin/wallets", listAllWallets);  // List all wallets (admin only)

router.post("/admin/wallet/:customerId/reload", reloadWalletBalance);  // Admin wallet reload



export default router;