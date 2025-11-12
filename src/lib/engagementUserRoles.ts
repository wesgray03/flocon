// Engagement User Roles Helper Functions
import { supabase } from '@/lib/supabaseClient';

export type UserRole =
  | 'sales_lead'
  | 'project_lead'
  | 'foreman'
  | 'estimator'
  | 'project_admin'
  | 'observer';

export type EngagementUserRoleDetailed = {
  id: string;
  engagement_id: string;
  user_id: string;
  role: UserRole;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  engagement_name: string;
  engagement_type: string;
  user_name: string;
  user_email: string;
  user_type: string;
  assigned_by_name: string | null;
};

// Fetch all primary user roles for a set of engagements
export async function getPrimaryUserRolesForEngagements(
  engagementIds: string[],
  roles: UserRole[]
): Promise<EngagementUserRoleDetailed[]> {
  if (engagementIds.length === 0) return [];
  const { data, error } = await supabase
    .from('engagement_user_roles_detailed')
    .select('*')
    .in('engagement_id', engagementIds)
    .in('role', roles)
    .eq('is_primary', true);
  if (error) throw error;
  return (data ?? []) as EngagementUserRoleDetailed[];
}

// Set primary user for a role, clearing any previous primary
export async function setPrimaryUserRole(options: {
  engagementId: string;
  role: UserRole;
  userId: string | null;
  assignedBy?: string | null;
  notes?: string | null;
}): Promise<void> {
  const {
    engagementId,
    role,
    userId,
    assignedBy = null,
    notes = null,
  } = options;

  // Clear existing primary for this role
  const { error: clearErr } = await supabase
    .from('engagement_user_roles')
    .update({ is_primary: false })
    .eq('engagement_id', engagementId)
    .eq('role', role)
    .eq('is_primary', true);
  if (clearErr) throw clearErr;

  if (!userId) {
    // If null, we've cleared the primary and are done
    return;
  }

  // Upsert the specific user-role and set as primary
  const { error: upsertErr } = await supabase
    .from('engagement_user_roles')
    .upsert(
      [
        {
          engagement_id: engagementId,
          user_id: userId,
          role,
          is_primary: true,
          assigned_by: assignedBy,
          notes,
        },
      ],
      { onConflict: 'engagement_id,user_id,role' }
    );
  if (upsertErr) throw upsertErr;
}

// Convenience: sync common user roles
export async function syncCoreUserRoles(params: {
  engagementId: string;
  projectOwnerId?: string | null;
  foremanId?: string | null;
  estimatorId?: string | null;
  assignedBy?: string | null;
}): Promise<void> {
  const {
    engagementId,
    projectOwnerId = null,
    foremanId = null,
    estimatorId = null,
    assignedBy = null,
  } = params;

  // Run sequentially to preserve constraint guarantees
  await setPrimaryUserRole({
    engagementId,
    role: 'project_lead',
    userId: projectOwnerId ?? null,
    assignedBy,
  });

  await setPrimaryUserRole({
    engagementId,
    role: 'foreman',
    userId: foremanId ?? null,
    assignedBy,
  });

  if (estimatorId) {
    await setPrimaryUserRole({
      engagementId,
      role: 'estimator',
      userId: estimatorId ?? null,
      assignedBy,
    });
  }
}

// Get all users assigned to an engagement (any role)
export async function getEngagementUsers(
  engagementId: string
): Promise<EngagementUserRoleDetailed[]> {
  const { data, error } = await supabase
    .from('engagement_user_roles_detailed')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('role', { ascending: true })
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EngagementUserRoleDetailed[];
}

// Add a non-primary user to an engagement
export async function addEngagementUser(options: {
  engagementId: string;
  userId: string;
  role: UserRole;
  assignedBy?: string | null;
  notes?: string | null;
}): Promise<void> {
  const {
    engagementId,
    userId,
    role,
    assignedBy = null,
    notes = null,
  } = options;

  const { error } = await supabase.from('engagement_user_roles').insert([
    {
      engagement_id: engagementId,
      user_id: userId,
      role,
      is_primary: false,
      assigned_by: assignedBy,
      notes,
    },
  ]);
  if (error) throw error;
}

// Remove a user-role assignment
export async function removeEngagementUserRole(options: {
  engagementId: string;
  userId: string;
  role: UserRole;
}): Promise<void> {
  const { engagementId, userId, role } = options;

  const { error } = await supabase
    .from('engagement_user_roles')
    .delete()
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .eq('role', role);
  if (error) throw error;
}
