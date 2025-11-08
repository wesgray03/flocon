// pages/projects/index.tsx — Projects Dashboard
// --------------------------------------------------------------
// STRUCTURE:
// - Extracted Components: src/components/modals/UsersModal.tsx, ContactsModal.tsx
// - Shared Styles: src/styles/projectStyles.ts
// - This file contains: Main ProjectsPage component, MasterDataModal, Popover
// --------------------------------------------------------------

import { ContactsModal } from '@/components/modals/ContactsModal';
import { UsersModal } from '@/components/modals/UsersModal';
import { MultiFilterInput } from '@/components/ui/multi-filter-input';
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectStyles';
import { Folder, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

/* ========================= TYPE DEFINITIONS ========================= */

type Filters = {
  qbid: string[];
  project_name: string[];
  customer_name: string[];
  manager: string[];
  owner: string[];
  stage: string[];
};

interface TaskData {
  id: string;
  name: string;
  stages?: { name?: string }[] | { name?: string };
}

interface StageData {
  id?: string;
  name: string;
  order?: number;
}

interface NameRecord {
  name: string;
}

interface ProjectPayload {
  name: string;
  qbid: string | null;
  customer_id: string | null;
  manager: string | null;
  owner: string | null;
  sharepoint_folder: string | null;
  contract_amount: number | null;
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
    | 'customers'
    | 'managers'
    | 'owners'
    | 'users'
    | 'stages'
    | 'project_tasks'
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
      if (table === 'project_tasks') {
        // Load project_tasks with stage information
        const result = await supabase
          .from('project_tasks')
          .select('id, name, stage_id, stages(name)')
          .order('order_num', { ascending: true });
        data = result.data;
        error = result.error;
        // Transform to include stage_name
        if (data) {
          data = data.map((task: TaskData) => {
            const stageName = Array.isArray(task.stages)
              ? task.stages[0]?.name
              : task.stages?.name;
            return {
              id: task.id,
              name: task.name,
              stage_name: stageName || 'Unknown Stage',
            };
          });
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
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#f8fafc',
              padding: 8,
              fontSize: 12,
              color: '#334155',
            }}
          >
            {loading ? 'Loading…' : `${items.length} item(s)`}
            {loadError ? (
              <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 12 }}>
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
                  borderTop: '1px solid #e5e7eb',
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
                          color: '#6b7280',
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
export type Row = {
  id: string;
  qbid: string | null;
  project_name: string;
  customer_name: string | null;
  manager: string | null;
  owner: string | null;
  // `stage` is the display name. `stage_id` is an optional FK to the `stages` table.
  stage: string | null;
  stage_id?: string | null;
  stage_order?: number | null; // Added for sorting by stage order
  // Optional SharePoint folder URL for the project
  sharepoint_folder?: string | null;
  contract_amt: number;
  co_amt: number;
  total_amt: number;
  billed_amt: number;
  balance: number;
  start_date: string | null;
  end_date: string | null;
};
export type SortKey = keyof Row | 'none';
export type SortOrder = 'asc' | 'desc';

/* ------------------------------ Popover ------------------------------ */
function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 220,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        zIndex: 1001,
      }}
      role="menu"
    >
      {children}
    </div>
  );
}

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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Row | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    qbid: [],
    project_name: [],
    customer_name: [],
    manager: [],
    owner: [],
    stage: [],
  });

  // Unique values for suggestions
  const uniqueValues = useMemo(
    () => ({
      qbid: Array.from(
        new Set(rows.map((r) => r.qbid).filter((v): v is string => !!v))
      ),
      project_name: Array.from(new Set(rows.map((r) => r.project_name))),
      customer_name: Array.from(
        new Set(
          rows.map((r) => r.customer_name).filter((v): v is string => !!v)
        )
      ),
      manager: Array.from(
        new Set(rows.map((r) => r.manager).filter((v): v is string => !!v))
      ),
      owner: Array.from(
        new Set(rows.map((r) => r.owner).filter((v): v is string => !!v))
      ),
      stage: Array.from(
        new Set(rows.map((r) => r.stage).filter((v): v is string => !!v))
      ),
    }),
    [rows]
  );

  const [showMaster, setShowMaster] = useState<null | {
    table:
      | 'customers'
      | 'managers'
      | 'owners'
      | 'stages'
      | 'project_tasks'
      | 'subcontractors';
    label: string;
  }>(null);
  const openMaster = (
    table:
      | 'customers'
      | 'managers'
      | 'owners'
      | 'stages'
      | 'project_tasks'
      | 'subcontractors',
    label: string
  ) => setShowMaster({ table, label });
  const closeMaster = () => setShowMaster(null);

  const [showUsersModal, setShowUsersModal] = useState(false);
  const openUsers = () => setShowUsersModal(true);
  const closeUsers = () => setShowUsersModal(false);

  const [showContactsModal, setShowContactsModal] = useState(false);
  const openContacts = () => setShowContactsModal(true);
  const closeContacts = () => setShowContactsModal(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [managerOptions, setManagerOptions] = useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
  const [stageOptions, setStageOptions] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '',
    qbid: '',
    customer_name: '',
    manager: '',
    owner: '',
    stage: '',
    sharepoint_folder: '',
    contract_amount: '',
    start_date: '',
    end_date: '',
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Note: project_dashboard view already includes stage info (stage_id, stage_name, stage_order)
      // so we don't need to join with stages table
      const { data, error } = await supabase
        .from('project_dashboard')
        .select('*');
      if (error) {
        console.error(
          'Project dashboard load error:',
          (error as { message?: string }).message ?? error
        );
        setRows([]);
        return;
      }

      interface ProjectDashboardRow {
        id: string;
        qbid?: string | null;
        project_name: string;
        customer_name?: string | null;
        manager?: string | null;
        owner?: string | null;
        stage_id?: string | null;
        stage_name?: string | null;
        stage_order?: number | null;
        sharepoint_folder?: string | null;
        contract_amt?: number;
        co_amt?: number;
        total_amt?: number;
        billed_amt?: number;
        balance?: number;
        start_date?: string | null;
        end_date?: string | null;
      }

      const rowsData = (data ?? []) as ProjectDashboardRow[];

      // Load stages table to prefer canonical stages.name where possible.
      // Build maps for names and orders
      const stagesMap: Record<string, string> = {};
      const normalizedNameMap: Record<string, string> = {};
      const stageOrderMap: Record<string, number | null> = {};
      try {
        const { data: stagesData, error: stagesErr } = await supabase
          .from('stages')
          .select('id,name,order');
        if (!stagesErr && stagesData) {
          (stagesData as StageData[]).forEach((s) => {
            if (s?.id && s?.name) {
              const displayName = s.order ? `${s.order}. ${s.name}` : s.name;
              stagesMap[s.id] = displayName;
              stageOrderMap[s.id] = s.order || null;
              const key = (String(s.name) || '').trim().toLowerCase();
              normalizedNameMap[key] = displayName;
            }
          });
        }
      } catch {
        // ignore - stages table may not exist
      }

      const mapped: Row[] = rowsData.map((r): Row => {
        // prefer stage_id -> stages.name if available
        if (r.stage_id && stagesMap[r.stage_id]) {
          return {
            id: r.id,
            qbid: r.qbid ?? null,
            project_name: r.project_name,
            customer_name: r.customer_name ?? null,
            manager: r.manager ?? null,
            owner: r.owner ?? null,
            stage: stagesMap[r.stage_id],
            stage_id: r.stage_id,
            stage_order: stageOrderMap[r.stage_id] ?? null,
            sharepoint_folder: r.sharepoint_folder ?? null,
            contract_amt: r.contract_amt ?? 0,
            co_amt: r.co_amt ?? 0,
            total_amt: r.total_amt ?? 0,
            billed_amt: r.billed_amt ?? 0,
            balance: r.balance ?? 0,
            start_date: r.start_date ?? null,
            end_date: r.end_date ?? null,
          };
        }

        // otherwise, if we have a stage_name, try to match to a canonical
        // stages.name (case-insensitive). If no match, use stage_name as-is.
        if (r.stage_name && typeof r.stage_name === 'string') {
          const key = r.stage_name.trim().toLowerCase();
          const displayStage = normalizedNameMap[key] || r.stage_name;
          return {
            id: r.id,
            qbid: r.qbid ?? null,
            project_name: r.project_name,
            customer_name: r.customer_name ?? null,
            manager: r.manager ?? null,
            owner: r.owner ?? null,
            stage: displayStage,
            stage_id: r.stage_id,
            stage_order: r.stage_order ?? null,
            sharepoint_folder: r.sharepoint_folder ?? null,
            contract_amt: r.contract_amt ?? 0,
            co_amt: r.co_amt ?? 0,
            total_amt: r.total_amt ?? 0,
            billed_amt: r.billed_amt ?? 0,
            balance: r.balance ?? 0,
            start_date: r.start_date ?? null,
            end_date: r.end_date ?? null,
          };
        }

        return {
          id: r.id,
          qbid: r.qbid ?? null,
          project_name: r.project_name,
          customer_name: r.customer_name ?? null,
          manager: r.manager ?? null,
          owner: r.owner ?? null,
          stage: null,
          stage_id: r.stage_id,
          stage_order: r.stage_order ?? null,
          sharepoint_folder: r.sharepoint_folder ?? null,
          contract_amt: r.contract_amt ?? 0,
          co_amt: r.co_amt ?? 0,
          total_amt: r.total_amt ?? 0,
          billed_amt: r.billed_amt ?? 0,
          balance: r.balance ?? 0,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
        };
      });
      setRows(mapped as Row[]);
    } catch (err) {
      console.error('Unexpected error loading projects:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    (async () => {
      try {
        const { data: custs } = await supabase
          .from('customers')
          .select('name')
          .order('name', { ascending: true });
        setCustomerOptions(
          (
            (custs ?? [])
              .map((c: NameRecord) => c.name)
              .filter(Boolean) as string[]
          ).sort()
        );

        // Load project managers from contacts table
        const { data: mgrs } = await supabase
          .from('contacts')
          .select('name')
          .eq('contact_type', 'Project Manager')
          .order('name', { ascending: true });
        setManagerOptions(
          (
            (mgrs ?? [])
              .map((m: NameRecord) => m.name)
              .filter(Boolean) as string[]
          ).sort()
        );

        // Load owners from users table where user_type='Owner'
        const { data: owns } = await supabase
          .from('users')
          .select('name')
          .eq('user_type', 'Owner')
          .order('name', { ascending: true });
        setOwnerOptions(
          (
            (owns ?? [])
              .map((o: NameRecord) => o.name)
              .filter(Boolean) as string[]
          ).sort()
        );

        // Prefer reading stages from a dedicated `stages` table if present.
        try {
          const { data: stagesData, error: stagesErr } = await supabase
            .from('stages')
            .select('name,order')
            .order('order', { ascending: true })
            .order('name', { ascending: true });
          if (!stagesErr && stagesData && stagesData.length > 0) {
            setStageOptions(
              stagesData
                .map((s: StageData) =>
                  s.order ? `${s.order}. ${s.name}` : s.name
                )
                .filter(Boolean) as string[]
            );
          } else {
            // If stages table exists but is empty (or not accessible as expected),
            // fall back to a reasonable defaults list. We prefer `stages.name`
            // as the source of truth for project stage values.
            const defaults = [
              'Project Setup',
              'Contract Onboarding',
              'Product Submitals',
              'Material Procurement',

              'Project Review',
              'Final Document Submission',
              'Final Payment Receipt',
              'Project Closure',
              'Bonus Payment',
            ];
            setStageOptions(defaults.sort());
          }
        } catch {
          // If `stages` table isn't available or permissions block access, use defaults.
          const defaults = [
            'Project Setup',
            'Contract Onboarding',
            'Product Submitals',
            'Material Procurement',
            'Installation Execution',
            'Punch List Execution',
            'Project Review',
            'Final Document Submission',
            'Final Payment Receipt',
            'Project Closure',
            'Bonus Payment',
          ];
          setStageOptions(defaults.sort());
        }
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

  const money = (n: number | null | undefined) =>
    n == null
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const dateStr = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : '—';
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = () => {
    setEditingProject(null);
    setForm({
      name: '',
      qbid: '',
      customer_name: '',
      manager: '',
      owner: '',
      stage: '',
      sharepoint_folder: '',
      contract_amount: '',
      start_date: '',
      end_date: '',
    });
    setShowModal(true);
  };

  const openForEdit = (project: Row) => {
    setEditingProject(project);
    setForm({
      name: project.project_name,
      qbid: project.qbid || '',
      customer_name: project.customer_name || '',
      manager: project.manager || '',
      owner: project.owner || '',
      stage: project.stage || '',
      sharepoint_folder: project.sharepoint_folder || '',
      contract_amount: project.contract_amt?.toString() || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    });
    setShowModal(true);
  };

  const getOrCreateCustomerId = async (
    name: string | null
  ): Promise<string | null> => {
    try {
      const clean = (name ?? '').trim();
      if (!clean) return null;

      const { data: found, error: findErr } = await supabase
        .from('customers')
        .select('id,name')
        .ilike('name', clean)
        .limit(1);
      if (!findErr && found && found.length > 0) return found[0].id as string;

      const { data: inserted, error: insErr } = await supabase
        .from('customers')
        .insert([{ name: clean }])
        .select('id')
        .maybeSingle();

      if (insErr) {
        const { data: recheck } = await supabase
          .from('customers')
          .select('id')
          .eq('name', clean)
          .limit(1)
          .maybeSingle();
        return recheck?.id ?? null;
      }
      return inserted?.id ?? null;
    } catch (err) {
      console.error('getOrCreateCustomerId error:', err);
      return null;
    }
  };

  const getOrCreateStageId = async (
    name: string | null
  ): Promise<string | null> => {
    try {
      const clean = (name ?? '').trim();
      if (!clean) return null;

      // Try to find existing stage by name (case-insensitive)
      const { data: found, error: findErr } = await supabase
        .from('stages')
        .select('id,name')
        .ilike('name', clean)
        .limit(1);
      if (!findErr && found && found.length > 0) return found[0].id as string;

      // Insert new stage
      const { data: inserted, error: insErr } = await supabase
        .from('stages')
        .insert([{ name: clean }])
        .select('id')
        .maybeSingle();

      if (insErr) {
        const { data: recheck } = await supabase
          .from('stages')
          .select('id')
          .eq('name', clean)
          .limit(1)
          .maybeSingle();
        return recheck?.id ?? null;
      }
      return inserted?.id ?? null;
    } catch (err) {
      // If the `stages` table doesn't exist or permissions block access, return null
      console.debug(
        'getOrCreateStageId - stages table not available or error:',
        err
      );
      return null;
    }
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Project name is required');
    setSaving(true);
    try {
      const customer_id = await getOrCreateCustomerId(form.customer_name);
      // Try to resolve a stage id from the `stages` table.
      const stage_id = await getOrCreateStageId(form.stage);
      const payload: ProjectPayload = {
        name: form.name,
        qbid: form.qbid || null,
        customer_id,
        manager: form.manager || null,
        owner: form.owner || null,
        sharepoint_folder: form.sharepoint_folder
          ? form.sharepoint_folder.trim()
          : null,
        contract_amount: form.contract_amount
          ? Number(form.contract_amount)
          : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      // Always prefer storing the FK `stage_id`. Do not write a legacy
      // status/stage string to the `projects` table. If `stage_id` is null
      // (stages table unavailable), we save the project without a stage
      // association.
      if (stage_id) payload.stage_id = stage_id;

      let error = null;
      if (editingProject) {
        const { error: err } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('projects')
          .insert([payload]);
        error = err;
      }

      if (error) alert('Error saving project: ' + error.message);
      else {
        setShowModal(false);
        await loadProjects();
      }
    } catch (err) {
      console.error('Unexpected error saving project:', err);
      alert('Unexpected error saving project. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    // Multi-value filter logic: if filter array is non-empty, match any
    const matchesTokens = (
      value: string | null | undefined,
      tokens: string[]
    ) => {
      if (!tokens || tokens.length === 0) return true;
      if (!value) return false;
      const v = String(value).toLowerCase();
      return tokens.some((t) => v.includes(String(t).toLowerCase()));
    };

    const out = rows.filter((row) => {
      return (
        matchesTokens(row.qbid, filters.qbid) &&
        matchesTokens(row.project_name, filters.project_name) &&
        matchesTokens(row.customer_name, filters.customer_name) &&
        matchesTokens(row.manager, filters.manager) &&
        matchesTokens(row.owner, filters.owner) &&
        matchesTokens(row.stage, filters.stage)
      );
    });

    // Then apply sorting
    if (sortKey === 'none') return out;

    out.sort((a, b) => {
      if (sortKey === 'stage') {
        // Custom sorting for stages that considers both order and name
        const aOrder = a.stage_order ?? Infinity;
        const bOrder = b.stage_order ?? Infinity;
        const aName = (a.stage || '').toLowerCase();
        const bName = (b.stage || '').toLowerCase();

        // First try to sort by order
        if (aOrder !== bOrder) {
          return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        }

        // If orders are equal (or both null), sort by name
        return sortOrder === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }

      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // numeric/date compare first
      const aNum =
        typeof aVal === 'number' ? aVal : Date.parse(String(aVal)) || NaN;
      const bNum =
        typeof bVal === 'number' ? bVal : Date.parse(String(bVal)) || NaN;
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // fallback string compare
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return out;
  }, [rows, sortKey, sortOrder, filters]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  const sortIndicator = (key: SortKey) =>
    key !== sortKey ? '' : sortOrder === 'asc' ? ' ▲' : ' ▼';

  if (authChecked && !sessionEmail) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
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
              color: '#0f172a',
            }}
          >
            Sign in required
          </h1>
          <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
            Please sign in with your Microsoft account to access Projects.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '10px 12px',
              borderRadius: 8,
              background: '#2563eb',
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: '#faf8f5',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Left: FloCon Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Image
            src="/flocon-logo-v2.png"
            alt="FloCon"
            width={150}
            height={45}
            style={{ height: 'auto', maxHeight: 45, width: 'auto' }}
            priority
          />
        </div>

        {/* Center: Prospects | Projects Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: '#ebe5db',
            borderRadius: 8,
            padding: 3,
          }}
        >
          <Link
            href="/prospects"
            style={{
              padding: '6px 18px',
              background: '#faf8f5',
              color: '#8b7d6b',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Prospects
          </Link>
          <div
            style={{
              padding: '6px 18px',
              background: '#1e3a5f',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Projects
          </div>
        </div>

        {/* Right: Actions and User Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          {sessionEmail && (
            <span style={{ color: '#64748b', fontSize: 14 }}>
              {sessionEmail}
            </span>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                background: '#f1f5f9',
                color: '#0f172a',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: 16,
              }}
              title="Menu"
              aria-label="Menu"
            >
              ☰
            </button>
            <Popover open={menuOpen} onClose={() => setMenuOpen(false)}>
              <button
                type="button"
                style={{
                  ...menuItemButton,
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openForNew();
                }}
              >
                + New Project
              </button>
              <div
                style={{
                  height: 1,
                  background: '#e2e8f0',
                  margin: '4px 0',
                }}
              />
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openMaster('customers', 'Customers');
                }}
              >
                Customers
              </button>
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openContacts();
                }}
              >
                Contacts
              </button>
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openUsers();
                }}
              >
                Users
              </button>
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openMaster('stages', 'Stages');
                }}
              >
                Stages
              </button>
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openMaster('project_tasks', 'Project Tasks');
                }}
              >
                Project Tasks
              </button>
              <button
                type="button"
                style={menuItemButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  setMenuOpen(false);
                  openMaster('subcontractors', 'Subcontractors');
                }}
              >
                Subcontractors
              </button>
              {sessionEmail && (
                <>
                  <div
                    style={{
                      height: 1,
                      background: '#e2e8f0',
                      margin: '4px 0',
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      ...menuItemButton,
                      background: '#fee2e2',
                      color: '#991b1b',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fecaca';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                    }}
                    onClick={async () => {
                      setMenuOpen(false);
                      await supabase.auth.signOut();
                      window.location.href = '/login';
                    }}
                  >
                    Sign out ({sessionEmail})
                  </button>
                </>
              )}
            </Popover>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <p style={{ color: '#475569' }}>Loading…</p>
      ) : filteredAndSortedRows.length === 0 ? (
        <p style={{ color: '#475569' }}>No projects yet.</p>
      ) : (
        <div
          style={{
            background: '#faf8f5',
            border: '1px solid #e5dfd5',
            borderRadius: 12,
            padding: 16,
            overflowX: 'auto',
            overflowY: 'visible',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <table
            style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}
          >
            <thead>
              <tr
                style={{
                  background: '#f0ebe3',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th style={thQBID} onClick={() => handleSort('qbid')}>
                  QBID{sortIndicator('qbid')}
                </th>
                <th
                  style={thProjectName}
                  onClick={() => handleSort('project_name')}
                >
                  Project Name{sortIndicator('project_name')}
                </th>
                <th
                  style={thCustomer}
                  onClick={() => handleSort('customer_name')}
                >
                  Customer{sortIndicator('customer_name')}
                </th>
                <th style={thManager} onClick={() => handleSort('manager')}>
                  Manager{sortIndicator('manager')}
                </th>
                <th style={thOwner} onClick={() => handleSort('owner')}>
                  Owner{sortIndicator('owner')}
                </th>
                <th style={thStage} onClick={() => handleSort('stage')}>
                  Stage{sortIndicator('stage')}
                </th>
                <th style={thMoney} onClick={() => handleSort('contract_amt')}>
                  Contract{sortIndicator('contract_amt')}
                </th>
                <th style={thMoney} onClick={() => handleSort('co_amt')}>
                  Change Orders{sortIndicator('co_amt')}
                </th>
                <th style={thMoney} onClick={() => handleSort('total_amt')}>
                  Total{sortIndicator('total_amt')}
                </th>
                <th style={thMoney} onClick={() => handleSort('billed_amt')}>
                  Billings{sortIndicator('billed_amt')}
                </th>
                <th style={thMoney} onClick={() => handleSort('balance')}>
                  Balance{sortIndicator('balance')}
                </th>
                <th style={thDate} onClick={() => handleSort('start_date')}>
                  Start{sortIndicator('start_date')}
                </th>
                <th style={thDate} onClick={() => handleSort('end_date')}>
                  End{sortIndicator('end_date')}
                </th>
                <th style={thActions}>Actions</th>
              </tr>
              {/* Filter row */}
              <tr>
                <th style={thQBID}>
                  <MultiFilterInput
                    values={filters.qbid}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, qbid: vals }))
                    }
                    suggestions={uniqueValues.qbid}
                    placeholder="Filter QBID..."
                  />
                </th>
                <th style={thProjectName}>
                  <MultiFilterInput
                    values={filters.project_name}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, project_name: vals }))
                    }
                    suggestions={uniqueValues.project_name}
                    placeholder="Filter project name..."
                  />
                </th>
                <th style={thCustomer}>
                  <MultiFilterInput
                    values={filters.customer_name}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, customer_name: vals }))
                    }
                    suggestions={uniqueValues.customer_name}
                    placeholder="Filter customer..."
                  />
                </th>
                <th style={thManager}>
                  <MultiFilterInput
                    values={filters.manager}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, manager: vals }))
                    }
                    suggestions={uniqueValues.manager}
                    placeholder="Filter manager..."
                  />
                </th>
                <th style={thOwner}>
                  <MultiFilterInput
                    values={filters.owner}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, owner: vals }))
                    }
                    suggestions={uniqueValues.owner}
                    placeholder="Filter owner..."
                  />
                </th>
                <th style={thStage}>
                  <MultiFilterInput
                    values={filters.stage}
                    onChangeValues={(vals) =>
                      setFilters((f) => ({ ...f, stage: vals }))
                    }
                    suggestions={uniqueValues.stage}
                    placeholder="Filter stage..."
                  />
                </th>
                {/* Empty cells for non-filtered columns */}
                <th style={thMoney}></th>
                <th style={thMoney}></th>
                <th style={thMoney}></th>
                <th style={thMoney}></th>
                <th style={thMoney}></th>
                <th style={thDate}></th>
                <th style={thDate}></th>
                <th style={thActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({
                        qbid: [],
                        project_name: [],
                        customer_name: [],
                        manager: [],
                        owner: [],
                        stage: [],
                      });
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #e5e7eb',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      margin: 0,
                      minWidth: 0,
                      minHeight: 0,
                      lineHeight: 1.2,
                    }}
                    aria-label="Clear all filters"
                  >
                    Clear Filters
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map((r: Row) => (
                <tr
                  key={r.id}
                  onClick={(e) => {
                    // Don't navigate if clicking on links or buttons
                    const target = e.target as HTMLElement;
                    if (
                      target.tagName === 'A' ||
                      target.tagName === 'BUTTON' ||
                      target.closest('a') ||
                      target.closest('button')
                    ) {
                      return;
                    }
                    router.push(`/projects/${r.id}`);
                  }}
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={td}>{r.qbid ?? '—'}</td>
                  <td style={td}>
                    <span style={{ color: '#0f172a' }}>{r.project_name}</span>
                    {r.sharepoint_folder ? (
                      <a
                        href={r.sharepoint_folder}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open project folder in SharePoint"
                        style={{
                          marginLeft: 8,
                          color: '#2563eb',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          verticalAlign: 'middle',
                        }}
                        aria-label="Open project folder"
                      >
                        <Folder size={16} />
                      </a>
                    ) : null}
                  </td>
                  <td style={td}>{r.customer_name ?? '—'}</td>
                  <td style={td}>{r.manager ?? '—'}</td>
                  <td style={td}>{r.owner ?? '—'}</td>
                  <td style={td}>{r.stage ?? '—'}</td>
                  <td style={tdRight}>{money(r.contract_amt)}</td>
                  <td style={tdRight}>
                    <Link
                      href={`/change-orders/${r.id}`}
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                    >
                      {money(r.co_amt)}
                    </Link>
                  </td>
                  <td style={tdRight}>{money(r.total_amt)}</td>
                  <td style={tdRight}>
                    <Link
                      href={`/billings/${r.id}`}
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                    >
                      {money(r.billed_amt)}
                    </Link>
                  </td>
                  <td style={tdRight}>{money(r.balance)}</td>
                  <td style={td}>{dateStr(r.start_date)}</td>
                  <td style={td}>{dateStr(r.end_date)}</td>
                  <td style={tdCenter}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => openForEdit(r)}
                      title="Edit project"
                      aria-label="Edit project"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: '#ef4444',
                        marginLeft: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Are you sure you want to delete "${r.project_name}"? This action cannot be undone.`
                          )
                        )
                          return;
                        try {
                          const { error } = await supabase
                            .from('projects')
                            .delete()
                            .eq('id', r.id);
                          if (error) throw error;
                          await loadProjects();
                        } catch (err) {
                          const errorMessage =
                            err instanceof Error ? err.message : String(err);
                          alert(`Delete failed: ${errorMessage}`);
                        }
                      }}
                      title="Delete project"
                      aria-label="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}
            >
              {editingProject ? 'Edit Project' : 'New Project'}
            </h2>
            <form onSubmit={saveProject}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <input
                  name="name"
                  placeholder="Project Name *"
                  value={form.name}
                  onChange={handleChange}
                  style={styles.input}
                />
                <input
                  name="qbid"
                  placeholder="QBID"
                  value={form.qbid}
                  onChange={handleChange}
                  style={styles.input}
                />
                <input
                  name="customer_name"
                  placeholder="Customer"
                  value={form.customer_name}
                  onChange={handleChange}
                  list="customers-list"
                  autoComplete="off"
                  style={styles.input}
                />
                <datalist id="customers-list">
                  {customerOptions.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <input
                  name="manager"
                  placeholder="Manager"
                  value={form.manager}
                  onChange={handleChange}
                  list="managers-list"
                  autoComplete="off"
                  style={styles.input}
                />
                <datalist id="managers-list">
                  {managerOptions.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <input
                  name="owner"
                  placeholder="Owner"
                  value={form.owner}
                  onChange={handleChange}
                  list="owners-list"
                  autoComplete="off"
                  style={styles.input}
                />
                <datalist id="owners-list">
                  {ownerOptions.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <input
                  name="stage"
                  placeholder="Stage"
                  value={form.stage}
                  onChange={handleChange}
                  list="stages-list"
                  autoComplete="off"
                  style={styles.input}
                />
                <datalist id="stages-list">
                  {stageOptions.map((v: string) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <input
                  name="sharepoint_folder"
                  placeholder="SharePoint Folder URL"
                  value={form.sharepoint_folder}
                  onChange={handleChange}
                  style={styles.input}
                />
                <input
                  name="contract_amount"
                  placeholder="Contract Amount"
                  type="number"
                  value={form.contract_amount}
                  onChange={handleChange}
                  style={styles.input}
                />
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  style={styles.input}
                />
                <input
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  style={styles.input}
                />
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

      {/* Users Modal */}
      <UsersModal open={showUsersModal} onClose={closeUsers} />
      {/* Contacts Modal */}
      <ContactsModal open={showContactsModal} onClose={closeContacts} />
    </div>
  );
}

/* ------------------------------ Styles ------------------------------ */
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: '#f1f5f9',
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
const thManager: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thOwner: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thStage: React.CSSProperties = { ...th, width: 160, minWidth: 140 };
const thMoney: React.CSSProperties = { ...thRight, width: 110, minWidth: 100 };
const thDate: React.CSSProperties = { ...th, width: 100, minWidth: 90 };
const thActions: React.CSSProperties = { ...thCenter, width: 80, minWidth: 80 };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };

const menuItemButton: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  color: '#0f172a',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontSize: 14,
  borderBottom: '1px solid #f1f5f9',
  cursor: 'pointer',
};
