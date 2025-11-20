// api/qbo/payroll-from-gl.ts
// Fetch costs from QuickBooks Profit & Loss report filtered by customer
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface PayrollGLCosts {
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: string;
}

// Exported function to fetch costs using P&L report with customer filter
export async function fetchPayrollFromGL(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<PayrollGLCosts> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let totalCost = 0;
  const accountsUsed = new Set<string>();

  // Use ProfitAndLoss report with customer filter
  const plParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    accounting_method: 'Accrual',
    customer: qboJobId,
  });

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
    if (lowerName.includes('income') || lowerName.includes('revenue') || lowerName.includes('sales')) {
      return false;
    }
    
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
      const indent = '  '.repeat(depth);
      
      // Check for section headers (Income, COGS, Expenses)
      if (row.Header) {
        const headerText = row.Header.ColData?.[0]?.value || '';
        console.log(`${indent}📁 Section: "${headerText}"`);
        
        // Skip income section entirely
        if (headerText.toLowerCase().includes('income')) {
          console.log(`${indent}  ⏭️  Skipping income section`);
          return;
        }
        
        // Process subsections
        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row, depth + 1);
        }
        return;
      }

      // Data rows with account details
      if (row.ColData && row.ColData[0]?.value) {
        const accountName = row.ColData[0].value;
        const amountStr = (row.ColData[1]?.value || '0').replace(/[,()]/g, '');
        const amount = parseFloat(amountStr) || 0;

        console.log(`${indent}Account: "${accountName}" Amount: $${amount}`);

        // Only include expense/COGS accounts
        if (isExpenseAccount(accountName) && amount !== 0) {
          // P&L shows expenses as positive, so we add them
          totalCost += Math.abs(amount);
          accountsUsed.add(accountName);
          console.log(`${indent}  ✅ Added: $${Math.abs(amount)}`);
        } else if (amount !== 0) {
          console.log(`${indent}  ❌ Skipped (not expense account)`);
        }
      }

      // Recursively process nested rows
      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row, depth + 1);
      }
    });
  };

  if (profitAndLoss?.Rows?.Row) {
    console.log('🔍 Traversing P&L Report Structure for job', qboJobId);
    traverseRows(profitAndLoss.Rows.Row, 0);
    console.log(`\n💰 Final Total: $${totalCost.toFixed(2)} from ${accountsUsed.size} accounts`);
  } else {
    console.log('❌ No rows found in P&L report for job', qboJobId);
  }

  return {
    payrollTotal: totalCost,
    accountsChecked: Array.from(accountsUsed),
    transactionsFound: accountsUsed.size,
    method: 'ProfitAndLoss',
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
