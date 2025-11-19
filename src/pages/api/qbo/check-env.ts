/**
 * Diagnostic endpoint to check environment variables
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Return which env vars are set (but not their values for security)
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_QBO_CLIENT_ID: !!process.env.NEXT_PUBLIC_QBO_CLIENT_ID,
    QBO_CLIENT_ID: !!process.env.QBO_CLIENT_ID,
    QBO_CLIENT_SECRET: !!process.env.QBO_CLIENT_SECRET,
    NEXT_PUBLIC_QBO_ENVIRONMENT:
      process.env.NEXT_PUBLIC_QBO_ENVIRONMENT ||
      process.env.QBO_ENVIRONMENT ||
      'not set',
    QBO_ENVIRONMENT: process.env.QBO_ENVIRONMENT || 'not set',
    NEXT_PUBLIC_QBO_REDIRECT_URI: !!process.env.NEXT_PUBLIC_QBO_REDIRECT_URI,
    QBO_REDIRECT_URI: !!process.env.QBO_REDIRECT_URI,
    NEXT_PUBLIC_QBO_REALM_ID: !!process.env.NEXT_PUBLIC_QBO_REALM_ID,
  };

  return res.json(envCheck);
}
