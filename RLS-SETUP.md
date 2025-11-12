# Enable Row Level Security (RLS) for Supabase Tables

This guide helps you enable RLS on all tables in your Supabase database.

## What is Row Level Security (RLS)?

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can access in your database tables. When enabled, users can only see and modify rows that pass the security policies you define.

## Quick Start

### Option 1: Run the Migration Manually (Recommended)

1. Open the Supabase SQL Editor:
   - **Staging**: https://supabase.com/dashboard/project/hieokzpxehyelhbubbpb/sql
   - **Production**: https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe/sql

2. Copy the contents of:
   ```
   db/migrations/2025-11-08-enable-rls-all-tables.sql
   ```

3. Paste into the SQL Editor and click **Run**

### Option 2: View Instructions

Run the helper script to see what will be changed:

```powershell
node enable-rls.js
```

## What This Migration Does

### 1. Enables RLS on All Tables

The migration enables RLS on 22 tables:

**Core Tables:**
- projects
- users
- contacts
- customers
- stages
- managers
- owners

**Financial Tables:**
- change_orders
- pay_apps
- billings
- proposals
- purchase_orders

**SOV (Schedule of Values):**
- sov_lines
- sov_line_progress

**Project-Related:**
- project_comments
- project_tasks
- project_task_completion
- project_subcontractors
- comment_mentions

**Vendors & Subcontractors:**
- subcontractors
- vendors

**Legacy:**
- tasks

### 2. Creates Permissive Policies

By default, the migration creates policies that allow **all authenticated users** to perform **all operations** (SELECT, INSERT, UPDATE, DELETE) on all tables.

Example policy:
```sql
CREATE POLICY "Authenticated users full access"
  ON public.projects FOR ALL
  USING (auth.role() = 'authenticated');
```

### 3. Cleans Up Old Policies

Removes any old staging-specific policies like:
- "Allow public access in staging"
- "Allow all for authenticated users"

### 4. Preserves Specific Policies

If tables already have more specific policies (like `project_comments` or `comment_mentions`), those are preserved and the generic policy is skipped.

## Verification

After running the migration, you can verify RLS is enabled:

```sql
-- Check which tables have RLS enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies for a specific table
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects';
```

## Security Considerations

### Current Setup (Development-Friendly)

The default policies allow **all authenticated users** full access to all tables. This is suitable for:
- Development environments
- Small teams where everyone needs access
- Internal tools

### Production Best Practices

For production, consider implementing more restrictive policies based on:

#### 1. **User Roles**
```sql
-- Only admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE user_type = 'Admin'
    )
  );
```

#### 2. **Resource Ownership**
```sql
-- Users can only edit their own comments
CREATE POLICY "Users can update own comments"
  ON public.project_comments FOR UPDATE
  USING (
    auth.uid() = (
      SELECT auth_user_id FROM users WHERE id = project_comments.user_id
    )
  );
```

#### 3. **Project Membership**
```sql
-- Users can only see projects they're assigned to
CREATE POLICY "Users can view assigned projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users 
      WHERE users.name = projects.manager OR users.name = projects.owner
    )
  );
```

## Troubleshooting

### Error: "new row violates row-level security policy"

This means RLS is blocking the operation. Solutions:

1. **Check your authentication:** Make sure you're signed in
2. **Review policies:** Verify the policy allows your operation
3. **Service role key:** For admin operations, use the service role key (bypasses RLS)

### No data returned after enabling RLS

If queries return no data:

1. Check if you're authenticated: `SELECT auth.role()` should return `'authenticated'`
2. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
3. Check policy conditions match your user

### Testing RLS Locally

```sql
-- Test as an authenticated user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'your-user-uuid';

-- Run your query
SELECT * FROM projects;

-- Reset
RESET ROLE;
```

## Disabling RLS (Not Recommended)

If you need to temporarily disable RLS for testing:

```sql
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

To re-enable:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

## Related Files

- `db/migrations/2025-11-08-enable-rls-all-tables.sql` - Main migration
- `enable-rls.js` - Helper script with instructions
- `db/migrations/2025-11-07-add-project-comments-rls.sql` - Specific RLS for comments
- `db/migrations/2025-11-08-add-comment-mentions.sql` - Specific RLS for mentions

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Policy Examples](https://supabase.com/docs/guides/auth/row-level-security#policies)
