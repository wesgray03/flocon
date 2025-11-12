import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Configuration
const EXCEL_FILE = 'import-templates/prod import.xlsx';
const OUTPUT_DIR = 'import-templates/parsed';

// UUID counter for generating engagement_parties IDs
let partyIdCounter = 60000001;

function generatePartyId(): string {
  const id = `${partyIdCounter.toString().padStart(8, '0')}-0000-0000-0000-000000000001`;
  partyIdCounter++;
  return id;
}

interface EngagementRow {
  id: string;
  [key: string]: any;
}

interface PartyRecord {
  id: string;
  engagement_id: string;
  party_type: 'company' | 'contact';
  company_id: string | null;
  contact_id: string | null;
  role: string;
  is_primary: boolean;
}

function parseExcelFile() {
  console.log(`Reading Excel file: ${EXCEL_FILE}`);

  // Read workbook
  const workbook = XLSX.readFile(EXCEL_FILE);

  console.log(`Found ${workbook.SheetNames.length} sheets:`);
  workbook.SheetNames.forEach((name) => console.log(`  - ${name}`));

  return workbook;
}

function processEngagementsSheet(worksheet: XLSX.WorkSheet): {
  engagements: any[];
  parties: PartyRecord[];
} {
  console.log('\nProcessing engagements sheet...');

  // Convert to JSON
  const data: EngagementRow[] = XLSX.utils.sheet_to_json(worksheet);
  console.log(`  Found ${data.length} engagement records`);

  // Party columns to extract
  const partyColumnMap: {
    [key: string]: { role: string; type: 'company' | 'contact' };
  } = {
    customer_id: { role: 'customer', type: 'company' },
    customer_company_id: { role: 'customer', type: 'company' },
    project_manager_id: { role: 'project_manager', type: 'contact' },
    project_manager_contact_id: { role: 'project_manager', type: 'contact' },
    superintendent_id: { role: 'superintendent', type: 'contact' },
    superintendent_contact_id: { role: 'superintendent', type: 'contact' },
    architect_id: { role: 'architect', type: 'company' },
    architect_contact_id: { role: 'architect', type: 'contact' },
    owner_id: { role: 'owner', type: 'company' },
    owner_contact_id: { role: 'owner', type: 'contact' },
    prospect_contact_id: { role: 'prospect_contact', type: 'contact' },
  };

  const parties: PartyRecord[] = [];
  const cleanEngagements: any[] = [];

  // Process each engagement
  data.forEach((row) => {
    const engagementId = row.id;
    if (!engagementId) return;

    // Extract parties
    Object.entries(partyColumnMap).forEach(([column, config]) => {
      const value = row[column];
      if (value) {
        parties.push({
          id: generatePartyId(),
          engagement_id: engagementId,
          party_type: config.type,
          company_id: config.type === 'company' ? value : null,
          contact_id: config.type === 'contact' ? value : null,
          role: config.role,
          is_primary:
            config.role === 'customer' ||
            config.role === 'project_manager' ||
            config.role === 'prospect_contact',
        });
      }
    });

    // Clean engagement data (remove party columns)
    const cleanRow: any = {};
    Object.keys(row).forEach((key) => {
      if (!partyColumnMap[key]) {
        cleanRow[key] = row[key];
      }
    });
    cleanEngagements.push(cleanRow);
  });

  console.log(`  Created ${parties.length} engagement_parties records`);

  return { engagements: cleanEngagements, parties };
}

function exportToCsv(data: any[], filename: string) {
  if (data.length === 0) {
    console.log(`  Skipping empty data: ${filename}`);
    return;
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Convert to CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Write file
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, csv);

  console.log(`  Exported: ${data.length} records -> ${outputPath}`);
}

function main() {
  console.log('='.repeat(60));
  console.log('Excel Import File Parser');
  console.log('='.repeat(60));

  // Read Excel file
  const workbook = parseExcelFile();

  // Process each sheet
  workbook.SheetNames.forEach((sheetName) => {
    console.log(`\nProcessing: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Special handling for engagements sheet
    if (sheetName.toLowerCase().includes('engagement')) {
      const { engagements, parties } = processEngagementsSheet(worksheet);
      exportToCsv(engagements, '05-engagements.csv');
      exportToCsv(parties, '06-engagement-parties.csv');
    } else {
      // Export as-is
      const data = XLSX.utils.sheet_to_json(worksheet);
      const filename = `${sheetName}.csv`;
      exportToCsv(data, filename);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Processing complete!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review the generated CSV files in import-templates/parsed/');
  console.log('2. Follow PRODUCTION-IMPORT-PROCEDURE.md to import');
  console.log(
    '3. Run post-import-autocomplete-tasks.sql to auto-complete tasks'
  );
}

main();
