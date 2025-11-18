// api/qbo/pull-bills-test.ts
// Test endpoint to explore QuickBooks cost data via transaction queries
// Fallback to transaction-based approach since Reports API requires additional permissions
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

  try {
    console.log('\n=== Exploring QuickBooks Cost Transactions ===');
    console.log(`QBO Job ID: ${qboJobId}`);

    // Helper function to check if a line item references the job
    const lineReferencesJob = (line: any, jobId: string): boolean => {
      // Check various possible locations for customer/job reference
      const customerRef =
        line.CustomerRef?.value ||
        line.AccountBasedExpenseLineDetail?.CustomerRef?.value ||
        line.ItemBasedExpenseLineDetail?.CustomerRef?.value;
      return customerRef === jobId;
    };

    // Helper to extract amount from line item
    const getLineAmount = (line: any): number => {
      return parseFloat(line.Amount || '0');
    };

    // Test 1: Query Bills
    console.log('\n--- Querying Bills ---');
    const billsQuery = `SELECT * FROM Bill WHERE TxnDate >= '${startDate || '2024-01-01'}' AND TxnDate <= '${endDate || '2025-12-31'}' MAXRESULTS 1000`;
    const billsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(billsQuery)}`
    );
    const allBills = billsResult?.QueryResponse?.Bill || [];
    console.log(`Found ${allBills.length} bills in date range`);

    // Log sample bill structure for debugging
    if (allBills.length > 0) {
      console.log('\nSample Bill Structure:');
      console.log(JSON.stringify(allBills[0], null, 2));
    }

    // Filter bills by job ID if provided
    let jobBills: any[] = [];
    let billsTotal = 0;
    if (qboJobId && allBills.length > 0) {
      jobBills = allBills.filter((bill: any) => {
        // Check if any line item references this job
        const lines = bill.Line || [];
        return lines.some((line: any) =>
          lineReferencesJob(line, qboJobId as string)
        );
      });

      // Calculate total from matching line items only
      jobBills.forEach((bill: any) => {
        const lines = bill.Line || [];
        lines.forEach((line: any) => {
          if (lineReferencesJob(line, qboJobId as string)) {
            billsTotal += getLineAmount(line);
          }
        });
      });

      console.log(`Found ${jobBills.length} bills for job ${qboJobId}`);
      console.log(`Bills total for job: $${billsTotal.toFixed(2)}`);
    }

    // Test 2: Query Purchase transactions (checks, credit cards, cash)
    console.log('\n--- Querying Purchases ---');
    const purchasesQuery = `SELECT * FROM Purchase WHERE TxnDate >= '${startDate || '2024-01-01'}' AND TxnDate <= '${endDate || '2025-12-31'}' MAXRESULTS 1000`;
    const purchasesResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(purchasesQuery)}`
    );
    const allPurchases = purchasesResult?.QueryResponse?.Purchase || [];
    console.log(`Found ${allPurchases.length} purchases in date range`);

    // Log sample purchase structure for debugging
    if (allPurchases.length > 0) {
      console.log('\nSample Purchase Structure:');
      console.log(JSON.stringify(allPurchases[0], null, 2));
    }

    let jobPurchases: any[] = [];
    let purchasesTotal = 0;
    if (qboJobId && allPurchases.length > 0) {
      jobPurchases = allPurchases.filter((purchase: any) => {
        const lines = purchase.Line || [];
        return lines.some((line: any) =>
          lineReferencesJob(line, qboJobId as string)
        );
      });

      jobPurchases.forEach((purchase: any) => {
        const lines = purchase.Line || [];
        lines.forEach((line: any) => {
          if (lineReferencesJob(line, qboJobId as string)) {
            purchasesTotal += getLineAmount(line);
          }
        });
      });

      console.log(`Found ${jobPurchases.length} purchases for job ${qboJobId}`);
      console.log(`Purchases total for job: $${purchasesTotal.toFixed(2)}`);
    }

    // Test 3: Query Payroll Checks
    console.log('\n--- Querying Payroll Checks ---');
    const payrollQuery = `SELECT * FROM PayrollCheck WHERE TxnDate >= '${startDate || '2024-01-01'}' AND TxnDate <= '${endDate || '2025-12-31'}' MAXRESULTS 1000`;
    const payrollResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(payrollQuery)}`
    );
    const allPayrollChecks = payrollResult?.QueryResponse?.PayrollCheck || [];
    console.log(
      `Found ${allPayrollChecks.length} payroll checks in date range`
    );

    // Log sample payroll structure for debugging
    if (allPayrollChecks.length > 0) {
      console.log('\nSample Payroll Check Structure:');
      console.log(JSON.stringify(allPayrollChecks[0], null, 2));
    }

    let jobPayrollChecks: any[] = [];
    let payrollTotal = 0;
    if (qboJobId && allPayrollChecks.length > 0) {
      jobPayrollChecks = allPayrollChecks.filter((paycheck: any) => {
        const lines = paycheck.Line || [];
        return lines.some((line: any) =>
          lineReferencesJob(line, qboJobId as string)
        );
      });

      jobPayrollChecks.forEach((paycheck: any) => {
        const lines = paycheck.Line || [];
        lines.forEach((line: any) => {
          if (lineReferencesJob(line, qboJobId as string)) {
            payrollTotal += getLineAmount(line);
          }
        });
      });

      console.log(
        `Found ${jobPayrollChecks.length} payroll checks for job ${qboJobId}`
      );
      console.log(`Payroll total for job: $${payrollTotal.toFixed(2)}`);
    }

    // Test 4: Query Vendor Credits (subtract from costs)
    console.log('\n--- Querying Vendor Credits ---');
    const creditsQuery = `SELECT * FROM VendorCredit WHERE TxnDate >= '${startDate || '2024-01-01'}' AND TxnDate <= '${endDate || '2025-12-31'}' MAXRESULTS 1000`;
    const creditsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(creditsQuery)}`
    );
    const allCredits = creditsResult?.QueryResponse?.VendorCredit || [];
    console.log(`Found ${allCredits.length} vendor credits in date range`);

    let jobCredits: any[] = [];
    let creditsTotal = 0;
    if (qboJobId && allCredits.length > 0) {
      jobCredits = allCredits.filter((credit: any) => {
        const lines = credit.Line || [];
        return lines.some((line: any) =>
          lineReferencesJob(line, qboJobId as string)
        );
      });

      jobCredits.forEach((credit: any) => {
        const lines = credit.Line || [];
        lines.forEach((line: any) => {
          if (lineReferencesJob(line, qboJobId as string)) {
            creditsTotal += getLineAmount(line);
          }
        });
      });

      console.log(
        `Found ${jobCredits.length} vendor credits for job ${qboJobId}`
      );
      console.log(`Credits total for job: $${creditsTotal.toFixed(2)}`);
    }

    // Calculate net costs
    const netCosts = billsTotal + purchasesTotal + payrollTotal - creditsTotal;

    console.log('\n=== Summary ===');
    console.log(`Bills: $${billsTotal.toFixed(2)}`);
    console.log(`Purchases: $${purchasesTotal.toFixed(2)}`);
    console.log(`Payroll: $${payrollTotal.toFixed(2)}`);
    console.log(`Credits: -$${creditsTotal.toFixed(2)}`);
    console.log(`Net Cost-to-Date: $${netCosts.toFixed(2)}`);

    return res.status(200).json({
      success: true,
      summary: {
        qboJobId: qboJobId || 'Not provided',
        dateRange: `${startDate || '2024-01-01'} to ${endDate || '2025-12-31'}`,
        totalBillsInRange: allBills.length,
        totalPurchasesInRange: allPurchases.length,
        totalPayrollChecksInRange: allPayrollChecks.length,
        totalCreditsInRange: allCredits.length,
        billsCount: jobBills.length,
        billsTotal: billsTotal,
        purchasesCount: jobPurchases.length,
        purchasesTotal: purchasesTotal,
        payrollCount: jobPayrollChecks.length,
        payrollTotal: payrollTotal,
        creditsCount: jobCredits.length,
        creditsTotal: creditsTotal,
        netCostToDate: netCosts,
      },
      allTransactionsSample: {
        sampleBill: allBills[0] || null,
        samplePurchase: allPurchases[0] || null,
        samplePayrollCheck: allPayrollChecks[0] || null,
        sampleCredit: allCredits[0] || null,
      },
      details: {
        bills: jobBills.map((bill: any) => ({
          id: bill.Id,
          docNumber: bill.DocNumber,
          txnDate: bill.TxnDate,
          vendor: bill.VendorRef?.name,
          totalAmt: bill.TotalAmt,
          jobLines: bill.Line?.filter((line: any) =>
            lineReferencesJob(line, qboJobId as string)
          ).map((line: any) => ({
            description: line.Description,
            amount: line.Amount,
            accountName:
              line.AccountBasedExpenseLineDetail?.AccountRef?.name ||
              line.ItemBasedExpenseLineDetail?.ItemRef?.name,
          })),
        })),
        purchases: jobPurchases.map((purchase: any) => ({
          id: purchase.Id,
          docNumber: purchase.DocNumber,
          txnDate: purchase.TxnDate,
          paymentType: purchase.PaymentType,
          accountRef: purchase.AccountRef?.name,
          totalAmt: purchase.TotalAmt,
          jobLines: purchase.Line?.filter((line: any) =>
            lineReferencesJob(line, qboJobId as string)
          ).map((line: any) => ({
            description: line.Description,
            amount: line.Amount,
            accountName: line.AccountBasedExpenseLineDetail?.AccountRef?.name,
          })),
        })),
        payrollChecks: jobPayrollChecks.map((paycheck: any) => ({
          id: paycheck.Id,
          docNumber: paycheck.DocNumber,
          txnDate: paycheck.TxnDate,
          employee: paycheck.EmployeeRef?.name,
          totalAmt: paycheck.TotalAmt,
          jobLines: paycheck.Line?.filter((line: any) =>
            lineReferencesJob(line, qboJobId as string)
          ).map((line: any) => ({
            description: line.Description,
            amount: line.Amount,
          })),
        })),
        credits: jobCredits.map((credit: any) => ({
          id: credit.Id,
          docNumber: credit.DocNumber,
          txnDate: credit.TxnDate,
          vendor: credit.VendorRef?.name,
          totalAmt: credit.TotalAmt,
          jobLines: credit.Line?.filter((line: any) =>
            lineReferencesJob(line, qboJobId as string)
          ).map((line: any) => ({
            description: line.Description,
            amount: line.Amount,
          })),
        })),
      },
      notes: {
        approach: 'Transaction-based querying with line-item filtering',
        filtering: 'Checks CustomerRef in each line item to match job',
        calculation:
          'Bills + Purchases + Payroll - Vendor Credits = Net Cost-to-Date',
        implementation: 'This approach works with standard Accounting scope',
      },
    });
  } catch (error: any) {
    console.error('Error exploring QBO costs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to query QuickBooks costs',
      details: error.toString(),
      response: error.response?.data || null,
    });
  }
}
