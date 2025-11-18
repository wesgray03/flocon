/**
 * Query QuickBooks for project 1304
 */
require('dotenv').config({ path: '.env.local' });

async function queryProject() {
  console.log('Querying QuickBooks for project 1304...\n');

  try {
    const response = await fetch('http://localhost:3000/api/qbo/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "SELECT * FROM Customer WHERE DisplayName LIKE '1304%'",
      }),
    });

    const data = await response.json();

    if (data.success && data.result?.QueryResponse?.Customer) {
      const customers = data.result.QueryResponse.Customer;

      if (customers.length === 0) {
        console.log('No customers found matching "1304%"');
        return;
      }

      console.log(`Found ${customers.length} result(s):\n`);

      customers.forEach((customer, index) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  ID: ${customer.Id}`);
        console.log(`  DisplayName: "${customer.DisplayName}"`);
        console.log(`  FullyQualifiedName: "${customer.FullyQualifiedName}"`);
        console.log(`  Job: ${customer.Job}`);
        console.log(`  BillWithParent: ${customer.BillWithParent}`);
        console.log(`  ParentRef: ${customer.ParentRef?.value || 'None'}`);
        console.log(`  Active: ${customer.Active}`);
        console.log();
      });
    } else {
      console.log('Query failed or no results');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

queryProject();
