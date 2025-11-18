# QuickBooks Online Cost Tracking Integration

## Overview

FloCon integrates with QuickBooks Online (QBO) to track project costs in real-time. This document explains how cost data is extracted from QBO and integrated into the Financial Overview.

## Architecture

### Cost Categories Tracked

1. **Bills** - Vendor bills for materials, services, etc.
2. **Purchases** - Direct purchases (credit card, cash)
3. **Journal Entries** - Manual accounting adjustments
4. **Time Activities** - Billable/non-billable time entries
5. **Payroll Checks** - Employee payroll costs
6. **Vendor Credits** - Credits/refunds (subtracted from total)

### API Endpoints

#### `/api/qbo/project-costs`

Main endpoint that aggregates all cost categories for a project.

**Parameters:**

- `qboJobId` (required) - QuickBooks Customer/Job ID
- `startDate` (optional) - Filter costs after this date
- `endDate` (optional) - Filter costs before this date

**Returns:**

```typescript
{
  bills: number;
  purchases: number;
  journalEntries: number;
  timeActivities: number;
  payroll: number;
  vendorCredits: number;
  totalCost: number;
}
```

**Implementation:**

- Uses QBO Query API for Bills, Purchases, JournalEntry, TimeActivity, VendorCredit
- Calls `/api/qbo/payroll-from-gl` for payroll costs
- Filters transactions by CustomerRef in line items
- Calculates: `totalCost = bills + purchases + journalEntries + timeActivities + payroll - vendorCredits`

#### `/api/qbo/payroll-from-gl`

Extracts payroll costs from QuickBooks reports.

**Parameters:**

- `qboJobId` (required) - QuickBooks Customer/Job ID
- `startDate` (optional) - Filter costs after this date
- `endDate` (optional) - Filter costs before this date

**Returns:**

```typescript
{
  payrollTotal: number;
  accountsChecked: string[];
  transactionsFound: number;
  method: 'TransactionList_PayrollCheck' | 'GeneralLedger_PayrollCheck';
}
```

**Implementation:**

1. **Primary Method - TransactionList Report:**
   - Queries `reports/TransactionList` with date range
   - Filters rows where `transaction_type = "Payroll Check"`
   - Excludes cash/liability account lines (credits)
   - Matches by customer ID or name
   - Sums expense account amounts

2. **Fallback Method - GeneralLedger Report:**
   - If TransactionList fails, queries `reports/GeneralLedger`
   - Same filtering logic for Payroll Check transactions
   - Parses GL rows to extract job-coded payroll expenses

**Key Logic - Excluding Credits:**

```javascript
// Skip cash/liability accounts to avoid double-counting
const isCashOrLiability =
  accountName.includes('cash') ||
  accountName.includes('checking') ||
  accountName.includes('savings') ||
  accountName.includes('bank') ||
  accountName.includes('payable') ||
  accountName.includes('liability') ||
  accountName.includes('payroll liabilities');

if (!isCashOrLiability) {
  // Sum this expense line
}
```

## Data Flow

```
QuickBooks Online
    ↓
makeQBORequest (OAuth + Token Refresh)
    ↓
[Query API] ─────────────┐
  - Bills                 │
  - Purchases             │
  - JournalEntry          │──→ /api/qbo/project-costs
  - TimeActivity          │
  - VendorCredit          │
    ↓                     │
[Reports API]             │
  - TransactionList ──────┤
  - GeneralLedger         │
    ↓                     │
/api/qbo/payroll-from-gl ─┘
    ↓
useProjectFinancials hook
    ↓
FinancialOverview component
```

## Database Integration

### Required Fields

**`engagements` table:**

- `qbo_job_id` (text) - QuickBooks Customer:Job ID (e.g., "123:456" or "59")

### How Job ID is Used

The `qbo_job_id` links FloCon projects to QuickBooks customers/jobs:

1. **useProjectCore.ts** loads `qbo_job_id` from database
2. **FinancialOverview.tsx** passes it to `useProjectFinancials`
3. **useProjectFinancials.ts** fetches costs: `GET /api/qbo/project-costs?qboJobId=${qboJobId}`
4. **project-costs.ts** filters all transactions by `CustomerRef.value = qboJobId`

## Query API vs Reports API

### Query API (Transaction-based)

**Used for:** Bills, Purchases, JournalEntry, TimeActivity, VendorCredit

**Advantages:**

- Direct access to transaction details
- Can filter by CustomerRef in line items
- Returns structured data

**Example:**

```sql
SELECT * FROM Bill WHERE TxnDate >= '2024-01-01' MAXRESULTS 1000
```

**Filtering Logic:**

```javascript
const lineReferencesJob = (line: any): boolean => {
  return line.DetailType === 'AccountBasedExpenseLineDetail' &&
         line.AccountBasedExpenseLineDetail?.CustomerRef?.value === qboJobId;
};
```

### Reports API (Aggregated)

**Used for:** Payroll Checks

**Why Reports API for Payroll:**

- Payroll Check is NOT queryable via Query API (returns "invalid context declaration")
- TransactionList and GeneralLedger reports include all transaction types including Payroll Check
- Can filter by transaction type in report data

**Example:**

```
GET reports/TransactionList?start_date=2024-01-01&end_date=2024-12-31&customer=59
```

**Report Structure:**

```javascript
{
  Rows: {
    Row: [
      {
        type: 'Data',
        ColData: [
          { value: '2024-11-15' }, // Date
          { value: 'Payroll Check' }, // Transaction Type
          { value: '12345' }, // Transaction ID
          { value: 'John Doe' }, // Name
          { value: 'Job ABC', id: '59' }, // Customer/Job
          { value: 'Wages Expense' }, // Account
          { value: '1,234.56' }, // Amount
        ],
      },
    ];
  }
}
```

## QuickBooks Setup Requirements

### OAuth Scopes

```javascript
scope: [
  OAuthClient.scopes.Accounting, // Required for transactions and reports
  OAuthClient.scopes.Payroll, // Future: Direct payroll API access
];
```

### Job Costing in QuickBooks

For accurate cost tracking, transactions must be job-coded:

1. **Create Customer:Job hierarchy** in QBO (e.g., "ACME Corp:Office Remodel")
2. **Code transactions** to jobs:
   - Bills: Add job in line item details
   - Purchases: Add job in line item details
   - Time Activities: Select customer/job
   - Payroll Checks: Code paychecks to jobs during payroll processing

3. **Link to FloCon:**
   - Copy Customer:Job ID from QBO (visible in URL or via API)
   - Set `qbo_job_id` in FloCon engagement

## Testing

### Test Scripts

- `check-companies-qb-status.js` - Verify QBO connection status
- `set-qbo-job-id.js` - Set qbo_job_id for testing

### Test Job ID 59

```javascript
// Manual test
const response = await fetch('/api/qbo/project-costs?qboJobId=59');
const costs = await response.json();
```

**Expected Results:**

- Bills, Purchases, etc. return transaction-specific costs
- Payroll returns sum of Payroll Check expenses (excluding cash/liability credits)
- Total cost matches sum of all categories minus vendor credits

## Error Handling

### Common Issues

1. **"Permission Denied Error" (5020)**
   - Missing OAuth scope
   - Re-authorize with correct scopes

2. **"Invalid context declaration" (4001)**
   - Attempted to query non-queryable entity (e.g., PayrollCheck)
   - Use Reports API instead

3. **No payroll data returned**
   - Payroll checks not job-coded in QBO
   - Check that Customer/Job is assigned to payroll transactions
   - Verify date range includes payroll periods

4. **Double-counted costs**
   - Both debit and credit sides included
   - Ensure cash/liability filter is working

### Debugging

Enable detailed logging:

```javascript
console.log('Found payroll check:', { amount, customerName, accountName });
```

Check logs for:

- Number of transactions found per category
- Which accounts are being summed
- Customer/Job matching logic

## Future Enhancements

1. **Direct Payroll API** - When Payroll OAuth scope is authorized
2. **Caching** - Cache cost data to reduce API calls
3. **Incremental Updates** - Only fetch new transactions since last sync
4. **Cost Categories** - Break down costs by GL account type
5. **Vendor Analysis** - Track costs by vendor for spend analysis

## Related Files

- `src/pages/api/qbo/project-costs.ts` - Main cost aggregation endpoint
- `src/pages/api/qbo/payroll-from-gl.ts` - Payroll extraction from reports
- `src/domain/projects/useProjectFinancials.ts` - Financial data hook
- `src/components/project/FinancialOverview.tsx` - Cost display component
- `src/lib/qboClient.ts` - OAuth and API request wrapper
