// api/qbo/test-payroll-transactions.ts
// Test if we can read Payroll Check transactions via TransactionList report
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, startDate, endDate } = req.query;
  const results: any = {};

  console.log('\n=== Testing Payroll Check Transaction Access ===\n');

  // Test 1: TransactionList without type filter
  try {
    console.log('Testing TransactionList (no type filter)...');
    const params = new URLSearchParams({
      start_date: (startDate as string) || '2024-01-01',
      end_date: (endDate as string) || '2025-12-31',
    });

    if (qboJobId) {
      params.append('customer', qboJobId as string);
    }

    const transactionList: any = await makeQBORequest(
      'GET',
      `reports/TransactionList?${params.toString()}`
    );

    const rows = transactionList.Rows?.Row || [];
    const payrollRows = rows.filter((row: any) => {
      const txnType = row.ColData?.[1]?.value || '';
      return txnType.toLowerCase().includes('payroll');
    });

    results.transactionListAll = {
      success: true,
      totalRows: rows.length,
      payrollRows: payrollRows.length,
      samplePayrollRow: payrollRows[0] || null,
    };

    console.log(
      `✓ Found ${payrollRows.length} payroll transactions out of ${rows.length} total`
    );
  } catch (error: any) {
    results.transactionListAll = {
      success: false,
      error: error.message,
    };
    console.log('✗ TransactionList failed:', error.message);
  }

  // Test 2: Try TransactionList with specific transaction types
  const typesToTry = [
    'PayrollCheck',
    'Payroll Check',
    'Paycheck',
    'Check', // Might include payroll checks
  ];

  for (const txnType of typesToTry) {
    try {
      console.log(`Testing TransactionList with type=${txnType}...`);
      const params = new URLSearchParams({
        start_date: (startDate as string) || '2024-01-01',
        end_date: (endDate as string) || '2025-12-31',
        transaction_type: txnType,
      });

      if (qboJobId) {
        params.append('customer', qboJobId as string);
      }

      const result: any = await makeQBORequest(
        'GET',
        `reports/TransactionList?${params.toString()}`
      );

      results[`type_${txnType.replace(/\s/g, '_')}`] = {
        success: true,
        rowCount: result.Rows?.Row?.length || 0,
      };

      console.log(`✓ ${txnType}: ${result.Rows?.Row?.length || 0} rows`);
    } catch (error: any) {
      results[`type_${txnType.replace(/\s/g, '_')}`] = {
        success: false,
        error: error.message,
      };
      console.log(`✗ ${txnType}: ${error.message}`);
    }
  }

  // Test 3: GeneralLedgerDetail for payroll accounts
  try {
    console.log('Testing GL for payroll accounts...');

    // Query for common payroll account
    const params = new URLSearchParams({
      start_date: (startDate as string) || '2024-01-01',
      end_date: (endDate as string) || '2025-12-31',
    });

    const gl: any = await makeQBORequest(
      'GET',
      `reports/GeneralLedger?${params.toString()}`
    );

    // Look for payroll-related entries
    let payrollEntries = 0;
    const traverseRows = (rows: any[]) => {
      rows.forEach((row: any) => {
        if (row.ColData) {
          const account = row.ColData[5]?.value || '';
          const txnType = row.ColData[1]?.value || '';
          if (
            account.toLowerCase().includes('wage') ||
            account.toLowerCase().includes('salary') ||
            account.toLowerCase().includes('payroll') ||
            txnType.toLowerCase().includes('payroll')
          ) {
            payrollEntries++;
          }
        }
        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row);
        }
      });
    };

    if (gl.Rows?.Row) {
      traverseRows(gl.Rows.Row);
    }

    results.generalLedgerPayroll = {
      success: true,
      payrollEntriesFound: payrollEntries,
    };

    console.log(`✓ GL: Found ${payrollEntries} payroll-related entries`);
  } catch (error: any) {
    results.generalLedgerPayroll = {
      success: false,
      error: error.message,
    };
  }

  return res.status(200).json({
    success: true,
    results,
    recommendation:
      results.transactionListAll?.payrollRows > 0
        ? 'TransactionList report includes Payroll Check transactions - use this method'
        : 'Use General Ledger method to extract payroll costs by account',
  });
}
