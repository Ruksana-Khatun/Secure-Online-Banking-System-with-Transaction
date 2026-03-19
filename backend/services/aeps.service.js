import axios from "axios";
import crypto from "crypto";

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const EKO_BASE_URL  = process.env.EKO_BASE_URL  || "https://staging.eko.in:25004";
const INITIATOR_ID  = process.env.INITIATOR_ID;
const DEVELOPER_KEY = process.env.DEVELOPER_KEY;

const isMockEnabled = () => process.env.USE_AEPS_MOCK === "true";

// ✅ Bug Fix #1: Startup pe env check
if (!isMockEnabled() && (!INITIATOR_ID || !DEVELOPER_KEY)) {
  throw new Error(
    "Missing env variables: INITIATOR_ID and DEVELOPER_KEY are required in .env"
  );
}

// ─────────────────────────────────────────────
// Hash Generator
// ─────────────────────────────────────────────

function generateHash(data) {
  const sortedKeys = Object.keys(data).sort();

  // ✅ Bug Fix #2: undefined/null values filter karo
  const queryString = sortedKeys
    .filter(key => data[key] !== undefined && data[key] !== null)
    .map(key => `${key}=${data[key]}`)
    .join("&");

  const hashString = queryString + DEVELOPER_KEY;
  return crypto.createHash("sha256").update(hashString).digest("hex");
}

// ─────────────────────────────────────────────
// Core API Caller
// ─────────────────────────────────────────────

async function makeEkoApiCall(endpoint, data) {
  if (isMockEnabled()) {
    return mockEkoResponse(endpoint, data);
  }

  try {
    const hash = generateHash(data);
    const payload = {
      initiator_id: INITIATOR_ID,
      hash,
      ...data,
    };

    const response = await axios.post(
      `${EKO_BASE_URL}${endpoint}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Accept":        "application/json",
        },
        timeout: 60000, // ✅ Bug Fix #5: 60s for bank APIs
      }
    );

    return response.data;
  } catch (error) {
    console.error("EKO API Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "EKO API call failed");
  }
}

// ─────────────────────────────────────────────
// Mock Responses
// ─────────────────────────────────────────────

function mockEkoResponse(endpoint, data) {
  // ✅ Warning Fix: Aadhaar wala data production logs mein print mat karo
  console.log(`[AEPS Mock] Endpoint: ${endpoint}`);

  switch (endpoint) {
    case "/ekoapi/v2/aeps/agent/activate":
      return {
        success: true,
        message: "Agent activated successfully",
        data: {
          agent_id:     `AGENT_${Date.now()}`,
          status:       "APPROVED",
          reference_id: `REF_${Date.now()}`,
        },
      };

    case "/ekoapi/v2/aeps/send-otp":       // ✅ Bug Fix #3: Alag endpoint
      return {
        success: true,
        message: "OTP sent successfully",
        data: { mobile: data.mobile, sent_at: new Date().toISOString() },
      };

    case "/ekoapi/v2/aeps/authenticate":
      return {
        success: true,
        message: "Authentication successful",
        data: {
          authenticated: true,
          token:         `MOCK_TOKEN_${Date.now()}`,
          expires_in:    3600,
        },
      };

    case "/ekoapi/v2/aeps/cash-withdrawal":
      return {
        success: true,
        message: "Cash withdrawal processed successfully",
        data: {
          transaction_id: `TXN_${Date.now()}`,
          status:         "SUCCESS",
          amount:         data.amount,
          commission:     parseFloat((data.amount * 0.02).toFixed(2)),
          reference_id:   data.client_ref_id,
        },
      };

    case "/ekoapi/v2/aeps/balance-enquiry": // ✅ Bug Fix #4: Missing case add kiya
      return {
        success: true,
        message: "Balance retrieved successfully",
        data: {
          balance:        `₹${(Math.random() * 50000).toFixed(2)}`,
          transaction_id: `BAL_${Date.now()}`,
          reference_id:   data.client_ref_id,
        },
      };

    case "/ekoapi/v2/aeps/transaction/status":
      return {
        success: true,
        message: "Transaction status retrieved",
        data: {
          transaction_id: data.transaction_id,
          status:         "SUCCESS",
          processed_at:   new Date().toISOString(),
        },
      };

    default:
      console.warn(`[AEPS Mock] Unknown endpoint: ${endpoint}`);
      return { success: false, message: `Unknown endpoint: ${endpoint}` };
  }
}

// ─────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────

export async function activateAgent(agentData) {
  const payload = {
    first_name:      agentData.firstName,
    last_name:       agentData.lastName,
    mobile:          agentData.mobile,
    email:           agentData.email,
    pan_number:      agentData.panNumber,
    aadhaar_number:  agentData.aadhaarNumber,
    bank_account_no: agentData.bankAccountNo,
    ifsc_code:       agentData.ifscCode,
    bank_name:       agentData.companyBankName,
    state:           agentData.state,
    city:            agentData.city,
    pincode:         agentData.pincode,
    shop_name:       agentData.shopName,
    gst_number:      agentData.gstNumber || "",
    outlet_id:       agentData.outletId,
    action:          "ACTIVATE",
  };

  return await makeEkoApiCall("/ekoapi/v2/aeps/agent/activate", payload);
}

// ✅ Warning Fix: registerAgent hataya — dead code tha, activateAgent hi use hota hai

export async function sendAepsOtp(mobile) {
  // ✅ Bug Fix #3: Alag endpoint
  return await makeEkoApiCall("/ekoapi/v2/aeps/send-otp", {
    mobile,
    action: "SEND_OTP",
  });
}

export async function authenticateAgent(mobile, otp) {
  return await makeEkoApiCall("/ekoapi/v2/aeps/authenticate", {
    mobile,
    otp,
    action: "AUTHENTICATE",
  });
}

export async function cashWithdrawal(withdrawalData) {
  const payload = {
    agent_id:         withdrawalData.agentId,
    customer_aadhaar: withdrawalData.customerAadhaar,
    customer_mobile:  withdrawalData.customerMobile,
    bank_account_no:  withdrawalData.bankAccountNo,
    amount:           withdrawalData.amount,
    client_ref_id:    withdrawalData.clientRefId,
    fingerprint_data: withdrawalData.fingerprintData,
    transaction_type: "CASH_WITHDRAWAL",
  };

  return await makeEkoApiCall("/ekoapi/v2/aeps/cash-withdrawal", payload);
}

export async function balanceEnquiry(enquiryData) {
  const payload = {
    agent_id:         enquiryData.agentId,
    customer_aadhaar: enquiryData.customerAadhaar,
    customer_mobile:  enquiryData.customerMobile,
    bank_account_no:  enquiryData.bankAccountNo,
    client_ref_id:    enquiryData.clientRefId,
    fingerprint_data: enquiryData.fingerprintData,
    transaction_type: "BALANCE_ENQUIRY",
  };

  return await makeEkoApiCall("/ekoapi/v2/aeps/balance-enquiry", payload);
}

export async function getTransactionStatus(transactionId) {
  return await makeEkoApiCall("/ekoapi/v2/aeps/transaction/status", {
    transaction_id: transactionId,
  });
}

export function verifyMockOtp(mobile, otp) {
  return otp === "123456";
}

export function verifyMockFingerprint(fingerprintData) {
  return fingerprintData === "MOCK_FINGER_DATA";
}

export default {
  activateAgent,
  sendAepsOtp,
  authenticateAgent,
  cashWithdrawal,
  balanceEnquiry,
  getTransactionStatus,
  verifyMockOtp,
  verifyMockFingerprint,
  isMockEnabled,
};