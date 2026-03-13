import axios from "axios";
import crypto from "crypto";
import https from "https";

import { getAuthHeaders } from "./bbps.service.js";

const httpsAgent =
  process.env.NODE_ENV !== "production"
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

function isMockEnabled() {
  // Read USE_PPI_MOCK from environment. Set to "true" in .env to use mock data
  // instead of calling the real Eko API (useful for local development/testing).
  return process.env.USE_PPI_MOCK === "true";
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getPpiBaseUrl() {
  // PPI DigiKhata APIs are under /ekoapi, BBPS in this repo is under /ekoicici
  const raw = String(process.env.EKO_PPI_BASE_URL || process.env.EKO_BASE_URL || "").trim();
  if (!raw) throw new Error("Missing env var: EKO_PPI_BASE_URL (or EKO_BASE_URL)");
  return raw.replace(/\/+$/, "");
}

function ekoPpiUrl(path) {
  const base = getPpiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function getCommonQuery() {
  const initiatorId = requiredEnv("EKO_INITIATOR_ID");
  const userCode = requiredEnv("EKO_USER_CODE");
  return { initiator_id: initiatorId, user_code: userCode };
}

// Very small in-memory store for mock mode only (resets on server restart)
const mockStore = {
  senders: new Map(), // customerId -> sender info
  recipients: new Map(), // customerId -> list
};

function ensureMockSender(customerId) {
  const id = String(customerId);
  if (!mockStore.senders.has(id)) {
    mockStore.senders.set(id, {
      customer_id: id,
      name: "",
      mobile: id,
      ppi_product: "DIGIKHATA",
      kyc_level: "MIN",
      monthly_limit: 25000,
      remaining_limit: 25000,
      message: "Sender profile",
    });
  }
  return mockStore.senders.get(id);
}

function ensureMockRecipients(customerId) {
  const id = String(customerId);
  if (!mockStore.recipients.has(id)) mockStore.recipients.set(id, []);
  return mockStore.recipients.get(id);
}

// -------------------- Sender APIs --------------------

export async function getSenderInformation({ customerId }) {
  if (isMockEnabled()) return ensureMockSender(customerId);

  const headers = getAuthHeaders();
  const url = ekoPpiUrl(`/v3/customer/profile/${encodeURIComponent(customerId)}/ppi-digikhata`);
  const res = await axios.get(url, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function onboardSender({ customerId, name, mobile, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId || mobile || "9999999999");
    if (name) sender.name = name;
    if (mobile) sender.mobile = mobile;
    sender.message = "Mock sender onboarded";
    return sender;
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact EKO endpoint + request body from docs
  const url = ekoPpiUrl(`/v3/customer/onboard/ppi-digikhata`);
  const body = { customer_id: customerId, name, mobile, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function verifyCustomerOtp({ customerId, otp, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    return { ...sender, otp_verified: String(otp) === "123456", message: "Mock OTP verified" };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact EKO endpoint + request body from docs
  const url = ekoPpiUrl(`/v3/customer/verify/otp/ppi-digikhata`);
  const body = { customer_id: customerId, otp, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function validateSenderAadhaar({ customerId, aadhaar, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    sender.kyc_level = "FULL";
    sender.message = "Mock Aadhaar validated";
    return { ...sender, aadhaar_validated: Boolean(aadhaar) };
  }

  const headers = getAuthHeaders();
  const url = ekoPpiUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/aadhaar`);
  const body = { aadhaar, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function validateSenderPan({ customerId, pan, extra = {} }) {
  if (isMockEnabled()) {
    const sender = ensureMockSender(customerId);
    sender.kyc_level = "FULL";
    sender.message = "Mock PAN validated";
    return { ...sender, pan_validated: Boolean(pan) };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact path for PAN API from docs (your pasted URL had aadhaar twice)
  const url = ekoPpiUrl(`/v3/customer/account/${encodeURIComponent(customerId)}/ppi-digikhata/pan`);
  const body = { pan, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

// -------------------- Recipient APIs --------------------

export async function getRecipients({ customerId }) {
  if (isMockEnabled()) {
    return { customer_id: String(customerId), recipients: ensureMockRecipients(customerId) };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact recipients list endpoint from docs
  const url = ekoPpiUrl(`/v3/customer/${encodeURIComponent(customerId)}/ppi-digikhata/recipients`);
  const res = await axios.get(url, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function addRecipient({ customerId, name, mobile, extra = {} }) {
  if (isMockEnabled()) {
    const list = ensureMockRecipients(customerId);
    const recipient = {
      recipient_id: `R_${crypto.randomUUID()}`,
      name,
      mobile,
      created_at: new Date().toISOString(),
      bank: null,
    };
    list.push(recipient);
    return { customer_id: String(customerId), recipient, message: "Mock recipient added" };
  }

  const headers = getAuthHeaders();
  const url = ekoPpiUrl(`/v3/customer/${encodeURIComponent(customerId)}/ppi-digikhata/recipients`);
  const body = { name, mobile, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function addRecipientBank({ customerId, recipientId, accountNumber, ifsc, extra = {} }) {
  if (isMockEnabled()) {
    const list = ensureMockRecipients(customerId);
    const r = list.find((x) => String(x.recipient_id) === String(recipientId));
    if (!r) return { success: false, message: "Recipient not found" };
    r.bank = { accountNumber, ifsc };
    return { customer_id: String(customerId), recipient: r, message: "Mock recipient bank added" };
  }

  const headers = getAuthHeaders();
  const url = ekoPpiUrl(
    `/v3/customer/${encodeURIComponent(customerId)}/ppi-digikhata/recipients/${encodeURIComponent(recipientId)}/bank`
  );
  const body = { account_number: accountNumber, ifsc, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

// -------------------- Transaction APIs --------------------

export async function sendTransactionOtp({ customerId, amount, extra = {} }) {
  if (isMockEnabled()) {
    return {
      customer_id: String(customerId),
      otp_ref_id: `OTP_${crypto.randomUUID()}`,
      amount,
      message: "Mock transaction OTP sent (use 123456)",
    };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact endpoint from docs
  const url = ekoPpiUrl(`/v3/customer/${encodeURIComponent(customerId)}/ppi-digikhata/transaction/otp`);
  const body = { amount, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function initiateTransaction({ customerId, recipientId, amount, otp, clientRefId, extra = {} }) {
  if (isMockEnabled()) {
    const providerRefId = `MOCK_${crypto.randomUUID()}`;
    const txStatus = amount > 5000 ? 2 : 0;
    return {
      provider: "MOCK",
      tx_status: txStatus,
      txstatus_desc: txStatus === 0 ? "Success" : "Initiated",
      client_ref_id: clientRefId,
      provider_ref_id: providerRefId,
      customer_id: String(customerId),
      recipient_id: String(recipientId),
      otp_used: String(otp) === "123456",
      message: "Mock PPI initiate response",
      ...extra,
    };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact transaction initiate endpoint from docs
  const url = ekoPpiUrl(`/v3/customer/${encodeURIComponent(customerId)}/ppi-digikhata/transaction`);
  const body = { recipient_id: recipientId, amount, otp, client_ref_id: clientRefId, ...extra };
  const res = await axios.post(url, body, { headers, params: getCommonQuery(), timeout: 20000, httpsAgent });
  return res.data;
}

export async function transactionInquiry({ clientRefId }) {
  if (isMockEnabled()) {
    return {
      client_ref_id: clientRefId,
      tx_status: 0,
      txstatus_desc: "Success",
      message: "Mock inquiry result",
    };
  }

  const headers = getAuthHeaders();
  // TODO: confirm exact inquiry endpoint from docs
  const url = ekoPpiUrl(`/v3/transactions/inquiry`);
  const res = await axios.get(url, { headers, params: { ...getCommonQuery(), client_ref_id: clientRefId }, timeout: 20000, httpsAgent });
  return res.data;
}

// -------------------- Backward-compatible wrappers --------------------

export async function createPpiTransaction({ senderMobile, recipientAccount, amount, clientRefId, description }) {
  // Demo wrapper (UI uses mobile/account instead of customerId/recipientId)
  return initiateTransaction({
    customerId: senderMobile,
    recipientId: recipientAccount,
    amount,
    otp: "123456",
    clientRefId,
    extra: { description },
  });
}

export async function getPpiTransactionStatus({ providerRefId }) {
  // In real EKO integration, inquiry is usually done via client_ref_id.
  if (isMockEnabled()) {
    return {
      provider: "MOCK",
      provider_ref_id: providerRefId,
      tx_status: 0,
      txstatus_desc: "Success",
      message: "Mock status response",
    };
  }

  const headers = getAuthHeaders();
  const url = ekoPpiUrl(`/v3/transactions/${encodeURIComponent(providerRefId)}/status`);
  const res = await axios.get(url, { headers, params: getCommonQuery(), timeout: 15000, httpsAgent });
  return res.data;
}

