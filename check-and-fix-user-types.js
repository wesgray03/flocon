// Script to check and fix user types in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking user types in database...');

  // First, check what user types exist
  const { data: users, error: selectError } = await supabase
    .from('users')
    .select('id, name, email, user_type');

  if (selectError) {
    console.error('❌ Error fetching users:', selectError);
    return;
  }

  console.log('\nCurrent users:');
  const userTypeCounts = {};
  users.forEach((u) => {
    console.log(`  - ${u.name} (${u.email}): ${u.user_type}`);
    userTypeCounts[u.user_type] = (userTypeCounts[u.user_type] || 0) + 1;
  });

  console.log('\nUser type counts:');
  Object.entries(userTypeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Now update any old user types to the new system
  console.log('\nUpdating old user types...');

  const sql = `
-- Map old user types to new system
UPDATE users 
SET user_type = CASE 
  WHEN user_type IN ('Owner', 'Admin') THEN 'Admin'
  WHEN user_type IN ('Sales', 'Ops') THEN 'Office'
  WHEN user_type = 'Foreman' THEN 'Field'
  ELSE 'Office'  -- Default fallback
END
WHERE user_type NOT IN ('Admin', 'Office', 'Field');
`;

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error updating user types:', error);
  } else {
    console.log('✅ Successfully updated user types!');

    // Check again
    const { data: updatedUsers } = await supabase
      .from('users')
      .select('id, name, email, user_type');

    console.log('\nUpdated users:');
    updatedUsers.forEach((u) => {
      console.log(`  - ${u.name} (${u.email}): ${u.user_type}`);
    });
  }
}

run();
