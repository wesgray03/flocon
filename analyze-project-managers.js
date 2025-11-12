require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeProjectManagers() {
  console.log('=== Analyzing Project Managers ===\n');
  
  // Get all unique manager names from project_dashboard
  const { data: projects, error } = await supabase
    .from('project_dashboard')
    .select('manager');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Get unique manager names
  const managerNames = [...new Set(projects.map(p => p.manager).filter(Boolean))];
  console.log(`Unique manager names in projects: ${managerNames.length}`);
  managerNames.sort().forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  
  // Get contacts with Project Manager type
  console.log('\n=== Project Managers in Contacts Table ===\n');
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('contact_type', 'Project Manager')
    .order('name');
  
  if (contactError) {
    console.error('Contact Error:', contactError);
    return;
  }
  
  console.log(`Total PM contacts: ${contacts?.length || 0}`);
  if (contacts && contacts.length > 0) {
    contacts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.email})`);
    });
  }
  
  // Find managers that need to be added as contacts
  const contactNames = new Set(contacts.map(c => c.name));
  const missingManagers = managerNames.filter(name => !contactNames.has(name));
  
  if (missingManagers.length > 0) {
    console.log(`\n=== Managers NOT in Contacts Table (${missingManagers.length}) ===`);
    missingManagers.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
    console.log('\nThese managers need to be added to the contacts table.');
  } else {
    console.log('\n✓ All project managers exist in contacts table!');
  }
}

analyzeProjectManagers();
