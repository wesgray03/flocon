// Pull vendors from QuickBooks to FloCon
import { pullVendorsFromQBO } from '@/lib/qboVendorSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API: Starting vendor pull from QuickBooks...');

    const result = await pullVendorsFromQBO();

    if (result.success) {
      console.log('API: Vendor pull successful');
      return res.status(200).json(result);
    } else {
      console.error('API: Vendor pull failed:', result.error);
      return res.status(500).json({
        error: result.error || 'Failed to pull vendors',
      });
    }
  } catch (error: any) {
    console.error('API: Vendor pull error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
