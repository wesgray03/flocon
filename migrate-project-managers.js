require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateProjectManagers() {
  console.log('=== Migrating Project Managers to Contacts Table ===\n');
  
  // Get all unique manager names from project_dashboard
  const { data: projects, error: projectError } = await supabase
    .from('project_dashboard')
    .select('manager');
  
  if (projectError) {
    console.error('Error loading projects:', projectError);
    return;
  }
  
  const managerNames = [...new Set(projects.map(p => p.manager).filter(Boolean))].sort();
  console.log(`Found ${managerNames.length} unique manager names in projects\n`);
  
  // Get existing contacts
  const { data: existingContacts, error: contactError } = await supabase
    .from('contacts')
    .select('name')
    .eq('contact_type', 'Project Manager');
  
  if (contactError) {
    console.error('Error loading contacts:', contactError);
    return;
  }
  
  const existingNames = new Set(existingContacts.map(c => c.name));
  const missingManagers = managerNames.filter(name => !existingNames.has(name));
  
  if (missingManagers.length === 0) {
    console.log('✓ All project managers already exist in contacts table!');
    return;
  }
  
  console.log(`Need to add ${missingManagers.length} project managers to contacts table:\n`);
  
  // Get D.F. Chase as the default company (since that's what Adam Russell uses)
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'D.F. Chase, Inc.')
    .single();
  
  if (companyError || !companies) {
    console.error('Error finding D.F. Chase company:', companyError);
    console.log('Using first customer company as fallback...');
    
    const { data: fallbackCompany } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_customer', true)
      .limit(1)
      .single();
    
    if (!fallbackCompany) {
      console.error('No customer company found! Cannot proceed.');
      return;
    }
    
    var defaultCompanyId = fallbackCompany.id;
    var defaultCompanyName = fallbackCompany.name;
  } else {
    var defaultCompanyId = companies.id;
    var defaultCompanyName = companies.name;
  }
  
  console.log(`Using company: ${defaultCompanyName} (${defaultCompanyId})\n`);
  
  // Create contacts for missing managers
  const newContacts = missingManagers.map(name => ({
    name: name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@dfchase.com`,
    contact_type: 'Project Manager',
    company_id: defaultCompanyId,
    phone: null
  }));
  
  console.log('Creating contacts:\n');
  newContacts.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.email})`);
  });
  
  console.log('\nInserting into database...');
  
  const { data, error } = await supabase
    .from('contacts')
    .insert(newContacts)
    .select();
  
  if (error) {
    console.error('\n❌ Error inserting contacts:', error);
    return;
  }
  
  console.log(`\n✓ Successfully added ${data.length} project managers to contacts table!`);
  console.log('\nYou can now update individual contact details (email, phone, company) through the Contacts modal.');
}

migrateProjectManagers();
