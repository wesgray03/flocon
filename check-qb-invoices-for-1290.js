// Check QuickBooks for existing invoices for project 1290
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// QuickBooks OAuth
const CLIENT_ID = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
const CLIENT_SECRET = process.env.QBO_CLIENT_SECRET;
const REALM_ID = process.env.NEXT_PUBLIC_QBO_REALM_ID;

async function getAccessToken() {
  const { data: tokenData, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !tokenData) {
    throw new Error('No QB tokens found');
  }

  return tokenData.access_token;
}

async function checkInvoicesFor1290() {
  console.log('=== Checking QuickBooks invoices for project 1290 ===\n');

  // First get the QB Job ID for project 1290
  const { data: engagement } = await supabase
    .from('engagements')
    .select('id, project_number, qbo_job_id')
    .eq('project_number', '1290')
    .single();

  if (!engagement) {
    console.log('Project 1290 not found');
    return;
  }

  console.log('Project 1290:');
  console.log('  ID:', engagement.id);
  console.log('  QB Job ID:', engagement.qbo_job_id);
  console.log('');

  if (!engagement.qbo_job_id) {
    console.log('❌ No QB Job ID set for project 1290');
    return;
  }

  try {
    const accessToken = await getAccessToken();

    // Query QuickBooks for recent invoices
    const query = `SELECT * FROM Invoice MAXRESULTS 50`;
    const url = `https://quickbooks.api.intuit.com/v3/company/${REALM_ID}/query?query=${encodeURIComponent(query)}`;

    console.log('Querying QuickBooks for recent invoices...');
    console.log('');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QB API Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    const invoices = result.QueryResponse?.Invoice || [];

    console.log(`Found ${invoices.length} total invoice(s) in QuickBooks\n`);

    // Filter for project 1290
    const project1290Invoices = invoices.filter(
      (inv) =>
        inv.DocNumber?.startsWith('1290-') ||
        inv.CustomerRef?.value === engagement.qbo_job_id
    );

    console.log(
      `Invoices for project 1290 (DocNumber starts with '1290-' or CustomerRef = ${engagement.qbo_job_id}):\n`
    );

    if (project1290Invoices.length > 0) {
      project1290Invoices.forEach((inv, idx) => {
        console.log(`Invoice ${idx + 1}:`);
        console.log('  ID:', inv.Id);
        console.log('  DocNumber:', inv.DocNumber);
        console.log('  CustomerRef:', inv.CustomerRef?.value);
        console.log('  TotalAmt:', inv.TotalAmt);
        console.log('  Balance:', inv.Balance);
        console.log('  TxnDate:', inv.TxnDate);
        console.log('  DueDate:', inv.DueDate);
        console.log('');
      });
    } else {
      console.log('No invoices found for project 1290');
      console.log('\nShowing first 10 invoice DocNumbers for reference:');
      invoices.slice(0, 10).forEach((inv) => {
        console.log(`  ${inv.DocNumber} (Customer: ${inv.CustomerRef?.value})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkInvoicesFor1290();
