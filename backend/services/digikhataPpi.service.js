import axios from "axios";
import crypto from "crypto";
import https from "https";
import { getAuthHeaders } from "./bbps.service.js"; // ✅ Now safe to import — bbps is fixed

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ✅ Same correct base URL
function getBase() {
  return process.env.NODE_ENV === "production"
    ? "https://api.eko.in:25002/ekoapi"
    : "https://staging.eko.in:25004/ekoapi";
}

function ekoUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBase()}${cleanPath}`;
}

function getCommonParams() {
  const initiatorId = process.env.EKO_INITIATOR_ID;
  const userCode = process.env.EKO_USER_CODE;
  if (!initiatorId) throw new Error("Missing env: EKO_INITIATOR_ID");
  if (!userCode) throw new Error("Missing env: EKO_USER_CODE");
  return { initiator_id: initiatorId, user_code: userCode };
}

function isMockEnabled() {
  return process.env.USE_PPI_MOCK === "true";
}

// ─────────────────────────────────────────────
// Mock store (dev only)
// ─────────────────────────────────────────────
const mockStore = {
  senders: new Map(),
  recipients: new Map(),
};

function ensureMockSender(customerId) {
  const id = String(customerId);
  if (!mockStore.senders.has(id)) {
    mockStore.senders.set(id, {
      customer_id: id,
      name: "",
      mobile: id,
      kyc_level: "MIN",
      monthly_limit: 25000,
      remaining_limit: 25000,
    });
  }
  return mockStore.senders.get(id);
}

function ensureMockRecipients(customerId) {
  const id = String(customerId);
  if (!mockStore.recipients.has(id)) mockStore.recipients.set(id, []);
  return mockStore.recipients.get(id);
}

// ═════════════════════════════════════════════
// SENDER APIs
// ═════════════════════════════════════════════

export async function getSenderInformation({ customerId }) {
  if (isMockEnabled()) return ensureMockSender(customerId);

  const url = ekoUrl(`/v3/customer/profile/${encodeURIComponent(customerId)}/ppi-digikhata`);
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

export async function onboardSender({ customerId, name, mobile, dob, residence_address, extra = {} }) {
  console.log(`[PPI Service] Onboarding sender: ${customerId}, name: ${name}, mobile: ${mobile}`);
  
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    sender.name = name || sender.name;
    sender.mobile = mobile || sender.mobile;
    console.log(`[PPI Service] Mock sender onboarded: ${customerId}`);
    return { ...sender, message: "Mock sender onboarded" };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata`);
  const body = {
    initiator_id: process.env.EKO_INITIATOR_ID,
    name,
    mobile,
    dob,
    residence_address,
    ...extra,
  };
  
  console.log(`[PPI Service] Sending onboarding request to EKO for: ${customerId}`);
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  
  console.log(`[PPI Service] Onboarding response for ${customerId}:`, res.data);
  return res.data;
}

export async function verifyCustomerOtp({ customerId, otp, otpRefId, extra = {} }) {
  if (isMockEnabled()) {
    return {
      ...ensureMockSender(customerId),
      otp_verified: String(otp) === "123456",
      message: "Mock OTP verified",
    };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/otp/verify`);
  const body = {
    initiator_id: process.env.EKO_INITIATOR_ID,
    otp,
    otp_ref_id: otpRefId,
    ...extra,
  };
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

export async function validateSenderAadhaar({ customerId, aadhaar, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    sender.kyc_level = "FULL";
    return { ...sender, message: "Mock Aadhaar validated" };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/aadhaar`);
  const body = { initiator_id: process.env.EKO_INITIATOR_ID, aadhaar, ...extra };
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

export async function validateSenderPan({ customerId, pan, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    sender.kyc_level = "FULL";
    return { ...sender, message: "Mock PAN validated" };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/pan`);
  const body = { initiator_id: process.env.EKO_INITIATOR_ID, pan, ...extra };
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

// ═════════════════════════════════════════════
// RECIPIENT APIs
// ═════════════════════════════════════════════

export async function getRecipients({ customerId }) {
  if (isMockEnabled()) {
    return { customer_id: String(customerId), recipients: ensureMockRecipients(customerId) };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/recipients`);
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

export async function addRecipient({ customerId, name, mobile, extra = {} }) {
  if (isMockEnabled()) {
    const list = ensureMockRecipients(customerId);
    const recipient = { recipient_id: `R_${crypto.randomUUID()}`, name, mobile, bank: null };
    list.push(recipient);
    return { customer_id: String(customerId), recipient, message: "Mock recipient added" };
  }

  const url = ekoUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/recipients`);
  const body = { initiator_id: process.env.EKO_INITIATOR_ID, name, mobile, ...extra };
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

export async function addRecipientBank({ customerId, recipientId, accountNumber, ifsc, extra = {} }) {
  if (isMockEnabled()) {
    const list = ensureMockRecipients(customerId);
    const r = list.find((x) => String(x.recipient_id) === String(recipientId));
    if (!r) return { success: false, message: "Recipient not found" };
    r.bank = { accountNumber, ifsc };
    return { customer_id: String(customerId), recipient: r, message: "Mock bank added" };
  }

  const url = ekoUrl(
    `/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/recipients/${encodeURIComponent(recipientId)}/bank`
  );
  const body = {
    initiator_id: process.env.EKO_INITIATOR_ID,
    account_number: accountNumber,
    ifsc,
    ...extra,
  };
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

// ═════════════════════════════════════════════
// TRANSACTION APIs
// ═════════════════════════════════════════════

export async function sendTransactionOtp({ customerId, amount, extra = {} }) {
  console.log(`[PPI Service] Sending OTP for transaction: ${customerId}, amount: ${amount}`);
  
  if (isMockEnabled()) {
    return {
      customer_id: String(customerId),
      otp_ref_id: `OTP_${crypto.randomUUID()}`,
      amount,
      message: "Mock OTP sent — use 123456 for testing",
    };
  }

  const url = ekoUrl(
    `/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/transaction/otp`
  );
  const body = { initiator_id: process.env.EKO_INITIATOR_ID, amount, ...extra };
  
  console.log(`[PPI Service] Sending OTP request to EKO for: ${customerId}`);
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  
  console.log(`[PPI Service] OTP response for ${customerId}:`, res.data);
  return res.data;
}

export async function initiateTransaction({
  customerId, recipientId, amount, otp, otpRefId, clientRefId, extra = {},
}) {
  console.log(`[PPI Service] Initiating transaction: ${customerId} -> ${recipientId}, amount: ${amount}`);
  
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    const txStatus = amount > 1000000 ? 2 : 0; // 2 = Initiated (Pending), 0 = Success
    
    if (txStatus === 0) {
      sender.remaining_limit -= amount;
      console.log(`[PPI Service] Mock transaction successful: ${customerId}, new balance: ${sender.remaining_limit}`);
    } else {
      console.log(`[PPI Service] Mock transaction pending: ${customerId}, amount: ${amount}`);
    }

    return {
      tx_status: txStatus,
      txstatus_desc: txStatus === 0 ? "Success" : "Initiated",
      client_ref_id: clientRefId,
      provider_ref_id: `MOCK_${crypto.randomUUID()}`,
      message: "Mock PPI transaction",
    };
  }

  const url = ekoUrl(
    `/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/transaction`
  );
  const body = {
    initiator_id: process.env.EKO_INITIATOR_ID,
    recipient_id: recipientId,
    amount,
    otp,
    otp_ref_id: otpRefId,
    client_ref_id: clientRefId,
    ...extra,
  };
  
  console.log(`[PPI Service] Sending transaction request to EKO for: ${customerId}`);
  const res = await axios.post(url, body, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  
  console.log(`[PPI Service] Transaction response for ${customerId}:`, res.data);
  return res.data;
}

export async function transactionInquiry({ clientRefId }) {
  if (isMockEnabled()) {
    // In mock mode, inquiry always moves from Pending to Success
    return { client_ref_id: clientRefId, tx_status: 0, txstatus_desc: "Success" };
  }

  const url = ekoUrl(`/v2/transaction/${encodeURIComponent(clientRefId)}`);
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
    params: getCommonParams(),
    timeout: 20000,
    httpsAgent,
  });
  return res.data;
}

// ─────────────────────────────────────────────
// Backward-compatible wrappers
// ─────────────────────────────────────────────
export async function createPpiTransaction({ senderMobile, recipientAccount, amount, clientRefId, description }) {
  return initiateTransaction({
    customerId: senderMobile,
    recipientId: recipientAccount,
    amount,
    otp: "123456",
    clientRefId,
    extra: { description },
  });
}

export async function getPpiTransactionStatus({ clientRefId }) {
  return transactionInquiry({ clientRefId });
}