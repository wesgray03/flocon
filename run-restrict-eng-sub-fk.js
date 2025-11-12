// Run migration to set engagement_subcontractors.company_id FK to RESTRICT
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'db/migrations/2025-11-11-restrict-eng-sub-fk.sql'),
      'utf8'
    );

    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    console.log('✅ FK updated to ON DELETE RESTRICT');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
