// API Route: Pull subcontractors from QuickBooks
import { pullSubcontractorsFromQBO } from '@/lib/qboVendorSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pullSubcontractorsFromQBO();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({
        error: result.error || 'Failed to pull subcontractors',
        ...result,
      });
    }
  } catch (error: any) {
    console.error('Pull subcontractors API error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
