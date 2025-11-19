// Test endpoint to verify OAuth client configuration
import type { NextApiRequest, NextApiResponse } from 'next';
import OAuthClient from 'intuit-oauth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET ? 'SET' : 'NOT SET',
      environment: process.env.QBO_ENVIRONMENT,
      redirectUri: process.env.QBO_REDIRECT_URI,
    };

    // Test if we can create the OAuth client
    const oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID!,
      clientSecret: process.env.QBO_CLIENT_SECRET!,
      environment: (process.env.QBO_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
      redirectUri: process.env.QBO_REDIRECT_URI!,
    });

    // Test if we can generate auth URI
    const state = 'test_' + Math.random().toString(36).substring(2, 15);
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payroll],
      state,
    });

    // Parse the auth URI to show individual components
    const url = new URL(authUri);
    const params = {
      client_id: url.searchParams.get('client_id'),
      redirect_uri: url.searchParams.get('redirect_uri'),
      response_type: url.searchParams.get('response_type'),
      scope: url.searchParams.get('scope'),
      state: url.searchParams.get('state'),
    };

    res.status(200).json({
      success: true,
      config,
      authUri,
      parsedParams: params,
      note: 'If redirect_uri matches what you have in QuickBooks Developer Portal, OAuth should work.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
