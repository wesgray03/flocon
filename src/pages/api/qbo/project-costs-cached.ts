// api/qbo/project-costs-cached.ts
// Cached version of project costs - checks cache first, then falls back to QBO API
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchPayrollFromGL } from './payroll-from-gl';

type ProjectCosts = {
  billsTotal: number;
  purchasesTotal: number;
  payrollTotal: number;
  creditsTotal: number;
  netCostToDate: number;
  billsCount: number;
  purchasesCount: number;
  payrollCount: number;
  creditsCount: number;
  cached: boolean;
  lastSynced?: string;
};

const CACHE_TTL_MINUTES = 60; // Cache valid for 1 hour

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectCosts | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, engagementId, forceRefresh } = req.query;

  console.log('=== QBO Costs Cached Request ===');
  console.log('qboJobId:', qboJobId);
  console.log('engagementId:', engagementId);
  console.log('forceRefresh:', forceRefresh);

  if (!qboJobId || !engagementId) {
    console.error('Missing required parameters');
    return res
      .status(400)
      .json({ error: 'qboJobId and engagementId are required' });
  }

  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check cache first (unless force refresh is requested)
    if (forceRefresh !== 'true') {
      console.log('Checking cache for engagement:', engagementId);
      const { data: cached, error: cacheError } = await supabase
        .from('qbo_cost_cache')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (cacheError) {
        console.error('Cache query error:', cacheError);
      }

      console.log('Cache result:', cached ? 'found' : 'not found');

      if (cached && !cacheError) {
        const cacheAge = Date.now() - new Date(cached.last_synced_at).getTime();
        const cacheAgeMinutes = cacheAge / 1000 / 60;

        // If cache is fresh, return it
        if (cacheAgeMinutes < CACHE_TTL_MINUTES) {
          console.log(
            `Returning cached costs for ${engagementId} (${cacheAgeMinutes.toFixed(1)}m old)`
          );
          return res.status(200).json({
            billsTotal: Number(cached.bills_total),
            purchasesTotal: Number(cached.purchases_total),
            payrollTotal: Number(cached.payroll_total),
            creditsTotal: Number(cached.credits_total),
            netCostToDate: Number(cached.net_cost_to_date),
            billsCount: cached.bills_count,
            purchasesCount: cached.purchases_count,
            payrollCount: cached.payroll_count,
            creditsCount: cached.credits_count,
            cached: true,
            lastSynced: cached.last_synced_at,
          });
        }
      }
    }

    // Cache miss or stale - fetch from QBO
    console.log(`Fetching fresh costs from QBO for ${engagementId}...`);

    const dateStart = '2000-01-01';
    const dateEnd = '2099-12-31';

    // Fetch ALL costs from General Ledger report (debits - credits)
    console.log('Fetching all costs from GL...');
    const glData = await fetchPayrollFromGL(
      qboJobId as string,
      dateStart,
      dateEnd
    );
    const netCostToDate = glData.payrollTotal || 0; // Now returns net total, not just payroll
    const transactionsFound = glData.transactionsFound || 0;
    console.log(
      `GL Report: $${netCostToDate} (${transactionsFound} transactions)`
    );

    // Update cache
    const cacheData = {
      engagement_id: engagementId,
      qbo_job_id: qboJobId,
      bills_total: 0,
      purchases_total: 0,
      payroll_total: 0,
      credits_total: 0,
      net_cost_to_date: netCostToDate,
      bills_count: 0,
      purchases_count: 0,
      payroll_count: 0,
      credits_count: transactionsFound,
      last_synced_at: new Date().toISOString(),
    };

    await supabase
      .from('qbo_cost_cache')
      .upsert(cacheData, { onConflict: 'engagement_id' });

    console.log(`✅ Updated cost cache for ${engagementId}`);
    console.log('Returning fresh QBO data:', {
      netCostToDate,
      transactionsFound,
      method: 'GeneralLedger',
    });

    return res.status(200).json({
      billsTotal: 0,
      purchasesTotal: 0,
      payrollTotal: 0,
      creditsTotal: 0,
      netCostToDate,
      billsCount: 0,
      purchasesCount: 0,
      payrollCount: 0,
      creditsCount: transactionsFound,
      cached: false,
      lastSynced: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching project costs:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch project costs',
    });
  }
}
