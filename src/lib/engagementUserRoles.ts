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

  // Fetch user roles first
  const { data: userRoles, error: rolesError } = await supabase
    .from('engagement_user_roles')
    .select('*')
    .in('engagement_id', engagementIds)
    .in('role', roles)
    .eq('is_primary', true);

  if (rolesError) throw rolesError;
  if (!userRoles || userRoles.length === 0) return [];

  // Get unique IDs for related data
  const userIds = [...new Set(userRoles.map((r) => r.user_id))];
  const assignedByIds = [
    ...new Set(userRoles.map((r) => r.assigned_by).filter(Boolean)),
  ];

  // Fetch engagements, users, and assigned_by users in parallel
  const [engagementsRes, usersRes, assignedByUsersRes] = await Promise.all([
    supabase
      .from('engagements')
      .select('id, name, type')
      .in('id', engagementIds),
    supabase
      .from('users')
      .select('id, name, email, user_type')
      .in('id', userIds),
    assignedByIds.length > 0
      ? supabase.from('users').select('id, name').in('id', assignedByIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (engagementsRes.error) throw engagementsRes.error;
  if (usersRes.error) throw usersRes.error;
  if (assignedByUsersRes.error) throw assignedByUsersRes.error;

  // Build lookup maps
  const engagementsMap = new Map(
    (engagementsRes.data || []).map((e) => [e.id, e])
  );
  const usersMap = new Map((usersRes.data || []).map((u) => [u.id, u]));
  const assignedByMap = new Map(
    (assignedByUsersRes.data || []).map((u) => [u.id, u])
  );

  // Map to detailed format
  return userRoles.map((role) => {
    const engagement = engagementsMap.get(role.engagement_id);
    const user = usersMap.get(role.user_id);
    const assignedByUser = role.assigned_by
      ? assignedByMap.get(role.assigned_by)
      : null;

    return {
      id: role.id,
      engagement_id: role.engagement_id,
      user_id: role.user_id,
      role: role.role as UserRole,
      is_primary: role.is_primary,
      assigned_at: role.assigned_at,
      assigned_by: role.assigned_by,
      notes: role.notes,
      created_at: role.created_at,
      updated_at: role.updated_at,
      engagement_name: engagement?.name || '',
      engagement_type: engagement?.type || '',
      user_name: user?.name || '',
      user_email: user?.email || '',
      user_type: user?.user_type || '',
      assigned_by_name: assignedByUser?.name || null,
    };
  }) as EngagementUserRoleDetailed[];
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
  if (clearErr) {
    console.error('[setPrimaryUserRole] Clear error:', {
      code: clearErr.code,
      message: clearErr.message,
      details: clearErr.details,
      hint: clearErr.hint,
      engagementId,
      role,
    });
    throw clearErr;
  }

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

  if (upsertErr) {
    const needsFallback =
      upsertErr.message?.includes(
        'no unique or exclusion constraint matching the ON CONFLICT specification'
      ) || upsertErr.code === 'PGRST204';

    if (!needsFallback) {
      console.error('[setPrimaryUserRole] Upsert error:', {
        code: upsertErr.code,
        message: upsertErr.message,
        details: upsertErr.details,
        hint: upsertErr.hint,
        engagementId,
        role,
        userId,
      });
      throw upsertErr;
    }

    // Fallback path when unique constraint (engagement_id,user_id,role) not present in prod yet
    const { data: existing, error: fetchErr } = await supabase
      .from('engagement_user_roles')
      .select('id')
      .eq('engagement_id', engagementId)
      .eq('user_id', userId)
      .eq('role', role)
      .limit(1)
      .maybeSingle();
    if (fetchErr) {
      console.error('[setPrimaryUserRole] Fallback fetch error:', {
        code: fetchErr.code,
        message: fetchErr.message,
        details: fetchErr.details,
        hint: fetchErr.hint,
        engagementId,
        role,
        userId,
      });
      throw fetchErr;
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from('engagement_user_roles')
        .update({ is_primary: true, assigned_by: assignedBy, notes })
        .eq('id', existing.id);
      if (updateErr) {
        console.error('[setPrimaryUserRole] Fallback update error:', {
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details,
          hint: updateErr.hint,
          engagementId,
          role,
          existingId: existing.id,
        });
        throw updateErr;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('engagement_user_roles')
        .insert([
          {
            engagement_id: engagementId,
            user_id: userId,
            role,
            is_primary: true,
            assigned_by: assignedBy,
            notes,
          },
        ]);
      if (insertErr) {
        console.error('[setPrimaryUserRole] Fallback insert error:', {
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint,
          engagementId,
          role,
          userId,
        });
        throw insertErr;
      }
    }
  }
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
  // Fetch user roles first
  const { data: userRoles, error: rolesError } = await supabase
    .from('engagement_user_roles')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('role', { ascending: true })
    .order('is_primary', { ascending: false });

  if (rolesError) throw rolesError;
  if (!userRoles || userRoles.length === 0) return [];

  // Get unique IDs for related data
  const userIds = [...new Set(userRoles.map((r) => r.user_id))];
  const assignedByIds = [
    ...new Set(userRoles.map((r) => r.assigned_by).filter(Boolean)),
  ];

  // Fetch engagement, users, and assigned_by users in parallel
  const [engagementRes, usersRes, assignedByUsersRes] = await Promise.all([
    supabase
      .from('engagements')
      .select('id, name, type')
      .eq('id', engagementId)
      .single(),
    supabase
      .from('users')
      .select('id, name, email, user_type')
      .in('id', userIds),
    assignedByIds.length > 0
      ? supabase.from('users').select('id, name').in('id', assignedByIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (engagementRes.error) throw engagementRes.error;
  if (usersRes.error) throw usersRes.error;
  if (assignedByUsersRes.error) throw assignedByUsersRes.error;

  // Build lookup maps
  const usersMap = new Map((usersRes.data || []).map((u) => [u.id, u]));
  const assignedByMap = new Map(
    (assignedByUsersRes.data || []).map((u) => [u.id, u])
  );

  // Map to detailed format
  return userRoles.map((role) => {
    const user = usersMap.get(role.user_id);
    const assignedByUser = role.assigned_by
      ? assignedByMap.get(role.assigned_by)
      : null;

    return {
      id: role.id,
      engagement_id: role.engagement_id,
      user_id: role.user_id,
      role: role.role as UserRole,
      is_primary: role.is_primary,
      assigned_at: role.assigned_at,
      assigned_by: role.assigned_by,
      notes: role.notes,
      created_at: role.created_at,
      updated_at: role.updated_at,
      engagement_name: engagementRes.data?.name || '',
      engagement_type: engagementRes.data?.type || '',
      user_name: user?.name || '',
      user_email: user?.email || '',
      user_type: user?.user_type || '',
      assigned_by_name: assignedByUser?.name || null,
    };
  }) as EngagementUserRoleDetailed[];
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
