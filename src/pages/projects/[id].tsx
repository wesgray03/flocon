// pages/projects/[id].tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

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

type ProjectTask = {
  id: string;
  name: string;
  stage_id: string;
  complete: boolean;
  order_num: number;
};

type Subcontractor = {
  id: string;
  name: string;
};

type ProjectSubcontractor = {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  work_order_number: string | null;
  assigned_date: string | null;
  notes: string | null;
};

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
  const [currentTasks, setCurrentTasks] = useState<ProjectTask[]>([]);
  const [prevTasks, setPrevTasks] = useState<ProjectTask[]>([]);
  const [nextTasks, setNextTasks] = useState<ProjectTask[]>([]);
  const [projectSubcontractors, setProjectSubcontractors] = useState<
    ProjectSubcontractor[]
  >([]);
  const [allSubcontractors, setAllSubcontractors] = useState<Subcontractor[]>(
    []
  );
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);
  const [payApps, setPayApps] = useState<PayApp[]>([]);
  const [newSubcontractor, setNewSubcontractor] = useState({
    subcontractor_id: '',
    work_order_number: '',
    assigned_date: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sov'>('overview');
  const [sovLoaded, setSOVLoaded] = useState(false); // Track if SOV data is loaded

  // Comments state
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
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
  const [toast, setToast] = useState<
    | {
        message: string;
        type: 'success' | 'error' | 'info';
      }
    | null
  >(null);
  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    timeoutMs = 2500
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), timeoutMs);
  };

  const [newLine, setNewLine] = useState<{
    line_code: string;
    description: string;
    unit: string;
    quantity: string; // keep as string for the input, convert on submit
    unit_cost: string; // keep as string for the input, convert on submit
    category: 'Material' | 'Labor' | 'Other';
  }>({
    line_code: '',
    description: '',
    unit: 'EA',
    quantity: '',
    unit_cost: '',
    category: 'Material',
  });

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
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        if (userData) {
          setCurrentUser(userData as User);
        } else {
          console.warn('No user record found for authenticated user');
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

      // Don't load SOV lines on initial load - defer until SOV tab is opened
      // const { data: sov, error: sovErr } = await supabase...
      // setLines((sov ?? []) as SOVLine[]);

      // Load project tasks for current, previous, and next stages
      if (projectData?.stage_id && stagesList) {
        const currentStage = (stagesList as Stage[]).find(
          (s) => s.id === projectData.stage_id
        );

        if (currentStage) {
          const prevStage = (stagesList as Stage[]).find(
            (s) => s.order === currentStage.order - 1
          );
          const nextStage = (stagesList as Stage[]).find(
            (s) => s.order === currentStage.order + 1
          );

          // Load current stage tasks
          const { data: currentTasksData, error: currentErr } = await supabase
            .from('project_tasks')
            .select('id, name, stage_id, complete, order_num')
            .eq('stage_id', projectData.stage_id)
            .order('order_num', { ascending: true });

          if (currentErr)
            console.error('Current tasks load error:', currentErr);
          setCurrentTasks((currentTasksData ?? []) as ProjectTask[]);

          // Load previous stage tasks
          if (prevStage) {
            const { data: prevTasksData, error: prevErr } = await supabase
              .from('project_tasks')
              .select('id, name, stage_id, complete, order_num')
              .eq('stage_id', prevStage.id)
              .order('order_num', { ascending: true });

            if (prevErr) console.error('Previous tasks load error:', prevErr);
            setPrevTasks((prevTasksData ?? []) as ProjectTask[]);
          }

          // Load next stage tasks
          if (nextStage) {
            const { data: nextTasksData, error: nextErr } = await supabase
              .from('project_tasks')
              .select('id, name, stage_id, complete, order_num')
              .eq('stage_id', nextStage.id)
              .order('order_num', { ascending: true });

            if (nextErr) console.error('Next tasks load error:', nextErr);
            setNextTasks((nextTasksData ?? []) as ProjectTask[]);
          }
        }
      }

      // Load all subcontractors for dropdown
      const { data: subsData, error: subsErr } = await supabase
        .from('subcontractors')
        .select('id, name')
        .order('name', { ascending: true });

      if (subsErr) console.error('Subcontractors load error:', subsErr);
      setAllSubcontractors((subsData ?? []) as Subcontractor[]);

      // Load project subcontractor assignments
      const { data: projSubsData, error: projSubsErr } = await supabase
        .from('project_subcontractors')
        .select(
          `
          id,
          subcontractor_id,
          work_order_number,
          assigned_date,
          notes,
          subcontractors (name)
        `
        )
        .eq('project_id', id);

      if (projSubsErr)
        console.error('Project subcontractors load error:', projSubsErr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedProjectSubs = (projSubsData ?? []).map((ps: any) => ({
        id: ps.id,
        subcontractor_id: ps.subcontractor_id,
        subcontractor_name: ps.subcontractors?.name || 'Unknown',
        work_order_number: ps.work_order_number,
        assigned_date: ps.assigned_date,
        notes: ps.notes,
      }));
      setProjectSubcontractors(mappedProjectSubs);

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

      if (commentsErr) console.error('Comments load error:', commentsErr);

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
      setComments(mappedComments);

      setLoading(false);
    };

    load();
  }, [id]);

  // Reload tasks whenever the project stage changes
  useEffect(() => {
    if (!project?.stage_id || stages.length === 0) return;

    const loadTasks = async () => {
      const currentStage = stages.find((s) => s.id === project.stage_id);

      if (currentStage) {
        const prevStage = stages.find(
          (s) => s.order === currentStage.order - 1
        );
        const nextStage = stages.find(
          (s) => s.order === currentStage.order + 1
        );

        // Load current stage tasks
        const { data: currentTasksData, error: currentErr } = await supabase
          .from('project_tasks')
          .select('id, name, stage_id, complete, order_num')
          .eq('stage_id', project.stage_id)
          .order('order_num', { ascending: true });

        if (currentErr) console.error('Current tasks load error:', currentErr);
        setCurrentTasks((currentTasksData ?? []) as ProjectTask[]);

        // Load previous stage tasks
        if (prevStage) {
          const { data: prevTasksData, error: prevErr } = await supabase
            .from('project_tasks')
            .select('id, name, stage_id, complete, order_num')
            .eq('stage_id', prevStage.id)
            .order('order_num', { ascending: true });

          if (prevErr) console.error('Previous tasks load error:', prevErr);
          setPrevTasks((prevTasksData ?? []) as ProjectTask[]);
        } else {
          setPrevTasks([]);
        }

        // Load next stage tasks
        if (nextStage) {
          const { data: nextTasksData, error: nextErr } = await supabase
            .from('project_tasks')
            .select('id, name, stage_id, complete, order_num')
            .eq('stage_id', nextStage.id)
            .order('order_num', { ascending: true });

          if (nextErr) console.error('Next tasks load error:', nextErr);
          setNextTasks((nextTasksData ?? []) as ProjectTask[]);
        } else {
          setNextTasks([]);
        }
      }
    };

    loadTasks();
  }, [project?.stage_id, stages]);

  // Load SOV data when SOV tab is opened
  useEffect(() => {
    if (!id || activeTab !== 'sov' || sovLoaded) return;

    const loadSOV = async () => {
      const { data: sov, error: sovErr } = await supabase
        .from('sov_lines')
        .select(
          'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,retainage_percent,created_at'
        )
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      if (sovErr) console.error('SOV load error:', sovErr);
      else setLines((sov ?? []) as SOVLine[]);
      setSOVLoaded(true);
    };

    loadSOV();
  }, [id, activeTab, sovLoaded]);

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

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const ext = l.extended_cost ?? 0;
        const cat = (l.category ?? 'Material').toLowerCase();
        if (cat === 'labor') acc.labor += ext;
        else if (cat === 'other') acc.other += ext;
        else acc.materials += ext;
        acc.total += ext;
        return acc;
      },
      { materials: 0, labor: 0, other: 0, total: 0 }
    );
  }, [lines]);

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

  const advanceToNextStage = async () => {
    if (!project?.id || !nextStage?.id) return;
    setAdvancing(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ stage_id: nextStage.id })
        .eq('id', project.id);

      if (error) {
        console.error('Error advancing stage:', error);
        alert('Error advancing stage: ' + error.message);
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
      }
    } catch (err) {
      console.error('Unexpected error advancing stage:', err);
      alert('Unexpected error advancing stage');
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
        console.error('Error changing stage:', error);
        alert('Error changing stage: ' + error.message);
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
      }
    } catch (err) {
      console.error('Unexpected error changing stage:', err);
      alert('Unexpected error changing stage');
    } finally {
      setAdvancing(false);
    }
  };

  const handleAddSubcontractor = async () => {
    if (!id || !newSubcontractor.subcontractor_id) {
      alert('Please select a subcontractor');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_subcontractors')
        .insert({
          project_id: id,
          subcontractor_id: newSubcontractor.subcontractor_id,
          work_order_number: newSubcontractor.work_order_number || null,
          assigned_date: newSubcontractor.assigned_date || null,
          notes: newSubcontractor.notes || null,
        })
        .select(
          `
          id,
          subcontractor_id,
          work_order_number,
          assigned_date,
          notes,
          subcontractors (name)
        `
        )
        .single();

      if (error) {
        console.error('Error adding subcontractor:', error);
        alert('Error: ' + error.message);
        return;
      }

      const newProjectSub: ProjectSubcontractor = {
        id: data.id,
        subcontractor_id: data.subcontractor_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subcontractor_name: (data.subcontractors as any)?.name || 'Unknown',
        work_order_number: data.work_order_number,
        assigned_date: data.assigned_date,
        notes: data.notes,
      };

      setProjectSubcontractors([...projectSubcontractors, newProjectSub]);
      setShowAddSubcontractor(false);
      setNewSubcontractor({
        subcontractor_id: '',
        work_order_number: '',
        assigned_date: '',
        notes: '',
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error adding subcontractor');
    }
  };

  const handleRemoveSubcontractor = async (projectSubId: string) => {
    if (!confirm('Remove this subcontractor assignment?')) return;

    try {
      const { error } = await supabase
        .from('project_subcontractors')
        .delete()
        .eq('id', projectSubId);

      if (error) {
        console.error('Error removing subcontractor:', error);
        alert('Error: ' + error.message);
        return;
      }

      setProjectSubcontractors(
        projectSubcontractors.filter((ps) => ps.id !== projectSubId)
      );
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error removing subcontractor');
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim() || !currentUser) return;

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert({
          project_id: id,
          user_id: currentUser.id,
          comment_text: newComment.trim(),
        })
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
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
        return;
      }

      const newCommentObj: ProjectComment = {
        id: data.id,
        project_id: data.project_id,
        user_id: data.user_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user_name: (data.users as any)?.name || currentUser?.name || 'Unknown',
        user_type:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.users as any)?.user_type || currentUser?.user_type || 'Unknown',
      };

      setComments([newCommentObj, ...comments]);
      setNewComment('');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Unexpected error:', err);
      alert('Unexpected error adding comment');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        alert('Error deleting comment: ' + error.message);
        return;
      }

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error deleting comment');
    }
  };

  const addLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Basic validation
    if (!newLine.description.trim()) return;

    const qty = Number(newLine.quantity);
    const cost = Number(newLine.unit_cost);
    if (Number.isNaN(qty) || Number.isNaN(cost)) return;

    const payload = {
      project_id: id,
      line_code: newLine.line_code || null,
      description: newLine.description,
      division: null as string | null, // not collected in this simple form
      unit: newLine.unit || null,
      quantity: qty,
      unit_cost: cost,
      category: newLine.category,
    };

    const { data, error } = await supabase
      .from('sov_lines')
      .insert([payload])
      .select(
        'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,created_at'
      );

    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      // Append in display order (created_at asc); insert returns newest row, so place at end
      setLines((prev) => [...prev, ...(data as SOVLine[])]);
      setNewLine({
        line_code: '',
        description: '',
        unit: 'EA',
        quantity: '',
        unit_cost: '',
        category: 'Material',
      });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'system-ui',
      }}
    >
      {toast && <Toast message={toast.message} type={toast.type} />}
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
        }}
      >
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
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                  color: '#0f172a',
                }}
              >
                {project.name}
              </h1>
              <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 16 }}>
                {project.qbid ? `QBID: ${project.qbid}` : 'No QBID assigned'}
              </p>
            </div>
          )}
        </div>
      </div>

      {loading || !project ? null : (
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: 24 }}>
          {/* 3-Column Layout: Project Info + Main Content + Comments */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Left Sidebar - Project Information (20%) */}
            <div style={{ flex: '0 0 20%' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  position: 'sticky',
                  top: 24,
                }}
              >
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
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Project
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
                          background: '#16a34a',
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
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Details / Edit Form */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {editMode && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        background: '#f1f5f9',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {/* Contract Amount */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Contract Amount</label>
                        <input
                          type="number"
                          value={editForm.contract_amount}
                          onChange={(e) => handleEditChange('contract_amount', e.target.value)}
                          style={inputStyle}
                          placeholder="0.00"
                        />
                      </div>
                      {/* Start Date */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Start Date</label>
                        <input
                          type="date"
                          value={editForm.start_date}
                          onChange={(e) => handleEditChange('start_date', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      {/* End Date */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Finish Date</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={(e) => handleEditChange('end_date', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      {/* Customer Name (datalist) */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Customer</label>
                        <input
                          list="customer-options"
                          value={editForm.customer_name}
                          onChange={(e) => handleEditChange('customer_name', e.target.value)}
                          style={inputStyle}
                          placeholder="Customer Name"
                        />
                        <datalist id="customer-options">
                          {customerOptions.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                      {/* Manager */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Manager</label>
                        <input
                          list="manager-options"
                          value={editForm.manager}
                          onChange={(e) => handleEditChange('manager', e.target.value)}
                          style={inputStyle}
                          placeholder="Manager"
                        />
                        <datalist id="manager-options">
                          {managerOptions.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                      {/* Superintendent (not editable yet) */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Superintendent</label>
                        <input
                          value={project.superintendent || ''}
                          disabled
                          style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }}
                          placeholder="Not set"
                        />
                      </div>
                      {/* Owner */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Owner</label>
                        <input
                          list="owner-options"
                          value={editForm.owner}
                          onChange={(e) => handleEditChange('owner', e.target.value)}
                          style={inputStyle}
                          placeholder="Owner"
                        />
                        <datalist id="owner-options">
                          {ownerOptions.map((o) => (
                            <option key={o} value={o} />
                          ))}
                        </datalist>
                      </div>
                      {/* Foreman (not editable yet) */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Foreman</label>
                        <input
                          value={project.foreman || ''}
                          disabled
                          style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }}
                          placeholder="Not set"
                        />
                      </div>
                      {/* Stage */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Stage</label>
                        <select
                          value={editForm.stage_id}
                          onChange={(e) => handleEditChange('stage_id', e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select Stage</option>
                          {stageOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.order}. {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* QBID */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>QBID</label>
                        <input
                          value={editForm.qbid}
                          onChange={(e) => handleEditChange('qbid', e.target.value)}
                          style={inputStyle}
                          placeholder="QBID"
                        />
                      </div>
                      {/* Project Name */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Project Name</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          style={inputStyle}
                          placeholder="Project Name"
                        />
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
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: 16,
                      marginTop: 4,
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      Customer
                    </p>
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
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: 16,
                      marginTop: 4,
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      Team
                    </p>
                    <DetailItem label="Owner" value={project.owner} />
                    <div style={{ marginTop: 8 }}>
                      <DetailItem label="Foreman" value={project.foreman} />
                    </div>
                  </div>
                  )}

                  {!editMode && (
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: 16,
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        Subcontractors
                      </p>
                      <button
                        onClick={() => setShowAddSubcontractor(true)}
                        style={{
                          padding: '2px 8px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                    {projectSubcontractors.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: '#9ca3af',
                          fontStyle: 'italic',
                        }}
                      >
                        No subcontractors assigned
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {projectSubcontractors.map((ps) => (
                          <div
                            key={ps.id}
                            style={{
                              padding: 8,
                              background: '#f8fafc',
                              borderRadius: 4,
                              fontSize: 13,
                            }}
                          >
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>
                              {ps.subcontractor_name}
                            </div>
                            {ps.work_order_number && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#64748b',
                                  marginTop: 2,
                                }}
                              >
                                WO: {ps.work_order_number}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content - 55% */}
            <div style={{ flex: '0 0 55%' }}>
              {/* Stage Progress with Tasks */}
              <div style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <h2 style={{ ...sectionHeaderStyle, margin: 0 }}>
                    Project Status
                  </h2>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 16,
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 16,
                  }}
                >
                  {/* Previous Stage Column */}
                  <div
                    style={{
                      borderRight: '1px solid #e2e8f0',
                      paddingRight: 16,
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        Previous Stage
                      </p>
                      {prevStage ? (
                        <button
                          onClick={goToPreviousStage}
                          disabled={advancing}
                          style={{
                            margin: '4px 0 0',
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#6b7280',
                            background: 'transparent',
                            border: 'none',
                            cursor: advancing ? 'not-allowed' : 'pointer',
                            textDecoration: 'underline',
                            opacity: advancing ? 0.5 : 1,
                            padding: 0,
                          }}
                        >
                          {prevStage.order}. {prevStage.name}
                        </button>
                      ) : (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: 16,
                            color: '#9ca3af',
                          }}
                        >
                          —
                        </p>
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 13,
                          color: '#64748b',
                          fontStyle: 'italic',
                        }}
                      >
                        List Previous Stage Tasks (View Only)
                      </p>
                      {prevTasks.length === 0 ? (
                        <p
                          style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}
                        >
                          No tasks
                        </p>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {prevTasks.map((task) => (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 14,
                                color: '#64748b',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={task.complete}
                                disabled
                                style={{
                                  width: 16,
                                  height: 16,
                                  marginRight: 8,
                                  cursor: 'not-allowed',
                                  opacity: 0.6,
                                }}
                              />
                              <span
                                style={{
                                  textDecoration: task.complete
                                    ? 'line-through'
                                    : 'none',
                                }}
                              >
                                {task.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Stage Column */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      padding: 16,
                      borderRadius: 8,
                      border: '2px solid #86efac',
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: '#059669',
                          fontWeight: 600,
                        }}
                      >
                        Current Stage
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#059669',
                        }}
                      >
                        {project?.stage_order
                          ? `${project.stage_order}. ${cleanStageName(project.stage)}`
                          : cleanStageName(project.stage)}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 13,
                          color: '#059669',
                          fontWeight: 600,
                        }}
                      >
                        List Current Stage Tasks (Read/Write)
                      </p>
                      {currentTasks.length === 0 ? (
                        <p
                          style={{ margin: 0, fontSize: 14, color: '#16a34a' }}
                        >
                          No tasks
                        </p>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          {currentTasks.map((task) => (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: 8,
                                background: '#ffffff',
                                borderRadius: 4,
                                border: '1px solid #86efac',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={task.complete}
                                onChange={async () => {
                                  const { error } = await supabase
                                    .from('project_tasks')
                                    .update({ complete: !task.complete })
                                    .eq('id', task.id);

                                  if (error) {
                                    console.error(
                                      'Error updating task:',
                                      error
                                    );
                                  } else {
                                    setCurrentTasks(
                                      currentTasks.map((t) =>
                                        t.id === task.id
                                          ? { ...t, complete: !t.complete }
                                          : t
                                      )
                                    );
                                  }
                                }}
                                style={{
                                  width: 18,
                                  height: 18,
                                  marginRight: 10,
                                  cursor: 'pointer',
                                }}
                              />
                              <span
                                style={{
                                  flex: 1,
                                  color: task.complete ? '#16a34a' : '#0f172a',
                                  textDecoration: task.complete
                                    ? 'line-through'
                                    : 'none',
                                  fontSize: 14,
                                  fontWeight: 500,
                                }}
                              >
                                {task.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Stage Column */}
                  <div
                    style={{
                      borderLeft: '1px solid #e2e8f0',
                      paddingLeft: 16,
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        Next Stage
                      </p>
                      {nextStage ? (
                        <button
                          onClick={advanceToNextStage}
                          disabled={advancing}
                          style={{
                            margin: '4px 0 0',
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#0369a1',
                            background: 'transparent',
                            border: 'none',
                            cursor: advancing ? 'not-allowed' : 'pointer',
                            textDecoration: 'underline',
                            opacity: advancing ? 0.5 : 1,
                            padding: 0,
                          }}
                        >
                          {nextStage.order}. {nextStage.name}
                        </button>
                      ) : (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: 16,
                            color: '#9ca3af',
                          }}
                        >
                          Complete
                        </p>
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 13,
                          color: '#64748b',
                          fontStyle: 'italic',
                        }}
                      >
                        List Next Stage Tasks (View Only)
                      </p>
                      {nextTasks.length === 0 ? (
                        <p
                          style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}
                        >
                          No tasks
                        </p>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {nextTasks.map((task) => (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 14,
                                color: '#64748b',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={task.complete}
                                disabled
                                style={{
                                  width: 16,
                                  height: 16,
                                  marginRight: 8,
                                  cursor: 'not-allowed',
                                  opacity: 0.6,
                                }}
                              />
                              <span
                                style={{
                                  textDecoration: task.complete
                                    ? 'line-through'
                                    : 'none',
                                }}
                              >
                                {task.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Overview */}
              <div style={cardStyle}>
                <h2 style={sectionHeaderStyle}>Financial Overview</h2>

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

              {/* SOV Module - Only show when selected */}
              {activeTab === 'sov' && (
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                    }}
                  >
                    <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                      Schedule of Values
                    </h2>
                    <div style={{ fontSize: 14, color: '#334155' }}>
                      <b>Materials:</b> {money(totals.materials)} &nbsp;|&nbsp;{' '}
                      <b>Labor:</b> {money(totals.labor)} &nbsp;|&nbsp;{' '}
                      <b>Other:</b> {money(totals.other)} &nbsp;|&nbsp;{' '}
                      <b>Total:</b> {money(totals.total)}
                    </div>
                  </div>

                  {lines.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No SOV lines yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          fontSize: 14,
                          borderCollapse: 'collapse',
                        }}
                      >
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={thLeft}>Code</th>
                            <th style={thLeft}>Description</th>
                            <th style={thCenter}>Unit</th>
                            <th style={thRight}>Qty</th>
                            <th style={thRight}>Unit Cost</th>
                            <th style={thCenter}>Category</th>
                            <th style={thRight}>Extended</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line) => (
                            <tr key={line.id}>
                              <td style={tdLeft}>{line.line_code ?? '—'}</td>
                              <td style={tdLeft}>{line.description}</td>
                              <td style={tdCenter}>{line.unit ?? '—'}</td>
                              <td style={tdRight}>{line.quantity ?? 0}</td>
                              <td style={tdRight}>{money(line.unit_cost)}</td>
                              <td style={tdCenter}>{line.category ?? '—'}</td>
                              <td style={tdRight}>
                                {money(line.extended_cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <form onSubmit={addLine} style={{ marginTop: 24 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      Add New Line
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '120px 1fr 90px 100px 120px 140px 100px',
                        gap: 12,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Code"
                        value={newLine.line_code}
                        onChange={(e) =>
                          setNewLine((s) => ({
                            ...s,
                            line_code: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newLine.description}
                        onChange={(e) =>
                          setNewLine((s) => ({
                            ...s,
                            description: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={newLine.unit}
                        onChange={(e) =>
                          setNewLine((s) => ({ ...s, unit: e.target.value }))
                        }
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={newLine.quantity}
                        onChange={(e) =>
                          setNewLine((s) => ({
                            ...s,
                            quantity: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        placeholder="Unit Cost"
                        value={newLine.unit_cost}
                        onChange={(e) =>
                          setNewLine((s) => ({
                            ...s,
                            unit_cost: e.target.value,
                          }))
                        }
                        style={inputStyle}
                      />
                      <select
                        value={newLine.category}
                        onChange={(e) =>
                          setNewLine((s) => ({
                            ...s,
                            category: e.target.value as
                              | 'Material'
                              | 'Labor'
                              | 'Other',
                          }))
                        }
                        style={inputStyle}
                      >
                        <option>Material</option>
                        <option>Labor</option>
                        <option>Other</option>
                      </select>
                      <button
                        type="submit"
                        style={{
                          padding: '8px 16px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Comments Sidebar - 25% */}
            <div style={{ flex: '0 0 25%' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  position: 'sticky',
                  top: 24,
                  maxHeight: 'calc(100vh - 100px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    margin: '0 0 16px 0',
                    color: '#0f172a',
                    borderBottom: '2px solid #2563eb',
                    paddingBottom: 12,
                  }}
                >
                  Comments
                </h2>

                {/* Add Comment Form */}
                <div style={{ marginBottom: 20 }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    disabled={loadingComments}
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 12,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 14,
                      fontFamily: 'system-ui',
                      resize: 'vertical',
                      marginBottom: 8,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Ctrl+Enter to submit
                    </span>
                    <button
                      onClick={handleAddComment}
                      disabled={loadingComments || !newComment.trim()}
                      style={{
                        padding: '6px 16px',
                        background:
                          loadingComments || !newComment.trim()
                            ? '#94a3b8'
                            : '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 14,
                        cursor:
                          loadingComments || !newComment.trim()
                            ? 'not-allowed'
                            : 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {loadingComments ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {comments.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#94a3b8',
                        fontSize: 14,
                      }}
                    >
                      <p style={{ margin: 0 }}>No comments yet</p>
                      <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                        Be the first to add one!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          background: '#f8fafc',
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 4,
                              }}
                            >
                              {/* User Avatar */}
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background:
                                    comment.user_type === 'Owner'
                                      ? '#3b82f6'
                                      : comment.user_type === 'Admin'
                                        ? '#8b5cf6'
                                        : '#f97316',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 14,
                                  fontWeight: 600,
                                }}
                              >
                                {comment.user_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#0f172a',
                                  }}
                                >
                                  {comment.user_name}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 12,
                                    color: '#64748b',
                                  }}
                                >
                                  <span
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 500,
                                      background:
                                        comment.user_type === 'Owner'
                                          ? '#dbeafe'
                                          : comment.user_type === 'Admin'
                                            ? '#ede9fe'
                                            : '#fed7aa',
                                      color:
                                        comment.user_type === 'Owner'
                                          ? '#1e40af'
                                          : comment.user_type === 'Admin'
                                            ? '#5b21b6'
                                            : '#9a3412',
                                    }}
                                  >
                                    {comment.user_type}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                          {currentUser &&
                            comment.user_id === currentUser.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{
                                  padding: 4,
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: 18,
                                  lineHeight: 1,
                                }}
                                title="Delete comment"
                              >
                                ×
                              </button>
                            )}
                        </div>
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: 14,
                            color: '#334155',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {comment.comment_text}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: '#94a3b8',
                          }}
                        >
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
}) => (
  <div
    style={{
      position: 'fixed',
      right: 20,
      bottom: 20,
      background:
        type === 'success'
          ? '#10b981'
          : type === 'error'
            ? '#ef4444'
            : '#3b82f6',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: 8,
      boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
      fontSize: 14,
      zIndex: 9999,
      maxWidth: 320,
    }}
  >
    {message}
  </div>
);

const thBase: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
};
const thLeft: React.CSSProperties = { ...thBase, textAlign: 'left' };
const thCenter: React.CSSProperties = { ...thBase, textAlign: 'center' };
const thRight: React.CSSProperties = { ...thBase, textAlign: 'right' };

const tdBase: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
};
const tdLeft: React.CSSProperties = { ...tdBase, textAlign: 'left' };
const tdCenter: React.CSSProperties = { ...tdBase, textAlign: 'center' };
const tdRight: React.CSSProperties = { ...tdBase, textAlign: 'right' };

const inp: React.CSSProperties = {
  padding: 8,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
};

// Helper Components
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div>
    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
      {label}
    </p>
    <p style={{ margin: '2px 0 0', fontSize: 14, color: '#0f172a' }}>
      {value || '—'}
    </p>
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

// Styles
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  margin: '0 0 16px 0',
  color: '#0f172a',
};

const subsectionHeaderStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: '0 0 12px 0',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
};

// Label style for edit form inputs
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 4,
  letterSpacing: '.25px',
  textTransform: 'uppercase',
};
