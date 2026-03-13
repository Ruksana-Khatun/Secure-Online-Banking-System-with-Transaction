// ✅ Corrected Eko Sandbox – test paybill API
// Run with: node backend/scripts/test-paybill.mjs

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

// ─── Credentials (reads from .env) ───────────────────────────────────────────
const developerKey  = process.env.EKO_DEVELOPER_KEY;   // your clientId
const authKey       = process.env.EKO_AUTH_KEY;        // your clientSecret
const initiatorId   = process.env.EKO_INITIATOR_ID;
const userCode      = process.env.EKO_USER_CODE || initiatorId; // fallback

// ─── Auth headers (matches bbps.service.js exactly) ──────────────────────────
const timestamp  = Date.now().toString();
const encodedKey = Buffer.from(authKey).toString('base64'); // ← IMPORTANT: base64 first
const secretKey  = crypto.createHmac('sha256', encodedKey).update(timestamp).digest('base64');

// ─── Payload (correct Eko field names) ───────────────────────────────────────
const utilityAccNo = '9999999999';   // bill account / consumer number
const amount       = '100';
const clientRefId  = `TEST_${Date.now()}`;

const payload = {
  source_ip:              '127.0.0.1',
  user_code:              userCode,
  amount:                 amount,
  client_ref_id:          clientRefId,
  utility_acc_no:         utilityAccNo,
  confirmation_mobile_no: '9999999999',
  sender_name:            'Test User',
  operator_id:            '3',        // ← get real operator_id from /operators endpoint
  latlong:                process.env.EKO_LATLONG || '0,0',
};

// ─── request_hash (HMAC of timestamp+utilityAccNo+amount+userCode) ────────────
const requestHash = crypto
  .createHmac('sha256', encodedKey)
  .update(`${timestamp}${utilityAccNo}${amount}${userCode}`)
  .digest('base64');

const headers = {
  developer_key:          developerKey,
  'secret-key':           secretKey,
  'secret-key-timestamp': timestamp,
  request_hash:           requestHash,
  'Content-Type':         'application/json',
  Accept:                 'application/json',
};

const url = `https://staging.eko.in:25004/ekoicici/v2/billpayments/paybill?initiator_id=${encodeURIComponent(initiatorId)}`;

// Bypass expired staging SSL cert
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

console.log('📤 Sending to:', url);
console.log('📋 Payload:', payload);
console.log('🔑 Headers (sanitized):', { ...headers, 'secret-key': '***' });

axios.post(url, payload, { headers, httpsAgent })
  .then(res => {
    console.log('\n✅ Sandbox Response:');
    console.log(JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
    console.error('\n❌ Error Status:', err.response?.status);
    console.error('❌ Error Body:', JSON.stringify(err.response?.data, null, 2) || err.message);
  });
