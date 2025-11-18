import { pullCustomersFromQBO } from '@/lib/qboVendorSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pullCustomersFromQBO();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Pull customers API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to pull customers from QuickBooks',
    });
  }
}
