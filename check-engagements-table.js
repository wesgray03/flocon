// Check actual engagements table columns (not the view)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hiimfqazsbqniqvowexo.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaW1mcWF6c2Jxbmlxdm93ZXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTAxNTQzMiwiZXhwIjoyMDQ0NTkxNDMyfQ.z2vp4k1DgC6tOikbqMPCF2sGXXfmv35CL_ZcqS2w3uY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEngagementsTable() {
  console.log('Checking engagements table schema...\n');

  // Query the table directly to see its columns
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('engagements table columns:');
    Object.keys(data[0])
      .sort()
      .forEach((col) => {
        console.log(`  - ${col}`);
      });

    console.log('\nSample data types:');
    Object.entries(data[0]).forEach(([key, value]) => {
      console.log(
        `  ${key}: ${typeof value} (${value === null ? 'null' : typeof value})`
      );
    });
  } else {
    console.log('No data in engagements table');
  }
}

checkEngagementsTable();
