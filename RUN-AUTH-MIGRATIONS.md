# Run These Migrations in Supabase SQL Editor

Since `psql` is not installed locally, please run these migrations manually in the Supabase SQL Editor:

## Step 1: Link Users to Auth

1. Go to: https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe/sql/new
2. Copy and paste the contents of: `db/migrations/2025-11-05-link-users-to-auth.sql`
3. Click "Run"

## Step 2: Auto-Create User Records on Auth

1. In the same SQL Editor (or a new query)
2. Copy and paste the contents of: `db/migrations/2025-11-05-auto-create-user-on-auth.sql`
3. Click "Run"

## What This Does

**Migration 1** (`link-users-to-auth.sql`):

- Adds `auth_user_id` column to the `users` table
- Links each user record to their Supabase authentication account
- Creates indexes for fast lookups

**Migration 2** (`auto-create-user-on-auth.sql`):

- Creates a trigger that automatically creates a user record when someone signs in
- New users default to "Admin" role (can be changed manually)
- Uses the email from their Microsoft account

## After Running Migrations

1. When you sign in with Microsoft, a user record will be automatically created
2. You can then edit that user in the Users modal to:
   - Change their name
   - Change their role (Owner/Admin/Foreman)
3. The "Auth Status" column will show "Linked" for users connected to authentication

## Linking Existing Users

If you have existing users in the `users` table that need to be linked to authentication accounts:

1. They need to sign in at least once with their Microsoft account
2. The system will match by email and link them automatically
3. Or you can manually update the `auth_user_id` field in the database
