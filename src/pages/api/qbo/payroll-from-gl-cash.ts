// api/qbo/payroll-from-gl-cash.ts
// Fetch costs from QuickBooks Profit & Loss report (CASH BASIS) filtered by customer
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollGLCosts {
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: string;
}

// Exported function to fetch costs using P&L report with customer filter (CASH BASIS)
export async function fetchPayrollFromGLCash(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollGLCosts> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let totalCost = 0;
  const accountsUsed = new Set<string>();

  // Use ProfitAndLoss report with customer filter - CASH BASIS
  const plParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    accounting_method: 'Cash', // CASH BASIS
    customer: qboJobId,
    summarize_column_by: 'Total',
  });

  console.log(
    `Fetching Cash Basis ProfitAndLoss report for customer ${qboJobId}...`
  );

  const profitAndLoss: any = await makeQBORequest(
    'GET',
    `reports/ProfitAndLoss?${plParams.toString()}`
  );

  // Helper to check if account is COGS or Expense (not Income)
  const isExpenseAccount = (accountName: string): boolean => {
    if (!accountName) return false;

    // Match by account number first (5xxxx or 6xxxx)
    const numberMatch = accountName.match(/^(\d{5})/);
    if (numberMatch) {
      const num = numberMatch[1];
      return /^[56]\d{4}/.test(num);
    }

    // If no number, match by account name keywords for COGS and Expenses
    const lowerName = accountName.toLowerCase();

    // Explicitly exclude income
    if (
      lowerName.includes('income') ||
      lowerName.includes('revenue') ||
      lowerName.includes('sales')
    ) {
      return false;
    }

    // Include COGS and common expense categories
    const expenseKeywords = [
      'cost of goods',
      'cogs',
      'materials',
      'labor',
      'equipment',
      'supplies',
      'freight',
      'shipping',
      'concrete',
      'steel',
      'lumber',
      'electrical',
      'plumbing',
      'hvac',
      'roofing',
      'flooring',
      'drywall',
      'painting',
      'landscaping',
      'excavation',
      'grading',
      'foundation',
      'framing',
      'insulation',
      'windows',
      'doors',
      'cabinets',
      'countertops',
      'appliances',
      'fixtures',
      'tile',
      'carpet',
      'hardwood',
      'siding',
      'gutters',
      'fencing',
      'irrigation',
      'sprinklers',
      'decks and patios',
      'pest control',
      'wages',
      'salaries',
      'payroll',
      'benefits',
      'reimbursements',
      'travel expense',
      'subcontractors',
    ];

    return expenseKeywords.some((keyword) => lowerName.includes(keyword));
  };

  // Traverse P&L report rows recursively
  const traverseRows = (rows: any[], depth: number = 0) => {
    if (!rows) return;

    rows.forEach((row: any) => {
      // Check for section headers (Income, COGS, Expenses)
      if (row.Header) {
        const headerText = row.Header.ColData?.[0]?.value || '';
        const headerAmountStr = (row.Header.ColData?.[1]?.value || '').replace(
          /[,()]/g,
          ''
        );
        const headerAmount = parseFloat(headerAmountStr) || 0;

        // Skip income section entirely
        if (headerText.toLowerCase().includes('income')) {
          return;
        }

        // If this section has an amount AND is an expense account, add the parent amount
        if (headerAmount !== 0 && isExpenseAccount(headerText)) {
          totalCost += Math.abs(headerAmount);
          accountsUsed.add(headerText);
        }

        // Also traverse children to add their amounts (parent + children = total)
        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row, depth + 1);
        }
        return;
      }

      // Check for Summary rows (subtotals) - skip these
      if (row.Summary) {
        return;
      }

      // Data rows with account details
      if (row.ColData && row.ColData[0]?.value) {
        const accountName = row.ColData[0].value;
        const amountStr = (row.ColData[1]?.value || '0').replace(/[,()]/g, '');
        const amount = parseFloat(amountStr) || 0;

        // Only include expense/COGS accounts
        if (isExpenseAccount(accountName) && amount !== 0) {
          // P&L shows expenses as positive, so we add them
          totalCost += Math.abs(amount);
          accountsUsed.add(accountName);
        }
      }

      // Recursively process nested rows
      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row, depth + 1);
      }
    });
  };

  if (profitAndLoss?.Rows?.Row) {
    traverseRows(profitAndLoss.Rows.Row, 0);
  }

  return {
    payrollTotal: totalCost,
    accountsChecked: Array.from(accountsUsed),
    transactionsFound: accountsUsed.size,
    method: 'ProfitAndLoss_Cash',
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

  if (!qboJobId || typeof qboJobId !== 'string') {
    return res.status(400).json({ error: 'qboJobId is required' });
  }

  try {
    const result = await fetchPayrollFromGLCash(
      qboJobId,
      startDate as string | undefined,
      endDate as string | undefined
    );
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error fetching cash basis payroll from GL:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
