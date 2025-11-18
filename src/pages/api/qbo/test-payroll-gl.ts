// api/qbo/test-payroll-gl.ts
// Test reading payroll data from General Ledger and Transaction reports
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

  console.log('\n=== Testing Payroll Data Access via Reports/GL ===\n');

  // Test 1: Transaction List (all transactions)
  try {
    console.log('Testing TransactionList report...');
    const params = new URLSearchParams({
      start_date: (startDate as string) || '2024-01-01',
      end_date: (endDate as string) || '2025-12-31',
      transaction_type: 'ALL',
    });

    const transactionList: any = await makeQBORequest(
      'GET',
      `reports/TransactionList?${params.toString()}`
    );

    results.transactionList = {
      success: true,
      hasData: !!transactionList.Rows,
      sample: transactionList.Rows?.Row?.[0] || null,
    };
    console.log('✓ TransactionList report accessible');
  } catch (error: any) {
    results.transactionList = {
      success: false,
      error: error.message,
    };
    console.log('✗ TransactionList report failed:', error.message);
  }

  // Test 2: General Ledger
  try {
    console.log('Testing GeneralLedger report...');
    const params = new URLSearchParams({
      start_date: (startDate as string) || '2024-01-01',
      end_date: (endDate as string) || '2025-12-31',
    });

    const generalLedger: any = await makeQBORequest(
      'GET',
      `reports/GeneralLedger?${params.toString()}`
    );

    results.generalLedger = {
      success: true,
      hasData: !!generalLedger.Rows,
      sample: generalLedger.Rows?.Row?.[0] || null,
    };
    console.log('✓ GeneralLedger report accessible');
  } catch (error: any) {
    results.generalLedger = {
      success: false,
      error: error.message,
    };
    console.log('✗ GeneralLedger report failed:', error.message);
  }

  // Test 3: Transaction List by Customer (filtered)
  if (qboJobId) {
    try {
      console.log(`Testing TransactionList for customer ${qboJobId}...`);
      const params = new URLSearchParams({
        start_date: (startDate as string) || '2024-01-01',
        end_date: (endDate as string) || '2025-12-31',
        customer: qboJobId as string,
      });

      const customerTransactions: any = await makeQBORequest(
        'GET',
        `reports/TransactionList?${params.toString()}`
      );

      results.customerTransactions = {
        success: true,
        hasData: !!customerTransactions.Rows,
        rows: customerTransactions.Rows?.Row || [],
      };
      console.log('✓ Customer-filtered TransactionList accessible');
    } catch (error: any) {
      results.customerTransactions = {
        success: false,
        error: error.message,
      };
      console.log('✗ Customer-filtered TransactionList failed:', error.message);
    }
  }

  // Test 4: Try Journal Report (includes all GL postings)
  try {
    console.log('Testing JournalReport...');
    const params = new URLSearchParams({
      start_date: (startDate as string) || '2024-01-01',
      end_date: (endDate as string) || '2025-12-31',
    });

    const journalReport: any = await makeQBORequest(
      'GET',
      `reports/JournalReport?${params.toString()}`
    );

    results.journalReport = {
      success: true,
      hasData: !!journalReport.Rows,
      sample: journalReport.Rows?.Row?.[0] || null,
    };
    console.log('✓ JournalReport accessible');
  } catch (error: any) {
    results.journalReport = {
      success: false,
      error: error.message,
    };
    console.log('✗ JournalReport failed:', error.message);
  }

  // Test 5: Try to find payroll expense accounts in GL
  try {
    console.log('Testing Account query for payroll accounts...');
    const accountQuery = `SELECT * FROM Account WHERE AccountType = 'Expense' AND AccountSubType LIKE '%Payroll%' MAXRESULTS 100`;

    const accounts: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(accountQuery)}`
    );

    const payrollAccounts = accounts?.QueryResponse?.Account || [];
    results.payrollAccounts = {
      success: true,
      count: payrollAccounts.length,
      accounts: payrollAccounts.map((acc: any) => ({
        id: acc.Id,
        name: acc.Name,
        type: acc.AccountType,
        subType: acc.AccountSubType,
      })),
    };
    console.log(`✓ Found ${payrollAccounts.length} payroll-related accounts`);
  } catch (error: any) {
    results.payrollAccounts = {
      success: false,
      error: error.message,
    };
    console.log('✗ Payroll account query failed:', error.message);
  }

  console.log('\n=== Summary ===');
  const accessible = Object.keys(results).filter((k) => results[k].success);
  console.log(`Accessible: ${accessible.join(', ')}`);

  return res.status(200).json({
    success: true,
    results,
    recommendations: [
      'If TransactionList works: Can read all transaction types including payroll postings',
      'If GeneralLedger works: Can extract payroll costs from GL entries by account',
      'If JournalReport works: Can see detailed journal entries including payroll',
      'Query payroll expense accounts and sum GL activity for job costing',
    ],
    nextSteps: qboJobId
      ? 'Check customer transactions for payroll-related entries'
      : 'Provide qboJobId parameter to test customer-specific filtering',
  });
}
