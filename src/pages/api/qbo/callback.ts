// API Route: /api/qbo/callback
// Handles OAuth callback from QuickBooks and exchanges code for tokens
import { getQBOClient, saveTokens } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, realmId, error } = req.query;

  // Check for OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(
      `/settings?qbo_error=${encodeURIComponent(error as string)}`
    );
  }

  // Validate required parameters
  if (!code || !realmId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const oauthClient = getQBOClient();
    const parseRedirect = req.url || '';

    // Exchange authorization code for tokens
    const authResponse = await oauthClient.createToken(parseRedirect);
    const token = authResponse.token;

    // Save tokens to database
    await saveTokens(
      realmId as string,
      token.access_token,
      token.refresh_token,
      token.expires_in,
      token.x_refresh_token_expires_in
    );

    console.log('Successfully connected to QuickBooks');
    console.log('Realm ID:', realmId);

    // Redirect to settings page with success message
    res.redirect('/settings?qbo_connected=true');
  } catch (err) {
    console.error('Error during OAuth callback:', err);
    res.redirect('/settings?qbo_error=connection_failed');
  }
}
