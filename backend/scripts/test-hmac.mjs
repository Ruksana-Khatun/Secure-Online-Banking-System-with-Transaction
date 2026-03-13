// Debug script for BBPS HMAC theory
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;
const BASE_URL     = (process.env.EKO_BASE_URL || 'https://staging.eko.in:25004/ekoicici').replace(/\/+$/, '');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testHMAC(label, secretKeyFunc) {
  try {
    const timestamp = Date.now().toString();
    const secretKey = secretKeyFunc(authKey, timestamp);
    const url = `${BASE_URL}/v2/billpayments/operators_category`;
    
    console.log(`\n--- Testing ${label} ---`);
    const headers = {
      developer_key: developerKey,
      'secret-key': secretKey,
      'secret-key-timestamp': timestamp,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res = await axios.get(url, {
      headers,
      params: { initiator_id: initiatorId },
      httpsAgent,
      timeout: 5000
    });
    console.log(`✅ Success with ${label}!`);
    console.log(`✅ Status: ${res.status}`);
  } catch (err) {
    console.log(`❌ Fail with ${label}`);
    console.log(`   Status: ${err.response?.status}`);
    console.log(`   Body: ${JSON.stringify(err.response?.data)}`);
  }
}

// Method 1: Base64 encode the authKey BEFORE using it as HMAC key
const method1 = (key, ts) => {
  const encoded = Buffer.from(key).toString('base64');
  return crypto.createHmac('sha256', encoded).update(ts).digest('base64');
};

// Method 2: Use raw authKey as HMAC key
const method2 = (key, ts) => {
  return crypto.createHmac('sha256', Buffer.from(key)).update(ts).digest('base64');
};

// Method 3: Use raw authKey string directly
const method3 = (key, ts) => {
  return crypto.createHmac('sha256', key).update(ts).digest('base64');
};

async function run() {
  await testHMAC("Method 1: Base64(Key) -> HMAC", method1);
  await testHMAC("Method 2: Raw Buffer(Key) -> HMAC", method2);
  await testHMAC("Method 3: Raw String Key -> HMAC", method3);
}

run();
