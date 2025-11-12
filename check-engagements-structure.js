const { createClient } = require('@supabase/supabase-js');

// Use staging environment
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function checkEngagementsStructure() {
  console.log('🔍 Checking engagements table structure...\n');

  // Get table columns
  const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
    sql: `
        SELECT 
          column_name,
          data_type,
          column_default,
          is_nullable,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'engagements'
        ORDER BY ordinal_position;
      `,
  });

  if (colError) {
    console.error('❌ Error fetching columns:', colError);
    return;
  }

  console.log('📋 Engagements Table Columns:');
  console.log('='.repeat(80));
  columns?.forEach((col) => {
    console.log(
      `${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | Nullable: ${col.is_nullable}`
    );
  });

  // Get foreign key relationships
  console.log('\n🔗 Foreign Key Relationships:');
  console.log('='.repeat(80));

  const { data: fks, error: fkError } = await supabase.rpc('exec_sql', {
    sql: `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'engagements'
        ORDER BY kcu.column_name;
      `,
  });

  if (fkError) {
    console.error('❌ Error fetching foreign keys:', fkError);
  } else {
    fks?.forEach((fk) => {
      console.log(
        `${fk.column_name.padEnd(30)} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`
      );
    });
  }

  // Sample some engagements data
  console.log('\n📊 Sample Engagements Data (first 3 rows):');
  console.log('='.repeat(80));

  const { data: samples, error: sampleError } = await supabase
    .from('engagements')
    .select(
      `
      id,
      name,
      company_id,
      contact_id,
      architect_id,
      sales_contact_id,
      owner
    `
    )
    .limit(3);

  if (sampleError) {
    console.error('❌ Error fetching samples:', sampleError);
  } else {
    console.log(JSON.stringify(samples, null, 2));
  }

  // Count how many engagements use each field
  console.log('\n📈 Usage Statistics:');
  console.log('='.repeat(80));

  const { data: stats, error: statsError } = await supabase.rpc('exec_sql', {
    sql: `
        SELECT 
          COUNT(*) as total_engagements,
          COUNT(company_id) as has_company_id,
          COUNT(contact_id) as has_contact_id,
          COUNT(architect_id) as has_architect_id,
          COUNT(sales_contact_id) as has_sales_contact_id,
          COUNT(owner) as has_owner
        FROM engagements;
      `,
  });

  if (statsError) {
    console.error('❌ Error fetching stats:', statsError);
  } else {
    console.log(stats?.[0]);
  }

  // Check contacts table structure
  console.log('\n📋 Contacts Table Structure:');
  console.log('='.repeat(80));

  const { data: contactCols, error: contactError } = await supabase.rpc(
    'exec_sql',
    {
      sql: `
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_name = 'contacts'
        ORDER BY ordinal_position;
      `,
    }
  );

  if (contactError) {
    console.error('❌ Error:', contactError);
  } else {
    contactCols?.forEach((col) => {
      console.log(`${col.column_name.padEnd(30)} | ${col.data_type}`);
    });
  }

  // Check companies table structure
  console.log('\n📋 Companies Table Structure:');
  console.log('='.repeat(80));

  const { data: companyCols, error: companyError } = await supabase.rpc(
    'exec_sql',
    {
      sql: `
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_name = 'companies'
        ORDER BY ordinal_position;
      `,
    }
  );

  if (companyError) {
    console.error('❌ Error:', companyError);
  } else {
    companyCols?.forEach((col) => {
      console.log(`${col.column_name.padEnd(30)} | ${col.data_type}`);
    });
  }
}

checkEngagementsStructure().catch(console.error);
