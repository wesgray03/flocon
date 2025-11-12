const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function main() {
  console.log('Checking projects_v and prospects_v...');
  for (const view of ['projects_v', 'prospects_v']) {
    const { data, error } = await supabase.from(view).select('id').limit(1);
    if (error) {
      console.log(`❌ ${view} not available: ${error.message}`);
    } else {
      console.log(`✅ ${view} exists (${data?.length || 0} rows sample)`);
    }
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
