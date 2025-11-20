// Test script to verify QBO cost pulling logic
require('dotenv').config();
const axios = require('axios');

const qboJobId = '2927'; // Your test job
const dateStart = '2000-01-01';
const dateEnd = '2099-12-31';

// Simple QBO request function
async function makeQBORequest(method, endpoint) {
  const realmId = process.env.QBO_REALM_ID;
  const accessToken = process.env.QBO_ACCESS_TOKEN;

  if (!realmId || !accessToken) {
    throw new Error('Missing QBO credentials');
  }

  const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`;

  const response = await axios({
    method,
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return response.data;
}

async function testProfitAndLoss() {
  console.log('\n=== Testing ProfitAndLoss Report ===');
  console.log(`Job ID: ${qboJobId}`);

  const plParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    customer: qboJobId,
    accounting_method: 'Accrual',
  });

  console.log(`Fetching: reports/ProfitAndLoss?${plParams.toString()}`);

  const profitAndLoss = await makeQBORequest(
    'GET',
    `reports/ProfitAndLoss?${plParams.toString()}`
  );

  console.log('\nReport Structure:');
  console.log(JSON.stringify(profitAndLoss, null, 2));
}

async function testGeneralLedger() {
  console.log('\n=== Testing GeneralLedger Report ===');
  console.log(`Job ID: ${qboJobId}`);

  const glParams = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    customer: qboJobId,
    accounting_method: 'Accrual',
  });

  console.log(`Fetching: reports/GeneralLedger?${glParams.toString()}`);

  const generalLedger = await makeQBORequest(
    'GET',
    `reports/GeneralLedger?${glParams.toString()}`
  );

  console.log('\nFirst few rows:');
  if (generalLedger?.Rows?.Row) {
    console.log(JSON.stringify(generalLedger.Rows.Row.slice(0, 3), null, 2));
  }

  // Try to calculate from it
  let totalDebits = 0;
  let totalCredits = 0;
  let transactionsFound = 0;

  const isIncludedAccount = (accountNumber) => {
    const num = accountNumber.trim();
    return /^[56]\d{4}/.test(num);
  };

  const traverseRows = (rows, currentAccount) => {
    rows.forEach((row) => {
      if (row.Header?.ColData) {
        const accountHeader = row.Header.ColData[0]?.value || '';
        const accountMatch = accountHeader.match(/^(\d{5})/);
        const accountNumber = accountMatch ? accountMatch[1] : '';

        if (row.Rows?.Row) {
          traverseRows(row.Rows.Row, accountNumber);
        }
        return;
      }

      if (row.type === 'Data' && row.ColData && currentAccount) {
        if (!isIncludedAccount(currentAccount)) {
          return;
        }

        const debitCol = row.ColData[6];
        const creditCol = row.ColData[7];

        const debitStr = (debitCol?.value || '').replace(/,/g, '').trim();
        const creditStr = (creditCol?.value || '').replace(/,/g, '').trim();

        const debit = parseFloat(debitStr) || 0;
        const credit = parseFloat(creditStr) || 0;

        if (debit > 0 || credit > 0) {
          totalDebits += debit;
          totalCredits += credit;
          transactionsFound++;
          console.log(
            `Account ${currentAccount}: Debit=$${debit}, Credit=$${credit}`
          );
        }
      }

      if (row.Rows?.Row) {
        traverseRows(row.Rows.Row, currentAccount);
      }
    });
  };

  if (generalLedger?.Rows?.Row) {
    traverseRows(generalLedger.Rows.Row);
  }

  console.log(`\nGL Results:`);
  console.log(`Transactions: ${transactionsFound}`);
  console.log(`Total Debits: $${totalDebits}`);
  console.log(`Total Credits: $${totalCredits}`);
  console.log(`Net: $${totalDebits - totalCredits}`);
}

async function testTransactionList() {
  console.log('\n=== Testing TransactionList Report ===');
  console.log(`Job ID: ${qboJobId}`);

  const params = new URLSearchParams({
    start_date: dateStart,
    end_date: dateEnd,
    customer: qboJobId,
  });

  console.log(`Fetching: reports/TransactionList?${params.toString()}`);

  const txList = await makeQBORequest(
    'GET',
    `reports/TransactionList?${params.toString()}`
  );

  console.log('\nFirst few rows:');
  if (txList?.Rows?.Row) {
    console.log(JSON.stringify(txList.Rows.Row.slice(0, 5), null, 2));
  }
}

async function main() {
  console.log('Expected total from QBO: $243,816.57\n');

  try {
    await testProfitAndLoss();
  } catch (error) {
    console.error('P&L Error:', error.message);
  }

  try {
    await testGeneralLedger();
  } catch (error) {
    console.error('GL Error:', error.message);
  }

  try {
    await testTransactionList();
  } catch (error) {
    console.error('TransactionList Error:', error.message);
  }
}

main().catch(console.error);
