/**
 * API endpoint to sync all pay apps for a project to QuickBooks
 */
import { pullPaymentFromQBO, syncPayAppToQBO } from '@/lib/qboInvoiceSync';
import { supabase } from '@/lib/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Get all pay apps for this project
    const { data: payApps, error: payAppsError } = await supabase
      .from('engagement_pay_apps')
      .select('id')
      .eq('engagement_id', projectId)
      .order('pay_app_number');

    if (payAppsError) {
      console.error('Error fetching pay apps:', payAppsError);
      return res.status(500).json({ error: 'Failed to fetch pay apps' });
    }

    if (!payApps || payApps.length === 0) {
      return res.json({
        success: true,
        syncedCount: 0,
        message: 'No pay apps to sync',
      });
    }

    // Sync each pay app and pull payment status
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const payApp of payApps) {
      try {
        // First, sync the invoice
        const syncResult = await syncPayAppToQBO(payApp.id);
        results.push(syncResult);

        if (syncResult.success) {
          successCount++;

          // Then, pull payment status
          try {
            await pullPaymentFromQBO(payApp.id);
          } catch (paymentError) {
            console.error(
              `Error pulling payment for ${payApp.id}:`,
              paymentError
            );
            // Don't fail the whole operation if payment pull fails
          }
        } else {
          errorCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing pay app ${payApp.id}:`, error);
        errorCount++;
        results.push({ success: false, error: error.message });
      }
    }

    return res.json({
      success: errorCount === 0,
      syncedCount: successCount,
      errorCount,
      totalCount: payApps.length,
      results,
    });
  } catch (error: any) {
    console.error('Sync billing error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
