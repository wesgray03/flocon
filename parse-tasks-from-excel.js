#!/usr/bin/env node
/**
 * Parse engagement_tasks from Excel and export to CSV
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function parseExcelToCSV() {
  console.log('📖 Reading Excel file...\n');
  
  const excelPath = path.join(__dirname, 'import-templates', 'prod import.xlsx');
  const workbook = XLSX.readFile(excelPath);
  
  console.log('Available sheets:', workbook.SheetNames.join(', '));
  
  // Look for engagement tasks sheet
  const taskSheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('task') && !name.toLowerCase().includes('completion')
  );
  
  if (!taskSheetName) {
    console.error('❌ Could not find engagement tasks sheet in Excel file');
    process.exit(1);
  }
  
  console.log(`\n✅ Found tasks sheet: "${taskSheetName}"`);
  
  const worksheet = workbook.Sheets[taskSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Found ${jsonData.length} tasks in Excel`);
  
  if (jsonData.length > 0) {
    console.log('\nFirst task sample:', JSON.stringify(jsonData[0], null, 2));
  }
  
  // Convert to CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  // Write to parsed directory
  const outputPath = path.join(__dirname, 'import-templates', 'parsed', '07-engagement-tasks.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');
  
  console.log(`\n✅ Exported to: ${outputPath}`);
  console.log(`\n📋 Task count: ${jsonData.length}`);
}

parseExcelToCSV();
