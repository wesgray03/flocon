// Direct test of syncPayAppToQBO function
require('dotenv').config({ path: '.env.production.local' });

// Import the sync function directly
async function testSync() {
  console.log('Testing syncPayAppToQBO directly...\n');
  
  // Test importing the module
  try {
    const { syncPayAppToQBO } = require('./src/lib/qboInvoiceSync.ts');
    console.log('✅ Module imported successfully');
    
    // Try to sync pay app #1 for project 1290
    const payAppId = 'ceed1325-67f6-49f4-a3ff-f314f9580bd8';
    console.log(`\nAttempting to sync pay app: ${payAppId}`);
    
    const result = await syncPayAppToQBO(payAppId);
    console.log('\nSync Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSync();
