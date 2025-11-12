#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('engagement_parties')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Sample record structure:', data);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No records yet - checking via RPC...');

    // Try to get column info via SQL
    const { data: cols, error: colError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'engagement_parties'
        ORDER BY ordinal_position;
      `,
    });

    if (colError) {
      console.log('Cannot query schema, using expected schema from codebase');
    } else {
      console.log('Columns from schema:', cols);
    }
  }
}
