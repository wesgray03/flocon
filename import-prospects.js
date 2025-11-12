// import-prospects.js
// Import prospects from CSV with automatic company and contact creation
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

// Parse CSV manually to handle commas in quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter((line) => line.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rows.push(row);
  }

  return rows;
}

// Convert Excel date serial number to ISO date
function excelDateToISO(serial) {
  if (!serial || serial === '') return null;
  const num = parseInt(serial);
  if (isNaN(num)) return null;

  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// Get or create a company
async function getOrCreateCompany(name, type = 'Contractor') {
  if (!name || name === '') return null;

  const cleanName = name.trim();

  // Check if company exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', cleanName)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ Found existing company: ${cleanName}`);
    return existing.id;
  }

  // Create new company
  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert([
      {
        name: cleanName,
        company_type: type,
        is_customer: type === 'Contractor',
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error(`  ✗ Error creating company ${cleanName}:`, error.message);
    return null;
  }

  console.log(`  ✓ Created company: ${cleanName}`);
  return newCompany.id;
}

// Get or create a contact
async function getOrCreateContact(
  name,
  companyId,
  contactType = 'Project Manager'
) {
  if (!name || name === '') return null;

  const cleanName = name.trim();

  // Check if contact exists
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .ilike('name', cleanName)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ Found existing contact: ${cleanName}`);
    return existing.id;
  }

  // Create new contact
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert([
      {
        name: cleanName,
        company_id: companyId,
        contact_type: contactType,
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error(`  ✗ Error creating contact ${cleanName}:`, error.message);
    return null;
  }

  console.log(`  ✓ Created contact: ${cleanName}`);
  return newContact.id;
}

// Get or create user
async function getOrCreateUser(name) {
  if (!name || name === '') return null;

  const cleanName = name.trim();

  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('name', cleanName)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([
      {
        name: cleanName,
        email: `${cleanName.toLowerCase().replace(/\s+/g, '.')}@floorsunlimited.com`,
        user_type: 'Office',
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error(`  ✗ Error creating user ${cleanName}:`, error.message);
    return null;
  }

  console.log(`  ✓ Created user: ${cleanName}`);
  return newUser.id;
}

// Parse trade amounts and create engagement_trades records
async function createTrades(engagementId, row, tradeMapping) {
  const trades = [];

  for (const [csvColumn, tradeCode] of Object.entries(tradeMapping)) {
    const amount = row[csvColumn];
    if (amount && amount !== '' && amount !== '0' && amount !== 'null') {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        // Get trade_id from code
        const { data: trade } = await supabase
          .from('trades')
          .select('id')
          .eq('code', tradeCode)
          .maybeSingle();

        if (trade) {
          trades.push({
            engagement_id: engagementId,
            trade_id: trade.id,
            estimated_amount: numAmount,
          });
        }
      }
    }
  }

  if (trades.length > 0) {
    const { error } = await supabase.from('engagement_trades').insert(trades);

    if (error) {
      console.error(`  ✗ Error creating trades:`, error.message);
    } else {
      console.log(`  ✓ Created ${trades.length} trade(s)`);
    }
  }
}

async function importProspects() {
  console.log('🚀 Starting prospect import...\n');

  // Read CSV file
  const csvPath = path.join(
    __dirname,
    'import-templates',
    'Prospect Import.csv'
  );
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`📊 Found ${rows.length} prospects to import\n`);

  // Trade code mapping (CSV column -> trade code)
  // Only mapping trades that exist in the database
  const tradeMapping = {
    '09 30 00': '09.30.00', // Ceramic Tile
    '09 64 00': '09.64.00', // Wood Flooring
    '09 65 00': '09.65.00', // Resilient Flooring
    '09 68 00': '09.68.00', // Carpet
    '12 36 00': '12.36.00', // Countertops
    // Note: 06 61 13, 10 28 13, 10 28 19, 22 40 00 not in trades table
  };

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const projectName = row.Project;

    if (!projectName || projectName === '') {
      console.log(`⏭️  Skipping row ${i + 1}: No project name\n`);
      continue;
    }

    console.log(`📝 [${i + 1}/${rows.length}] Processing: ${projectName}`);

    try {
      // 1. Get or create customer company
      const customerId = await getOrCreateCompany(row.Customer, 'Contractor');

      // 2. Get or create architect company
      const architectId = row.Architect
        ? await getOrCreateCompany(row.Architect, 'Architect')
        : null;

      // 3. Get or create prospect contact (linked to customer)
      const prospectContactId = row['Prospect Contact']
        ? await getOrCreateContact(
            row['Prospect Contact'],
            customerId,
            'Project Manager'
          )
        : null;

      // 4. Get or create project manager contact (linked to customer)
      const pmContactId = row['Project Manager']
        ? await getOrCreateContact(
            row['Project Manager'],
            customerId,
            'Project Manager'
          )
        : null;

      // 5. Get or create sales user
      const salesUserId = row.Sales ? await getOrCreateUser(row.Sales) : null;

      // 6. Parse dates
      const bidDate = excelDateToISO(row['Bid Date']);
      const lastCall = excelDateToISO(row.last_call);
      const estStart = excelDateToISO(row['Est. Start']);

      // 7. Parse bid amount
      const bidAmount = row.bid_amount ? parseFloat(row.bid_amount) : null;

      // 8. Parse active status
      const active =
        row.Active === 'TRUE' || row.Active === 'true' || row.Active === '1';

      // 9. Get probability_level_id from Probability column
      let probabilityLevelId = null;
      if (row.Probability && row.Probability !== '') {
        const { data: probLevel } = await supabase
          .from('probability_levels')
          .select('id')
          .ilike('name', row.Probability.trim())
          .maybeSingle();

        if (probLevel) {
          probabilityLevelId = probLevel.id;
        }
      }

      // 10. Create engagement
      const { data: engagement, error: engError } = await supabase
        .from('engagements')
        .insert([
          {
            name: projectName,
            type: 'prospect',
            estimating_type: row.Estimating_type || 'Budget',
            bid_date: bidDate,
            last_call: lastCall,
            active: active,
            probability_level_id: probabilityLevelId,
            bid_amount: bidAmount,
            est_start_date: estStart,
          },
        ])
        .select('id')
        .single();

      if (engError) {
        console.error(`  ✗ Error creating engagement:`, engError.message);
        errorCount++;
        continue;
      }

      console.log(`  ✓ Created engagement: ${engagement.id}`);

      // 11. Create engagement_parties relationships
      const parties = [];

      if (customerId) {
        parties.push({
          engagement_id: engagement.id,
          party_type: 'company',
          party_id: customerId,
          role: 'customer',
          is_primary: true,
        });
      }

      if (architectId) {
        parties.push({
          engagement_id: engagement.id,
          party_type: 'company',
          party_id: architectId,
          role: 'architect',
          is_primary: true,
        });
      }

      if (prospectContactId) {
        parties.push({
          engagement_id: engagement.id,
          party_type: 'contact',
          party_id: prospectContactId,
          role: 'prospect_contact',
          is_primary: true,
        });
      }

      if (pmContactId) {
        parties.push({
          engagement_id: engagement.id,
          party_type: 'contact',
          party_id: pmContactId,
          role: 'project_manager',
          is_primary: true,
        });
      }

      if (parties.length > 0) {
        const { error: partiesError } = await supabase
          .from('engagement_parties')
          .insert(parties);

        if (partiesError) {
          console.error(`  ✗ Error creating parties:`, partiesError.message);
        } else {
          console.log(`  ✓ Created ${parties.length} party relationship(s)`);
        }
      }

      // 12. Create engagement_user_roles relationship for sales
      if (salesUserId) {
        const { error: roleError } = await supabase
          .from('engagement_user_roles')
          .insert([
            {
              engagement_id: engagement.id,
              user_id: salesUserId,
              role: 'sales_lead',
              is_primary: true,
            },
          ]);

        if (roleError) {
          console.error(`  ✗ Error creating user role:`, roleError.message);
        } else {
          console.log(`  ✓ Assigned sales lead`);
        }
      }

      // 13. Create engagement_trades
      await createTrades(engagement.id, row, tradeMapping);

      successCount++;
      console.log(`  ✅ Success!\n`);
    } catch (err) {
      console.error(`  ✗ Unexpected error:`, err.message);
      errorCount++;
      console.log();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📋 Total processed: ${rows.length}`);
  console.log('='.repeat(60));
}

// Run the import
importProspects().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
