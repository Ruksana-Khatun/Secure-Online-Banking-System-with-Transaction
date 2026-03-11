import axios from "axios";
import crypto from "crypto";
import https from "https";

const httpsAgent =
  process.env.NODE_ENV !== "production"
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

const AXIOS_TIMEOUT_MS = Number(process.env.EKO_TIMEOUT_MS || 20000);
const MAX_RETRIES = Number(process.env.EKO_RETRIES || 2);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(err) {
  const status = err?.response?.status;
  // Network / timeout / DNS etc: no response
  if (!status) return true;
  // EKO sometimes throws transient 5xx (their logs show DB connection closed)
  return status >= 500 && status <= 599;
}

async function withRetries(fn, { retries = MAX_RETRIES } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !isRetryableError(err)) throw err;
      // Exponential backoff with small jitter
      const backoff = Math.min(250 * 2 ** (attempt - 1), 2000) + Math.floor(Math.random() * 100);
      await sleep(backoff);
    }
  }
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getEkoBase() {
  const raw = requiredEnv("EKO_BASE_URL").replace(/\/+$/, "");
  return raw;
}

function ekoUrl(path) {
  const base = getEkoBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getAuthHeaders() {
  const developerKey = requiredEnv("EKO_DEVELOPER_KEY");
  const authKey = requiredEnv("EKO_AUTH_KEY"); // ← AUTH_KEY
  const timestamp = Date.now().toString();
  const encodedKey = Buffer.from(authKey).toString("base64"); // ← AUTH_KEY
  const secretKey = crypto
    .createHmac("sha256", encodedKey)
    .update(timestamp)
    .digest("base64");

  return {
    developer_key: developerKey,
    "secret-key": secretKey,
    "secret-key-timestamp": timestamp,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function getFormHeaders() {
  return { 
    ...getAuthHeaders(), 
    "Content-Type": "application/x-www-form-urlencoded" 
  };
}

function getRequestHash({ secretKeyTimestamp, utilityAccNo, amount, userCode }) {
  const authKey = requiredEnv("EKO_AUTH_KEY"); // ← AUTH_KEY
  const encodedKey = Buffer.from(authKey).toString("base64"); // ← AUTH_KEY
  const concatenated = `${secretKeyTimestamp}${utilityAccNo}${amount}${userCode}`;
  return crypto
    .createHmac("sha256", encodedKey)
    .update(concatenated)
    .digest("base64");
}

function withAuth() {
  const h = getAuthHeaders();
  return { headers: h, secretKeyTimestamp: h["secret-key-timestamp"] };
}

export async function activateBBPS({ latlong }) {
  const initiatorId = requiredEnv("EKO_INITIATOR_ID");
  const userCode = requiredEnv("EKO_USER_CODE");

  const headers = getFormHeaders();
  const body = new URLSearchParams({
    service_code: "53",
    initiator_id: initiatorId,
    user_code: userCode,
    latlong: latlong || process.env.EKO_LATLONG || "0,0",
  });

  const url = ekoUrl("/v1/user/service/activate");
  const res = await withRetries(
    () => axios.put(url, body, { headers, httpsAgent, timeout: AXIOS_TIMEOUT_MS }),
    { retries: MAX_RETRIES }
  );
  return res.data;
}

export async function getCategories() {
  const { headers } = withAuth();
  const url = ekoUrl("/v2/billpayments/operators_category");
  const res = await withRetries(
    () => axios.get(url, { headers, httpsAgent, timeout: AXIOS_TIMEOUT_MS }),
    { retries: MAX_RETRIES }
  );
  return res.data;
}

export async function getOperators(categoryId) {
  const { headers } = withAuth();
  const url = ekoUrl("/v2/billpayments/operators");
  const res = await withRetries(
    () =>
      axios.get(url, {
        headers,
        params: { category: categoryId },
        httpsAgent,
        timeout: AXIOS_TIMEOUT_MS,
      }),
    { retries: MAX_RETRIES }
  );
  return res.data;
}

export async function fetchBill({ 
  billerId, utilityAccNo, customerMobile, 
  senderName, latlong, hcChannel, clientRefId, amount
}) {
  const initiatorId = requiredEnv("EKO_INITIATOR_ID");
  const userCode = requiredEnv("EKO_USER_CODE");
  const { headers } = withAuth();
  const refId = clientRefId || `BBPS_${Date.now()}`;

  const body = {
    source_ip: "127.0.0.1",
    user_code: userCode,
    client_ref_id: refId,
    utility_acc_no: utilityAccNo,
    confirmation_mobile_no: customerMobile,
    sender_name: senderName || "Customer",
    operator_id: String(billerId),
    ...(amount !== undefined && amount !== null && String(amount).trim() !== ""
      ? { amount: String(amount) }
      : {}),
    latlong: latlong || process.env.EKO_LATLONG || "0,0",
    ...(hcChannel !== undefined ? { hc_channel: String(hcChannel) } : {}),
  };

  const url = ekoUrl(
    `/v2/billpayments/fetchbill?initiator_id=${encodeURIComponent(initiatorId)}`
  );
  const res = await withRetries(
    () => axios.post(url, body, { headers, httpsAgent, timeout: AXIOS_TIMEOUT_MS }),
    { retries: MAX_RETRIES }
  );
  return { clientRefId: refId, data: res.data };
}

export async function payBill({ 
  billerId, utilityAccNo, customerMobile, 
  amount, senderName, latlong, hcChannel, clientRefId
}) {
  const initiatorId = requiredEnv("EKO_INITIATOR_ID");
  const userCode = requiredEnv("EKO_USER_CODE");
  const { headers, secretKeyTimestamp } = withAuth();
  const refId = clientRefId || `BBPS_${Date.now()}`;

  const requestHash = getRequestHash({
    secretKeyTimestamp,
    utilityAccNo,
    amount: String(amount),
    userCode,
  });

  const payHeaders = { ...headers, request_hash: requestHash };

  const body = {
    source_ip: "127.0.0.1",
    user_code: userCode,
    amount: String(amount),
    client_ref_id: refId,
    utility_acc_no: utilityAccNo,
    confirmation_mobile_no: customerMobile,
    sender_name: senderName || "Customer",
    operator_id: String(billerId),
    latlong: latlong || process.env.EKO_LATLONG || "0,0",
    ...(hcChannel !== undefined ? { hc_channel: String(hcChannel) } : {}),
  };

  const url = ekoUrl(
    `/v2/billpayments/paybill?initiator_id=${encodeURIComponent(initiatorId)}`
  );
  const res = await withRetries(
    () =>
      axios.post(url, body, { headers: payHeaders, httpsAgent, timeout: AXIOS_TIMEOUT_MS }),
    { retries: MAX_RETRIES }
  );
  return { clientRefId: refId, data: res.data };
}