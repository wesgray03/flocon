// Script to run the add admin user type migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Running migration: Add Admin user type...');

  const sql = `
-- Step 1: Drop the existing constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Add new constraint with Admin included
-- Admin = Highest level access (future-proofing for advanced permissions)
-- Office = Back office staff
-- Field = Field workers (foremen, superintendents)
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('Admin', 'Office', 'Field'));
`;

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } else {
    console.log('✅ Successfully added Admin user type!');
    console.log('   Allowed user types: Admin, Office, Field');
  }
}

run();
