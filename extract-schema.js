const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4'
);

async function extractCompleteSchema() {
  console.log('🔍 Extracting complete schema from production...\n');

  try {
    // Get all tables
    console.log('📋 Getting table list...');
    const { data: tables, error: tablesError } = await prodClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error getting tables:', tablesError);
      return;
    }

    console.log(
      `✅ Found ${tables.length} tables:`,
      tables.map((t) => t.table_name).join(', ')
    );

    // Get column information for each table
    console.log('\n🏗️ Getting column definitions...');
    let schemaSQL = '-- Complete production schema export\n\n';

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`📝 Processing ${tableName}...`);

      // Get columns for this table
      const { data: columns, error: columnsError } = await prodClient
        .from('information_schema.columns')
        .select(
          `
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        `
        )
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columnsError) {
        console.log(
          `⚠️ Error getting columns for ${tableName}:`,
          columnsError.message
        );
        continue;
      }

      // Build CREATE TABLE statement
      schemaSQL += `-- Table: ${tableName}\n`;
      schemaSQL += `CREATE TABLE public.${tableName} (\n`;

      const columnDefs = columns.map((col) => {
        let def = `    ${col.column_name} ${col.data_type}`;

        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }

        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }

        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        return def;
      });

      schemaSQL += columnDefs.join(',\n');
      schemaSQL += '\n);\n\n';
    }

    // Add RLS enabling for all tables
    schemaSQL += '-- Enable Row Level Security\n';
    for (const table of tables) {
      schemaSQL += `ALTER TABLE public.${table.table_name} ENABLE ROW LEVEL SECURITY;\n`;
    }
    schemaSQL += '\n';

    // Add basic policies for all tables
    schemaSQL += '-- Basic RLS policies (allow all for authenticated users)\n';
    for (const table of tables) {
      schemaSQL += `CREATE POLICY "Allow all operations for authenticated users" ON public.${table.table_name}\n`;
      schemaSQL += `    FOR ALL USING (auth.role() = 'authenticated');\n\n`;
    }

    // Write to file
    await fs.writeFile('complete-schema.sql', schemaSQL);
    console.log('✅ Schema exported to: complete-schema.sql');
    console.log(`📊 Contains ${tables.length} tables`);

    console.log('\n🎯 Next steps:');
    console.log('1. Copy the contents of complete-schema.sql');
    console.log('2. Go to staging Supabase SQL Editor');
    console.log('3. Paste and run the schema');
    console.log('4. Run: node quick-copy.js');
  } catch (err) {
    console.error('💥 Schema extraction failed:', err.message);
  }
}

extractCompleteSchema();
