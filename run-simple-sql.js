// Quick script to run simple SQL
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
ALTER TABLE public.engagements 
ADD COLUMN IF NOT EXISTS estimating_type TEXT DEFAULT 'Budget';

ALTER TABLE public.engagements
DROP CONSTRAINT IF EXISTS engagements_estimating_type_check;

ALTER TABLE public.engagements
ADD CONSTRAINT engagements_estimating_type_check 
CHECK (estimating_type IN ('Budget', 'Construction'));

CREATE INDEX IF NOT EXISTS idx_engagements_estimating_type 
ON public.engagements(estimating_type);
`;

async function run() {
  console.log('Adding estimating_type column...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Success!', data);
  }
}

run();
