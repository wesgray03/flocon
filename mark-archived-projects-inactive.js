// mark-archived-projects-inactive.js
// Script to mark all projects in Archive stage as inactive (active = false)

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function markArchivedProjectsInactive() {
  try {
    console.log('=== MARKING ARCHIVED PROJECTS AS INACTIVE ===\n');

    // First, find the Archive stage ID
    const { data: archiveStage, error: stageError } = await supabase
      .from('stages')
      .select('id, name')
      .eq('name', 'Archive')
      .single();

    if (stageError || !archiveStage) {
      console.error('Error finding Archive stage:', stageError);
      console.log('No Archive stage found. Exiting...');
      return;
    }

    console.log(
      `Found Archive stage: ${archiveStage.name} (ID: ${archiveStage.id})\n`
    );

    // Find all projects in Archive stage
    const { data: archivedProjects, error: projectsError } = await supabase
      .from('engagements')
      .select('id, name, project_number, stage_id, active')
      .eq('type', 'project')
      .eq('stage_id', archiveStage.id);

    if (projectsError) {
      console.error('Error fetching archived projects:', projectsError);
      return;
    }

    if (!archivedProjects || archivedProjects.length === 0) {
      console.log('No archived projects found.');
      return;
    }

    console.log(`Found ${archivedProjects.length} archived projects:\n`);

    const activeArchived = archivedProjects.filter((p) => p.active !== false);
    const alreadyInactive = archivedProjects.filter((p) => p.active === false);

    console.log(
      `- ${activeArchived.length} currently marked as active (will be updated)`
    );
    console.log(`- ${alreadyInactive.length} already marked as inactive\n`);

    if (activeArchived.length === 0) {
      console.log(
        'All archived projects are already marked as inactive. Nothing to do!'
      );
      return;
    }

    console.log('Projects to update:');
    activeArchived.forEach((p, i) => {
      console.log(`${i + 1}. ${p.project_number || 'N/A'} - ${p.name}`);
    });

    console.log('\nUpdating projects...\n');

    // Update all archived projects to be inactive
    const { data: updated, error: updateError } = await supabase
      .from('engagements')
      .update({ active: false })
      .eq('type', 'project')
      .eq('stage_id', archiveStage.id)
      .eq('active', true)
      .select('id, name, project_number');

    if (updateError) {
      console.error('Error updating projects:', updateError);
      return;
    }

    console.log(
      `✓ Successfully marked ${updated?.length || 0} archived projects as inactive\n`
    );

    if (updated && updated.length > 0) {
      console.log('Updated projects:');
      updated.forEach((p, i) => {
        console.log(`${i + 1}. ${p.project_number || 'N/A'} - ${p.name}`);
      });
    }

    console.log('\n=== COMPLETE ===');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

markArchivedProjectsInactive();
