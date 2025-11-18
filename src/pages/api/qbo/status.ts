// API Route: /api/qbo/status
// Check QuickBooks connection status
import { getStoredTokens } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getStoredTokens();

    if (!token) {
      return res.status(200).json({
        connected: false,
        message: 'Not connected to QuickBooks',
      });
    }

    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const refreshExpiresAt = new Date(token.refresh_expires_at);

    return res.status(200).json({
      connected: true,
      realmId: token.realm_id,
      expiresAt: token.expires_at,
      refreshExpiresAt: token.refresh_expires_at,
      accessTokenExpired: expiresAt < now,
      refreshTokenExpired: refreshExpiresAt < now,
      needsReauthorization: refreshExpiresAt < now,
    });
  } catch (error) {
    console.error('Error checking QBO status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
}
