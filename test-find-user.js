// Find a user by name (case-insensitive)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const q = process.argv.slice(2).join(' ') || 'test project 1292';

async function run() {
  console.log(`Searching users for name ilike: ${q}`);
  const { data: exact, error: exactErr } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', q)
    .limit(5);
  if (exactErr) {
    console.error('Error querying users:', exactErr);
  } else {
    console.log('Exact ilike matches:', exact?.length || 0);
    console.log(exact);
  }

  if (!exact || exact.length === 0) {
    const like = `%${q.replace(/\s+/g, '%')}%`;
    const { data: fuzzy, error: fuzzyErr } = await supabase
      .from('users')
      .select('id, name')
      .ilike('name', like)
      .limit(10);
    if (fuzzyErr) {
      console.error('Error querying fuzzy users:', fuzzyErr);
    } else {
      console.log(`\nFuzzy matches (${like}):`, fuzzy?.length || 0);
      console.log(fuzzy);
    }
  }
}

run().then(() => process.exit(0));
