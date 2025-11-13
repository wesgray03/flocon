// pages/projects/[id].tsx
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SharedMenu } from '@/components/layout/SharedMenu';
import { CompaniesModal } from '@/components/modals/CompaniesModal';
import { ContactsModal } from '@/components/modals/ContactsModal';
import { CommentsSection } from '@/components/project/CommentsSection';
import ProjectStatusBlock from '@/components/project/ProjectStatusBlock';
import type { Project } from '@/domain/projects/types';
import { useProjectCore } from '@/domain/projects/useProjectCore';
import { useMenuModals } from '@/hooks/useMenuModals';
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
import * as styles from '@/styles/projectDetailStyles';
import { colors } from '@/styles/theme';
// Icon imports moved into ProjectInfoCard; FinancialOverview centralizes financial tables
import BillingModule from '@/components/billing/BillingModule';
import { FinancialOverview } from '@/components/project/FinancialOverview';
import {
  ProjectInfoCard,
  type EditForm,
} from '@/components/project/ProjectInfoCard';
import { Folder } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const ChangeOrdersSection = dynamic(
  () => import('@/components/project/ChangeOrdersSection'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          background: '#faf8f5',
          border: '1px solid #e5dfd5',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <p style={{ margin: 0, color: colors.textSecondary }}>
          Loading Change Orders…
        </p>
      </div>
    ),
  }
);

// Types centralized in '@/domain/projects/types'

export default function ProjectDetail() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const {
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
  } = useProjectCore(id);

  const [menuOpen, setMenuOpen] = useState(false);
  const { menuCallbacks, renderModals } = useMenuModals(() => {
    loadDropdownOptions();
  });
  const [activeTab, setActiveTab] = useState<
    'overview' | 'billing' | 'changeorders'
  >('overview');
  const [showModuleMenu, setShowModuleMenu] = useState(false);
  // SOV data is now loaded lazily by SOVSection component

  // Add editing state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    project_number: '',
    customer_name: '',
    manager: '',
    architect: '',
    owner_company: '',
    superintendent: '',
    foreman: '',
    sales_lead: '',
    project_lead: '',
    start_date: '',
    end_date: '',
    stage_id: '',
    contract_amount: '',
  });
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [managerOptions, setManagerOptions] = useState<string[]>([]);
  const [architectOptions, setArchitectOptions] = useState<string[]>([]);
  const [ownerCompanyOptions, setOwnerCompanyOptions] = useState<string[]>([]);
  const [superintendentOptions, setSuperintendentOptions] = useState<string[]>(
    []
  );
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [stageOptions, setStageOptions] = useState<
    { id: string; name: string; order: number }[]
  >([]);

  // Toast notifications state (lightweight, auto-dismiss)
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Modal states
  const [companiesModal, setCompaniesModal] = useState<{
    open: boolean;
    companyType: 'Contractor' | 'Architect' | 'Owner' | 'Subcontractor' | null;
    label: string;
  }>({ open: false, companyType: null, label: '' });
  const [showContactsModal, setShowContactsModal] = useState(false);

  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    timeoutMs = 2500
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), timeoutMs);
  };

  // SOV add-line form state managed in SOVSection

  // Load dropdown options (customers/managers/architects/superintendents/owners)
  const loadDropdownOptions = async () => {
    const [
      { data: customers },
      { data: managers },
      { data: architects },
      { data: ownerCompanies },
      { data: superintendents },
      { data: owners },
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('name')
        .eq('is_customer', true)
        .order('name'),
      supabase
        .from('contacts')
        .select('name')
        .eq('contact_type', 'Project Manager')
        .order('name'),
      supabase
        .from('companies')
        .select('name')
        .eq('company_type', 'Architect')
        .order('name'),
      supabase
        .from('companies')
        .select('name')
        .eq('company_type', 'Owner')
        .order('name'),
      supabase
        .from('contacts')
        .select('name')
        .eq('contact_type', 'Superintendent')
        .order('name'),
      supabase.from('users').select('name').order('name'),
    ]);
    setCustomerOptions((customers?.map((c) => c.name) ?? []).filter(Boolean));
    setManagerOptions((managers?.map((m) => m.name) ?? []).filter(Boolean));
    setArchitectOptions((architects?.map((a) => a.name) ?? []).filter(Boolean));
    setOwnerCompanyOptions(
      (ownerCompanies?.map((o) => o.name) ?? []).filter(Boolean)
    );
    setSuperintendentOptions(
      (superintendents?.map((s) => s.name) ?? []).filter(Boolean)
    );
    setUserOptions((owners?.map((o) => o.name) ?? []).filter(Boolean));
  };

  useEffect(() => {
    if (!id) return;
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Redirect to login if no session (preserve original behavior)
  useEffect(() => {
    if (!id) return;
    if (!loading && !sessionEmail) {
      router.push(`/login?redirect=/projects/${id}`);
    }
  }, [loading, sessionEmail, id, router]);

  // Removed task reload effect (handled in hook within StageProgressSection)

  // SOV loading moved into SOVSection

  // money/dateStr now provided by shared formatter in '@/lib/format'

  // Totals computed inside SOVSection

  // nextStage and prevStage provided by useProjectCore

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = () => {
    if (project) {
      setEditForm({
        name: project.name || '',
        project_number: project.project_number || '',
        customer_name: project.customer_name || '',
        manager: project.manager || '',
        architect: project.architect || '',
        owner_company: project.company_owner || '',
        project_lead: project.project_lead || '',
        superintendent: project.superintendent || '',
        foreman: project.foreman || '',
        sales_lead: project.sales_lead || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        stage_id: project.stage_id || '',
        contract_amount: project.contract_amount?.toString() || '',
      });
    }
    setEditMode(true);
    notify('Editing enabled', 'info', 1800);
  };

  const cancelEdit = () => {
    setEditMode(false);
    notify('Changes discarded', 'info');
  };

  const saveEdit = async () => {
    if (!project?.id) return;

    setSaving(true);
    try {
      // Update project basic fields
      // Customer/manager/superintendent are handled via engagement_parties
      // Owner/foreman are handled via engagement_user_roles
      // Only update columns that exist in engagements table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        name: editForm.name.trim(),
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        contract_amount: editForm.contract_amount.trim()
          ? parseFloat(editForm.contract_amount)
          : null,
      };

      // Only set project_number if it's a project (not a prospect)
      if (project.type === 'project' && editForm.project_number.trim()) {
        updatePayload.project_number = editForm.project_number.trim();
      }

      if (editForm.stage_id) updatePayload.stage_id = editForm.stage_id;

      const { error } = await supabase
        .from('engagements')
        .update(updatePayload)
        .eq('id', project.id);

      if (error) {
        console.error('Error updating project:', error);
        notify('Error updating project: ' + error.message, 'error');
        return;
      }

      // After updating basic fields, sync junction-table primaries for roles that were edited.
      try {
        // If customer_name was provided/changed, resolve and set customer primary party
        if (editForm.customer_name.trim()) {
          try {
            const { data: customerCompany } = await supabase
              .from('companies')
              .select('id')
              .ilike('name', editForm.customer_name.trim())
              .eq('is_customer', true)
              .limit(1)
              .single();
            const customerId = customerCompany?.id || null;
            if (customerId) {
              await setPrimaryParty({
                engagementId: project.id,
                role: 'customer',
                partyType: 'company',
                partyId: customerId,
              });
            }
          } catch (e: unknown) {
            console.warn('Failed to set customer primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set customer: ${message}`, 'error');
          }
        }
        // If manager was provided, resolve contact and set as project_manager primary
        if (editForm.manager.trim()) {
          try {
            const { data: pmContact } = await supabase
              .from('contacts')
              .select('id')
              .ilike('name', editForm.manager.trim())
              .eq('contact_type', 'Project Manager')
              .limit(1)
              .single();
            const pmId = pmContact?.id || null;
            if (pmId) {
              await setPrimaryParty({
                engagementId: project.id,
                role: 'project_manager',
                partyType: 'contact',
                partyId: pmId,
              });
            }
          } catch (e: unknown) {
            console.warn('Failed to set project manager primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set project manager: ${message}`, 'error');
          }
        }
        // If architect was provided, resolve company and set as architect primary
        if (editForm.architect.trim()) {
          try {
            const { data: architectCompany } = await supabase
              .from('companies')
              .select('id')
              .ilike('name', editForm.architect.trim())
              .eq('company_type', 'Architect')
              .limit(1)
              .single();
            const architectId = architectCompany?.id || null;
            if (architectId) {
              await setPrimaryParty({
                engagementId: project.id,
                role: 'architect',
                partyType: 'company',
                partyId: architectId,
              });
            }
          } catch (e: unknown) {
            console.warn('Failed to set architect primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set architect: ${message}`, 'error');
          }
        }
        // If owner_company was provided, resolve company and set as owner primary
        if (editForm.owner_company.trim()) {
          try {
            const { data: ownerCompany } = await supabase
              .from('companies')
              .select('id')
              .ilike('name', editForm.owner_company.trim())
              .eq('company_type', 'Owner')
              .limit(1)
              .single();
            const ownerId = ownerCompany?.id || null;
            if (ownerId) {
              await setPrimaryParty({
                engagementId: project.id,
                role: 'owner',
                partyType: 'company',
                partyId: ownerId,
              });
            }
          } catch (e: unknown) {
            console.warn('Failed to set owner company primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set owner company: ${message}`, 'error');
          }
        }
        // Superintendent via contacts -> engagement_parties
        if (editForm.superintendent.trim()) {
          try {
            const { data: superContact } = await supabase
              .from('contacts')
              .select('id')
              .ilike('name', editForm.superintendent.trim())
              .eq('contact_type', 'Superintendent')
              .limit(1)
              .single();
            const superId = superContact?.id || null;
            if (superId) {
              await setPrimaryParty({
                engagementId: project.id,
                role: 'superintendent',
                partyType: 'contact',
                partyId: superId,
              });
            } else {
              notify(
                'Superintendent contact not found. No change made.',
                'info'
              );
            }
          } catch (e: unknown) {
            console.warn('Failed to set superintendent primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(
              `Failed to set superintendent: ${message}. If this mentions a CHECK constraint on role, run the migration to allow role 'superintendent'.`,
              'error'
            );
          }
        } else {
          // Clearing field removes primary superintendent contact
          try {
            await setPrimaryParty({
              engagementId: project.id,
              role: 'superintendent',
              partyType: 'contact',
              partyId: null,
            });
          } catch (e: unknown) {
            console.warn('Failed to clear superintendent primary party:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to clear superintendent: ${message}`, 'error');
          }
        }

        // Project Lead via users -> engagement_user_roles (stored as 'project_lead' role)
        if (editForm.project_lead.trim()) {
          try {
            const { data: ownerUser } = await supabase
              .from('users')
              .select('id')
              .ilike('name', editForm.project_lead.trim())
              .limit(1)
              .single();
            const ownerId = ownerUser?.id || null;
            if (ownerId) {
              await setPrimaryUserRole({
                engagementId: project.id,
                role: 'project_lead',
                userId: ownerId,
              });
            } else {
              notify(
                'Project Lead not found in users. No change made.',
                'info'
              );
            }
          } catch (e: unknown) {
            console.warn('Failed to set project lead user role:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set project lead: ${message}`, 'error');
          }
        }

        // Foreman via users -> engagement_user_roles
        if (editForm.foreman.trim()) {
          try {
            const { data: foremanUser } = await supabase
              .from('users')
              .select('id')
              .ilike('name', editForm.foreman.trim())
              .limit(1)
              .single();
            const foremanId = foremanUser?.id || null;
            if (foremanId) {
              await setPrimaryUserRole({
                engagementId: project.id,
                role: 'foreman',
                userId: foremanId,
              });
            } else {
              notify('Foreman not found in users. No change made.', 'info');
            }
          } catch (e: unknown) {
            console.warn('Failed to set foreman user role:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set foreman: ${message}`, 'error');
          }
        }

        // Sales Lead via users -> engagement_user_roles (stored as 'sales_lead' role)
        if (editForm.sales_lead.trim()) {
          try {
            const { data: salesLeadUser } = await supabase
              .from('users')
              .select('id')
              .ilike('name', editForm.sales_lead.trim())
              .limit(1)
              .single();
            const salesLeadId = salesLeadUser?.id || null;
            if (salesLeadId) {
              await setPrimaryUserRole({
                engagementId: project.id,
                role: 'sales_lead',
                userId: salesLeadId,
              });
            } else {
              notify('Sales Lead not found in users. No change made.', 'info');
            }
          } catch (e: unknown) {
            console.warn('Failed to set sales lead user role:', e);
            const message = e instanceof Error ? e.message : String(e);
            notify(`Failed to set sales lead: ${message}`, 'error');
          }
        }
      } catch (partySyncErr) {
        console.warn(
          'Non-blocking: failed to sync primary parties/user roles',
          partySyncErr
        );
      }

      // Reload project data (projects_v fields loaded from engagements table)
      const { data: updatedProj } = await supabase
        .from('projects_v')
        .select('*')
        .eq('id', project.id)
        .single();

      if (updatedProj) {
        const updatedProjectData = {
          id: updatedProj.id,
          name: updatedProj.name,
          project_number: updatedProj.project_number,
          customer_name: null,
          manager: null,
          architect: null,
          project_lead: null,
          superintendent: null,
          foreman: null,
          sales_lead: null,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          contract_amount: updatedProj.contract_amount,
          stage: null,
          stage_id: updatedProj.stage_id,
          stage_order: null,
        } as Project;

        // Load stage name/order from stages table
        if (updatedProj.stage_id) {
          const { data: stageData } = await supabase
            .from('stages')
            .select('name, order')
            .eq('id', updatedProj.stage_id)
            .single();
          if (stageData) {
            updatedProjectData.stage = stageData.order
              ? `${stageData.order}. ${stageData.name}`
              : stageData.name;
            updatedProjectData.stage_order = stageData.order ?? null;
          }
        }

        // Overlay current primary parties post-save for consistency
        try {
          const roles: PartyRole[] = [
            'customer',
            'project_manager',
            'architect',
            'owner',
            'superintendent',
          ];
          const parties = await getPrimaryPartiesForEngagements(
            [project.id],
            roles
          );
          for (const p of parties) {
            if (p.role === 'customer')
              updatedProjectData.customer_name =
                p.party_name ?? updatedProjectData.customer_name;
            if (p.role === 'project_manager')
              updatedProjectData.manager =
                p.party_name ?? updatedProjectData.manager;
            if (p.role === 'architect') {
              const projectWithArchitect = updatedProjectData as Project & {
                architect?: string | null;
              };
              projectWithArchitect.architect =
                p.party_name ?? projectWithArchitect.architect;
            }
            if (p.role === 'owner')
              updatedProjectData.company_owner =
                p.party_name ?? updatedProjectData.company_owner;
            if (p.role === 'superintendent')
              updatedProjectData.superintendent =
                p.party_name ?? updatedProjectData.superintendent;
          }

          // Also reload user roles for sales_lead, project_lead, foreman
          const userRoles: UserRole[] = [
            'project_lead',
            'foreman',
            'sales_lead',
          ];
          const userRoleAssignments = await getPrimaryUserRolesForEngagements(
            [project.id],
            userRoles
          );
          for (const ur of userRoleAssignments) {
            if (ur.role === 'project_lead')
              updatedProjectData.project_lead =
                ur.user_name ?? updatedProjectData.project_lead;
            if (ur.role === 'foreman')
              updatedProjectData.foreman =
                ur.user_name ?? updatedProjectData.foreman;
            if (ur.role === 'sales_lead')
              updatedProjectData.sales_lead =
                ur.user_name ?? updatedProjectData.sales_lead;
          }

          // Fallback post-save as well
          if (
            (!updatedProjectData.superintendent ||
              updatedProjectData.superintendent.trim() === '') &&
            project.id
          ) {
            try {
              // Query party then resolve name
              const { data: partyData } = await supabase
                .from('engagement_parties')
                .select('party_type, party_id')
                .eq('engagement_id', project.id)
                .eq('role', 'superintendent')
                .eq('is_primary', true)
                .maybeSingle();

              if (partyData) {
                if (partyData.party_type === 'contact') {
                  const { data: contact } = await supabase
                    .from('contacts')
                    .select('name')
                    .eq('id', partyData.party_id)
                    .maybeSingle();
                  if (contact?.name)
                    updatedProjectData.superintendent = contact.name;
                } else if (partyData.party_type === 'company') {
                  const { data: company } = await supabase
                    .from('companies')
                    .select('name')
                    .eq('id', partyData.party_id)
                    .maybeSingle();
                  if (company?.name)
                    updatedProjectData.superintendent = company.name;
                }
              }
            } catch {}
          }
        } catch (err) {
          console.debug('Post-save party overlay skipped:', err);
        }

        setProject(updatedProjectData);
      }

      setEditMode(false);
      notify('Project updated successfully', 'success');
    } catch (err) {
      console.error('Unexpected error:', err);
      notify('Unexpected error updating project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const advanceToNextStage = async (
    incompleteTasks?: { id: string; name: string }[]
  ) => {
    if (!project?.id || !nextStage?.id) return;

    // Show warning if there are incomplete tasks
    if (incompleteTasks && incompleteTasks.length > 0) {
      const taskList = incompleteTasks.map((t) => `• ${t.name}`).join('\n');
      const confirmed = window.confirm(
        `⚠️ Warning: You have ${incompleteTasks.length} incomplete task(s):\n\n${taskList}\n\nAre you sure you want to advance to the next stage?`
      );
      if (!confirmed) return;
    }

    setAdvancing(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ stage_id: nextStage.id })
        .eq('id', project.id);

      if (error) {
        console.error('Error advancing stage:', error);
        notify('Error advancing stage: ' + error.message, 'error');
        return;
      }

      const { data: updatedProj } = await supabase
        .from('projects_v')
        .select('*')
        .eq('id', project.id)
        .single();

      if (updatedProj) {
        // Load stage name/order from stages table
        let stageName: string | null = null;
        let stageOrder: number | null = null;
        if (updatedProj.stage_id) {
          const { data: stageData } = await supabase
            .from('stages')
            .select('name, order')
            .eq('id', updatedProj.stage_id)
            .single();
          if (stageData) {
            stageName = stageData.order
              ? `${stageData.order}. ${stageData.name}`
              : stageData.name;
            stageOrder = stageData.order ?? null;
          }
        }

        // Keep existing customer_name and manager from current project state
        setProject((prev) => ({
          ...prev!,
          id: updatedProj.id,
          name: updatedProj.name,
          project_number: updatedProj.project_number,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          stage: stageName,
          stage_id: updatedProj.stage_id,
          stage_order: stageOrder,
        }));
        notify(`Advanced to ${stageName}`, 'success');
      }
    } catch (err) {
      console.error('Unexpected error advancing stage:', err);
      notify('Unexpected error advancing stage', 'error');
    } finally {
      setAdvancing(false);
    }
  };

  const goToPreviousStage = async () => {
    if (!project?.id || !prevStage?.id) return;

    setAdvancing(true);
    try {
      const { error } = await supabase
        .from('engagements')
        .update({ stage_id: prevStage.id })
        .eq('id', project.id);

      if (error) {
        console.error('Error going to previous stage:', error);
        notify('Error going to previous stage: ' + error.message, 'error');
        return;
      }

      const { data: updatedProj } = await supabase
        .from('projects_v')
        .select('*')
        .eq('id', project.id)
        .single();

      if (updatedProj) {
        // Load stage name/order from stages table
        let stageName: string | null = null;
        let stageOrder: number | null = null;
        if (updatedProj.stage_id) {
          const { data: stageData } = await supabase
            .from('stages')
            .select('name, order')
            .eq('id', updatedProj.stage_id)
            .single();
          if (stageData) {
            stageName = stageData.order
              ? `${stageData.order}. ${stageData.name}`
              : stageData.name;
            stageOrder = stageData.order ?? null;
          }
        }

        // Keep existing customer_name and manager from current project state
        setProject((prev) => ({
          ...prev!,
          id: updatedProj.id,
          name: updatedProj.name,
          project_number: updatedProj.project_number,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          stage: stageName,
          stage_id: updatedProj.stage_id,
          stage_order: stageOrder,
        }));
        notify(`Moved back to ${stageName}`, 'success');
      }
    } catch (err) {
      console.error('Unexpected error going to previous stage:', err);
      notify('Unexpected error going to previous stage', 'error');
    } finally {
      setAdvancing(false);
    }
  };

  // Subcontractor add/remove now handled within SubcontractorsSection component

  // Comment add/delete handled inside CommentsSection

  // SOV add-line now handled in SOVSection

  return (
    <div style={styles.pageContainerStyle}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Dashboard Header with Menu */}
      <DashboardHeader
        sessionEmail={sessionEmail}
        activeTab="projects"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuItems={
          <SharedMenu onClose={() => setMenuOpen(false)} {...menuCallbacks} />
        }
        actionButton={
          <div style={{ width: 145, minWidth: 145, visibility: 'hidden' }} />
        }
        exportButton={
          <button
            disabled
            style={{
              background: '#f5f5f5',
              color: '#999',
              border: '1px solid #e5dfd5',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            Export CSV
          </button>
        }
      />

      {/* Header */}
      <div style={styles.headerStyle}>
        <Link
          href="/projects"
          style={{
            color: colors.navy,
            textDecoration: 'none',
            fontSize: 14,
            marginBottom: 8,
            display: 'inline-block',
          }}
        >
          ← Back to Projects
        </Link>

        {loading ? (
          <p style={{ color: colors.textSecondary }}>Loading…</p>
        ) : !project ? (
          <p style={{ color: colors.textSecondary }}>Project not found.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={styles.titleStyle}>{project.name}</h1>
              {project.sharepoint_folder && (
                <a
                  href={project.sharepoint_folder}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open SharePoint Folder"
                  style={{
                    color: colors.navy,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Folder size={18} />
                </a>
              )}
            </div>
            <p style={styles.subtitleStyle}>
              {project.project_number
                ? `Project #: ${project.project_number}`
                : 'No project number assigned'}
            </p>
          </div>
        )}
      </div>

      {loading || !project ? null : (
        <div style={styles.contentWrapperStyle} className="content-wrapper">
          {/* 3-Column Layout: Project Info + Main Content + Comments */}
          <div
            style={styles.threeColumnLayoutStyle}
            className="three-column-layout"
          >
            {/* Left Sidebar - Project Information (20%) */}
            <div style={styles.leftSidebarStyle} className="left-sidebar">
              <div
                style={styles.stickyContainerStyle}
                className="sticky-container"
              >
                {/* Project Information Card */}
                <ProjectInfoCard
                  project={project}
                  projectId={id || ''}
                  editMode={editMode}
                  editForm={editForm}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onChange={(field, value) => handleEditChange(field, value)}
                  saving={saving}
                  partiesLoaded={partiesLoaded}
                  stageOptions={stageOptions}
                  customerOptions={customerOptions}
                  managerOptions={managerOptions}
                  architectOptions={architectOptions}
                  ownerCompanyOptions={ownerCompanyOptions}
                  superintendentOptions={superintendentOptions}
                  userOptions={userOptions}
                />{' '}
                {/* End Project Information Card */}
                {/* Separate Project Status Card moved to right sidebar above comments */}
              </div>
            </div>

            {/* Main Content - 55% */}
            <div style={styles.mainContentStyle} className="main-content">
              {/* Desktop Tabs for Main Content */}
              <div style={styles.tabContainerStyle} className="desktop-tabs">
                {(
                  [
                    { key: 'overview', label: 'Overview' },
                    { key: 'billing', label: 'Billing' },
                    { key: 'changeorders', label: 'Change Orders' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={styles.getTabStyle(activeTab === tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && project && (
                <FinancialOverview project={project} variant="desktop" />
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && id && (
                <BillingModule projectId={id} />
              )}

              {/* Change Orders Tab */}
              {activeTab === 'changeorders' && id && (
                <ChangeOrdersSection projectId={id} />
              )}
            </div>

            {/* Mobile Floating Module Button */}
            <div className="mobile-module-selector">
              <button
                onClick={() => setShowModuleMenu(!showModuleMenu)}
                style={{
                  position: 'fixed',
                  bottom: 20,
                  right: 20,
                  zIndex: 1000,
                  background: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 56,
                  height: 56,
                  fontSize: 24,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ☰
              </button>

              {showModuleMenu && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1001,
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header with horizontal tabs and close button */}
                  <div
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1002,
                      background: '#fff',
                      borderBottom: '2px solid #e5dfd5',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Horizontal tabs with icons only */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => setActiveTab('overview')}
                        style={{
                          padding: '12px 20px',
                          background:
                            activeTab === 'overview' ? '#1e3a5f' : '#f0ebe3',
                          color: activeTab === 'overview' ? '#fff' : '#64748b',
                          border: '1px solid #e5dfd5',
                          borderRadius: 8,
                          fontSize: 24,
                          cursor: 'pointer',
                          minWidth: 44,
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        📊
                      </button>
                      <button
                        onClick={() => setActiveTab('billing')}
                        style={{
                          padding: '12px 20px',
                          background:
                            activeTab === 'billing' ? '#1e3a5f' : '#f0ebe3',
                          color: activeTab === 'billing' ? '#fff' : '#64748b',
                          border: '1px solid #e5dfd5',
                          borderRadius: 8,
                          fontSize: 24,
                          cursor: 'pointer',
                          minWidth: 44,
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        💰
                      </button>
                      <button
                        onClick={() => setActiveTab('changeorders')}
                        style={{
                          padding: '12px 20px',
                          background:
                            activeTab === 'changeorders'
                              ? '#1e3a5f'
                              : '#f0ebe3',
                          color:
                            activeTab === 'changeorders' ? '#fff' : '#64748b',
                          border: '1px solid #e5dfd5',
                          borderRadius: 8,
                          fontSize: 24,
                          cursor: 'pointer',
                          minWidth: 44,
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        📝
                      </button>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => setShowModuleMenu(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 24,
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        padding: 8,
                        minWidth: 44,
                        minHeight: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content - scrollable */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: 20,
                    }}
                  >
                    {activeTab === 'overview' && project && (
                      <FinancialOverview project={project} variant="mobile" />
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && id && (
                      <BillingModule projectId={id} />
                    )}

                    {/* Change Orders Tab */}
                    {activeTab === 'changeorders' && id && (
                      <ChangeOrdersSection projectId={id} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Project Status above Comments */}
            <div style={styles.rightSidebarStyle} className="right-sidebar">
              <div style={styles.statusCardStyle} className="status-card">
                <ProjectStatusBlock
                  project={project}
                  stages={stages}
                  advancing={advancing}
                  onAdvanceToNextStage={advanceToNextStage}
                  onGoToPreviousStage={goToPreviousStage}
                  onProjectStageChange={(newStageId) => {
                    const s = stages.find((st) => st.id === newStageId);
                    setProject((prev) =>
                      prev
                        ? {
                            ...prev,
                            stage_id: newStageId,
                            stage: s?.name ?? prev.stage,
                            stage_order: s?.order ?? prev.stage_order,
                          }
                        : prev
                    );
                  }}
                />
              </div>
              {id && (
                <div className="comments-section">
                  <CommentsSection
                    comments={comments}
                    setComments={setComments}
                    currentUser={currentUser}
                    projectId={id}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {companiesModal.open && companiesModal.companyType && (
        <CompaniesModal
          open={companiesModal.open}
          onClose={() => {
            setCompaniesModal({ open: false, companyType: null, label: '' });
            loadDropdownOptions();
          }}
          companyType={companiesModal.companyType}
          label={companiesModal.label}
        />
      )}

      {showContactsModal && (
        <ContactsModal
          open={showContactsModal}
          onClose={() => {
            setShowContactsModal(false);
            loadDropdownOptions();
          }}
        />
      )}

      {renderModals()}
    </div>
  );
}

// Toast UI
const Toast = ({
  message,
  type,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
}) => <div style={styles.getToastStyle(type)}>{message}</div>;

// Helper Components
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div>
    <p style={styles.detailLabelStyle}>{label}</p>
    <p style={styles.detailValueStyle}>{value || '—'}</p>
  </div>
);
