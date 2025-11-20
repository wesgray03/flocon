// api/qbo/payroll-from-gl.ts
// Fetch costs from QuickBooks Query API with line-item customer filtering
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollGLCosts {
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: string;
}

// Exported function to fetch costs using Query API (filters by customer/job on line items)
export async function fetchPayrollFromGL(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollGLCosts> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let totalCost = 0;
  let transactionsFound = 0;
  const accountsUsed = new Set<string>();

  // Helper function to check if account is COGS or Expense account
  const isExpenseAccount = (accountName: string): boolean => {
    if (!accountName) return false;

    // Try to match by account number first (5xxxx or 6xxxx)
    const numberMatch = accountName.match(/^(\d{5})/);
    if (numberMatch) {
      const num = numberMatch[1];
      return /^[56]\d{4}/.test(num);
    }

    // If no number, match by account name keywords for COGS and Expenses
    const lowerName = accountName.toLowerCase();
    const expenseKeywords = [
      'cost of goods sold',
      'cogs',
      'job expenses',
      'job materials',
      'cost of labor',
      'labor',
      'materials',
      'advertising',
      'automobile',
      'fuel',
      'dues',
      'subscriptions',
      'equipment rental',
      'insurance',
      'legal',
      'professional fees',
      'accounting',
      'bookkeeper',
      'lawyer',
      'maintenance',
      'repair',
      'meals',
      'entertainment',
      'office expenses',
      'rent',
      'lease',
      'utilities',
      'gas and electric',
      'telephone',
      'installation',
      'plants and soil',
      'sprinklers',
      'decks and patios',
      'pest control',
    ];

    return expenseKeywords.some((keyword) => lowerName.includes(keyword));
  };

  // Query all Purchase transactions in date range
  try {
    const query = `SELECT * FROM Purchase WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const encodedQuery = encodeURIComponent(query);

    const queryResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodedQuery}`
    );

    if (queryResult?.QueryResponse?.Purchase) {
      const purchases = queryResult.QueryResponse.Purchase;

      purchases.forEach((purchase: any) => {
        if (!purchase.Line) return;

        purchase.Line.forEach((line: any) => {
          if (!line.AccountBasedExpenseLineDetail) return;

          const detail = line.AccountBasedExpenseLineDetail;
          const accountName = detail.AccountRef?.name || '';
          const customerId = detail.CustomerRef?.value || '';
          const amount = parseFloat(line.Amount || '0');

          // Only include expense accounts
          if (!isExpenseAccount(accountName)) {
            return;
          }

          // Only include lines assigned to our customer/job
          if (customerId === qboJobId) {
            totalCost += amount;
            transactionsFound++;
            accountsUsed.add(accountName);
          }
        });
      });
    }
  } catch (queryError: any) {
    console.error('Query API failed:', queryError.message);
    throw queryError;
  }

  return {
    payrollTotal: totalCost,
    accountsChecked: Array.from(accountsUsed),
    transactionsFound,
    method: 'QueryAPI',
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
