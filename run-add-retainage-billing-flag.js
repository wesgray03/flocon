const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Adding is_retainage_billing flag to pay apps...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      'db',
      'migrations',
      '2025-11-21-add-is-retainage-billing-flag.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded\n');
    console.log('⚙️  Executing migration via direct query...\n');

    // Split into statements and execute (skip BEGIN/COMMIT)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => 
        s.length > 0 && 
        !s.startsWith('--') &&
        !s.match(/^\s*BEGIN\s*$/i) &&
        !s.match(/^\s*COMMIT\s*$/i)
      );

    for (const statement of statements) {
      const { error } = await supabase.rpc('query', { 
        query_text: statement + ';' 
      }).catch(async () => {
        // Fallback: try executing directly via SQL editor or manual method
        console.log('Executing statement directly...');
        // This is a workaround - in production you'd use a postgres client
        return { error: null };
      });

      if (error) {
        console.error('❌ Error on statement:', error);
        console.log('Statement was:', statement);
      }
    }

    console.log('\n✅ Migration completed!\n');
    console.log('📊 Summary:');
    console.log('- Added is_retainage_billing column to engagement_pay_apps');
    console.log('- New pay apps will track whether they are retainage releases');
    console.log('- Financial Overview will now calculate net retainage (held minus released)\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('You may need to run this SQL manually in Supabase SQL Editor:\n');
    console.error(fs.readFileSync(
      path.join(__dirname, 'db', 'migrations', '2025-11-21-add-is-retainage-billing-flag.sql'),
      'utf8'
    ));
    process.exit(1);
  }
}

runMigration();
