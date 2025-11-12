// scripts/verify-engagement-parties-frontend.ts
// Minimal verification using anon key to read from engagement_parties_detailed
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const supabase = createClient(url, anon);

  // Pick one recent engagement
  const { data: eng, error: engErr } = await supabase
    .from('engagements')
    .select('id,name')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (engErr || !eng) {
    console.error('No engagement found or error:', engErr);
    process.exit(1);
  }

  const { data: parties, error } = await supabase
    .from('engagement_parties_detailed')
    .select('*')
    .eq('engagement_id', eng.id);

  if (error) {
    console.error('Query error:', error);
    process.exit(1);
  }

  console.log('Engagement:', eng);
  console.log('Parties:', parties);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
