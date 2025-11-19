// pages/projects/index.tsx — Projects Dashboard
// --------------------------------------------------------------
// STRUCTURE:
// - Extracted Components: src/components/modals/UsersModal.tsx, ContactsModal.tsx
// - Shared Styles: src/styles/projectStyles.ts
// - This file contains: Main ProjectsPage component, MasterDataModal
// --------------------------------------------------------------

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SharedMenu } from '@/components/layout/SharedMenu';
import { CompaniesModal } from '@/components/modals/CompaniesModal';
import { ContactsModal } from '@/components/modals/ContactsModal';
import { LostReasonsModal } from '@/components/modals/LostReasonsModal';
import { UsersModal } from '@/components/modals/UsersModal';
import { StageBadge } from '@/components/project/StageBadge';
import { ProjectsTable } from '@/components/projects/ProjectsTable';
import { MultiFilterInput } from '@/components/ui/multi-filter-input';
import { useProjectsListCore } from '@/domain/projects/useProjectsListCore';
import {
  getPrimaryPartiesForEngagements,
  syncCorePrimaryParties,
  type PartyRole,
} from '@/lib/engagementParties';
import { setPrimaryUserRole } from '@/lib/engagementUserRoles';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectStyles';
import { colors } from '@/styles/theme';
import { Folder, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

/* StageBadge is now a shared component at src/components/project/StageBadge */

/* ========================= TYPE DEFINITIONS ========================= */

interface TaskData {
  id: string;
  name: string;
  stages?: { name?: string }[] | { name?: string };
}

interface ProjectPayload {
  name: string;
  project_number: string | null;
  sharepoint_folder: string | null;
  contract_amount: number | null;
  contract_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  stage_id?: string | null;
}

/* ========================= MASTER DATA MODAL ========================= */

/* Note: UsersModal and ContactsModal have been extracted to separate files:
 * - src/components/modals/UsersModal.tsx
 * - src/components/modals/ContactsModal.tsx
 */

/* ------------------------- */
function MasterDataModal({
  open,
  onClose,
  table,
  label,
}: {
  open: boolean;
  onClose: () => void;
  table:
    | 'companies'
    | 'managers'
    | 'owners'
    | 'users'
    | 'stages'
    | 'engagement_tasks'
    | 'subcontractors';
  label: string;
}) {
  const [items, setItems] = useState<
    { id: string; name: string; stage_name?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let data, error;
      if (table === 'engagement_tasks') {
        // Load engagement_tasks with stage information
        const [tasksResult, stagesResult] = await Promise.all([
          supabase
            .from('engagement_tasks')
            .select('id, name, stage_id')
            .order('order_num', { ascending: true }),
          supabase.from('stages').select('id, name'),
        ]);

        if (tasksResult.error) {
          error = tasksResult.error;
          data = null;
        } else if (stagesResult.error) {
          error = stagesResult.error;
          data = null;
        } else {
          // Build stage lookup
          const stagesMap = new Map(
            (stagesResult.data || []).map((s) => [s.id, s.name])
          );
          // Join manually
          data = (tasksResult.data || []).map((task) => ({
            id: task.id,
            name: task.name,
            stage_name: stagesMap.get(task.stage_id) || 'Unknown Stage',
          }));
        }
      } else {
        const result = await supabase
          .from(table)
          .select('id,name')
          .order('name', { ascending: true });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error(`${label} load error:`, error.message ?? error);
        setLoadError(error.message ?? String(error));
        setItems([]);
      } else {
        setItems(data ?? []);
      }
    } catch (err) {
      console.error(`${label} load unexpected error:`, err);
      setLoadError(String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from(table).insert([{ name }]);
    if (error) return alert(`Add ${label} error: ${error.message}`);
    setNewName('');
    await load();
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return alert('Name cannot be empty');
    const { error } = await supabase
      .from(table)
      .update({ name })
      .eq('id', editingId);
    if (error) return alert(`Update ${label} error: ${error.message}`);
    cancelEdit();
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete this ${label.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return alert(`Delete ${label} error: ${error.message}`);
    await load();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="masterdata-title"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h3
            id="masterdata-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 600 }}
          >
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.btnCancel}
            aria-label={`Close ${label}`}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder={`New ${label.slice(0, -1)} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ ...styles.input, flex: 1 }}
          />
          <button
            type="button"
            onClick={add}
            style={styles.btnSave}
            aria-label={`Add ${label}`}
          >
            Add
          </button>
        </div>

        <div
          style={{
            border: '1px solid #e5dfd5',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#f0ebe3',
              padding: 8,
              fontSize: 12,
              color: colors.textPrimary,
            }}
          >
            {loading ? 'Loading…' : `${items.length} item(s)`}
            {loadError ? (
              <div
                style={{ color: colors.errorText, marginTop: 8, fontSize: 12 }}
              >
                Error: {loadError}
              </div>
            ) : null}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 720 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: 8,
                  borderTop: '1px solid #e5dfd5',
                }}
              >
                {editingId === it.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    style={styles.input}
                  />
                ) : (
                  <div>
                    {it.name}
                    {it.stage_name && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: '0.875rem',
                          color: colors.gray,
                        }}
                      >
                        ({it.stage_name})
                      </span>
                    )}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  {editingId === it.id ? (
                    <>
                      <button
                        type="button"
                        onClick={saveEdit}
                        style={styles.btnSave}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={styles.btnCancel}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(it.id, it.name)}
                        style={styles.btnSmall}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        style={{ ...styles.btnSmall, background: '#fee2e2' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Types ----------------------------- */
// Types now sourced from domain hook (useProjectsListCore)
import type { ProjectListRow as Row } from '@/domain/projects/useProjectsListCore';

/* --------------------------- Page Component --------------------------- */
export default function ProjectsPage() {
  // Authentication state
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setSessionEmail(data.user?.email ?? null);
      } finally {
        setAuthChecked(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSessionEmail(sess?.user?.email ?? null);
    });
    return () => {
      sub.subscription?.unsubscribe();
    };
  }, []);
  const router = useRouter();
  // Domain list core
  const {
    rows,
    loading,
    filters,
    setFilters,
    uniqueValues,
    filteredAndSortedRows,
    sortKey,
    sortOrder,
    handleSort,
    sortIndicator,
    refresh,
  } = useProjectsListCore();
  const [showModal, setShowModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Row | null>(null);

  const [showMaster, setShowMaster] = useState<null | {
    table:
      | 'companies'
      | 'managers'
      | 'owners'
      | 'stages'
      | 'engagement_tasks'
      | 'subcontractors';
    label: string;
  }>(null);
  const openMaster = (
    table:
      | 'companies'
      | 'managers'
      | 'owners'
      | 'stages'
      | 'engagement_tasks'
      | 'subcontractors',
    label: string
  ) => {
    setShowMaster({ table, label });
  };
  const closeMaster = () => setShowMaster(null);

  const [showUsersModal, setShowUsersModal] = useState(false);
  const closeUsers = () => setShowUsersModal(false);

  // Modal states
  const [companiesModal, setCompaniesModal] = useState<{
    open: boolean;
    companyType:
      | 'Contractor'
      | 'Architect'
      | 'Owner'
      | 'Subcontractor'
      | 'Vendor'
      | null;
    label: string;
  }>({ open: false, companyType: null, label: '' });

  const [showContactsModal, setShowContactsModal] = useState(false);
  const closeContacts = () => setShowContactsModal(false);

  const [showLostReasonsModal, setShowLostReasonsModal] = useState(false);
  const closeLostReasons = () => setShowLostReasonsModal(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [managerOptions, setManagerOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [architectOptions, setArchitectOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [ownerOptions, setOwnerOptions] = useState<
    { id: string; name: string }[]
  >([]);
  // Stage selection is handled on the details page; no stage options in this modal.

  const [form, setForm] = useState({
    name: '',
    project_number: '',
    customer_id: '',
    manager_id: '',
    owner: '',
    architect_id: '',
    sharepoint_folder: '',
    contract_amount: '',
    contract_budget: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: custs } = await supabase
          .from('companies')
          .select('id, name')
          .eq('is_customer', true)
          .order('name', { ascending: true });
        setCustomerOptions(
          (custs ?? []).map((c) => ({ id: c.id, name: c.name }))
        );

        // Load project managers from contacts table
        const { data: mgrs } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('contact_type', 'Project Manager')
          .order('name', { ascending: true });
        setManagerOptions(
          (mgrs ?? []).map((m) => ({ id: m.id, name: m.name }))
        );

        // Load owners from users table
        const { data: owns } = await supabase
          .from('users')
          .select('id, name')
          .order('name', { ascending: true });
        setOwnerOptions((owns ?? []).map((o) => ({ id: o.id, name: o.name })));

        // Load architects from companies table
        const { data: archs } = await supabase
          .from('companies')
          .select('id, name')
          .eq('company_type', 'Architect')
          .order('name', { ascending: true });
        setArchitectOptions(
          (archs ?? []).map((a) => ({ id: a.id, name: a.name }))
        );

        // (Stage list intentionally not loaded in modal.)
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Close modal on Escape for accessibility
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = () => {
    setEditingProject(null);
    setForm({
      name: '',
      project_number: '',
      customer_id: '',
      manager_id: '',
      owner: '',
      architect_id: '',
      sharepoint_folder: '',
      contract_amount: '',
      contract_budget: '',
      start_date: '',
      end_date: '',
    });
    setShowModal(true);
  };

  const openForEdit = async (project: Row) => {
    setEditingProject(project);

    // Load party IDs from engagement_parties
    const roles: PartyRole[] = ['customer', 'project_manager', 'architect'];
    const parties = await getPrimaryPartiesForEngagements([project.id], roles);

    let customer_id = '';
    let manager_id = '';
    let architect_id = '';

    for (const p of parties) {
      if (p.role === 'customer' && p.party_type === 'company') {
        customer_id = p.party_id;
      } else if (p.role === 'project_manager' && p.party_type === 'contact') {
        manager_id = p.party_id;
      } else if (p.role === 'architect' && p.party_type === 'company') {
        architect_id = p.party_id;
      }
    }

    setForm({
      name: project.project_name,
      project_number: project.project_number || '',
      customer_id,
      manager_id,
      owner: '', // Owner is now resolved from engagement_user_roles, not editable here
      architect_id,
      sharepoint_folder: project.sharepoint_folder || '',
      contract_amount: project.contract_amt?.toString() || '',
      contract_budget: project.contract_budget?.toString() || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    });
    setShowModal(true);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Project name is required');
    setSaving(true);
    try {
      // Stage not handled in this modal.

      const payload: ProjectPayload = {
        name: form.name,
        project_number: form.project_number || null,
        sharepoint_folder: form.sharepoint_folder
          ? form.sharepoint_folder.trim()
          : null,
        contract_amount: form.contract_amount
          ? Number(form.contract_amount)
          : null,
        contract_budget: form.contract_budget
          ? Number(form.contract_budget)
          : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      let error = null;
      let engagementId: string | null = null;
      if (editingProject) {
        const { error: err } = await supabase
          .from('engagements')
          .update(payload)
          .eq('id', editingProject.id);
        error = err;
        engagementId = editingProject.id;
      } else {
        const { data: inserted, error: err } = await supabase
          .from('engagements')
          .insert([payload])
          .select('id')
          .maybeSingle();
        error = err;
        engagementId = inserted?.id ?? null;
      }

      if (!error && engagementId) {
        // Sync primary parties to junction table using IDs from form
        await syncCorePrimaryParties({
          engagementId,
          customerCompanyId: form.customer_id || null,
          projectManagerContactId: form.manager_id || null,
          architectCompanyId: form.architect_id || null,
        });

        // Sync project owner via engagement_user_roles (junction table)
        if (form.owner && form.owner.trim().length > 0) {
          try {
            await setPrimaryUserRole({
              engagementId,
              role: 'project_lead',
              userId: form.owner,
            });
          } catch (e) {
            console.warn(
              'Non-blocking: failed to set project owner user role',
              e
            );
          }
        }

        // Auto-sync to QuickBooks
        // For new projects, create in QB. For edits, only link to existing.
        const isNewProject = !editingProject;
        if (
          isNewProject ||
          form.name !== editingProject.name ||
          form.project_number !== editingProject.project_number ||
          form.customer_id !== editingProject.customer_id
        ) {
          try {
            await fetch('/api/qbo/sync-project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                engagementId: engagementId,
                createIfNotFound: isNewProject,
              }),
            });
            console.log('✓ Project synced to QuickBooks');
          } catch (qboError) {
            console.warn('Non-blocking: QB sync failed', qboError);
            // Don't block project save if QB sync fails
          }
        }
      }

      if (error) alert('Error saving project: ' + error.message);
      else {
        setShowModal(false);
        await refresh();
      }
    } catch (err) {
      console.error('Unexpected error saving project:', err);
      alert('Unexpected error saving project. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  // Sorting & filtering now provided by domain hook

  if (authChecked && !sessionEmail) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f1ea',
        }}
      >
        <div
          style={{
            background: '#faf8f5',
            border: '1px solid #e5dfd5',
            borderRadius: 12,
            padding: 24,
            width: 420,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 20,
              color: colors.textPrimary,
            }}
          >
            Sign in required
          </h1>
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              color: colors.textSecondary,
            }}
          >
            Please sign in with your Microsoft account to access Projects.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '10px 12px',
              borderRadius: 8,
              background: '#1e3a5f',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#f5f1ea',
        padding: 24,
        fontFamily: 'system-ui',
        position: 'relative',
      }}
    >
      {/* Header */}
      <DashboardHeader
        sessionEmail={sessionEmail}
        activeTab="projects"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuItems={
          <SharedMenu
            onClose={() => setMenuOpen(false)}
            onOpenMasterData={(table, label) =>
              openMaster(
                table as
                  | 'stages'
                  | 'companies'
                  | 'managers'
                  | 'owners'
                  | 'engagement_tasks'
                  | 'subcontractors',
                label
              )
            }
            onOpenCompanies={(companyType, label) => {
              setCompaniesModal({ open: true, companyType, label });
            }}
            onOpenContacts={() => setShowContactsModal(true)}
            onOpenUsers={() => setShowUsersModal(true)}
            onOpenLostReasons={() => setShowLostReasonsModal(true)}
          />
        }
        actionButton={
          <button
            type="button"
            className="desktop-new-button"
            onClick={openForNew}
            style={{
              background: colors.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'none',
              minWidth: 145,
              width: 145,
            }}
          >
            + New Project
          </button>
        }
        exportButton={
          <button
            type="button"
            className="projects-export-button"
            onClick={() => {
              if (!filteredAndSortedRows.length) return;
              const headers = [
                'id',
                'project_number',
                'project_name',
                'customer_name',
                'owner',
                'stage',
                'contract_amt',
                'co_amt',
                'total_amt',
                'billed_amt',
                'balance',
                'start_date',
                'end_date',
              ];
              const lines = [
                headers.join(','),
                ...filteredAndSortedRows.map((r) =>
                  headers
                    .map((h) => {
                      const val = (r as any)[h];
                      if (val == null) return '';
                      const str = String(val).replace(/"/g, '""');
                      return /[",\n]/.test(str) ? `"${str}"` : str;
                    })
                    .join(',')
                ),
              ];
              const blob = new Blob([lines.join('\n')], {
                type: 'text/csv',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `projects-export-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={filteredAndSortedRows.length === 0}
            style={{
              background:
                filteredAndSortedRows.length > 0 ? '#ebe5db' : '#f5f5f5',
              color:
                filteredAndSortedRows.length > 0 ? colors.textPrimary : '#999',
              border: '1px solid #e5dfd5',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor:
                filteredAndSortedRows.length > 0 ? 'pointer' : 'not-allowed',
              opacity: filteredAndSortedRows.length > 0 ? 1 : 0.5,
            }}
          >
            Export CSV
          </button>
        }
      />

      {/* Mobile Filters Button + New Project Button */}
      <div className="projects-mobile-filters">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            style={{
              flex: '1 1 50%',
              background: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {(filters.project_name.length > 0 ||
              filters.customer_name.length > 0 ||
              filters.stage.length > 0 ||
              filters.owner.length > 0 ||
              filters.project_number.length > 0) && (
              <span
                style={{
                  background: '#c8102e',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {filters.project_name.length +
                  filters.customer_name.length +
                  filters.stage.length +
                  filters.owner.length +
                  filters.project_number.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openForNew}
            style={{
              flex: '1 1 50%',
              background: colors.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <p style={{ color: colors.textSecondary }}>Loading…</p>
      ) : filteredAndSortedRows.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>No projects yet.</p>
      ) : (
        <>
          <ProjectsTable
            rows={filteredAndSortedRows}
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            onSort={handleSort}
            sortIndicator={sortIndicator}
            onRowClick={(r) => router.push(`/projects/${r.id}`)}
            onEdit={(r) => openForEdit(r)}
            onDelete={async (r) => {
              if (
                !confirm(
                  `Are you sure you want to delete "${r.project_name}"? This action cannot be undone.`
                )
              )
                return;
              try {
                const { error } = await supabase
                  .from('engagements')
                  .delete()
                  .eq('id', r.id);
                if (error) throw error;
                await refresh();
              } catch (err) {
                let errorMessage = 'Unknown error';
                if (err && typeof err === 'object') {
                  const anyErr: any = err;
                  if (anyErr.message) errorMessage = anyErr.message;
                  const detailsParts: string[] = [];
                  if (anyErr.code) detailsParts.push(`code=${anyErr.code}`);
                  if (anyErr.details) detailsParts.push(anyErr.details);
                  if (anyErr.hint) detailsParts.push(anyErr.hint);
                  if (detailsParts.length) {
                    errorMessage += ` ( ${detailsParts.join(' | ')} )`;
                  }
                } else if (err instanceof Error) {
                  errorMessage = err.message;
                } else {
                  errorMessage = String(err);
                }
                alert(`Delete failed: ${errorMessage}`);
              }
            }}
          />

          {/* Mobile Cards View */}
          <div className="projects-mobile-cards" style={{ display: 'none' }}>
            {filteredAndSortedRows.map((r: Row) => {
              return (
                <div
                  key={r.id}
                  className="project-card"
                  onClick={() => router.push(`/projects/${r.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-card-header">
                    <div>
                      <h3 className="project-card-title">{r.project_name}</h3>
                      {r.project_number && (
                        <div className="project-card-qbid">
                          Project #: {r.project_number}
                        </div>
                      )}
                    </div>
                    <div className="project-card-actions">
                      {r.sharepoint_folder && (
                        <a
                          href={r.sharepoint_folder}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: colors.navy,
                            padding: 8,
                            display: 'flex',
                          }}
                        >
                          <Folder size={20} />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openForEdit(r);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.navy,
                          padding: 8,
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <Pencil size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="project-card-row">
                    <span className="project-card-label">Customer</span>
                    <span className="project-card-value">
                      {r.customer_name ?? '—'}
                    </span>
                  </div>

                  {r.stage && (
                    <div className="project-card-row">
                      <span className="project-card-label">Stage</span>
                      <span
                        className="project-card-stage"
                        style={{ display: 'inline-block' }}
                      >
                        <StageBadge stage={r.stage} order={r.stage_order} />
                      </span>
                    </div>
                  )}

                  <div className="project-card-row">
                    <span className="project-card-label">Project Lead</span>
                    <span className="project-card-value">{r.owner ?? '—'}</span>
                  </div>

                  <div
                    className="project-card-row"
                    style={{
                      borderTop: '1px solid #e5dfd5',
                      paddingTop: 12,
                      marginTop: 8,
                    }}
                  >
                    <span className="project-card-label">Total</span>
                    <span className="project-card-value project-card-money">
                      {money(r.total_amt)}
                    </span>
                  </div>

                  <div className="project-card-row">
                    <span className="project-card-label">Billed</span>
                    <span className="project-card-value">
                      {money(r.billed_amt)}
                    </span>
                  </div>

                  <div className="project-card-row">
                    <span className="project-card-label">Balance</span>
                    <span className="project-card-value project-card-money">
                      {money(r.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Filters Modal */}
      {showFiltersModal && (
        <div style={styles.overlay}>
          <div
            style={{
              ...styles.modal,
              maxWidth: '90%',
              width: 400,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-modal-title"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2
                id="filters-modal-title"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: 0,
                  color: colors.textPrimary,
                }}
              >
                Filter Projects
              </h2>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Project Name
                </label>
                <MultiFilterInput
                  values={filters.project_name}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, project_name: vals }))
                  }
                  suggestions={uniqueValues.project_name}
                  placeholder="Filter projects..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Customer
                </label>
                <MultiFilterInput
                  values={filters.customer_name}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, customer_name: vals }))
                  }
                  suggestions={uniqueValues.customer_name}
                  placeholder="Filter customers..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Owner
                </label>
                <MultiFilterInput
                  values={filters.owner}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, owner: vals }))
                  }
                  suggestions={uniqueValues.owner}
                  placeholder="Filter owners..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Stage
                </label>
                <MultiFilterInput
                  values={filters.stage}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, stage: vals }))
                  }
                  suggestions={uniqueValues.stage}
                  placeholder="Filter stages..."
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid #e5dfd5',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    project_number: [],
                    project_name: [],
                    customer_name: [],
                    owner: [],
                    stage: [],
                  });
                }}
                style={{
                  flex: 1,
                  background: '#ebe5db',
                  color: colors.textPrimary,
                  border: '1px solid #e5dfd5',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                style={{
                  flex: 1,
                  background: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div
            style={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <h2
              id="project-modal-title"
              style={{
                marginTop: 0,
                marginBottom: 20,
                fontSize: 18,
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              {editingProject ? 'Edit Project' : 'New Project'}
            </h2>
            <form onSubmit={saveProject}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Project Number
                  </label>
                  <input
                    type="text"
                    name="project_number"
                    value={form.project_number}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Customer
                  </label>
                  <select
                    name="customer_id"
                    value={form.customer_id}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select customer...</option>
                    {customerOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Project Manager
                  </label>
                  <select
                    name="manager_id"
                    value={form.manager_id}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select project manager...</option>
                    {managerOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Architect
                  </label>
                  <select
                    name="architect_id"
                    value={form.architect_id}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select architect...</option>
                    {architectOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Owner
                  </label>
                  <select
                    name="owner"
                    value={form.owner}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select owner...</option>
                    {ownerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stage selection removed from modal; manage on project details page. */}

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    SharePoint Folder URL
                  </label>
                  <input
                    type="text"
                    name="sharepoint_folder"
                    value={form.sharepoint_folder}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Contract Amount
                  </label>
                  <input
                    type="number"
                    name="contract_amount"
                    value={form.contract_amount}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Contract Budget
                  </label>
                  <input
                    type="number"
                    name="contract_budget"
                    value={form.contract_budget}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={styles.btnSave}>
                  {saving ? 'Saving…' : editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Data modal (Customers/Managers/Owners/Stages) */}
      {showMaster && (
        <MasterDataModal
          open={true}
          onClose={closeMaster}
          table={showMaster.table}
          label={showMaster.label}
        />
      )}

      {/* Companies Modal */}
      {companiesModal.open && companiesModal.companyType && (
        <CompaniesModal
          open={companiesModal.open}
          onClose={() => {
            setCompaniesModal({ open: false, companyType: null, label: '' });
            refresh(); // Reload in case companies changed
          }}
          companyType={companiesModal.companyType}
          label={companiesModal.label}
        />
      )}

      {/* Users Modal */}
      <UsersModal open={showUsersModal} onClose={closeUsers} />
      {/* Contacts Modal */}
      <ContactsModal open={showContactsModal} onClose={closeContacts} />
      {/* Lost Reasons Modal */}
      <LostReasonsModal
        open={showLostReasonsModal}
        onClose={closeLostReasons}
      />
    </div>
  );
}

/* ------------------------------ Styles ------------------------------ */
const th: React.CSSProperties = {
  fontWeight: 600,
  color: colors.textPrimary,
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: '#f0ebe3',
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = {
  ...th,
  textAlign: 'center',
  cursor: 'default',
};

// Column-specific widths
const thQBID: React.CSSProperties = {
  ...th,
  width: 80,
  minWidth: 80,
  maxWidth: 80,
};
const thProjectName: React.CSSProperties = { ...th, width: 250, minWidth: 200 };
const thCustomer: React.CSSProperties = { ...th, width: 180, minWidth: 150 };
const thOwner: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thStage: React.CSSProperties = { ...th, width: 160, minWidth: 140 };
const thMoney: React.CSSProperties = { ...thRight, width: 110, minWidth: 100 };
const thDate: React.CSSProperties = { ...th, width: 100, minWidth: 90 };
const thActions: React.CSSProperties = { ...thCenter, width: 80, minWidth: 80 };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };
