// pages/projects/[id].tsx
import { CommentsSection } from '@/components/project/CommentsSection';
import ProjectStatusBlock from '@/components/project/ProjectStatusBlock';
import SubcontractorsSection from '@/components/project/SubcontractorsSection';
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectDetailStyles';
import { Pencil, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

const SOVSection = dynamic(() => import('@/components/project/SOVSection'), {
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
      <p style={{ margin: 0, color: '#64748b' }}>Loading SOV…</p>
    </div>
  ),
});

const PayAppsSection = dynamic(
  () => import('@/components/project/PayAppsSection'),
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
        <p style={{ margin: 0, color: '#64748b' }}>Loading Pay Apps…</p>
      </div>
    ),
  }
);

type Project = {
  id: string;
  name: string;
  qbid?: string | null;
  customer_name?: string | null;
  manager?: string | null;
  owner?: string | null;
  superintendent?: string | null;
  foreman?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  contract_amount?: number | null;
  // display-friendly stage name (from stages.name) and optional FK
  stage?: string | null;
  stage_id?: string | null;
  stage_order?: number | null;
};

type Stage = {
  id: string;
  name: string;
  order: number;
};

type SOVLine = {
  id: string;
  line_code: string | null;
  description: string;
  division: string | null;
  unit: string | null;
  quantity: number | null;
  unit_cost: number | null;
  extended_cost: number; // computed by DB
  category: string | null; // 'Material' | 'Labor' | 'Other' | null
  retainage_percent: number; // AIA retainage %
  created_at: string;
};

type SOVLineProgress = {
  id: string;
  pay_app_id: string;
  sov_line_id: string;
  scheduled_value: number;
  previous_completed: number;
  current_completed: number;
  stored_materials: number;
  total_completed_and_stored: number;
  percent_complete: number;
  balance_to_finish: number;
  retainage_amount: number;
  retainage_percent: number;
};

// Subcontractor and task types handled within extracted components/hooks

type PayApp = {
  id: string;
  pay_app_number: string | null;
  description: string;
  amount: number;
  period_start: string | null;
  period_end: string | null;
  date_submitted: string | null;
  date_paid: string | null;
  status: string | null;
  // AIA G703S fields
  total_completed_and_stored: number;
  retainage_completed_work: number;
  retainage_stored_materials: number;
  total_retainage: number;
  total_earned_less_retainage: number;
  previous_payments: number;
  current_payment_due: number;
  balance_to_finish: number;
  created_at: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  user_type: 'Owner' | 'Admin' | 'Foreman';
};

type ProjectComment = {
  id: string;
  project_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_name?: string;
  user_type?: string;
};

export default function ProjectDetail() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [lines, setLines] = useState<SOVLine[]>([]);
  const [payApps, setPayApps] = useState<PayApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing'>(
    'overview'
  );
  const [billingSubTab, setBillingSubTab] = useState<'sov' | 'payapps'>('sov');
  // SOV data is now loaded lazily by SOVSection component

  // Comments state
  const [comments, setComments] = useState<ProjectComment[]>([]);
  // Comments input state handled inside CommentsSection
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Add editing state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    qbid: '',
    customer_name: '',
    manager: '',
    owner: '',
    start_date: '',
    end_date: '',
    stage_id: '',
    contract_amount: '',
  });
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [managerOptions, setManagerOptions] = useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
  const [stageOptions, setStageOptions] = useState<
    { id: string; name: string; order: number }[]
  >([]);

  // Toast notifications state (lightweight, auto-dismiss)
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    timeoutMs = 2500
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), timeoutMs);
  };

  // SOV add-line form state managed in SOVSection

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      // Load current authenticated user
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Get the user record linked to this auth user
        // Use limit(1) to get just one record even if there are duplicates
        const { data: userDataArray, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (userErr) {
          console.error('Error loading user record:', userErr);
        }

        const userData =
          userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

        if (userData) {
          setCurrentUser(userData as User);
          console.log('Loaded user record:', userData.id);
        } else {
          console.warn('No user record found for authenticated user');
          // Auto-create user record if not found
          const { data: newUser, error: insertErr } = await supabase
            .from('users')
            .insert([
              {
                auth_user_id: session.user.id,
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.email ||
                  'Unnamed User',
                email: session.user.email,
                user_type: 'admin',
              },
            ])
            .select('*')
            .single();

          if (newUser && !insertErr) {
            setCurrentUser(newUser as User);
            console.info('Created new user record for authenticated user');
          } else {
            console.error('Failed to create user record:', insertErr);
          }
        }
      }

      // Load all stages for current/next stage calculation
      const { data: stagesList } = await supabase
        .from('stages')
        .select('id, name, order')
        .order('order', { ascending: true });

      setStages((stagesList ?? []) as Stage[]);
      setStageOptions(
        (stagesList ?? []) as { id: string; name: string; order: number }[]
      );

      // Load dropdown options
      try {
        const [{ data: customers }, { data: managers }, { data: owners }] =
          await Promise.all([
            supabase.from('customers').select('name').order('name'),
            supabase.from('managers').select('name').order('name'),
            supabase.from('owners').select('name').order('name'),
          ]);

        setCustomerOptions(
          (customers?.map((c) => c.name) ?? []).filter(Boolean)
        );
        setManagerOptions((managers?.map((m) => m.name) ?? []).filter(Boolean));
        setOwnerOptions((owners?.map((o) => o.name) ?? []).filter(Boolean));
      } catch (err) {
        console.error('Error loading dropdown options:', err);
      }

      // Load project info with all fields
      const { data: proj, error: projErr } = await supabase
        .from('project_dashboard')
        .select(
          `
          id, project_name, qbid, customer_name, manager, owner, 
          start_date, end_date, stage_id, stage_name, stage_order
        `
        )
        .eq('id', id)
        .single();

      if (projErr) {
        console.error('Project load error:', projErr);
      }

      // Load contract_amount separately from projects table
      let contractAmount = null;
      if (id) {
        const { data: projectData, error: contractErr } = await supabase
          .from('projects')
          .select('contract_amount')
          .eq('id', id)
          .single();

        if (!contractErr && projectData) {
          contractAmount = projectData.contract_amount;
        }
      }

      // Now we have proper stage_id and stage_order from the view
      const projectData = proj
        ? ({
            id: proj.id,
            name: proj.project_name,
            qbid: proj.qbid,
            customer_name: proj.customer_name,
            manager: proj.manager,
            owner: proj.owner,
            superintendent: null, // Not available in dashboard view
            foreman: null, // Not available in dashboard view
            start_date: proj.start_date,
            end_date: proj.end_date,
            contract_amount: contractAmount,
            stage: proj.stage_name,
            stage_id: proj.stage_id,
            stage_order: proj.stage_order,
          } as Project)
        : null;

      setProject(projectData);

      // Initialize edit form with current project data
      if (projectData) {
        setEditForm({
          name: projectData.name || '',
          qbid: projectData.qbid || '',
          customer_name: projectData.customer_name || '',
          manager: projectData.manager || '',
          owner: projectData.owner || '',
          start_date: projectData.start_date || '',
          end_date: projectData.end_date || '',
          stage_id: projectData.stage_id || '',
          contract_amount: projectData.contract_amount?.toString() || '',
        });
      }

      // SOV lines now handled in SOVSection

      // Tasks and subcontractors are now loaded within extracted components/hooks

      // Defer pay apps loading - not needed on initial page load
      // const { data: payAppsData, error: payAppsErr } = await supabase...
      // setPayApps((payAppsData ?? []) as PayApp[]);

      // Load only recent 20 comments initially (pagination optimization)
      const { data: commentsData, error: commentsErr } = await supabase
        .from('project_comments')
        .select(
          `
          id,
          project_id,
          user_id,
          comment_text,
          created_at,
          users (name, user_type)
        `
        )
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(20); // Only load 20 most recent comments

      if (commentsErr) {
        console.error('Comments load error:', commentsErr);
      } else {
        console.log('Raw comments data:', commentsData);
        console.log('Comments count:', commentsData?.length);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedComments = (commentsData ?? []).map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        user_id: c.user_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        user_name: c.users?.name || 'Unknown',
        user_type: c.users?.user_type || 'Unknown',
      }));
      console.log('Mapped comments:', mappedComments);
      setComments(mappedComments);

      setLoading(false);
    };

    load();
  }, [id]);

  // Removed task reload effect (handled in hook within StageProgressSection)

  // SOV loading moved into SOVSection

  const money = (n?: number | null) =>
    n == null
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const dateStr = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : '—';

  // Helper function to clean stage display (remove order number if present)
  const cleanStageName = (stageName: string | null | undefined) => {
    if (!stageName) return 'Not Set';
    if (stageName.includes('. ')) {
      return stageName.split('. ')[1]; // Return just the name part
    }
    return stageName;
  };

  // Totals computed inside SOVSection

  const nextStage = useMemo(() => {
    if (!project?.stage_order || !stages.length) return null;
    return stages.find((s) => s.order === project.stage_order! + 1);
  }, [project?.stage_order, stages]);

  const prevStage = useMemo(() => {
    if (!project?.stage_order || !stages.length) return null;
    return stages.find((s) => s.order === project.stage_order! - 1);
  }, [project?.stage_order, stages]);

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = () => {
    if (project) {
      setEditForm({
        name: project.name || '',
        qbid: project.qbid || '',
        customer_name: project.customer_name || '',
        manager: project.manager || '',
        owner: project.owner || '',
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
      // Get or create customer_id
      let customer_id = null;
      if (editForm.customer_name.trim()) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .ilike('name', editForm.customer_name.trim())
          .limit(1)
          .single();

        if (existingCustomer) {
          customer_id = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{ name: editForm.customer_name.trim() }])
            .select('id')
            .single();
          customer_id = newCustomer?.id;
        }
      }

      // Update project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        name: editForm.name.trim(),
        qbid: editForm.qbid.trim() || null,
        manager: editForm.manager.trim() || null,
        owner: editForm.owner.trim() || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        contract_amount: editForm.contract_amount.trim()
          ? parseFloat(editForm.contract_amount)
          : null,
      };

      if (customer_id) updatePayload.customer_id = customer_id;
      if (editForm.stage_id) updatePayload.stage_id = editForm.stage_id;

      const { error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', project.id);

      if (error) {
        console.error('Error updating project:', error);
        notify('Error updating project: ' + error.message, 'error');
        return;
      }

      // Reload project data
      const { data: updatedProj } = await supabase
        .from('project_dashboard')
        .select(
          'id, project_name, qbid, customer_name, manager, owner, start_date, end_date, stage_id, stage_name, stage_order'
        )
        .eq('id', project.id)
        .single();

      // Reload contract_amount separately
      let updatedContractAmount = null;
      const { data: contractData } = await supabase
        .from('projects')
        .select('contract_amount')
        .eq('id', project.id)
        .single();

      if (contractData) {
        updatedContractAmount = contractData.contract_amount;
      }

      if (updatedProj) {
        const updatedProjectData = {
          id: updatedProj.id,
          name: updatedProj.project_name,
          qbid: updatedProj.qbid,
          customer_name: updatedProj.customer_name,
          manager: updatedProj.manager,
          owner: updatedProj.owner,
          superintendent: null,
          foreman: null,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          contract_amount: updatedContractAmount,
          stage: updatedProj.stage_name,
          stage_id: updatedProj.stage_id,
          stage_order: updatedProj.stage_order,
        } as Project;

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
        .from('projects')
        .update({ stage_id: nextStage.id })
        .eq('id', project.id);

      if (error) {
        console.error('Error advancing stage:', error);
        notify('Error advancing stage: ' + error.message, 'error');
        return;
      }

      const { data: updatedProj } = await supabase
        .from('project_dashboard')
        .select(
          'id, project_name, qbid, customer_name, manager, owner, start_date, end_date, stage_id, stage_name, stage_order'
        )
        .eq('id', project.id)
        .single();

      if (updatedProj) {
        setProject({
          id: updatedProj.id,
          name: updatedProj.project_name,
          qbid: updatedProj.qbid,
          customer_name: updatedProj.customer_name,
          manager: updatedProj.manager,
          owner: updatedProj.owner,
          superintendent: null,
          foreman: null,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          stage: updatedProj.stage_name,
          stage_id: updatedProj.stage_id,
          stage_order: updatedProj.stage_order,
        } as Project);
        notify(`Advanced to ${updatedProj.stage_name}`, 'success');
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
        .from('projects')
        .update({ stage_id: prevStage.id })
        .eq('id', project.id);

      if (error) {
        console.error('Error going to previous stage:', error);
        notify('Error going to previous stage: ' + error.message, 'error');
        return;
      }

      const { data: updatedProj } = await supabase
        .from('project_dashboard')
        .select(
          'id, project_name, qbid, customer_name, manager, owner, start_date, end_date, stage_id, stage_name, stage_order'
        )
        .eq('id', project.id)
        .single();

      if (updatedProj) {
        setProject({
          id: updatedProj.id,
          name: updatedProj.project_name,
          qbid: updatedProj.qbid,
          customer_name: updatedProj.customer_name,
          manager: updatedProj.manager,
          owner: updatedProj.owner,
          superintendent: null,
          foreman: null,
          start_date: updatedProj.start_date,
          end_date: updatedProj.end_date,
          stage: updatedProj.stage_name,
          stage_id: updatedProj.stage_id,
          stage_order: updatedProj.stage_order,
        } as Project);
        notify(`Moved back to ${updatedProj.stage_name}`, 'success');
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
      {/* Header */}
      <div style={styles.headerStyle}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Link
            href="/projects"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: 14,
              marginBottom: 8,
              display: 'inline-block',
            }}
          >
            ← Back to Projects
          </Link>

          {loading ? (
            <p style={{ color: '#64748b' }}>Loading…</p>
          ) : !project ? (
            <p style={{ color: '#64748b' }}>Project not found.</p>
          ) : (
            <div>
              <h1 style={styles.titleStyle}>{project.name}</h1>
              <p style={styles.subtitleStyle}>
                {project.qbid ? `QBID: ${project.qbid}` : 'No QBID assigned'}
              </p>
            </div>
          )}
        </div>
      </div>

      {loading || !project ? null : (
        <div style={styles.contentWrapperStyle}>
          {/* 3-Column Layout: Project Info + Main Content + Comments */}
          <div style={styles.threeColumnLayoutStyle}>
            {/* Left Sidebar - Project Information (20%) */}
            <div style={styles.leftSidebarStyle}>
              <div style={styles.stickyContainerStyle}>
                {/* Project Information Card */}
                <div style={styles.projectInfoCardStyle}>
                  {/* Header with Edit/Save/Cancel Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '2px solid #2563eb',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        margin: 0,
                        color: '#0f172a',
                      }}
                    >
                      Project Information
                    </h2>
                    {!editMode ? (
                      <button
                        onClick={startEdit}
                        style={{
                          padding: '6px 8px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Edit project"
                        aria-label="Edit project"
                      >
                        <Pencil size={16} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          style={{
                            padding: '6px 12px',
                            background: '#6b7280',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          style={{
                            padding: '6px 12px',
                            background: '#4a5d23',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: saving ? 0.7 : 1,
                          }}
                        >
                          {saving ? (
                            'Saving…'
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Save size={16} />
                              Save
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Project Details / Edit Form */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {editMode && (
                      <div style={styles.editFormContainerStyle}>
                        {/* QBID */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>QBID</label>
                          <input
                            value={editForm.qbid}
                            onChange={(e) =>
                              handleEditChange('qbid', e.target.value)
                            }
                            style={styles.inputStyle}
                            placeholder="QBID"
                          />
                        </div>
                        {/* Project Name */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Project Name</label>
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              handleEditChange('name', e.target.value)
                            }
                            style={styles.inputStyle}
                            placeholder="Project Name"
                          />
                        </div>
                        {/* Contract Amount */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>
                            Contract Amount
                          </label>
                          <input
                            type="number"
                            value={editForm.contract_amount}
                            onChange={(e) =>
                              handleEditChange(
                                'contract_amount',
                                e.target.value
                              )
                            }
                            style={styles.inputStyle}
                            placeholder="0.00"
                          />
                        </div>
                        {/* Start Date */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Start Date</label>
                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) =>
                              handleEditChange('start_date', e.target.value)
                            }
                            style={styles.inputStyle}
                          />
                        </div>
                        {/* End Date */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Finish Date</label>
                          <input
                            type="date"
                            value={editForm.end_date}
                            onChange={(e) =>
                              handleEditChange('end_date', e.target.value)
                            }
                            style={styles.inputStyle}
                          />
                        </div>
                        {/* Customer Name (datalist) */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Customer</label>
                          <input
                            list="customer-options"
                            value={editForm.customer_name}
                            onChange={(e) =>
                              handleEditChange('customer_name', e.target.value)
                            }
                            style={styles.inputStyle}
                            placeholder="Customer Name"
                          />
                          <datalist id="customer-options">
                            {customerOptions.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
                        </div>
                        {/* Manager */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Manager</label>
                          <input
                            list="manager-options"
                            value={editForm.manager}
                            onChange={(e) =>
                              handleEditChange('manager', e.target.value)
                            }
                            style={styles.inputStyle}
                            placeholder="Manager"
                          />
                          <datalist id="manager-options">
                            {managerOptions.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                        {/* Superintendent (not editable yet) */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>
                            Superintendent
                          </label>
                          <input
                            value={project.superintendent || ''}
                            disabled
                            style={{
                              ...styles.inputStyle,
                              background: '#f8fafc',
                              color: '#64748b',
                            }}
                            placeholder="Not set"
                          />
                        </div>
                        {/* Owner */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Owner</label>
                          <input
                            list="owner-options"
                            value={editForm.owner}
                            onChange={(e) =>
                              handleEditChange('owner', e.target.value)
                            }
                            style={styles.inputStyle}
                            placeholder="Owner"
                          />
                          <datalist id="owner-options">
                            {ownerOptions.map((o) => (
                              <option key={o} value={o} />
                            ))}
                          </datalist>
                        </div>
                        {/* Foreman (not editable yet) */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Foreman</label>
                          <input
                            value={project.foreman || ''}
                            disabled
                            style={{
                              ...styles.inputStyle,
                              background: '#f8fafc',
                              color: '#64748b',
                            }}
                            placeholder="Not set"
                          />
                        </div>
                        {/* Stage */}
                        <div style={styles.formFieldStyle}>
                          <label style={styles.labelStyle}>Stage</label>
                          <select
                            value={editForm.stage_id}
                            onChange={(e) =>
                              handleEditChange('stage_id', e.target.value)
                            }
                            style={styles.inputStyle}
                          >
                            <option value="">Select Stage</option>
                            {stageOptions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.order}. {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {!editMode && (
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#6b7280',
                            marginBottom: 4,
                          }}
                        >
                          Contract Amount
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#0f172a',
                          }}
                        >
                          {money(project.contract_amount || 0)}
                        </p>
                      </div>
                    )}

                    {!editMode && (
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#6b7280',
                            marginBottom: 4,
                          }}
                        >
                          Start Date
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#0f172a',
                          }}
                        >
                          {dateStr(project.start_date)}
                        </p>
                      </div>
                    )}

                    {!editMode && (
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#6b7280',
                            marginBottom: 4,
                          }}
                        >
                          Finish Date
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#0f172a',
                          }}
                        >
                          {dateStr(project.end_date)}
                        </p>
                      </div>
                    )}

                    {!editMode && (
                      <div style={styles.sectionDividerStyle}>
                        <p style={styles.sectionTitleStyle}>Customer</p>
                        <DetailItem
                          label="Customer"
                          value={project.customer_name}
                        />
                        <div style={{ marginTop: 8 }}>
                          <DetailItem label="Manager" value={project.manager} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <DetailItem
                            label="Superintendent"
                            value={project.superintendent}
                          />
                        </div>
                      </div>
                    )}

                    {!editMode && (
                      <div style={styles.sectionDividerStyle}>
                        <p style={styles.sectionTitleStyle}>Team</p>
                        <DetailItem label="Owner" value={project.owner} />
                        <div style={{ marginTop: 8 }}>
                          <DetailItem label="Foreman" value={project.foreman} />
                        </div>
                      </div>
                    )}

                    {!editMode && (
                      <div style={styles.sectionDividerStyle}>
                        {/* Extracted Subcontractors Section */}
                        {id && <SubcontractorsSection projectId={id} />}
                      </div>
                    )}

                    {/* Project Status moved out of this card */}
                  </div>
                </div>{' '}
                {/* End Project Information Card */}
                {/* Separate Project Status Card moved to right sidebar above comments */}
              </div>
            </div>

            {/* Main Content - 55% */}
            <div style={styles.mainContentStyle}>
              {/* Tabs for Main Content */}
              <div style={styles.tabContainerStyle}>
                {(
                  [
                    { key: 'overview', label: 'Overview' },
                    { key: 'billing', label: 'Billing' },
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

              {activeTab === 'overview' && (
                <>
                  {/* Stage Progress moved to left sidebar; keeping main area focused on financials */}

                  {/* Financial Overview */}
                  <div style={styles.cardStyle}>
                    <h2 style={styles.sectionHeaderStyle}>
                      Financial Overview
                    </h2>

                    {/* Financial Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 24,
                      }}
                    >
                      {/* Revenue Column */}
                      <div>
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            margin: '0 0 16px 0',
                            color: '#0f172a',
                          }}
                        >
                          Revenue
                        </h3>
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Contract Amount
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(project?.contract_amount)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Change Orders
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Billings-to-date
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Retainage-to-date
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Remaining Billings
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                % Complete Revenue
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Gross Margin */}
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            margin: '32px 0 16px 0',
                            color: '#0f172a',
                          }}
                        >
                          Gross Margin
                        </h3>
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Contract GM%
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Change Order GM%
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Total GM %
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Unadjusted GM%
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Expected GM%
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Cost Column */}
                      <div>
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            margin: '0 0 16px 0',
                            color: '#0f172a',
                          }}
                        >
                          Cost
                        </h3>
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Contract Budget
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Change Order Cost Budget
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Total Contract Cost Budget
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Cost-to-date
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Remaining Cost
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                % Complete Cost
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Cash Flow */}
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            margin: '32px 0 16px 0',
                            color: '#0f172a',
                          }}
                        >
                          Cash Flow
                        </h3>
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Cash In
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Cash Out
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Net Cash Flow
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                {money(0)}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  color: '#475569',
                                }}
                              >
                                Cash Position (+/-)
                              </td>
                              <td
                                style={{
                                  padding: '8px 0',
                                  fontSize: 14,
                                  textAlign: 'right',
                                  fontWeight: 600,
                                }}
                              >
                                0%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Billing Tab with Sub-tabs */}
              {activeTab === 'billing' && (
                <>
                  {/* Sub-tabs for Billing */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 16,
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: 8,
                    }}
                  >
                    <button
                      onClick={() => setBillingSubTab('sov')}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom:
                          billingSubTab === 'sov'
                            ? '2px solid #2563eb'
                            : '2px solid transparent',
                        cursor: 'pointer',
                        fontWeight: billingSubTab === 'sov' ? 600 : 400,
                        fontSize: 14,
                        color: billingSubTab === 'sov' ? '#2563eb' : '#64748b',
                        marginBottom: -10,
                      }}
                    >
                      Schedule of Values
                    </button>
                    <button
                      onClick={() => setBillingSubTab('payapps')}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom:
                          billingSubTab === 'payapps'
                            ? '2px solid #2563eb'
                            : '2px solid transparent',
                        cursor: 'pointer',
                        fontWeight: billingSubTab === 'payapps' ? 600 : 400,
                        fontSize: 14,
                        color:
                          billingSubTab === 'payapps' ? '#2563eb' : '#64748b',
                        marginBottom: -10,
                      }}
                    >
                      Pay Applications
                    </button>
                  </div>

                  {/* SOV Sub-tab Content */}
                  {billingSubTab === 'sov' && id && (
                    <SOVSection projectId={id} />
                  )}

                  {/* Pay Apps Sub-tab Content */}
                  {billingSubTab === 'payapps' && id && (
                    <PayAppsSection projectId={id} />
                  )}
                </>
              )}
            </div>

            {/* Right Sidebar: Project Status above Comments */}
            <div style={styles.rightSidebarStyle}>
              {!editMode && (
                <div style={styles.statusCardStyle}>
                  <ProjectStatusBlock
                    project={project}
                    stages={stages}
                    advancing={advancing}
                    onAdvanceToNextStage={advanceToNextStage}
                    onGoToPreviousStage={goToPreviousStage}
                  />
                </div>
              )}
              {id && (
                <CommentsSection
                  comments={comments}
                  setComments={setComments}
                  currentUser={currentUser}
                  projectId={id}
                />
              )}
            </div>
          </div>
        </div>
      )}
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

const ModuleCard = ({
  title,
  description,
  color,
  onClick,
}: {
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      padding: 20,
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderLeft: `4px solid ${color}`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.borderLeftColor = color;
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color }}>{title}</h3>
    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
      {description}
    </p>
  </div>
);
