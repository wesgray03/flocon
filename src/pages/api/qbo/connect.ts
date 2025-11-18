// API Route: /api/qbo/connect
// Initiates OAuth flow to connect to QuickBooks Online
import { getAuthUri } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUri = getAuthUri();
    res.status(200).json({ authUri });
  } catch (error) {
    console.error('Error generating auth URI:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
}
