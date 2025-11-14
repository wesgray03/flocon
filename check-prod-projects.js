const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTEwMDM4OSwiZXhwIjoyMDQ0Njc2Mzg5fQ.zHG8013KgspyCPaAxYxbTyV4y9JbFYCfxX_SJ1qC4yA'
);

(async () => {
  const { data, error } = await supabase
    .from('engagements')
    .select('id, name, project_number')
    .order('project_number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Production engagements:', data?.length || 0);
  if (data && data.length > 0) {
    data
      .slice(0, 15)
      .forEach((p) =>
        console.log(`  ${p.project_number || '(no #)'}: ${p.name}`)
      );
  }
})();
