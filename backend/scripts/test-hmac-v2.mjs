// Comprehensive Eko HMAC test
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
    const secretKey = secretKeyFunc(authKey, developerKey, timestamp);
    const url = `${BASE_URL}/v2/billpayments/operators_category`;
    
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
    return true;
  } catch (err) {
    process.stdout.write('.'); // just a dot for failure
    return false;
  }
}

const method1 = (k, d, ts) => crypto.createHmac('sha256', Buffer.from(k).toString('base64')).update(ts).digest('base64');
const method2 = (k, d, ts) => crypto.createHmac('sha256', k).update(ts).digest('base64');
const method3 = (k, d, ts) => crypto.createHmac('sha256', Buffer.from(k).toString('base64')).update(d + ts).digest('base64');
const method4 = (k, d, ts) => crypto.createHmac('sha256', k).update(d + ts).digest('base64');
const method5 = (k, d, ts) => crypto.createHmac('sha1', Buffer.from(k).toString('base64')).update(ts).digest('base64');
const method6 = (k, d, ts) => crypto.createHmac('sha1', k).update(ts).digest('base64');

async function run() {
  console.log('Running HMAC tests...');
  const tests = [
    { label: "SHA256, Base64(Key), TS", fn: method1 },
    { label: "SHA256, Raw Key, TS", fn: method2 },
    { label: "SHA256, Base64(Key), DevKey + TS", fn: method3 },
    { label: "SHA256, Raw Key, DevKey + TS", fn: method4 },
    { label: "SHA1, Base64(Key), TS", fn: method5 },
    { label: "SHA1, Raw Key, TS", fn: method6 },
  ];

  for (const t of tests) {
    const ok = await testHMAC(t.label, t.fn);
    if (ok) {
        console.log(`\nWINNER: ${t.label}`);
        process.exit(0);
    }
  }
  console.log('\n❌ All methods failed.');
}

run();
