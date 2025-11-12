// Export current database schema to a reference file
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function exportSchema() {
  console.log('📊 Exporting current database schema...\n');

  try {
    // Get all tables using direct query
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError);
      return;
    }

    let schemaDoc = `-- CURRENT DATABASE SCHEMA REFERENCE
-- Generated: ${new Date().toISOString()}
-- This file is auto-generated - do not edit manually
-- To update: run 'node export-schema.js'

`;

    // For each table, get its structure
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`📝 Exporting ${tableName}...`);

      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select(
          'column_name, data_type, character_maximum_length, is_nullable, column_default'
        )
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (colError) {
        console.log(
          `⚠️ Error getting columns for ${tableName}:`,
          colError.message
        );
        continue;
      }

      schemaDoc += `\n-- Table: ${tableName}\n`;
      schemaDoc += `CREATE TABLE public.${tableName} (\n`;

      const columnDefs = columns.map((col) => {
        let def = `  ${col.column_name} ${col.data_type}`;

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

      schemaDoc += columnDefs.join(',\n');
      schemaDoc += '\n);\n';
    }

    // Get foreign keys
    console.log('\n🔗 Exporting foreign key constraints...');
    const { data: fks, error: fkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
      `,
    });

    if (!fkError && fks && fks.length > 0) {
      schemaDoc += '\n-- Foreign Key Constraints\n';
      fks.forEach((fk) => {
        schemaDoc += `-- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}\n`;
      });
    }

    // Write to file
    await fs.writeFile('CURRENT-SCHEMA.sql', schemaDoc);

    console.log('\n✅ Schema exported to: CURRENT-SCHEMA.sql');
    console.log(`📊 Contains ${tables.length} tables`);
    console.log(
      '\n💡 This file should be referenced when making database changes'
    );
    console.log('💡 Update it periodically by running: node export-schema.js');
  } catch (err) {
    console.error('💥 Schema export failed:', err.message);
  }
}

exportSchema();
