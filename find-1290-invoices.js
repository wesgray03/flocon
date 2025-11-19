// Query QB for all invoices with DocNumber starting with 1290
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findInvoicesFor1290() {
  console.log('=== Searching for Project 1290 Invoices in QuickBooks ===\n');
  
  // Get token
  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tokenData) {
    console.error('No token found');
    return;
  }

  const realmId = tokenData.realm_id;
  const baseUrl = 'https://quickbooks.api.intuit.com';
  
  console.log('Method 1: Get ALL invoices and filter client-side...');
  try {
    // Get all invoices (limited to 1000)
    const queryUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 1000')}`;
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', errorText);
      return;
    }

    const data = await response.json();
    const allInvoices = data.QueryResponse?.Invoice || [];
    console.log(`Total invoices found: ${allInvoices.length}\n`);

    // Filter for 1290
    const invoices1290 = allInvoices.filter(inv => {
      return inv.DocNumber && inv.DocNumber.startsWith('1290');
    });

    console.log(`Invoices with DocNumber starting with "1290": ${invoices1290.length}\n`);

    if (invoices1290.length > 0) {
      invoices1290.forEach((inv, idx) => {
        console.log(`Invoice ${idx + 1}:`);
        console.log('  ID:', inv.Id);
        console.log('  DocNumber:', inv.DocNumber);
        console.log('  CustomerRef:', inv.CustomerRef?.value, inv.CustomerRef?.name);
        console.log('  TotalAmt:', inv.TotalAmt);
        console.log('  Balance:', inv.Balance);
        console.log('  TxnDate:', inv.TxnDate);
        
        // Show line items
        if (inv.Line && inv.Line.length > 0) {
          inv.Line.forEach(line => {
            if (line.DetailType === 'SalesItemLineDetail') {
              console.log('  Line:', line.Description, '-', line.Amount);
            }
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ No invoices found with DocNumber starting with "1290"');
      console.log('\nShowing sample DocNumbers from first 20 invoices:');
      allInvoices.slice(0, 20).forEach(inv => {
        console.log(`  ${inv.DocNumber} (Customer: ${inv.CustomerRef?.name || inv.CustomerRef?.value})`);
      });
    }

    // Also check for job 2927
    console.log('\n--- Checking for Job 2927 (Project 1290\'s QB Job ID) ---\n');
    const job2927Invoices = allInvoices.filter(inv => {
      return inv.CustomerRef?.value === '2927';
    });
    console.log(`Invoices with CustomerRef = 2927: ${job2927Invoices.length}`);
    
    if (job2927Invoices.length > 0) {
      job2927Invoices.forEach((inv, idx) => {
        console.log(`  ${idx + 1}. DocNumber: ${inv.DocNumber}, Amount: ${inv.TotalAmt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findInvoicesFor1290();
