// Debug script for Eko Sandbox URL theories
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const method1 = (k, d, ts) => {
  const encoded = Buffer.from(k).toString('base64');
  return crypto.createHmac('sha256', encoded).update(ts).digest('base64');
};

async function test(label, baseUrl) {
  try {
    const timestamp = Date.now().toString();
    const secretKey = method1(authKey, developerKey, timestamp);
    const url = `${baseUrl}/v2/billpayments/operators_category`;
    
    console.log(`\nTesting: ${label} [${url}]`);
    const res = await axios.get(url, {
      headers: {
        developer_key: developerKey,
        'secret-key': secretKey,
        'secret-key-timestamp': timestamp,
      },
      params: { initiator_id: initiatorId },
      httpsAgent,
      timeout: 5000
    });
    console.log(`✅ SUCCESS! ${label}`);
    console.log('Body:', JSON.stringify(res.data).slice(0, 100));
  } catch (err) {
    console.log(`❌ FAIL: ${label} [Status ${err.response?.status}] Info: ${JSON.stringify(err.response?.data)}`);
  }
}

async function run() {
  await test("ekoicici prefix", "https://staging.eko.in:25004/ekoicici");
  await test("ekoapi prefix", "https://staging.eko.in:25004/ekoapi");
  await test("Direct port 25002 ekoicici", "https://staging.eko.in:25002/ekoicici");
  await test("Direct port 25002 ekoapi", "https://staging.eko.in:25002/ekoapi");
}

run();
