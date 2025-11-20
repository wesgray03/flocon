// api/qbo/project-costs-cached.ts
// Cached version of project costs - checks cache first, then falls back to QBO API
import { makeQBORequest } from '@/lib/qboClient';
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

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

// Helper to check if a line references a specific job
function lineReferencesJob(line: any, jobId: string): boolean {
  const customerRef = line.CustomerRef?.value || line.customer_ref?.value;
  return customerRef === jobId;
}

// Helper to get line amount
function getLineAmount(line: any): number {
  return Number(line.Amount || line.amount || 0);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectCosts | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, engagementId, forceRefresh } = req.query;

  if (!qboJobId || !engagementId) {
    return res
      .status(400)
      .json({ error: 'qboJobId and engagementId are required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check cache first (unless force refresh is requested)
    if (forceRefresh !== 'true') {
      const { data: cached, error: cacheError } = await supabase
        .from('qbo_cost_cache')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

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

    // Query Bills
    const billsQuery = `SELECT * FROM Bill WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const billsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(billsQuery)}`
    );
    const allBills = billsResult?.QueryResponse?.Bill || [];

    let billsTotal = 0;
    let billsCount = 0;
    allBills.forEach((bill: any) => {
      const lines = bill.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          billsTotal += getLineAmount(line);
          billsCount++;
        }
      });
    });

    // Query Purchases
    const purchasesQuery = `SELECT * FROM Purchase WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const purchasesResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(purchasesQuery)}`
    );
    const allPurchases = purchasesResult?.QueryResponse?.Purchase || [];

    let purchasesTotal = 0;
    let purchasesCount = 0;
    allPurchases.forEach((purchase: any) => {
      const lines = purchase.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          purchasesTotal += getLineAmount(line);
          purchasesCount++;
        }
      });
    });

    // Query Payroll (simplified - may need payroll API)
    let payrollTotal = 0;
    let payrollCount = 0;
    try {
      const payrollQuery = `SELECT * FROM PayrollCheck WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
      const payrollResult: any = await makeQBORequest(
        'GET',
        `query?query=${encodeURIComponent(payrollQuery)}`
      );
      const allPayroll = payrollResult?.QueryResponse?.PayrollCheck || [];

      allPayroll.forEach((paycheck: any) => {
        const lines = paycheck.Line || [];
        lines.forEach((line: any) => {
          if (lineReferencesJob(line, qboJobId as string)) {
            payrollTotal += getLineAmount(line);
            payrollCount++;
          }
        });
      });
    } catch (err) {
      console.log('Payroll query failed (may require additional permissions)');
    }

    // Query Vendor Credits
    const creditsQuery = `SELECT * FROM VendorCredit WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const creditsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(creditsQuery)}`
    );
    const allCredits = creditsResult?.QueryResponse?.VendorCredit || [];

    let creditsTotal = 0;
    let creditsCount = 0;
    allCredits.forEach((credit: any) => {
      const lines = credit.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          creditsTotal += getLineAmount(line);
          creditsCount++;
        }
      });
    });

    const netCostToDate =
      billsTotal + purchasesTotal + payrollTotal - creditsTotal;

    // Update cache
    const cacheData = {
      engagement_id: engagementId,
      qbo_job_id: qboJobId,
      bills_total: billsTotal,
      purchases_total: purchasesTotal,
      payroll_total: payrollTotal,
      credits_total: creditsTotal,
      net_cost_to_date: netCostToDate,
      bills_count: billsCount,
      purchases_count: purchasesCount,
      payroll_count: payrollCount,
      credits_count: creditsCount,
      last_synced_at: new Date().toISOString(),
    };

    await supabase
      .from('qbo_cost_cache')
      .upsert(cacheData, { onConflict: 'engagement_id' });

    console.log(`✅ Updated cost cache for ${engagementId}`);

    return res.status(200).json({
      billsTotal,
      purchasesTotal,
      payrollTotal,
      creditsTotal,
      netCostToDate,
      billsCount,
      purchasesCount,
      payrollCount,
      creditsCount,
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
