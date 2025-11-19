/**
 * API endpoint to sync all pay apps for a project to QuickBooks
 */
import { pullPaymentFromQBO, syncPayAppToQBO } from '@/lib/qboInvoiceSync';
import { createClient } from '@supabase/supabase-js';
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
    console.log('=== SYNC-BILLING API START ===');
    console.log('Received projectId:', projectId);
    console.log('ProjectId type:', typeof projectId);

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all pay apps for this project
    console.log('Querying pay apps with engagement_id:', projectId);
    const { data: payApps, error: payAppsError } = await supabase
      .from('engagement_pay_apps')
      .select('id')
      .eq('engagement_id', projectId)
      .order('pay_app_number');

    console.log('Query completed');
    console.log('Query error:', payAppsError);
    console.log('Pay apps result:', payApps);
    console.log('Pay apps count:', payApps?.length || 0);

    if (payAppsError) {
      console.error('Error fetching pay apps:', payAppsError);
      return res.status(500).json({ error: payAppsError.message });
    }

    if (!payApps || payApps.length === 0) {
      console.log('No pay apps found for project:', projectId);
      return res.json({
        success: true,
        syncedCount: 0,
        message: 'No pay apps to sync',
      });
    }

    console.log(
      `Found ${payApps.length} pay apps to sync for project ${projectId}`
    );

    // Sync each pay app and pull payment status
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const payApp of payApps) {
      try {
        console.log(`Syncing pay app ${payApp.id}...`);
        // First, sync the invoice
        const syncResult = await syncPayAppToQBO(payApp.id);
        console.log(
          `Sync result for ${payApp.id}:`,
          JSON.stringify(syncResult)
        );
        results.push(syncResult);

        if (syncResult.success) {
          successCount++;
          console.log(`Successfully synced pay app ${payApp.id}`);

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
          console.error(
            `Failed to sync pay app ${payApp.id}:`,
            syncResult.error
          );
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
    console.error('Error type:', typeof error);
    console.error('Error keys:', Object.keys(error || {}));
    console.error('Error stack:', error?.stack);
    const errorMessage =
      error?.message || error?.toString() || 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}
