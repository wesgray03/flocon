// api/qbo/profit-loss-cash.ts
// Fetch complete Profit & Loss report (CASH BASIS) filtered by customer
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ProfitLossCashResult {
  income: number;
  cogs: number;
  expenses: number;
  netIncome: number;
  incomeAccounts: string[];
  expenseAccounts: string[];
  method: string;
}

// Exported function to fetch P&L cash basis
export async function fetchProfitLossCash(
  qboJobId: string,
  startDate?: string,
  endDate?: string
): Promise<ProfitLossCashResult> {
  const dateStart = startDate || '2000-01-01';
  const dateEnd = endDate || '2099-12-31';

  let income = 0;
  let cogs = 0;
  let expenses = 0;
  const incomeAccounts = new Set<string>();
  const expenseAccounts = new Set<string>();

  // Use ProfitAndLoss report with customer filter - CASH BASIS
  const plParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    accounting_method: 'Cash',
    customer: qboJobId,
    summarize_column_by: 'Total',
  });

  console.log(`Fetching Cash Basis P&L for customer ${qboJobId}...`);

  const profitAndLoss: any = await makeQBORequest(
    'GET',
    `reports/ProfitAndLoss?${plParams.toString()}`
  );

  // Traverse P&L report rows recursively
  const traverseRows = (rows: any[], currentSection: 'income' | 'cogs' | 'expenses' | 'other' = 'other') => {
    if (!rows) return;

    rows.forEach((row: any) => {
      // Check for section headers
      if (row.Header) {
        const headerText = (row.Header.ColData?.[0]?.value || '').toLowerCase();
        const headerAmountStr = (row.Header.ColData?.[1]?.value || '').replace(/[,()]/g, '');
        const headerAmount = parseFloat(headerAmountStr) || 0;

        // Determine section
        let section: 'income' | 'cogs' | 'expenses' | 'other' = 'other';
        if (headerText.includes('income') || headerText.includes('revenue')) {
          section = 'income';
        } else if (headerText.includes('cost of goods') || headerText.includes('cogs')) {
          section = 'cogs';
        } else if (headerText.includes('expense')) {
          section = 'expenses';
        }

        // Add header amount if not zero
        if (headerAmount !== 0) {
          if (section === 'income') {
            income += Math.abs(headerAmount);
            incomeAccounts.add(row.Header.ColData?.[0]?.value || 'Unknown');
          } else if (section === 'cogs') {
            cogs += Math.abs(headerAmount);
            expenseAccounts.add(row.Header.ColData?.[0]?.value || 'Unknown');
          } else if (section === 'expenses') {
            expenses += Math.abs(headerAmount);
            expenseAccounts.add(row.Header.ColData?.[0]?.value || 'Unknown');
          }
        }

        // Traverse children with current section context
        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row, section);
        }
        return;
      }

      // Skip Summary rows
      if (row.Summary) {
        return;
      }

      // Data rows with account details
      if (row.ColData && row.ColData[0]?.value) {
        const accountName = row.ColData[0].value;
        const amountStr = (row.ColData[1]?.value || '0').replace(/[,()]/g, '');
        const amount = parseFloat(amountStr) || 0;

        if (amount !== 0) {
          if (currentSection === 'income') {
            income += Math.abs(amount);
            incomeAccounts.add(accountName);
          } else if (currentSection === 'cogs') {
            cogs += Math.abs(amount);
            expenseAccounts.add(accountName);
          } else if (currentSection === 'expenses') {
            expenses += Math.abs(amount);
            expenseAccounts.add(accountName);
          }
        }
      }

      // Recursively process nested rows
      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row, currentSection);
      }
    });
  };

  if (profitAndLoss?.Rows?.Row) {
    traverseRows(profitAndLoss.Rows.Row);
  }

  const netIncome = income - cogs - expenses;

  return {
    income,
    cogs,
    expenses,
    netIncome,
    incomeAccounts: Array.from(incomeAccounts),
    expenseAccounts: Array.from(expenseAccounts),
    method: 'ProfitAndLoss_Cash',
  };
}

// API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfitLossCashResult | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, startDate, endDate } = req.query;

  if (!qboJobId || typeof qboJobId !== 'string') {
    return res.status(400).json({ error: 'qboJobId is required' });
  }

  try {
    const result = await fetchProfitLossCash(
      qboJobId,
      startDate as string | undefined,
      endDate as string | undefined
    );
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error fetching cash basis P&L:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
