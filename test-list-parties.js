// List parties for an engagement and role filters
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const id = process.argv[2];
if (!id) {
  console.error('Usage: node test-list-parties.js <engagement_id>');
  process.exit(1);
}

async function run() {
  console.log('Engagement:', id);
  const { data, error } = await supabase
    .from('engagement_parties_detailed')
    .select(
      'role, is_primary, party_type, party_name, party_email, party_phone'
    )
    .eq('engagement_id', id)
    .order('role', { ascending: true });
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Parties:', data);

  const { data: superintendent, error: sErr } = await supabase
    .from('engagement_parties_detailed')
    .select('party_name')
    .eq('engagement_id', id)
    .eq('role', 'superintendent')
    .eq('is_primary', true)
    .maybeSingle();
  if (sErr) console.error('Superintendent error:', sErr);
  else console.log('Primary superintendent:', superintendent);
}

run().then(() => process.exit(0));
