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

  // Use GeneralLedger report filtered by customer to get ALL expense transactions
  console.log(
    `Fetching GeneralLedger for customer ${qboJobId}...`
  );

  const glParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    customer: qboJobId,
    accounting_method: 'Accrual',
  });

  const generalLedger: any = await makeQBORequest(
    'GET',
    `reports/GeneralLedger?${glParams.toString()}`
  );

  // Balance sheet account prefixes to exclude (assets, liabilities, equity)
  const isBalanceSheetAccount = (accountName: string): boolean => {
    const name = accountName.trim();
    // QuickBooks account numbering:
    // 1xxxx = Assets
    // 2xxxx = Liabilities  
    // 3xxxx = Equity
    // 4xxxx = Income
    // 5xxxx = Cost of Goods Sold
    // 6xxxx+ = Expenses
    return /^[123]\d{4}/.test(name);
  };

  const traverseRows = (rows: any[], parentAccount?: string) => {
    rows.forEach((row: any) => {
      if (row.type === 'Data' && row.ColData) {
        // In GL, account name is typically in ColData[0]
        const accountCol = row.ColData[0];
        const accountName = (accountCol?.value || '').trim();
        
        // Skip balance sheet accounts
        if (isBalanceSheetAccount(accountName)) {
          return;
        }

        // Transaction type in ColData[1]
        const txnType = row.ColData[1]?.value || '';
        
        // Only process Payroll Check transactions for this payroll endpoint
        if (txnType === 'Payroll Check') {
          // Amount is typically in ColData[6] (Debit)
          const debitCol = row.ColData[6];
          const amountStr = (debitCol?.value || '').replace(/,/g, '').trim();
          const amount = parseFloat(amountStr) || 0;

          if (amount > 0) {
            payrollTotal += amount;
            transactionsFound++;
            console.log(
              `Payroll: $${amount} in ${accountName}`
            );
          }
        }
      }

      // Traverse nested rows
      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row);
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
