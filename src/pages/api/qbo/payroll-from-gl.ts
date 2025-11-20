// api/qbo/payroll-from-gl.ts
// Extract payroll costs from General Ledger by querying payroll expense accounts
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollGLCosts {
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: string;
}

// Exported function to fetch payroll costs (can be called from other endpoints)
export async function fetchPayrollFromGL(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollGLCosts> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let payrollTotal = 0;
  let transactionsFound = 0;

  // Use GeneralLedger report to find payroll costs by account and customer
  console.log(
    'Fetching GeneralLedger report for Payroll expense accounts...'
  );

  const glParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    accounting_method: 'Accrual',
  });

  const generalLedger: any = await makeQBORequest(
    'GET',
    `reports/GeneralLedger?${glParams.toString()}`
  );

  // Parse GL report for Payroll expenses
  const payrollAccounts = [
    '54000 direct salaries',
    '54100',
    'field wages',
    'field payroll',
    'simple ira',
  ];

  const traverseRows = (rows: any[], parentAccount?: string) => {
    rows.forEach((row: any) => {
      if (row.type === 'Data' && row.ColData) {
        // In GL, account name is typically in ColData[0]
        const accountCol = row.ColData[0];
        const accountName = (accountCol?.value || '').toLowerCase();
        const accountId = accountCol?.id || '';

        // Check if this is a payroll expense account
        const isPayrollAccount = payrollAccounts.some(keyword =>
          accountName.includes(keyword)
        );

        if (isPayrollAccount || (parentAccount && payrollAccounts.some(keyword => parentAccount.includes(keyword)))) {
          // Transaction type is typically in ColData[1]
          const txnType = row.ColData[1]?.value || '';

          if (txnType === 'Payroll Check') {
            // Customer/Job is typically in ColData[3]
            const customerCol = row.ColData[3];
            const customerId = customerCol?.id || '';
            const customerName = customerCol?.value || '';

            // Skip if this is a credit to cash/liability account
            const isCashOrLiability =
              accountName.includes('cash') ||
              accountName.includes('checking') ||
              accountName.includes('savings') ||
              accountName.includes('bank') ||
              accountName.includes('payable') ||
              accountName.includes('liability') ||
              accountName.includes('payroll liabilities') ||
              accountName.includes('direct deposit');

            if (!isCashOrLiability) {
              // Amount is typically in ColData[6] or ColData[7]
              const debitCol = row.ColData[6];
              const amountStr = (debitCol?.value || '').replace(/,/g, '').trim();
              const amount = parseFloat(amountStr) || 0;

              // Match by customer ID or name (if qboJobId is provided)
              if (!qboJobId || customerId === qboJobId || customerName.includes(qboJobId)) {
                if (amount > 0) {
                  payrollTotal += amount;
                  transactionsFound++;
                  console.log(
                    `Found payroll: $${amount} for ${customerName || 'No Customer'} in ${accountName}`
                  );
                }
              }
            }
          }
        }
      }

      // Traverse nested rows (account hierarchies)
      if (row.Rows?.Row) {
        const currentAccount = row.ColData?.[0]?.value || parentAccount;
        traverseRows(row.Rows.Row, currentAccount);
      }
    });
  };

  if (generalLedger?.Rows?.Row) {
    traverseRows(generalLedger.Rows.Row);
  }

  console.log(
    `GeneralLedger: Found ${transactionsFound} payroll checks, total: $${payrollTotal}`
  );

  return {
    payrollTotal,
    accountsChecked: ['GeneralLedger'],
    transactionsFound,
    method: 'GeneralLedger_PayrollCheck',
  };
}

// API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayrollGLCosts | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, startDate, endDate } = req.query;

  if (!qboJobId) {
    return res.status(400).json({ error: 'qboJobId is required' });
  }

  try {
    const result = await fetchPayrollFromGL(
      qboJobId as string,
      startDate as string,
      endDate as string
    );
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error fetching payroll from GL:', error);
    return res.status(500).json({
      error:
        error.message || 'Failed to fetch payroll costs from General Ledger',
    });
  }
}
