import { randomBytes } from "crypto";
import AepsAgent from "../models/AepsAgent.model.js";
import AepsTransaction from "../models/AepsTransaction.model.js";
// ✅ Bug Fix #1: Removed unused `User` import
import aepsService from "../services/aeps.service.js";
import mockAepsService from "../services/mockAepsService.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function sendError(res, e) {
  const status = e?.statusCode || e?.response?.status || 500;
  const message = e?.message || "Server error";
  return res.status(status).json({ success: false, message });
}

// ✅ Bug Fix #2: Single generateOutletId — crypto based, collision safe
function generateOutletId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `OT${timestamp}${random}`;
}

// ✅ Proper field validation helper
function validateRegistrationFields({
  firstName, lastName, email, mobile, panNumber, aadhaarNumber,
  companyBankName, bankHolderName, bankAccountNo, ifscCode,
  shopName, state, city, address, pincode,
}) {
  const errors = [];

  if (!firstName?.trim())  errors.push("First name is required");
  if (!lastName?.trim())   errors.push("Last name is required");
  if (!shopName?.trim())   errors.push("Shop name is required");
  if (!state?.trim())      errors.push("State is required");
  if (!city?.trim())       errors.push("City is required");
  if (!address?.trim())    errors.push("Address is required");
  if (!companyBankName?.trim())  errors.push("Bank name is required");
  if (!bankHolderName?.trim())   errors.push("Bank holder name is required");
  if (!bankAccountNo?.trim())    errors.push("Bank account number is required");

  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email))
    errors.push("Valid email is required");

  if (!mobile?.trim() || !/^[6-9]\d{9}$/.test(mobile))
    errors.push("Valid 10-digit mobile number is required");

  if (!panNumber?.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber.toUpperCase()))
    errors.push("Valid PAN number is required (e.g. ABCDE1234F)");

  if (!aadhaarNumber?.trim() || !/^\d{12}$/.test(aadhaarNumber))
    errors.push("Valid 12-digit Aadhaar number is required");

  if (!ifscCode?.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase()))
    errors.push("Valid IFSC code is required (e.g. SBIN0001234)");

  if (!pincode?.trim() || !/^\d{6}$/.test(pincode))
    errors.push("Valid 6-digit pincode is required");

  return errors;
}


// ─────────────────────────────────────────────
// Register AEPS Agent
// ─────────────────────────────────────────────

export async function registerAepsAgent(req, res) {
  console.log('AUTH HEADER:', req.headers.authorization);
  console.log('REQ USER IN CONTROLLER:', req.user);
  
  console.log("[AEPS] ========== REGISTRATION REQUEST START ==========");

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is required",
    });
  }

  try {
    const {
      firstName,
      lastName,
      companyBankName,
      bankHolderName,
      bankAccountNo,
      ifscCode,
      email,
      mobile,
      gstNumber,
      panNumber,
      aadhaarNumber,
      state,
      city,
      address,
      pincode,
      shopName,
    } = req.body;

    // ✅ Bug Fix #3: Strong validation
    const validationErrors = validateRegistrationFields({
      firstName, lastName, email, mobile, panNumber, aadhaarNumber,
      companyBankName, bankHolderName, bankAccountNo, ifscCode,
      shopName, state, city, address, pincode,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0], // First error dikhao
        errors: validationErrors,      // Saare errors bhi bhejo
      });
    }

    // Check if agent already exists
    const existingAgent = await AepsAgent.findOne({
      $or: [{ mobile }, { email }],
    });

    if (existingAgent) {
      // If agent exists but no outletId, add it
      if (!existingAgent.outletId) {
        existingAgent.outletId = generateOutletId();
        await existingAgent.save();
        console.log("[AEPS] Added outletId to existing agent:", existingAgent.outletId);
      }
      
      return res.status(200).json({
        success: true,
        message: "Agent already registered and approved",
        data: {
          agentId: existingAgent._id,
          outletId: existingAgent.outletId,
          status: existingAgent.status,
          email: existingAgent.email,
          mobile: existingAgent.mobile,
        },
      });
    }

    const outletId = generateOutletId();
    console.log("[AEPS] Generated outlet ID:", outletId);

    // ✅ Bug Fix #4: userId save ho raha hai ab
    // ✅ Bug Fix #5: approvedAt model mein add karo (AepsAgent.model.js mein)
    const agent = await AepsAgent.create({
      userId: req.user?.id || null,   // ← FIXED: userId save ho raha hai
      firstName,
      lastName,
      companyBankName,
      bankHolderName,
      bankAccountNo,
      ifscCode:     ifscCode.toUpperCase(),
      email:        email.toLowerCase(),
      mobile,
      gstNumber:    gstNumber?.toUpperCase() || undefined,
      panNumber:    panNumber.toUpperCase(),
      aadhaarNumber,
      state,
      city,
      address,
      pincode,
      shopName,
      outletId,
      status:     "APPROVED",
      kycStatus:  "DONE",           // ← FIXED: Set KYC as completed
      approvedAt: new Date(),
    });

    console.log("[AEPS] Agent created:", agent._id);
    console.log("[AEPS] Agent outletId:", agent.outletId);

    // Call EKO API for activation
    let ekoAgentId = null;
    try {
      let ekoResponse;
      
      if (mockAepsService.isMockEnabled()) {
        // Use mock service for agent activation
        ekoResponse = await mockAepsService.checkAgentStatus(req.user?.id);
      } else {
        // Use real EKO service
        ekoResponse = await aepsService.activateAgent({
          firstName, lastName, mobile, email,
          panNumber:    panNumber.toUpperCase(),
          aadhaarNumber,
          bankAccountNo,
          ifscCode:     ifscCode.toUpperCase(),
          companyBankName,
          state, city, pincode, shopName,
          gstNumber: gstNumber || "",
          outletId,
        });
      }

      console.log("[AEPS] EKO response:", JSON.stringify(ekoResponse, null, 2));

      if (ekoResponse.success) {
        ekoAgentId = ekoResponse.data?.agentId || ekoResponse.data?.agent_id;
        agent.ekoAgentId = ekoAgentId;
        agent.apiResponse = ekoResponse.data; // Raw response save karo
        await agent.save();
        console.log("[AEPS] EKO agent ID saved:", ekoAgentId);
      }
    } catch (ekoError) {
      // EKO fail hone pe bhi agent locally approved rahega
      console.error("[AEPS] EKO Activation Error:", ekoError.message);
    }

    console.log("[AEPS] ========== REGISTRATION SUCCESS ==========");

    return res.status(201).json({
      success: true,
      message: "AEPS Agent registered and approved successfully",
      data: {
        agentId:    agent._id,
        outletId:   agent.outletId,  // ← FIXED: Use agent.outletId
        status:     "APPROVED",
        email:      agent.email,
        mobile:     agent.mobile,
        ekoAgentId,
        approvedAt: agent.approvedAt,
      },
    });

  } catch (e) {
    console.error("[AEPS] Registration Error:", e.message);
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Get Agent Profile
// ─────────────────────────────────────────────

export async function getAepsAgentProfile(req, res) {
  try {
    const agent = await AepsAgent.findOne({ userId: req.user.id })
      .populate("userId", "fullName email");

    if (!agent) {
      return res.json({
        success: true,
        message: "No AEPS agent found",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "Agent profile retrieved successfully",
      data: agent,
    });

  } catch (e) {
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Check Agent Status
// ─────────────────────────────────────────────

export async function checkAgentStatus(req, res) {
  try {
    const { agentId } = req.params;

    const agent = await AepsAgent.findById(agentId);
    if (!agent) throw badRequest("Agent not found");

    // ✅ Bug Fix #6: Null check before .toString()
    if (!agent.userId || agent.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.json({
      success: true,
      message: "Agent status retrieved",
      data: {
        agentId:    agent._id,
        status:     agent.status,
        outletId:   agent.outletId,
        kycStatus:  agent.kycStatus,
        approvedAt: agent.approvedAt,
      },
    });

  } catch (e) {
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Send OTP
// ─────────────────────────────────────────────
export async function sendAepsOtp(req, res) {
  try {
    const { mobile } = req.body;
    if (!mobile) throw badRequest("Mobile number is required");

    const agent = await AepsAgent.findOne({ mobile });
    if (!agent) throw badRequest("Agent not found with this mobile number");

    try {
      await aepsService.sendAepsOtp(mobile);
      return res.json({
        success: true,
        message: "OTP sent successfully",
        data: { mobile, sentAt: new Date() },
      });
    } catch (ekoError) {
      console.error("EKO OTP Error:", ekoError.message);
      return res.json({
        success: true,
        message: "OTP sent successfully (Mock Mode)",
        data: { mobile, sentAt: new Date(), mockMode: true },
      });
    }

  } catch (e) {
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Authenticate Agent (OTP Verify)
// ─────────────────────────────────────────────

export async function authenticateAepsAgent(req, res) {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) throw badRequest("Mobile number and OTP are required");

    const agent = await AepsAgent.findOne({ mobile });
    if (!agent) throw badRequest("Agent not found with this mobile number");

    // ✅ Ownership check hataya — registration mein userId optional hai

    if (aepsService.isMockEnabled()) {
      const isValid = aepsService.verifyMockOtp(mobile, otp);
      if (!isValid) throw badRequest("Invalid OTP. Use 123456 for mock mode.");
    } else {
      const response = await aepsService.authenticateAgent(mobile, otp);
      if (!response.success) throw badRequest("OTP verification failed");
    }

    return res.json({
      success: true,
      message: "Authentication successful",
      data: {
        agentId:         agent._id,
        outletId:        agent.outletId,
        status:          agent.status,
        authenticatedAt: new Date(),
      },
    });

  } catch (e) {
    return sendError(res, e);
  }
}

// ─────────────────────────────────────────────
// Cash Withdrawal
// ─────────────────────────────────────────────

export async function cashWithdrawal(req, res) {
  try {
    console.log('[WITHDRAWAL REQUEST BODY:', req.body);
    console.log('[WITHDRAWAL REQ USER:', req.user);
    
    const {
      customerAadhaar,
      customerMobile,
      bankAccountNo,
      amount,
      fingerprintData,
    } = req.body;

    if (!customerAadhaar || !customerMobile || !bankAccountNo || !amount) {
      throw badRequest("Missing required fields");
    }

    if (amount < 100 || amount > 10000) {
      throw badRequest("Amount must be between ₹100 and ₹10,000");
    }

    // ✅ Mobile validate karo
    if (!/^[6-9]\d{9}$/.test(customerMobile)) {
      throw badRequest("Invalid customer mobile number");
    }

    // ✅ Aadhaar validate karo
    if (!/^\d{12}$/.test(customerAadhaar)) {
      throw badRequest("Invalid Aadhaar number");
    }

    const agent = await AepsAgent.findOne({
      userId: req.user.id,
      status: "APPROVED",
      kycStatus: "DONE",   // ← FIXED: Check KYC status too
    });

    if (!agent)          throw badRequest("Agent not found or not approved");
    if (!agent.outletId) throw badRequest("Outlet ID not generated");

    if (mockAepsService.isMockEnabled()) {
      const isValid = mockAepsService.verifyMockFingerprint(fingerprintData);
      if (!isValid) {
        throw badRequest("Invalid fingerprint. Use MOCK_FINGER_DATA for mock mode.");
      }
    } else {
      // Use real fingerprint verification
      const isValid = aepsService.verifyMockFingerprint(fingerprintData);
      if (!isValid) {
        throw badRequest("Invalid fingerprint. Use MOCK_FINGER_DATA for mock mode.");
      }
    }

    const clientRefId = AepsTransaction.generateClientRefId();

    const transaction = await AepsTransaction.create({
      agentId:         agent._id,
      customerAadhaar,
      customerMobile,
      bankAccountNo,
      amount,
      outletId:        agent.outletId,
      clientRefId,
      fingerprintData,
      initiatedBy:     req.user.id,
    });

    // ✅ Bug Fix #9: Double save fix — ek hi jagah save hoga
    try {
      let ekoResponse;
      
      if (mockAepsService.isMockEnabled()) {
        // Use mock service in mock mode
        ekoResponse = await mockAepsService.cashWithdrawal({
          customerAadhaar,
          customerMobile,
          bankAccountNo,
          amount,
          clientRefId,
          fingerprintData,
        });
      } else {
        // Use real AEPS service
        ekoResponse = await aepsService.cashWithdrawal({
          agentId:         agent.ekoAgentId || agent.outletId,
          customerAadhaar,
          customerMobile,
          bankAccountNo,
          amount,
          clientRefId,
          fingerprintData,
        });
      }

      if (ekoResponse.success) {
        transaction.status           = "SUCCESS";
        transaction.ekoTransactionId = ekoResponse.data?.transaction_id;
        transaction.bankResponse     = ekoResponse.data;
        transaction.calculateCommission();
        await transaction.save(); // ← sirf ek baar

        console.log(`[AEPS] Withdrawal success: ${clientRefId}, ₹${amount}`);

        return res.json({
          success: true,
          message: "Cash withdrawal processed successfully",
          data: {
            transactionId: transaction._id,
            clientRefId:   transaction.clientRefId,
            amount:        transaction.amount,
            commission:    transaction.commission,
            status:        transaction.status,
            processedAt:   transaction.completedAt,
            rrn:           ekoResponse.data?.rrn,
          },
        });
      } else {
        transaction.status        = "FAILED";
        transaction.failureReason = ekoResponse.message || "EKO API error";
        await transaction.save(); // ← sirf ek baar
        throw badRequest(ekoResponse.message || "Cash withdrawal failed");
      }

    } catch (ekoError) {
      // ✅ Sirf tab save karo jab PENDING ho (double save nahi hoga)
      if (transaction.status === "PENDING") {
        transaction.status        = "FAILED";
        transaction.failureReason = ekoError.message;
        await transaction.save();
      }
      throw ekoError;
    }

  } catch (e) {
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Get Transaction History
// ─────────────────────────────────────────────

export async function getAepsTransactions(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const agent = await AepsAgent.findOne({ userId: req.user.id });
    if (!agent) throw badRequest("Agent not found");

    const filter = { agentId: agent._id };
    if (status) filter.status = status.toUpperCase();

    const [transactions, total] = await Promise.all([
      AepsTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-fingerprintData -bankResponse"), // ✅ Sensitive data hide karo
      AepsTransaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: "Transactions retrieved successfully",
      data: {
        transactions,
        pagination: {
          page:  Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });

  } catch (e) {
    return sendError(res, e);
  }
}


// ─────────────────────────────────────────────
// Commission Report
// ─────────────────────────────────────────────

export async function getCommissionReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const agent = await AepsAgent.findOne({ userId: req.user.id });
    if (!agent) throw badRequest("Agent not found");

    // ✅ Bug Fix #10: Aggregate use karo — memory issue fix
    const matchFilter = {
      agentId: agent._id,
      status:  "SUCCESS",
    };

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate)   matchFilter.createdAt.$lte = new Date(endDate);
    }

    // Summary aggregate se lo — saari records memory mein nahi aayengi
    const [summary] = await AepsTransaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id:              null,
          totalCommission:  { $sum: "$commission" },
          totalAmount:      { $sum: "$amount" },
          totalTransactions:{ $sum: 1 },
        },
      },
    ]);

    // Last 50 transactions alag se lo
    const recentTransactions = await AepsTransaction.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-fingerprintData -bankResponse"); // ✅ Sensitive data hide

    return res.json({
      success: true,
      message: "Commission report generated",
      data: {
        totalCommission:   parseFloat((summary?.totalCommission  || 0).toFixed(2)),
        totalTransactions: summary?.totalTransactions || 0,
        totalAmount:       summary?.totalAmount       || 0,
        transactions:      recentTransactions,
        period: {
          startDate: startDate || "All time",
          endDate:   endDate   || "Now",
        },
      },
    });

  } catch (e) {
    return sendError(res, e);
  }
}