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

  // Try TransactionList report first (faster)
  try {
    console.log(
      'Attempting TransactionList report for Payroll Check transactions...'
    );

    const params = new URLSearchParams({
      start_date: dateStart,
      end_date: dateEnd,
    });

    if (qboJobId) {
      params.append('customer', qboJobId as string);
    }

    const transactionList: any = await makeQBORequest(
      'GET',
      `reports/TransactionList?${params.toString()}`
    );

    console.log('TransactionList response structure:', JSON.stringify(transactionList, null, 2).substring(0, 2000));

    const rows = transactionList?.Rows?.Row || [];

    // Filter for Payroll Check transactions
    rows.forEach((row: any) => {
      if (row.type === 'Data' && row.ColData) {
        // Transaction type is typically in ColData[1]
        const txnType = row.ColData[1]?.value || '';

        if (txnType === 'Payroll Check') {
          // Customer/Job is typically in ColData[4]
          const customerCol = row.ColData[4];
          const customerId = customerCol?.id || '';
          const customerName = customerCol?.value || '';

          // Account name/type is typically in ColData[5] or ColData[6]
          const accountCol = row.ColData[5] || row.ColData[6];
          const accountName = (accountCol?.value || '').toLowerCase();

          // Skip if this is a credit to cash/liability account
          // Look for: cash, checking, savings, bank, payable, liability
          const isCashOrLiability =
            accountName.includes('cash') ||
            accountName.includes('checking') ||
            accountName.includes('savings') ||
            accountName.includes('bank') ||
            accountName.includes('payable') ||
            accountName.includes('liability') ||
            accountName.includes('payroll liabilities');

          if (!isCashOrLiability) {
            // Amount is typically in last column (ColData[8] or similar)
            const amountCol = row.ColData[row.ColData.length - 1];
            const amountStr = (amountCol?.value || '').replace(/,/g, '');
            const amount = Math.abs(parseFloat(amountStr) || 0);

            // Match by customer ID or name
            if (
              customerId === qboJobId ||
              customerName.includes(qboJobId as string)
            ) {
              payrollTotal += amount;
              transactionsFound++;
              console.log(
                `Found payroll check: $${amount} for ${customerName} (${accountName})`
              );
            } else if (!qboJobId) {
              // If no job filter, include all payroll checks
              payrollTotal += amount;
              transactionsFound++;
            }
          }
        }
      }
    });

    console.log(
      `TransactionList: Found ${transactionsFound} payroll checks, total: $${payrollTotal}`
    );

    return {
      payrollTotal,
      accountsChecked: ['TransactionList'],
      transactionsFound,
      method: 'TransactionList_PayrollCheck',
    };
  } catch (transactionListError: any) {
    console.log(
      'TransactionList failed, trying GeneralLedger:',
      transactionListError.message
    );
  }

  // Fallback to GeneralLedger if TransactionList fails
  console.log(
    'Attempting GeneralLedger report for Payroll Check transactions...'
  );

  const glParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
  });

  const generalLedger: any = await makeQBORequest(
    'GET',
    `reports/GeneralLedger?${glParams.toString()}`
  );

  // Parse GL report for Payroll Check transactions
  const traverseRows = (rows: any[]) => {
    rows.forEach((row: any) => {
      if (row.type === 'Data' && row.ColData) {
        // Transaction type is typically in ColData[1]
        const txnType = row.ColData[1]?.value || '';

        if (txnType === 'Payroll Check') {
          // Customer/Job is typically in ColData[3]
          const customerCol = row.ColData[3];
          const customerId = customerCol?.id || '';
          const customerName = customerCol?.value || '';

          // Account name is typically in ColData[0] in GL
          const accountCol = row.ColData[0];
          const accountName = (accountCol?.value || '').toLowerCase();

          // Skip if this is a credit to cash/liability account
          const isCashOrLiability =
            accountName.includes('cash') ||
            accountName.includes('checking') ||
            accountName.includes('savings') ||
            accountName.includes('bank') ||
            accountName.includes('payable') ||
            accountName.includes('liability') ||
            accountName.includes('payroll liabilities');

          if (!isCashOrLiability) {
            // Amount is typically in ColData[6]
            const amountCol = row.ColData[6];
            const amountStr = (amountCol?.value || '').replace(/,/g, '');
            const amount = Math.abs(parseFloat(amountStr) || 0);

            // Match by customer ID or name
            if (
              customerId === qboJobId ||
              customerName.includes(qboJobId as string)
            ) {
              payrollTotal += amount;
              transactionsFound++;
              console.log(
                `Found payroll check in GL: $${amount} for ${customerName} (${accountName})`
              );
            } else if (!qboJobId) {
              // If no job filter, include all payroll checks
              payrollTotal += amount;
              transactionsFound++;
            }
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
