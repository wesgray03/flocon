import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const id = process.argv[2];

async function run() {
  const { data, error } = await supabase
    .from('engagements')
    .select('superintendent_id, foreman_id')
    .eq('id', id)
    .single();
  console.log('engagements.superintendent_id, foreman_id:', data, error);
  if (data?.superintendent_id) {
    const { data: u } = await supabase
      .from('users')
      .select('id,name')
      .eq('id', data.superintendent_id)
      .single();
    console.log('legacy superintendent user:', u);
  }
}

run().then(() => process.exit(0));
