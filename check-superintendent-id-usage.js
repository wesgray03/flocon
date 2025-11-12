// Check if superintendent_id column is safe to drop
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking if superintendent_id is safe to drop...\n');

  // Check for non-null values
  console.log('1. Checking for non-null superintendent_id values...');
  const { data: engagements, error: engErr } = await supabase
    .from('engagements')
    .select('id, name, superintendent_id')
    .not('superintendent_id', 'is', null);

  if (engErr) {
    console.error('   Error:', engErr.message);
  } else if (engagements && engagements.length > 0) {
    console.log(
      `   ⚠️  Found ${engagements.length} engagement(s) with non-null superintendent_id:`
    );
    engagements.slice(0, 5).forEach((e) => {
      console.log(`      - ${e.name}: ${e.superintendent_id}`);
    });
    if (engagements.length > 5) {
      console.log(`      ... and ${engagements.length - 5} more`);
    }
    console.log('\n   ❌ Cannot drop safely - data would be lost!');
    console.log(
      '   Migration needed to backfill these into engagement_parties first.'
    );
  } else {
    console.log('   ✓ All superintendent_id values are NULL - safe to drop!');
  }

  console.log('\n2. Checking database schema references...');
  console.log('   (This requires manual verification in Supabase SQL Editor)');
  console.log('   Run this query to check for foreign key constraints:');
  console.log(`
   SELECT 
     conname AS constraint_name,
     conrelid::regclass AS table_name,
     confrelid::regclass AS referenced_table,
     a.attname AS column_name
   FROM pg_constraint c
   JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
   WHERE confrelid = 'engagements'::regclass
     AND a.attname = 'superintendent_id';
  `);

  console.log('\n3. Checking code references...');
  console.log('   Searching for superintendent_id in TypeScript files...');
}

run().then(() => process.exit(0));
