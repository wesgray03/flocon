// api/qbo/payroll-costs.ts
// Fetch payroll costs from QuickBooks Payroll API
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollCosts {
  payrollTotal: number;
  paycheckCount: number;
  lastUpdated: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayrollCosts | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, startDate, endDate } = req.query;

  if (!qboJobId) {
    return res.status(400).json({ error: 'qboJobId is required' });
  }

  try {
    const dateStart = (startDate as string) || '2000-01-01';
    const dateEnd = (endDate as string) || '2099-12-31';

    // Try to fetch paychecks using the Payroll API endpoint
    // Note: This may require special permissions/scopes
    let paycheckData: any;

    try {
      // Attempt 1: Direct paycheck query (if supported)
      const paycheckQuery = `SELECT * FROM Paycheck WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
      paycheckData = await makeQBORequest(
        'GET',
        `query?query=${encodeURIComponent(paycheckQuery)}`
      );
    } catch (queryError: any) {
      console.log('Standard query failed, trying payroll endpoint...');

      // Attempt 2: Use dedicated payroll endpoint (if available)
      // The exact endpoint may vary based on QuickBooks Payroll version
      try {
        paycheckData = await makeQBORequest(
          'GET',
          `paycheck?startdate=${dateStart}&enddate=${dateEnd}`
        );
      } catch (endpointError: any) {
        console.error('Payroll endpoint also failed:', endpointError.message);
        throw new Error(
          'Payroll API access not available. Please ensure your QuickBooks subscription includes Payroll and the app has payroll scope permissions.'
        );
      }
    }

    // Parse paycheck data
    const paychecks =
      paycheckData?.QueryResponse?.Paycheck ||
      paycheckData?.Paycheck ||
      paycheckData?.paychecks ||
      [];

    let payrollTotal = 0;
    let paycheckCount = 0;

    // Filter paychecks by job/customer reference
    paychecks.forEach((paycheck: any) => {
      // Paychecks may have job costing in earnings lines
      let hasJobReference = false;
      let paycheckJobTotal = 0;

      // Check earnings lines for job reference
      const earnings = paycheck.Earnings || paycheck.earnings || [];
      earnings.forEach((earning: any) => {
        const customerRef =
          earning.CustomerRef?.value ||
          earning.customer_ref?.value ||
          earning.JobRef?.value;

        if (customerRef === qboJobId) {
          hasJobReference = true;
          const amount = parseFloat(earning.Amount || earning.amount || '0');
          paycheckJobTotal += amount;
        }
      });

      // If paycheck has job-coded earnings, include it
      if (hasJobReference) {
        payrollTotal += paycheckJobTotal;
        paycheckCount++;
      }
    });

    return res.status(200).json({
      payrollTotal,
      paycheckCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching QBO payroll costs:', error);

    // Provide helpful error message
    const errorMsg =
      error.message || 'Failed to fetch payroll costs from QuickBooks';
    const isPermissionError =
      errorMsg.includes('Permission') ||
      errorMsg.includes('scope') ||
      errorMsg.includes('Unauthorized');

    return res.status(isPermissionError ? 403 : 500).json({
      error: isPermissionError
        ? 'Payroll access not authorized. Please reconnect QuickBooks with Payroll permissions.'
        : errorMsg,
    });
  }
}
