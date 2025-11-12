// Quick test to check if billings data can be queried
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

async function testBillings() {
  console.log('Testing billings queries...\n');

  // Get a sample project ID
  const { data: projects, error: projError } = await supabase
    .from('engagements')
    .select('id, name')
    .limit(1);

  if (projError) {
    console.error('Error fetching project:', projError);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('No projects found');
    return;
  }

  const projectId = projects[0].id;
  console.log(`Using project: ${projects[0].name} (${projectId})\n`);

  // Test SOV lines query
  console.log('1. Testing sov_lines query...');
  const { data: sovData, error: sovError } = await supabase
    .from('sov_lines')
    .select('id, line_code, description, engagement_id')
    .eq('engagement_id', projectId)
    .limit(5);

  if (sovError) {
    console.error('❌ SOV Error:', sovError);
  } else {
    console.log(`✅ Found ${sovData?.length || 0} SOV lines`);
    if (sovData && sovData.length > 0) {
      console.log('Sample:', sovData[0]);
    }
  }

  // Test pay apps query
  console.log('\n2. Testing pay_apps query...');
  const { data: payAppData, error: payAppError } = await supabase
    .from('pay_apps')
    .select('*')
    .eq('engagement_id', projectId)
    .limit(5);

  if (payAppError) {
    console.error('❌ Pay App Error:', payAppError);
  } else {
    console.log(`✅ Found ${payAppData?.length || 0} pay apps`);
    if (payAppData && payAppData.length > 0) {
      console.log('Sample:', payAppData[0]);
    }
  }

  // Check column existence
  console.log('\n3. Checking column names in sov_lines...');
  const { data: sovSample } = await supabase
    .from('sov_lines')
    .select('*')
    .limit(1);

  if (sovSample && sovSample.length > 0) {
    const columns = Object.keys(sovSample[0]);
    console.log('Columns:', columns.join(', '));
    console.log('Has engagement_id?', columns.includes('engagement_id'));
    console.log('Has project_id?', columns.includes('project_id'));
  }
}

testBillings().then(() => {
  console.log('\nTest complete');
  process.exit(0);
});
