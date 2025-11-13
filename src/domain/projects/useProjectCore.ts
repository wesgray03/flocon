import {
  getPrimaryPartiesForEngagements,
  setPrimaryParty,
  type PartyRole,
} from '@/lib/engagementParties';
import {
  getPrimaryUserRolesForEngagements,
  setPrimaryUserRole,
  type UserRole,
} from '@/lib/engagementUserRoles';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';
import type { Project, ProjectComment, Stage, User } from './types';

export function useProjectCore(id?: string | string[]) {
  const projectId = Array.isArray(id) ? id[0] : id;
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [partiesLoaded, setPartiesLoaded] = useState(false);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }
      setSessionEmail(session.user.email ?? null);

      if (session?.user) {
        const { data: userArray } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const user = userArray && userArray.length > 0 ? userArray[0] : null;
        setCurrentUser(user as User);
      }

      const { data: stagesList } = await supabase
        .from('stages')
        .select('id, name, order')
        .order('order', { ascending: true });
      if (!cancelled) setStages((stagesList ?? []) as Stage[]);

      const { data: proj } = await supabase
        .from('projects_v')
        .select('*')
        .eq('id', projectId)
        .single();

      let contractAmount: number | null = null;
      let engagementType: 'project' | 'prospect' = 'project';
      if (proj) {
        contractAmount = proj.contract_amount ?? null;
        engagementType = proj.type ?? 'project';
      }

      const projectData: Project | null = proj
        ? {
            id: proj.id,
            name: proj.name,
            type: engagementType,
            project_number: proj.project_number,
            customer_name: null,
            manager: null,
            company_owner: null,
            architect: null,
            project_lead: null,
            sales_lead: null,
            start_date: proj.start_date,
            end_date: proj.end_date,
            contract_amount: contractAmount,
            stage: null,
            stage_id: proj.stage_id,
            stage_order: null,
            sharepoint_folder: proj.sharepoint_folder ?? null,
          }
        : null;

      if (projectData?.id) {
        try {
          // Load stage name and order from stages table
          if (projectData.stage_id) {
            const { data: stageData } = await supabase
              .from('stages')
              .select('name, order')
              .eq('id', projectData.stage_id)
              .single();
            if (stageData) {
              projectData.stage = stageData.order
                ? `${stageData.order}. ${stageData.name}`
                : stageData.name;
              projectData.stage_order = stageData.order ?? null;
            }
          }

          const partyRoles: PartyRole[] = [
            'customer',
            'project_manager',
            'architect',
            'owner',
            'superintendent',
          ];
          const parties = await getPrimaryPartiesForEngagements(
            [projectData.id],
            partyRoles
          );
          for (const p of parties) {
            if (p.role === 'customer')
              projectData.customer_name =
                p.party_name ?? projectData.customer_name;
            if (p.role === 'project_manager')
              projectData.manager = p.party_name ?? projectData.manager;
            if (p.role === 'architect')
              projectData.architect = p.party_name ?? projectData.architect;
            if (p.role === 'owner')
              projectData.company_owner =
                p.party_name ?? projectData.company_owner;
            if (p.role === 'superintendent')
              projectData.superintendent =
                p.party_name ?? projectData.superintendent;
          }

          const userRoles: UserRole[] = [
            'project_lead',
            'foreman',
            'sales_lead',
          ];
          const userRoleAssignments = await getPrimaryUserRolesForEngagements(
            [projectData.id],
            userRoles
          );
          for (const ur of userRoleAssignments) {
            if (ur.role === 'project_lead')
              projectData.project_lead =
                ur.user_name ?? projectData.project_lead;
            if (ur.role === 'foreman')
              projectData.foreman = ur.user_name ?? projectData.foreman;
            if (ur.role === 'sales_lead')
              projectData.sales_lead = ur.user_name ?? projectData.sales_lead;
          }
          setPartiesLoaded(true);
        } catch {}
      }

      const { data: commentsData } = await supabase
        .from('engagement_comments')
        .select(
          'id, engagement_id, user_id, comment_text, created_at, users (name, user_type)'
        )
        .eq('engagement_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      const mapped: ProjectComment[] = (commentsData ?? []).map((c: any) => ({
        id: c.id,
        engagement_id: c.engagement_id,
        user_id: c.user_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        user_name: c.users?.name || 'Unknown',
        user_type: c.users?.user_type || 'Unknown',
      }));

      if (!cancelled) {
        setProject(projectData);
        setComments(mapped);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const nextStage = useMemo(() => {
    if (!project?.stage_order || !stages.length) return null;
    return (
      stages.find((s) => s.order === (project.stage_order as number) + 1) ||
      null
    );
  }, [project?.stage_order, stages]);

  const prevStage = useMemo(() => {
    if (!project?.stage_order || !stages.length) return null;
    return (
      stages.find((s) => s.order === (project.stage_order as number) - 1) ||
      null
    );
  }, [project?.stage_order, stages]);

  return {
    sessionEmail,
    project,
    setProject,
    stages,
    loading,
    partiesLoaded,
    comments,
    setComments,
    currentUser,
    nextStage,
    prevStage,
    // Expose setters for future controls
    setPrimaryParty,
    setPrimaryUserRole,
  };
}
