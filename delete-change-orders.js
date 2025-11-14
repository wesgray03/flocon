// Delete all change orders and reimport with auto_number
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function deleteAndReimport() {
  console.log('Deleting existing change orders...');

  const { error: deleteError } = await supabase
    .from('engagement_change_orders')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Delete error:', deleteError);
    process.exit(1);
  }

  console.log('✅ Deleted all change orders');
  console.log('\nNow run: node import-change-orders.js');
}

deleteAndReimport();
