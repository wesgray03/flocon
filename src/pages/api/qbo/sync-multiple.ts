// API Route: /api/qbo/sync-multiple
// Sync multiple projects to QuickBooks
import { syncMultipleEngagements } from '@/lib/qboSync';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { engagementIds } = req.body;

  if (!engagementIds || !Array.isArray(engagementIds)) {
    return res.status(400).json({ error: 'engagementIds array is required' });
  }

  try {
    const result = await syncMultipleEngagements(engagementIds);

    return res.status(200).json({
      success: result.success > 0,
      message: `Synced ${result.success} of ${engagementIds.length} projects`,
      successCount: result.success,
      failedCount: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error('Bulk sync API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync projects to QuickBooks',
    });
  }
}
