// Debug endpoint to check QuickBooks OAuth configuration
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return all QB config (with secrets partially masked)
  const config = {
    environment: process.env.QBO_ENVIRONMENT,
    clientId: process.env.QBO_CLIENT_ID
      ? `${process.env.QBO_CLIENT_ID.substring(0, 10)}...`
      : 'NOT SET',
    clientSecret: process.env.QBO_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
    redirectUri: process.env.QBO_REDIRECT_URI,
    redirectUriLength: process.env.QBO_REDIRECT_URI?.length,
    redirectUriHasTrailingSlash: process.env.QBO_REDIRECT_URI?.endsWith('/'),
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV,

    // What the auth URL will contain
    expectedAuthUrl: process.env.QBO_REDIRECT_URI
      ? `Should contain: redirect_uri=${encodeURIComponent(process.env.QBO_REDIRECT_URI)}`
      : 'REDIRECT_URI NOT SET',
  };

  res.status(200).json(config);
}
