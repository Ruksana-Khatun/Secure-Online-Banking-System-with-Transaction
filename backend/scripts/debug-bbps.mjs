// Debug script for BBPS categories
import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import 'dotenv/config';

const developerKey = process.env.EKO_DEVELOPER_KEY;
const authKey      = process.env.EKO_AUTH_KEY;
const initiatorId  = process.env.EKO_INITIATOR_ID;
const BASE_URL     = (process.env.EKO_BASE_URL || 'https://staging.eko.in:25004/ekoicici').replace(/\/+$/, '');

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

async function test() {
  try {
    const url = `${BASE_URL}/v2/billpayments/operators_category`;
    console.log('GET', url);
    const res = await axios.get(url, {
      headers: makeHeaders(),
      params: { initiator_id: initiatorId },
      httpsAgent
    });
    console.log('✅ Status:', res.status);
    console.log('✅ Body:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Status:', err.response?.status);
    console.error('❌ Error Body:', JSON.stringify(err.response?.data, null, 2) || err.message);
  }
}

test();
