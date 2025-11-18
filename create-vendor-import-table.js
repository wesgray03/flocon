// Create vendor import list table via Supabase client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  try {
    console.log('Creating qbo_vendor_import_list table...\n');

    // Create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS qbo_vendor_import_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_name TEXT NOT NULL UNIQUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL,
    });

    if (createError) {
      console.log(
        'Note: exec_sql RPC not available, please run the migration SQL in Supabase SQL Editor'
      );
      console.log('Or copy these commands:\n');
      console.log(createTableSQL);
      return;
    }

    console.log('✓ Table created');

    // Add index
    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_name ON qbo_vendor_import_list(vendor_name);',
    });
    console.log('✓ Index created');

    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;',
    });
    console.log('✓ RLS enabled');

    console.log('\n✅ Table structure created! Now populating with vendors...');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run the SQL file manually in Supabase SQL Editor');
  }
}

createTable();
