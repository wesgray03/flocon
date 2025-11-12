#!/usr/bin/env node
/**
 * Create production views and functions
 * Run this after importing data to set up views that frontend expects
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);
  
  // Use raw SQL execution via rpc
  const { data, error } = await supabase.rpc('query', { query_text: sql }).single();
  
  if (error) {
    // Try alternative method: direct POST to PostgREST
    const response = await fetch(`${url}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query_text: sql })
    });
    
    if (!response.ok) {
      console.error(`❌ Failed: ${error?.message || response.statusText}`);
      return false;
    }
  }
  
  console.log(`✅ Success: ${description}`);
  return true;
}

async function createViews() {
  console.log('=== CREATING PRODUCTION VIEWS AND FUNCTIONS ===');
  console.log(`Target: ${url}`);

  // Read the SQL file
  const sqlContent = fs.readFileSync('./create-production-views.sql', 'utf8');
  
  // Split by statements (naive split on semicolons outside of function bodies)
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  
  for (const line of sqlContent.split('\n')) {
    // Skip comments and empty lines at the start
    if (!currentStatement.trim() && (line.trim().startsWith('--') || !line.trim())) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Track if we're inside a function definition
    if (line.match(/CREATE.*FUNCTION/i)) {
      inFunction = true;
    }
    if (inFunction && line.match(/LANGUAGE.*plpgsql/i)) {
      inFunction = false;
    }
    
    // End statement on semicolon if not in function
    if (line.includes(';') && !inFunction) {
      const stmt = currentStatement.trim();
      if (stmt && !stmt.startsWith('--') && !stmt.match(/^COMMENT/i)) {
        statements.push(stmt);
      }
      currentStatement = '';
    }
  }

  console.log(`\nFound ${statements.length} SQL statements to execute\n`);

  // Execute using direct connection
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Determine description from statement
    let description = 'Executing SQL';
    if (stmt.includes('engagement_parties_detailed')) {
      description = 'Creating engagement_parties_detailed view';
    } else if (stmt.includes('engagement_user_roles_detailed')) {
      description = 'Creating engagement_user_roles_detailed view';
    } else if (stmt.includes('engagement_dashboard')) {
      description = 'Creating engagement_dashboard view';
    } else if (stmt.includes('get_engagement_primary_party')) {
      description = 'Creating get_engagement_primary_party function';
    }
    
    console.log(`\n[${i + 1}/${statements.length}] ${description}...`);
    console.log(`Statement preview: ${stmt.substring(0, 80)}...`);
    
    // Execute directly using fetch
    try {
      const response = await fetch(`${url}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ sql: stmt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed (${response.status}): ${errorText}`);
        
        // Try alternative: use supabase-js raw query if available
        console.log('   Trying alternative method...');
        const { error: altError } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (altError) {
          console.error(`❌ Alternative also failed: ${altError.message}`);
          console.error('\n⚠️  You may need to run create-production-views.sql manually in Supabase SQL Editor');
        } else {
          console.log(`✅ Success via alternative method`);
        }
      } else {
        console.log(`✅ Success`);
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  console.log('\n=== VERIFYING VIEWS ===\n');
  
  // Test each view
  const viewsToTest = [
    'engagement_parties_detailed',
    'engagement_user_roles_detailed', 
    'engagement_dashboard'
  ];
  
  for (const viewName of viewsToTest) {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ ${viewName}: ${error.message}`);
    } else {
      console.log(`✅ ${viewName}: Working (${data?.length || 0} rows returned)`);
    }
  }

  console.log('\n=== COMPLETE ===');
  console.log('\n💡 If any views failed, run create-production-views.sql manually in Supabase SQL Editor:');
  console.log(`   ${url.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
}

createViews().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
