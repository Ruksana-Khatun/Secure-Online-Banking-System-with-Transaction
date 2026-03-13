// ✅ Eko Sandbox – PPI DigiKhata step-by-step test
// Tests: getSenderInfo → onboardSender → getRecipients
// Run with: node backend/scripts/test-ppi.mjs

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

// ─── Credentials (from .env) ──────────────────────────────────────────────────
const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;
const userCode     = process.env.EKO_USER_CODE || initiatorId;
const BASE_URL     = (process.env.EKO_PPI_BASE_URL || 'https://staging.eko.in:25004/ekoapi').replace(/\/+$/, '');

// Bypass expired staging SSL cert
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Helper: build auth headers (same logic as bbps.service.js) ───────────────
function makeHeaders() {
  const timestamp  = Date.now().toString();
  const encodedKey = Buffer.from(authKey).toString('base64'); // ← must base64 encode first
  const secretKey  = crypto.createHmac('sha256', encodedKey).update(timestamp).digest('base64');
  return {
    developer_key:          developerKey,
    'secret-key':           secretKey,
    'secret-key-timestamp': timestamp,
    'Content-Type':         'application/json',
    Accept:                 'application/json',
  };
}

const commonParams = { initiator_id: initiatorId, user_code: userCode };

// ─── Test mobile number ───────────────────────────────────────────────────────
const testMobile = process.argv[2] || initiatorId; // pass as CLI arg e.g. node test-ppi.mjs 9876543210

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Eko PPI DigiKhata – Sandbox Test');
  console.log(`  Customer / Mobile: ${testMobile}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Get Sender Information ──────────────────────────────────────────────
  console.log('📦 Step 1: GET sender profile...');
  try {
    const url = `${BASE_URL}/v3/customer/profile/${encodeURIComponent(testMobile)}/ppi-digikhata`;
    const res = await axios.get(url, { headers: makeHeaders(), params: commonParams, httpsAgent });
    console.log('✅ Sender Info:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Sender Info Error:', err.response?.status, JSON.stringify(err.response?.data));
  }

  console.log('\n───────────────────────────────────────────────────────');

  // ── 2. Onboard Sender ──────────────────────────────────────────────────────
  console.log('📦 Step 2: POST onboard sender...');
  try {
    const url  = `${BASE_URL}/v3/customer/onboard/ppi-digikhata`;
    const body = { customer_id: testMobile, name: 'Test User', mobile: testMobile };
    const res  = await axios.post(url, body, { headers: makeHeaders(), params: commonParams, httpsAgent });
    console.log('✅ Onboard Response:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Onboard Error:', err.response?.status, JSON.stringify(err.response?.data));
  }

  console.log('\n───────────────────────────────────────────────────────');

  // ── 3. Get Recipients ──────────────────────────────────────────────────────
  console.log('📦 Step 3: GET recipients...');
  try {
    const url = `${BASE_URL}/v3/customer/${encodeURIComponent(testMobile)}/ppi-digikhata/recipients`;
    const res = await axios.get(url, { headers: makeHeaders(), params: commonParams, httpsAgent });
    console.log('✅ Recipients:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Recipients Error:', err.response?.status, JSON.stringify(err.response?.data));
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Done!');
  console.log('═══════════════════════════════════════════════════════');
}

run();
