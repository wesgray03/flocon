/**
 * API endpoint to link existing QuickBooks invoices to pay apps
 * Searches for invoices by project (job) and tries to match them to pay apps
 */
import { makeQBORequest } from '@/lib/qboClient';
import { supabase } from '@/lib/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { engagementId } = req.body;

  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' });
  }

  try {
    // 1. Get engagement with QB job ID
    const { data: engagement, error: engagementError } = await supabase
      .from('engagements')
      .select('id, project_number, qbo_job_id')
      .eq('id', engagementId)
      .single();

    if (engagementError || !engagement) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    if (!engagement.qbo_job_id) {
      return res.status(400).json({
        error: 'Project must be synced to QuickBooks first',
      });
    }

    // 2. Get all pay apps for this project that don't have QB invoice IDs
    const { data: payApps, error: payAppsError } = await supabase
      .from('engagement_pay_apps')
      .select('id, pay_app_number, date_submitted, current_payment_due, amount')
      .eq('engagement_id', engagementId)
      .is('qbo_invoice_id', null)
      .order('pay_app_number', { ascending: true });

    if (payAppsError) {
      return res.status(500).json({ error: 'Error fetching pay apps' });
    }

    if (!payApps || payApps.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unlinked pay apps found',
        matched: 0,
      });
    }

    // 3. Query QuickBooks for all invoices for this job
    const query = `SELECT * FROM Invoice WHERE CustomerRef = '${engagement.qbo_job_id}' ORDERBY TxnDate ASC`;
    const qbData = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    if (!qbData.QueryResponse?.Invoice) {
      return res.status(200).json({
        success: true,
        message: 'No invoices found in QuickBooks for this project',
        matched: 0,
      });
    }

    const qbInvoices = qbData.QueryResponse.Invoice;

    // 4. Try to match invoices to pay apps
    const matches = [];
    const unmatched = [];

    for (const payApp of payApps) {
      let matched = false;

      // Try to match by DocNumber (pay app number)
      if (payApp.pay_app_number) {
        const matchingInvoice = qbInvoices.find(
          (inv: any) => inv.DocNumber === payApp.pay_app_number
        );

        if (matchingInvoice) {
          matches.push({
            payAppId: payApp.id,
            payAppNumber: payApp.pay_app_number,
            invoiceId: matchingInvoice.Id,
            invoiceDocNumber: matchingInvoice.DocNumber,
            matchType: 'doc_number',
          });
          matched = true;
        }
      }

      // If not matched by doc number, try by amount and date
      if (!matched && payApp.date_submitted) {
        const payAppAmount = payApp.current_payment_due || payApp.amount || 0;
        const matchingInvoice = qbInvoices.find((inv: any) => {
          const amountMatch = Math.abs(inv.TotalAmt - payAppAmount) < 0.01;
          const dateMatch = inv.TxnDate === payApp.date_submitted;
          return amountMatch && dateMatch;
        });

        if (matchingInvoice) {
          matches.push({
            payAppId: payApp.id,
            payAppNumber: payApp.pay_app_number || 'N/A',
            invoiceId: matchingInvoice.Id,
            invoiceDocNumber: matchingInvoice.DocNumber || 'N/A',
            matchType: 'amount_and_date',
          });
          matched = true;
        }
      }

      if (!matched) {
        unmatched.push({
          payAppId: payApp.id,
          payAppNumber: payApp.pay_app_number || 'N/A',
          amount: payApp.current_payment_due || payApp.amount || 0,
        });
      }
    }

    // 5. Update pay apps with matched invoice IDs
    let updatedCount = 0;
    const errors = [];

    for (const match of matches) {
      const { error: updateError } = await supabase
        .from('engagement_pay_apps')
        .update({
          qbo_invoice_id: match.invoiceId,
          qbo_sync_status: 'synced',
          qbo_synced_at: new Date().toISOString(),
        })
        .eq('id', match.payAppId);

      if (updateError) {
        errors.push({
          payAppId: match.payAppId,
          error: updateError.message,
        });
      } else {
        updatedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      matched: updatedCount,
      total: payApps.length,
      matches: matches.map((m) => ({
        payAppNumber: m.payAppNumber,
        invoiceDocNumber: m.invoiceDocNumber,
        matchType: m.matchType,
      })),
      unmatched,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error linking existing invoices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
