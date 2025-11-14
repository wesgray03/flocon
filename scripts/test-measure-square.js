#!/usr/bin/env node
// Quick smoke test for Measure Square API connectivity
// Usage: node scripts/test-measure-square.js [/path]

const path = require('path');
const fs = require('fs');

try {
  // Prefer .env.local if present
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    require('dotenv').config();
  }
} catch {}

const baseUrl = (process.env.MEASURE_SQUARE_API_URL || '').replace(/\/$/, '');
const apiKey = process.env.MEASURE_SQUARE_API_KEY;
const headerStyle =
  process.env.MEASURE_SQUARE_HEADER_STYLE || 'authorization-bearer';
const xApplication = process.env.MEASURE_SQUARE_X_APPLICATION;
const secretKey = process.env.MEASURE_SQUARE_SECRET_KEY;
const basicIncludeColon = /^(1|true)$/i.test(
  process.env.MEASURE_SQUARE_BASIC_INCLUDE_COLON || 'false'
);

if (!baseUrl || !apiKey) {
  console.error(
    'Missing MEASURE_SQUARE_API_URL or MEASURE_SQUARE_API_KEY in environment.'
  );
  process.exit(1);
}

const userPath = process.argv[2] || process.env.MEASURE_SQUARE_TEST_PATH || '/';
const url = `${baseUrl}${userPath.startsWith('/') ? userPath : `/${userPath}`}`;

let headers;
if (headerStyle === 'x-api-key') {
  headers = { 'x-api-key': apiKey };
} else if (headerStyle === 'basic') {
  const raw = basicIncludeColon ? `${apiKey}:` : apiKey;
  const b64 = Buffer.from(raw, 'utf8').toString('base64');
  headers = { Authorization: `Basic ${b64}` };
} else {
  headers = { Authorization: `Bearer ${apiKey}` };
}

// X-Headers for Measure Square Cloud (if available)
if (xApplication && secretKey) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(timestamp, 'utf8')
    .digest('base64');
  headers['X-Application'] = xApplication;
  headers['X-Timestamp'] = timestamp;
  headers['X-Signature'] = signature;
}

headers['Accept'] = 'application/json, */*;q=0.8';

(async () => {
  try {
    const res = await fetch(url, { headers });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    console.log('Status:', res.status, res.ok ? '(ok)' : '(error)');
    console.log('URL:', url);
    console.log('Content-Type:', ct);
    if (ct.includes('application/json')) {
      try {
        console.log('Body:', JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        console.log('Body:', text);
      }
    } else {
      console.log('Body (truncated):', text.slice(0, 500));
    }
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(2);
  }
})();
