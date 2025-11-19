/**
 * API endpoint to sync all projects to QuickBooks (one-time bulk operation)
 */
import { syncEngagementToQBO } from '@/lib/qboSync';
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Ensure Next.js treats this as API route
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Log the request for debugging
    console.log('sync-all-projects called with method:', req.method);
    
    if (req.method !== 'POST') {
      console.error('Invalid method:', req.method);
      return res.status(405).json({ 
        error: 'Method not allowed',
        received: req.method,
        expected: 'POST'
      });
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

  try {
    // Get all projects that haven't been synced yet (or optionally all)
    const { onlyUnsynced } = req.body;

    let query = supabase
      .from('engagements')
      .select('id, project_number, name')
      .eq('type', 'project')
      .order('project_number');

    if (onlyUnsynced) {
      query = query.is('qbo_job_id', null);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    if (!projects || projects.length === 0) {
      return res.json({
        success: true,
        syncedCount: 0,
        message: 'No projects to sync',
      });
    }

    // Sync each project
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
    console.error('Bulk sync error:', error);
    return res.status(500).json({ 
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
