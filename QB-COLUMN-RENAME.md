# QB Column Rename: qbo_customer_id → qbo_id

## Summary

Renamed the `qbo_customer_id` column to `qbo_id` in the `companies` table to make it universal for all company types (customers, vendors, subcontractors, architects, owners, etc.).

## Changes Made

### Database Migration

- **File**: `2025-11-17-rename-qbo-customer-id-to-qbo-id.sql`
- Renamed column: `qbo_customer_id` → `qbo_id`
- Dropped old index: `idx_companies_qbo_customer_id`
- Created new index: `idx_companies_qbo_id`
- ✅ **Migration executed successfully**

### Code Updates

- **src/lib/qboSync.ts**
  - Updated `getCustomerInfo()` return type: `qboCustomerId` → `qboId`
  - Updated companies query: `qbo_customer_id` → `qbo_id`
  - Updated all sync logic references
  - Updated company update statement

### Utility Scripts Updated

- `backfill-company-qb-ids.js` - Updated to use `qbo_id`
- `check-companies-qb-status.js` - Updated to use `qbo_id`
- `test-customer-name-update.js` - Updated to use `qbo_id`
- `CUSTOMER-NAME-UPDATE-TEST.md` - Updated documentation

### Verification

✅ All 15 companies still have their QB IDs after rename
✅ No TypeScript errors
✅ Column accessible and working

## Why This Change?

The `companies` table stores all types of companies:

- Customers
- Vendors
- Subcontractors
- Architects
- Owners
- Engineers
- etc.

By using a universal `qbo_id` column instead of `qbo_customer_id`, we can:

1. Store QuickBooks IDs for any company type in one column
2. Avoid creating separate columns like `qbo_vendor_id`, `qbo_subcontractor_id`, etc.
3. Simplify sync logic that works across all company types
4. Match FloCon's flexible company/role architecture

## Future Use

When implementing vendor/subcontractor sync to QuickBooks:

- Use the same `qbo_id` column
- Sync logic can check the company's role in the engagement
- Store the appropriate QB entity ID (Customer or Vendor) in `qbo_id`
- The column name is now agnostic to the QB entity type

## Status

✅ **Complete and tested**

- Database column renamed
- All code updated
- All scripts updated
- Documentation updated
- 15 companies verified with QB IDs intact
