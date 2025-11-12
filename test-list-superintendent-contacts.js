import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const q = process.argv.slice(2).join(' ');

async function run() {
  console.log('Listing superintendent contacts', q ? `matching: ${q}` : '');
  let query = supabase
    .from('contacts')
    .select('id,name,contact_type')
    .eq('contact_type', 'Superintendent')
    .order('name');
  if (q) query = query.ilike('name', `%${q}%`);
  const { data, error } = await query.limit(50);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Count:', data?.length || 0);
  console.log(data?.slice(0, 20));
}

run().then(() => process.exit(0));
