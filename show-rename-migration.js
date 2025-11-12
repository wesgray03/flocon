#!/usr/bin/env node

/**
 * Simple script to execute SQL migration using Supabase
 */

const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, 'db', 'migrations', '2025-11-09-rename-manager-to-owner-sales.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('📋 Migration SQL:');
console.log('═'.repeat(80));
console.log(sql);
console.log('═'.repeat(80));
console.log('\n💡 Copy the SQL above and run it in your Supabase SQL Editor');
console.log('   URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
