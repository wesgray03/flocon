// API Route: /api/qbo/disconnect
// Revoke QuickBooks tokens and disconnect
import { revokeTokens } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await revokeTokens();
    res
      .status(200)
      .json({ success: true, message: 'Disconnected from QuickBooks' });
  } catch (error) {
    console.error('Error disconnecting from QuickBooks:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
}
