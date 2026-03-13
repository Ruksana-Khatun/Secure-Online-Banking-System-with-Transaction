// Exact match of user script logic
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function test(label, baseUrl) {
  try {
    const timestamp = Date.now().toString();
    
    // Exact logic from user's script
    const hmac = crypto.createHmac('sha256', Buffer.from(authKey));
    hmac.update(timestamp);
    const secretKey = hmac.digest('base64');

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
    console.log(`❌ FAIL: ${label} [Status ${err.response?.status}] Body: ${JSON.stringify(err.response?.data)}`);
  }
}

async function run() {
  await test("ekoicici", "https://staging.eko.in:25004/ekoicici");
  await test("ekoapi", "https://staging.eko.in:25004/ekoapi");
}

run();
