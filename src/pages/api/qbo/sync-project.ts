// API Route: /api/qbo/sync-project
// Sync a single project to QuickBooks
import { syncEngagementToQBO } from '@/lib/qboSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { engagementId, createIfNotFound = false } = req.body;

  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' });
  }

  try {
    const result = await syncEngagementToQBO(engagementId, createIfNotFound);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Project synced to QuickBooks successfully',
        customerId: result.customerId,
        jobId: result.jobId,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Sync API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync to QuickBooks',
    });
  }
}
