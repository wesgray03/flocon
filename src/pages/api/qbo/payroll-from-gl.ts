// api/qbo/payroll-from-gl.ts
// Fetch costs from General Ledger report with manual customer filtering
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollGLCosts {
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: string;
}

// Exported function to fetch ALL costs from GL (can be called from other endpoints)
export async function fetchPayrollFromGL(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollGLCosts> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let totalDebits = 0;
  let totalCredits = 0;
  let transactionsFound = 0;

  // Use GeneralLedger report WITHOUT customer filter (we'll filter transactions manually)
  console.log(`Fetching GeneralLedger...`);

  const glParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    accounting_method: 'Accrual',
  });

  const generalLedger: any = await makeQBORequest(
    'GET',
    `reports/GeneralLedger?${glParams.toString()}`
  );

  // Only include COGS and Expenses
  const isIncludedAccount = (accountNumber: string): boolean => {
    const num = accountNumber.trim();
    // QuickBooks account numbering:
    // 5xxxx = Cost of Goods Sold (include)
    // 6xxxx+ = Expenses (include)
    return /^[56]\d{4}/.test(num);
  };

  const traverseRows = (rows: any[], currentAccount?: string) => {
    rows.forEach((row: any) => {
      // Check if this is an account header row
      if (row.Header?.ColData) {
        const accountHeader = row.Header.ColData[0]?.value || '';
        const accountMatch = accountHeader.match(/^(\d{5})/); // Extract account number
        const accountNumber = accountMatch ? accountMatch[1] : '';

        // Recursively traverse this account's transactions
        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row, accountNumber);
        }
        return;
      }

      if (row.type === 'Data' && row.ColData && currentAccount) {
        // Only include COGS and Expense accounts
        if (!isIncludedAccount(currentAccount)) {
          return;
        }

        // Debug: Log all ColData to see structure
        if (transactionsFound === 0) {
          console.log('First transaction ColData structure:');
          row.ColData.forEach((col: any, idx: number) => {
            console.log(`  ColData[${idx}]: ${JSON.stringify(col)}`);
          });
        }

        // Check if this transaction is for the specified job/customer
        // Try multiple possible locations for customer ID
        let customer = '';
        
        // Check each ColData entry for customer info
        for (let i = 0; i < row.ColData.length; i++) {
          const col = row.ColData[i];
          const value = (col?.value || '').trim();
          
          // If this value matches our job ID, we found it
          if (value === qboJobId) {
            customer = value;
            console.log(`Found customer ${qboJobId} in ColData[${i}]`);
            break;
          }
        }
        
        // Skip if not for our job
        if (customer !== qboJobId) {
          return;
        }

        // Debit in ColData[6], Credit in ColData[7]
        const debitCol = row.ColData[6];
        const creditCol = row.ColData[7];

        const debitStr = (debitCol?.value || '').replace(/,/g, '').trim();
        const creditStr = (creditCol?.value || '').replace(/,/g, '').trim();

        const debit = parseFloat(debitStr) || 0;
        const credit = parseFloat(creditStr) || 0;

        if (debit > 0 || credit > 0) {
          totalDebits += debit;
          totalCredits += credit;
          transactionsFound++;

          console.log(`Account ${currentAccount}, Customer ${customer}: Debit=$${debit}, Credit=$${credit}`);
        }
      }

      // Traverse nested rows
      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row, currentAccount);
      }
    });
  };

  if (generalLedger?.Rows?.Row) {
    traverseRows(generalLedger.Rows.Row);
  }

  // GL: Net cost = debits - credits
  const netCost = totalDebits - totalCredits;

  console.log(
    `GeneralLedger for job ${qboJobId}: ${transactionsFound} transactions, Debits: $${totalDebits}, Credits: $${totalCredits}, Net: $${netCost}`
  );

  return {
    payrollTotal: netCost,
    accountsChecked: ['GeneralLedger_5xxxx_6xxxx'],
    transactionsFound,
    method: 'GeneralLedger_Customer_Filtered',
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
