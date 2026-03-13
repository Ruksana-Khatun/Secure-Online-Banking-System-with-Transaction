// Quick debug: print full Eko response for sender info
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;
const userCode     = process.env.EKO_USER_CODE || initiatorId;
const BASE_URL     = (process.env.EKO_PPI_BASE_URL || 'https://staging.eko.in:25004/ekoapi').replace(/\/+$/, '');

console.log('Credentials loaded:');
console.log('  developerKey:', developerKey ? `${developerKey.slice(0,8)}...` : '❌ MISSING');
console.log('  authKey:', authKey ? `${authKey.slice(0,8)}...` : '❌ MISSING');
console.log('  initiatorId:', initiatorId || '❌ MISSING');
console.log('  userCode:', userCode || '❌ MISSING');
console.log('  BASE_URL:', BASE_URL);
console.log('');

if (!developerKey || !authKey || !initiatorId) {
  console.error('❌ Missing credentials in .env — please add EKO_DEVELOPER_KEY, EKO_AUTH_KEY, EKO_INITIATOR_ID');
  process.exit(1);
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function makeHeaders() {
  const timestamp  = Date.now().toString();
  const secretKey  = crypto.createHmac('sha256', Buffer.from(authKey)).update(timestamp).digest('base64');
  return {
    developer_key:          developerKey,
    'secret-key':           secretKey,
    'secret-key-timestamp': timestamp,
    'Content-Type':         'application/json',
    Accept:                 'application/json',
  };
}

const testMobile = process.argv[2] || initiatorId;
console.log('Testing with customer mobile:', testMobile);

// Test 1: Get Sender Info
try {
  const url = `${BASE_URL}/v3/customer/profile/${encodeURIComponent(testMobile)}/ppi-digikhata`;
  console.log('\n[GET Sender Info]', url);
  const res = await axios.get(url, {
    headers: makeHeaders(),
    params: { initiator_id: initiatorId, user_code: userCode },
    httpsAgent,
    timeout: 20000,
  });
  console.log('✅ Status:', res.status);
  console.log('✅ Body:', JSON.stringify(res.data, null, 2));
} catch (err) {
  console.error('❌ Status:', err.response?.status);
  console.error('❌ Full Error Body:', JSON.stringify(err.response?.data, null, 2) || err.message);
  console.error('❌ Request URL:', err.config?.url);
  console.error('❌ Request Params:', err.config?.params);
  console.error('❌ Request Headers (sanitized):', { ...err.config?.headers, 'secret-key': '***' });
}
