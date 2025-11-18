# Testing Customer Name Updates

## Setup

1. Make sure your Next.js app is running: `npm run dev`
2. Ensure you're connected to QuickBooks (visit `/settings` and connect if needed)

## Test Steps

### Option A: Manual UI Test

1. Go to the Companies/Customers page in FloCon
2. Find "Oak Hill School" (or any customer with synced projects)
3. Edit the name to "Oak Hill School (TEST NAME CHANGE)"
4. Save the company
5. Go to any project for that customer (e.g., project 1237)
6. The project will auto-sync when you view/edit it, OR click the manual "Sync to QBO" button
7. Open QuickBooks sandbox and search for the customer
8. Verify the name changed to "Oak Hill School (TEST NAME CHANGE)"
9. Change the name back to "Oak Hill School" in FloCon
10. Sync the project again
11. Verify QB shows "Oak Hill School" again

### Option B: Scripted Test (requires app running)

Run: `node test-customer-name-update.js`

This will automatically:

- Pick a test company
- Change the name
- Sync a project
- Verify QB updated
- Restore original name
- Verify QB restored

## How It Works

The sync logic now:

1. Checks if company has `qbo_id` stored in database
2. If yes, fetches current QB customer
3. Compares FloCon name vs QB name
4. If different, updates QB customer with new name
5. Stores the QB ID on the companies table (universal for all company types)

## Expected Results

✅ Customer names in QB automatically update when changed in FloCon
✅ No duplicate customers created
✅ All projects under that customer show the updated name in QB
✅ Works for all company types (customers, vendors, subcontractors, etc.)

## Notes

- Customer name updates happen automatically when a project syncs
- The "Sync All Projects" menu button will update all customer names across all projects
- Changes are immediate - no need to manually update QB
- The `qbo_id` column is universal and can be reused for any company type
