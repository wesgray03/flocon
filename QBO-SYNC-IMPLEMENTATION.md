# QuickBooks Sync Implementation Summary

## ✅ Completed

### 1. OAuth Connection (Done)

- ✅ QuickBooks OAuth flow working
- ✅ Connected to sandbox (Realm ID: 9341455715309199)
- ✅ Tokens stored securely in `qbo_tokens` table
- ✅ Automatic token refresh implemented

### 2. Database Schema

**Created:**

- `qbo_tokens` table - stores OAuth tokens
- `qbo_customer_id`, `qbo_job_id`, `qbo_last_synced_at` columns on `engagements`

**Migration Files:**

- `2025-11-17-create-qbo-tokens-table.sql` ✅ RAN
- `2025-11-17-add-qbo-id-columns.sql` ⏳ NEEDS TO RUN

### 3. Sync Service (`src/lib/qboSync.ts`)

- ✅ `syncEngagementToQBO()` - sync single project
- ✅ `syncMultipleEngagements()` - bulk sync
- ✅ Finds or creates Customer in QB
- ✅ Creates Job (sub-customer) under Customer
- ✅ Stores QB IDs back to database

### 4. API Endpoints

- ✅ `POST /api/qbo/sync-project` - sync single project
- ✅ `POST /api/qbo/sync-multiple` - bulk sync projects

### 5. UI Components

- ✅ `QBOSyncButton` component created
- ✅ Added to project detail page (`/projects/[id]`)
- ✅ Shows sync status (synced vs not synced)
- ✅ Displays errors and success messages

## 🔧 To Complete Setup

### Step 1: Run Database Migration

Copy and run in Supabase SQL Editor:

```sql
-- From: db/migrations/2025-11-17-add-qbo-id-columns.sql

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_job_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_engagements_qbo_customer
  ON engagements(qbo_customer_id)
  WHERE qbo_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_qbo_job
  ON engagements(qbo_job_id)
  WHERE qbo_job_id IS NOT NULL;
```

### Step 2: Test the Sync

```bash
# Run test script to verify setup
node test-qbo-setup.js

# Start dev server (already running)
# npm run dev

# Navigate to any project detail page
# Click "Sync to QuickBooks" button
```

## 📊 Data Flow

```
FloCon Project Creation
  ↓
Generate project_number (internal ID)
  ↓
User clicks "Sync to QuickBooks"
  ↓
API finds/creates Customer in QB → qbo_customer_id
  ↓
API creates Job under Customer → qbo_job_id
  ↓
Store QB IDs + timestamp in engagements table
  ↓
✅ Synced!
```

## 🔍 How It Works

### Customer Mapping

- Gets customer from `engagement_parties` with role='customer'
- Searches QB for existing customer by name
- Creates new customer if not found
- Stores `qbo_customer_id` in engagements table

### Job Creation

- Creates Job (sub-customer) in QB
- Format: `{project_number} - {project_name}`
- Links Job to Customer as parent
- Stores `qbo_job_id` in engagements table

### Sync Button UI

- Only shows on projects (not prospects)
- Requires `project_number` to be set
- Shows green if already synced
- Allows re-sync if needed
- Displays errors inline

## 📁 Files Created

### Core Logic

- `src/lib/qboSync.ts` - Sync service functions
- `src/lib/qboClient.ts` - OAuth client utilities

### API Routes

- `src/pages/api/qbo/connect.ts` - OAuth initiation
- `src/pages/api/qbo/callback.ts` - OAuth callback
- `src/pages/api/qbo/status.ts` - Connection status
- `src/pages/api/qbo/disconnect.ts` - Revoke tokens
- `src/pages/api/qbo/sync-project.ts` - Sync single project
- `src/pages/api/qbo/sync-multiple.ts` - Bulk sync

### UI Components

- `src/components/QuickBooksConnection.tsx` - Connection widget
- `src/components/QBOSyncButton.tsx` - Sync button
- `src/pages/settings.tsx` - Settings page

### Database

- `db/migrations/2025-11-17-create-qbo-tokens-table.sql`
- `db/migrations/2025-11-17-add-qbo-id-columns.sql`

### Testing

- `test-qbo-setup.js` - Setup verification script

## 🚀 Ready to Test!

After running the QB ID columns migration, you can:

1. Open any project detail page
2. Click "Sync to QuickBooks"
3. Check your QuickBooks sandbox for the new Customer and Job

The sync button will show:

- ⚪ "Sync to QuickBooks" - not yet synced
- ✅ "Re-sync to QuickBooks" - already synced (green)
- 🔄 "Syncing..." - in progress

## 🎯 Next Enhancements (Future)

1. **Bi-directional Sync** - Pull data from QB
2. **Sync Invoices/Payments** - Financial data sync
3. **Webhooks** - Real-time updates from QB
4. **Bulk Sync Page** - Sync multiple projects at once
5. **Sync Status Dashboard** - See all synced projects
