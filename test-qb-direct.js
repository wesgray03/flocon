// Test QB API with production credentials
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQBConnection() {
  console.log('=== Testing QuickBooks API Connection ===\n');
  
  // Get token from database
  const { data: tokenData, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !tokenData) {
    console.error('Error fetching token:', error);
    return;
  }

  console.log('Token Info:');
  console.log('  Realm ID:', tokenData.realm_id);
  console.log('  Token Type:', tokenData.token_type);
  console.log('  Expires At:', new Date(tokenData.expires_at).toLocaleString());
  console.log('  Refresh Expires At:', new Date(tokenData.refresh_expires_at).toLocaleString());
  console.log('  Access Token (first 20 chars):', tokenData.access_token.substring(0, 20) + '...');
  console.log('');

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  const isExpired = expiresAt < now;
  
  if (isExpired) {
    console.log('⚠️  Access token is EXPIRED');
    console.log('   Need to refresh the token first');
    return;
  } else {
    const minutesUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60);
    console.log(`✅ Access token is valid (expires in ${minutesUntilExpiry} minutes)`);
  }
  console.log('');

  // Try to query QB API - get company info
  const realmId = tokenData.realm_id;
  const baseUrl = 'https://quickbooks.api.intuit.com';
  
  try {
    console.log('Attempting to fetch company info from QB API...');
    const url = `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`;
    console.log('URL:', url);
    console.log('');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ QB API Error:');
      console.error(errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Successfully connected to QuickBooks!');
    console.log('Company Name:', data.CompanyInfo?.CompanyName);
    console.log('Legal Name:', data.CompanyInfo?.LegalName);
    console.log('');

    // Now try to query for an invoice
    console.log('Attempting to query for invoices...');
    const queryUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 1')}`;
    
    const queryResponse = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    console.log('Query Response Status:', queryResponse.status);
    
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('❌ Query Error:');
      console.error(errorText);
      return;
    }

    const queryData = await queryResponse.json();
    const invoices = queryData.QueryResponse?.Invoice || [];
    console.log(`✅ Query successful! Found ${invoices.length} invoice(s)`);
    
    if (invoices.length > 0) {
      console.log('Sample Invoice DocNumber:', invoices[0].DocNumber);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQBConnection();
