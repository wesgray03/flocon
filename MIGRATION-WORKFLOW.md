# Database Migration Workflow

## Setup

1. Update `migrate.js` with your staging credentials
2. Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "migrate:staging": "node migrate.js staging",
    "migrate:production": "node migrate.js production",
    "migrate:status:staging": "node migration-status.js staging",
    "migrate:status:production": "node migration-status.js production"
  }
}
```

## Development Workflow

### 1. Create New Migration

```bash
# Create a new migration file in db/migrations/
# Name it: YYYY-MM-DD-description.sql
# Example: 2025-11-06-add-user-preferences-table.sql
```

### 2. Test in Staging

```bash
# Run migrations on staging
npm run migrate:staging

# Check status
npm run migrate:status:staging

# Test your app with staging data
npm run dev
```

### 3. Promote to Production

```bash
# Check what migrations need to run
npm run migrate:status:production

# Run migrations on production
npm run migrate:production

# Verify
npm run migrate:status:production
```

## Migration Tracking

The system automatically:

- ✅ Tracks which migrations have been executed
- ✅ Skips already-run migrations
- ✅ Records execution timestamps
- ✅ Prevents duplicate execution
- ✅ Maintains execution order

## Safety Features

- Migration files are executed in alphabetical order
- Each migration is tracked in `migration_history` table
- Failed migrations stop the process
- Safe to run multiple times (idempotent)

## Best Practices

1. **Always test in staging first**
2. **Use descriptive migration names** with dates
3. **Make migrations reversible** when possible
4. **Backup production** before major migrations
5. **Keep migrations small** and focused

## Emergency Rollback

If you need to rollback a migration:

1. Create a new migration that reverses the changes
2. Test in staging first
3. Apply to production

## Example Migration File

```sql
-- 2025-11-06-add-user-preferences-table.sql

-- Add user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Add RLS policy
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
ON user_preferences FOR ALL
USING (auth.uid() = user_id);
```

---

## 🔄 Complete Production Deployment Process

### ✅ Recommended Workflow

1. **Develop in Staging**

   ```bash
   npm run dev  # Automatically uses staging via .env.local
   ```

2. **Create Migration File**

   ```bash
   # Create: db/migrations/2025-11-07-your-feature.sql
   ```

3. **Commit & Push Code**

   ```bash
   git add .
   git commit -m "Add feature with migration"
   git push  # Vercel auto-deploys, but DB needs manual migration
   ```

4. **Manually Run Migration in Production**
   - Go to: https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe
   - SQL Editor → Copy migration SQL → Run
   - ✅ This is the safest approach!

5. **Verify Production**
   - Visit: https://floconapp.com
   - Test the new feature

### 🚨 Important Notes

- **Code deploys automatically** via Vercel when you push to Git
- **Database changes are manual** - run SQL in Supabase dashboard
- **Staging = Safe testing** - break things here, not in production!
- Always test migrations in staging before production

---

## 📞 Quick Reference

| Task                      | Command / Link                                              |
| ------------------------- | ----------------------------------------------------------- |
| Local dev (staging)       | `npm run dev`                                               |
| Staging database          | https://supabase.com/dashboard/project/hieokzpxehyelhbubbpb |
| Production database       | https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe |
| Live app                  | https://floconapp.com                                       |
| Copy prod data to staging | `node quick-copy.js`                                        |
| Migration files           | `db/migrations/*.sql`                                       |

---

## 🎓 Your Setup Summary

✅ **Staging environment created** - Database copied from production  
✅ **Local dev configured** - `.env.local` points to staging  
✅ **RLS policies fixed** - Public access in staging for development  
✅ **View recreated** - `project_dashboard` working correctly  
✅ **Code fixed** - Removed problematic stages join

**You're all set!** Develop safely in staging, then promote to production manually. 🚀

```

```
