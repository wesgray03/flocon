// api/qbo/test-entity-types.ts
// Test which QuickBooks entity types are queryable for cost tracking
import { makeQBORequest } from '@/lib/qboClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const entityTypes = [
    // Cost/Expense related entities
    'Bill',
    'Purchase',
    'VendorCredit',
    'JournalEntry',
    'Expense', // Might be same as Purchase
    'Check', // Might be same as Purchase
    'CreditCardCredit',
    'PayrollCheck', // We know this doesn't work
    'TimeActivity', // Billable time tracking

    // Payables
    'BillPayment',

    // Revenue related (for reference)
    'Invoice',
    'Payment',
    'CreditMemo',
    'SalesReceipt',
    'Estimate',
  ];

  const results: any = {};

  console.log('\n=== Testing QuickBooks Entity Types ===\n');

  for (const entityType of entityTypes) {
    try {
      console.log(`Testing ${entityType}...`);
      const query = `SELECT * FROM ${entityType} MAXRESULTS 1`;
      const result: any = await makeQBORequest(
        'GET',
        `query?query=${encodeURIComponent(query)}`
      );

      const data = result?.QueryResponse?.[entityType];
      results[entityType] = {
        queryable: true,
        hasData: data && data.length > 0,
        count: data?.length || 0,
        sample: data?.[0] || null,
      };
      console.log(`  ✓ ${entityType}: Queryable, ${data?.length || 0} records`);
    } catch (error: any) {
      const errorMsg = error.message || error.toString();
      const isInvalid =
        errorMsg.includes('invalid context declaration') ||
        errorMsg.includes('Invalid query');
      results[entityType] = {
        queryable: false,
        error: isInvalid ? 'Not queryable via API' : errorMsg,
      };
      console.log(
        `  ✗ ${entityType}: ${isInvalid ? 'Not queryable' : 'Error'}`
      );
    }
  }

  console.log('\n=== Summary ===');
  const queryableEntities = Object.keys(results).filter(
    (k) => results[k].queryable
  );
  console.log(
    `Queryable entities (${queryableEntities.length}):`,
    queryableEntities
  );

  const costRelatedQueryable = queryableEntities.filter((e) =>
    [
      'Bill',
      'Purchase',
      'VendorCredit',
      'JournalEntry',
      'Expense',
      'Check',
      'CreditCardCredit',
      'TimeActivity',
      'BillPayment',
    ].includes(e)
  );
  console.log(
    `Cost-related queryable entities (${costRelatedQueryable.length}):`,
    costRelatedQueryable
  );

  return res.status(200).json({
    success: true,
    tested: entityTypes.length,
    results,
    summary: {
      queryable: queryableEntities,
      costRelated: costRelatedQueryable,
      recommendations: [
        'Use Bill for vendor invoices',
        'Use Purchase for checks, credit cards, cash',
        'Use VendorCredit to reduce costs',
        'Use JournalEntry for manual cost allocations',
        'Use TimeActivity for billable labor hours (if tracked)',
        'PayrollCheck is NOT queryable via API',
      ],
    },
  });
}
