require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  console.log('Backing up notes column before deletion...\n');

  // Get all records with notes
  const { data, error } = await supabase
    .from('engagements')
    .select('id, name, notes')
    .not('notes', 'is', null);

  if (error) {
    console.error('Error fetching notes:', error);
    process.exit(1);
  }

  console.log(`Found ${data.length} records with notes data`);

  // Save to backup file
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(
    backupDir,
    `engagements-notes-backup-${timestamp}.json`
  );

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

  console.log(`\n✅ Backup saved to: ${backupFile}`);
  console.log(`\nBackup contains ${data.length} records with notes.`);
  console.log('You can now proceed with the migration.');
})();
