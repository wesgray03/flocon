// api/qbo/project-costs.ts
// Production endpoint to fetch QuickBooks cost data for a specific project
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ProjectCosts {
  billsTotal: number;
  purchasesTotal: number;
  journalEntriesTotal: number;
  timeActivityTotal: number;
  payrollTotal: number;
  creditsTotal: number;
  netCostToDate: number;
  transactionCount: number;
  lastUpdated: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectCosts | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qboJobId, startDate, endDate } = req.query;

  if (!qboJobId) {
    return res.status(400).json({ error: 'qboJobId is required' });
  }

  try {
    // Helper function to check if a line item references the job
    const lineReferencesJob = (line: any, jobId: string): boolean => {
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

    const dateStart = (startDate as string) || '2000-01-01';
    const dateEnd = (endDate as string) || '2099-12-31';

    // Query Bills
    const billsQuery = `SELECT * FROM Bill WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const billsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(billsQuery)}`
    );
    const allBills = billsResult?.QueryResponse?.Bill || [];

    let billsTotal = 0;
    let billsCount = 0;
    allBills.forEach((bill: any) => {
      const lines = bill.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          billsTotal += getLineAmount(line);
          billsCount++;
        }
      });
    });

    // Query Purchases
    const purchasesQuery = `SELECT * FROM Purchase WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const purchasesResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(purchasesQuery)}`
    );
    const allPurchases = purchasesResult?.QueryResponse?.Purchase || [];

    let purchasesTotal = 0;
    let purchasesCount = 0;
    allPurchases.forEach((purchase: any) => {
      const lines = purchase.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          purchasesTotal += getLineAmount(line);
          purchasesCount++;
        }
      });
    });

    // Query Journal Entries (manual cost allocations)
    const journalQuery = `SELECT * FROM JournalEntry WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const journalResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(journalQuery)}`
    );
    const allJournalEntries = journalResult?.QueryResponse?.JournalEntry || [];

    let journalEntriesTotal = 0;
    let journalEntriesCount = 0;
    allJournalEntries.forEach((journal: any) => {
      const lines = journal.Line || [];
      lines.forEach((line: any) => {
        // Journal entries have different structure - check JournalEntryLineDetail
        const customerRef =
          line.JournalEntryLineDetail?.Entity?.EntityRef?.value;
        if (
          customerRef === qboJobId &&
          line.JournalEntryLineDetail?.PostingType === 'Debit'
        ) {
          journalEntriesTotal += getLineAmount(line);
          journalEntriesCount++;
        }
      });
    });

    // Query Time Activities (billable labor)
    const timeQuery = `SELECT * FROM TimeActivity WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const timeResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(timeQuery)}`
    );
    const allTimeActivities = timeResult?.QueryResponse?.TimeActivity || [];

    let timeActivityTotal = 0;
    let timeActivityCount = 0;
    allTimeActivities.forEach((time: any) => {
      // TimeActivity has CustomerRef at root level
      if (time.CustomerRef?.value === qboJobId) {
        // Calculate cost: hours * cost rate (or hourly rate if cost rate not set)
        const hours =
          parseFloat(time.Hours || '0') + parseFloat(time.Minutes || '0') / 60;
        const rate = parseFloat(time.CostRate || time.HourlyRate || '0');
        timeActivityTotal += hours * rate;
        timeActivityCount++;
      }
    });

    // Query Vendor Credits
    const creditsQuery = `SELECT * FROM VendorCredit WHERE TxnDate >= '${dateStart}' AND TxnDate <= '${dateEnd}' MAXRESULTS 1000`;
    const creditsResult: any = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(creditsQuery)}`
    );
    const allCredits = creditsResult?.QueryResponse?.VendorCredit || [];

    let creditsTotal = 0;
    let creditsCount = 0;
    allCredits.forEach((credit: any) => {
      const lines = credit.Line || [];
      lines.forEach((line: any) => {
        if (lineReferencesJob(line, qboJobId as string)) {
          creditsTotal += getLineAmount(line);
          creditsCount++;
        }
      });
    });

    // Fetch payroll costs from General Ledger
    let payrollTotal = 0;
    try {
      const payrollResponse = await fetch(
        `${req.headers.origin || 'http://localhost:3000'}/api/qbo/payroll-from-gl?qboJobId=${qboJobId}&startDate=${dateStart}&endDate=${dateEnd}`,
        {
          headers: {
            Cookie: req.headers.cookie || '',
          },
        }
      );

      if (payrollResponse.ok) {
        const payrollData = await payrollResponse.json();
        payrollTotal = payrollData.payrollTotal || 0;
        console.log(`Payroll from GL: $${payrollTotal}`);
      } else {
        console.log(
          'Payroll data not available:',
          await payrollResponse.text()
        );
      }
    } catch (payrollError: any) {
      console.log('Could not fetch payroll data:', payrollError.message);
      // Continue without payroll data
    }

    const netCostToDate =
      billsTotal +
      purchasesTotal +
      journalEntriesTotal +
      timeActivityTotal +
      payrollTotal -
      creditsTotal;

    return res.status(200).json({
      billsTotal,
      purchasesTotal,
      journalEntriesTotal,
      timeActivityTotal,
      payrollTotal,
      creditsTotal,
      netCostToDate,
      transactionCount:
        billsCount +
        purchasesCount +
        journalEntriesCount +
        timeActivityCount +
        creditsCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching QBO project costs:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch project costs from QuickBooks',
    });
  }
}
