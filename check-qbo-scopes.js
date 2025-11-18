// check-qbo-scopes.js
// Check current QuickBooks OAuth scopes

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkScopes() {
  console.log('Checking QuickBooks OAuth scopes...\n');

  const { data: tokens, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true)
    .order('last_refreshed_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching tokens:', error);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('⚠️  No active QuickBooks tokens found.');
    console.log('You need to authorize the app with QuickBooks.');
    console.log('\nVisit: http://localhost:3000/api/qbo/authorize');
    return;
  }

  const token = tokens[0];
  console.log('Current QuickBooks Connection:');
  console.log('='.repeat(60));
  console.log(`Realm ID: ${token.realm_id}`);
  console.log(`Scopes: ${token.scope || 'Not recorded'}`);
  console.log(`Last Refreshed: ${token.last_refreshed_at}`);
  console.log(`Expires At: ${token.expires_at}`);
  console.log('');

  const scopes = token.scope?.split(' ') || [];
  const hasAccounting = scopes.includes('com.intuit.quickbooks.accounting');
  const hasPayroll = scopes.includes('com.intuit.quickbooks.payroll');

  console.log('Scope Analysis:');
  console.log(
    `  ${hasAccounting ? '✓' : '✗'} Accounting API (com.intuit.quickbooks.accounting)`
  );
  console.log(
    `  ${hasPayroll ? '✓' : '✗'} Payroll API (com.intuit.quickbooks.payroll)`
  );
  console.log('');

  if (!hasPayroll) {
    console.log('⚠️  PAYROLL SCOPE MISSING');
    console.log('='.repeat(60));
    console.log('To access payroll data, you need to:');
    console.log('');
    console.log('1. Disconnect and reconnect QuickBooks with Payroll scope');
    console.log('   Visit: http://localhost:3000/api/qbo/authorize');
    console.log('');
    console.log('2. The OAuth flow now requests both scopes:');
    console.log('   - com.intuit.quickbooks.accounting');
    console.log('   - com.intuit.quickbooks.payroll');
    console.log('');
    console.log('3. You may need to approve payroll access in QuickBooks');
    console.log('');
    console.log('Note: Your QuickBooks subscription must include Payroll');
    console.log('      for this scope to work.');
  } else {
    console.log('✓ All required scopes are present!');
    console.log('  You should be able to access payroll data.');
  }
}

checkScopes()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
