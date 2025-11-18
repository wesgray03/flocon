/**
 * API endpoint to clear QB sync data and resync all projects
 */
import { syncEngagementToQBO } from '@/lib/qboSync';
import { supabase } from '@/lib/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Clear all QB sync data
    console.log('Clearing QB sync data...');
    const { error: clearError } = await supabase
      .from('engagements')
      .update({
        qbo_customer_id: null,
        qbo_job_id: null,
        qbo_last_synced_at: null,
      })
      .eq('type', 'project');

    if (clearError) {
      console.error('Error clearing sync data:', clearError);
      return res.status(500).json({ error: 'Failed to clear sync data' });
    }

    // 2. Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('engagements')
      .select('id, project_number, name')
      .eq('type', 'project')
      .order('project_number');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    if (!projects || projects.length === 0) {
      return res.json({
        success: true,
        syncedCount: 0,
        totalCount: 0,
        message: 'No projects to sync',
      });
    }

    // 3. Sync each project
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        console.log(
          `Syncing project ${project.project_number}: ${project.name}`
        );
        const result = await syncEngagementToQBO(project.id);
        results.push({
          projectId: project.id,
          projectNumber: project.project_number,
          name: project.name,
          ...result,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Add small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`Error syncing project ${project.id}:`, error);
        errorCount++;
        results.push({
          projectId: project.id,
          projectNumber: project.project_number,
          name: project.name,
          success: false,
          error: error.message,
        });
      }
    }

    return res.json({
      success: errorCount === 0,
      syncedCount: successCount,
      errorCount,
      totalCount: projects.length,
      results,
    });
  } catch (error: any) {
    console.error('Clear and resync error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
