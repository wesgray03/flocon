// Test if QB API token is working at all
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  console.log('Token expires at:', new Date(tokenData.expires_at).toLocaleString());
  return tokenData.access_token;
}

async function testQBAPI() {
  console.log('Testing QuickBooks API connection...\n');

  try {
    const accessToken = await getAccessToken();
    
    // Try to get company info - simplest API call
    const url = `https://quickbooks.api.intuit.com/v3/company/${REALM_ID}/companyinfo/${REALM_ID}`;
    
    console.log('Fetching company info...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('\n✅ QB API is working!');
    console.log('Company:', result.CompanyInfo?.CompanyName);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQBAPI();
