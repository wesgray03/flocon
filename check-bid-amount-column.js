const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBidAmountColumn() {
  try {
    // Check for bid_amount and related columns in engagements table
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('type', 'prospect')
      .limit(1);

    if (error) {
      console.error('Error querying engagements:', error);
      return;
    }

    console.log('Sample prospect engagement columns:');
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const relevantColumns = columns.filter(
        (col) =>
          col.includes('bid') ||
          col.includes('revenue') ||
          col.includes('amount') ||
          col.includes('probability')
      );
      console.log('Relevant columns:', relevantColumns);
      console.log('\nAll columns:', columns.sort());
    } else {
      console.log('No prospect data found');
    }

    // Also try a direct SQL query
    const { data: schemaData, error: schemaError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'engagements'
        AND (column_name LIKE '%bid%' OR column_name LIKE '%revenue%' OR column_name LIKE '%amount%')
        ORDER BY column_name;
      `,
      }
    );

    if (!schemaError && schemaData) {
      console.log('\nSchema columns (bid/revenue/amount):');
      console.log(schemaData);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBidAmountColumn();
