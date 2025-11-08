// pages/billings/[projectId].tsx
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Project = {
  id: string;
  qbid: string | null;
  name: string;
  contract_amount?: number;
};

type SOVLine = {
  id: string;
  project_id: string;
  line_code: string | null;
  description: string;
  division: string | null;
  unit: string | null;
  quantity: number | null;
  unit_cost: number | null;
  extended_cost: number;
  category: string | null;
  retainage_percent: number;
  created_at: string;
};

type SOVLineProgress = {
  id?: string;
  pay_app_id?: string;
  sov_line_id: string;
  scheduled_value: number;
  previous_completed: number;
  current_completed: number;
  stored_materials: number;
  total_completed_and_stored?: number;
  percent_complete?: number;
  balance_to_finish?: number;
  retainage_amount?: number;
  retainage_percent: number;
};

type PayApp = {
  id: string;
  project_id: string;
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

export default function BillingsPage() {
  const router = useRouter();
  const rawId = router.query.projectId;
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [project, setProject] = useState<Project | null>(null);
  const [payApps, setPayApps] = useState<PayApp[]>([]);
  const [sovLines, setSovLines] = useState<SOVLine[]>([]);
  const [sovLineProgress, setSovLineProgress] = useState<SOVLineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSOVModal, setShowSOVModal] = useState(false);
  const [showContinuationSheet, setShowContinuationSheet] = useState(false);
  const [showG703S, setShowG703S] = useState(false);
  const [viewingPayApp, setViewingPayApp] = useState<PayApp | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPayApp, setEditingPayApp] = useState<PayApp | null>(null);
  const [editingSOVLine, setEditingSOVLine] = useState<SOVLine | null>(null);
  const [activeTab, setActiveTab] = useState<'payapps' | 'sov'>('payapps');

  const [form, setForm] = useState({
    pay_app_number: '',
    description: '',
    period_start: '',
    period_end: '',
    date_submitted: '',
    date_paid: '',
    status: 'Submitted',
  });

  const [sovForm, setSovForm] = useState({
    line_code: '',
    description: '',
    division: '',
    unit: 'EA',
    quantity: '',
    unit_cost: '',
    category: 'Material',
    retainage_percent: '5.00',
  });

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);

      // Load project info
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('id,qbid,name')
        .eq('id', projectId)
        .single();

      if (projErr) {
        console.error(projErr);
        setProject(null);
      } else {
        setProject(proj as Project);
      }

      // Load pay apps
      const { data: apps, error: appsErr } = await supabase
        .from('pay_apps')
        .select('*')
        .eq('project_id', projectId)
        .order('date_submitted', { ascending: false });

      if (appsErr) {
        console.error(appsErr);
        setPayApps([]);
      } else {
        setPayApps((apps ?? []) as PayApp[]);
      }

      // Load SOV lines
      const { data: sov, error: sovErr } = await supabase
        .from('sov_lines')
        .select('*')
        .eq('project_id', projectId)
        .order('line_code', { ascending: true });

      if (sovErr) {
        console.error(sovErr);
        setSovLines([]);
      } else {
        setSovLines((sov ?? []) as SOVLine[]);
      }

      setLoading(false);
    };

    load();
  }, [projectId]);

  // Close modal on Escape
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

  const totalAmount = useMemo(() => {
    return payApps.reduce((sum, app) => sum + (app.amount ?? 0), 0);
  }, [payApps]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = () => {
    setEditingPayApp(null);
    setForm({
      pay_app_number: '',
      description: '',
      period_start: '',
      period_end: '',
      date_submitted: new Date().toISOString().split('T')[0],
      date_paid: '',
      status: 'Submitted',
    });
    setShowModal(true);
  };

  const openForEdit = async (app: PayApp) => {
    setEditingPayApp(app);
    setForm({
      pay_app_number: app.pay_app_number || '',
      description: app.description,
      period_start: app.period_start || '',
      period_end: app.period_end || '',
      date_submitted: app.date_submitted || '',
      date_paid: app.date_paid || '',
      status: app.status || 'Submitted',
    });

    // Load existing continuation sheet data if editing
    if (app.id) {
      const { data: progressData } = await supabase
        .from('sov_line_progress')
        .select('*')
        .eq('pay_app_id', app.id);

      if (progressData && progressData.length > 0) {
        setSovLineProgress(progressData as SOVLineProgress[]);
      }
    }

    setShowModal(true);
  };

  const savePayApp = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return alert('Description is required');
    if (!projectId) return;

    setSaving(true);
    try {
      // Calculate AIA totals from continuation sheet line progress
      const totalScheduledValue = sovLineProgress.reduce(
        (sum, line) => sum + line.scheduled_value,
        0
      );
      const totalCompletedAndStored = sovLineProgress.reduce((sum, line) => {
        const currentTotal =
          line.previous_completed +
          line.current_completed +
          line.stored_materials;
        return sum + currentTotal;
      }, 0);
      const totalRetainage = sovLineProgress.reduce((sum, line) => {
        const currentTotal =
          line.previous_completed +
          line.current_completed +
          line.stored_materials;
        const retainage = currentTotal * (line.retainage_percent / 100);
        return sum + retainage;
      }, 0);
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;

      // Get previous payments from prior pay apps
      const previousPayments = payApps
        .filter(
          (app) =>
            form.pay_app_number &&
            app.pay_app_number !== null &&
            Number(app.pay_app_number) < Number(form.pay_app_number)
        )
        .reduce((sum, app) => sum + app.current_payment_due, 0);

      const currentPaymentDue = totalEarnedLessRetainage - previousPayments;
      const balanceToFinish = totalScheduledValue - totalCompletedAndStored;

      const payload = {
        project_id: projectId,
        pay_app_number: form.pay_app_number || null,
        description: form.description,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        date_submitted: form.date_submitted || null,
        date_paid: form.date_paid || null,
        status: form.status || 'Submitted',
        // AIA G703S calculated fields
        total_completed_and_stored: totalCompletedAndStored,
        retainage_completed_work: totalRetainage,
        retainage_stored_materials: 0,
        total_retainage: totalRetainage,
        total_earned_less_retainage: totalEarnedLessRetainage,
        previous_payments: previousPayments,
        current_payment_due: currentPaymentDue,
        balance_to_finish: balanceToFinish,
        amount: currentPaymentDue, // Backward compatibility
      };

      let payAppId: string | null = null;
      if (editingPayApp) {
        const { error: err } = await supabase
          .from('pay_apps')
          .update(payload)
          .eq('id', editingPayApp.id);
        if (err) throw err;
        payAppId = editingPayApp.id;
      } else {
        const { data, error: err } = await supabase
          .from('pay_apps')
          .insert([payload])
          .select('id')
          .single();
        if (err) throw err;
        payAppId = data?.id || null;
      }

      // Save continuation sheet line progress
      if (payAppId && sovLineProgress.length > 0) {
        for (const line of sovLineProgress) {
          const linePayload = {
            pay_app_id: payAppId,
            sov_line_id: line.sov_line_id,
            scheduled_value: line.scheduled_value,
            previous_completed: line.previous_completed,
            current_completed: line.current_completed,
            stored_materials: line.stored_materials,
            retainage_percent: line.retainage_percent,
          };

          if (line.id) {
            await supabase
              .from('sov_line_progress')
              .update(linePayload)
              .eq('id', line.id);
          } else {
            await supabase.from('sov_line_progress').insert([linePayload]);
          }
        }
      }

      setShowModal(false);
      setShowContinuationSheet(false);
      setSovLineProgress([]);
      // Reload pay apps
      const { data: apps } = await supabase
        .from('pay_apps')
        .select('*')
        .eq('project_id', projectId)
        .order('date_submitted', { ascending: false });
      setPayApps((apps ?? []) as PayApp[]);
    } catch (err) {
      console.error('Unexpected error saving pay app:', err);
      alert('Unexpected error saving pay app. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const deletePayApp = async (id: string) => {
    if (!confirm('Delete this pay application?')) return;

    const { error } = await supabase.from('pay_apps').delete().eq('id', id);

    if (error) {
      alert('Error deleting pay app: ' + error.message);
    } else {
      setPayApps((prev) => prev.filter((app) => app.id !== id));
    }
  };

  // SOV Line Management Functions
  const handleSOVChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSovForm((f) => ({ ...f, [name]: value }));
  };

  const openSOVForNew = () => {
    setEditingSOVLine(null);
    setSovForm({
      line_code: '',
      description: '',
      division: '',
      unit: 'EA',
      quantity: '',
      unit_cost: '',
      category: 'Material',
      retainage_percent: '5.00',
    });
    setShowSOVModal(true);
  };

  const openSOVForEdit = (line: SOVLine) => {
    setEditingSOVLine(line);
    setSovForm({
      line_code: line.line_code || '',
      description: line.description,
      division: line.division || '',
      unit: line.unit || 'EA',
      quantity: line.quantity?.toString() || '',
      unit_cost: line.unit_cost?.toString() || '',
      category: line.category || 'Material',
      retainage_percent: line.retainage_percent?.toString() || '5.00',
    });
    setShowSOVModal(true);
  };

  const saveSOVLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!sovForm.description.trim()) return alert('Description is required');
    if (!projectId) return;

    setSaving(true);
    try {
      const qty = Number(sovForm.quantity) || 0;
      const cost = Number(sovForm.unit_cost) || 0;

      const payload = {
        project_id: projectId,
        line_code: sovForm.line_code || null,
        description: sovForm.description,
        division: sovForm.division || null,
        unit: sovForm.unit || null,
        quantity: qty,
        unit_cost: cost,
        category: sovForm.category || null,
        retainage_percent: Number(sovForm.retainage_percent) || 5.0,
      };

      let error = null;
      if (editingSOVLine) {
        const { error: err } = await supabase
          .from('sov_lines')
          .update(payload)
          .eq('id', editingSOVLine.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('sov_lines')
          .insert([payload]);
        error = err;
      }

      if (error) {
        alert('Error saving SOV line: ' + error.message);
      } else {
        setShowSOVModal(false);
        // Reload SOV lines
        const { data: sov } = await supabase
          .from('sov_lines')
          .select('*')
          .eq('project_id', projectId)
          .order('line_code', { ascending: true });
        setSovLines((sov ?? []) as SOVLine[]);
      }
    } catch (err) {
      console.error('Unexpected error saving SOV line:', err);
      alert('Unexpected error saving SOV line. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSOVLine = async (id: string) => {
    if (!confirm('Delete this SOV line item?')) return;

    const { error } = await supabase.from('sov_lines').delete().eq('id', id);

    if (error) {
      alert('Error deleting SOV line: ' + error.message);
    } else {
      setSovLines((prev) => prev.filter((line) => line.id !== id));
    }
  };

  const sovTotal = useMemo(() => {
    return sovLines.reduce((sum, line) => sum + (line.extended_cost || 0), 0);
  }, [sovLines]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#f5f1ea',
        padding: 24,
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/projects"
          style={{ color: '#1e3a5f', textDecoration: 'none' }}
        >
          ← Back to Projects
        </Link>
      </div>

      {loading ? (
        <p style={{ color: '#475569' }}>Loading…</p>
      ) : !project ? (
        <p style={{ color: '#475569' }}>Project not found.</p>
      ) : (
        <>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5dfd5',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              Billings / Pay Applications
            </h1>
            <p style={{ color: '#475569', marginBottom: 4 }}>
              Project: <strong>{project.name}</strong>
            </p>
            {project.qbid && (
              <p style={{ color: '#475569', marginBottom: 0 }}>
                QBID: {project.qbid}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5dfd5',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              padding: '12px 16px 0',
              marginBottom: -1,
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              onClick={() => setActiveTab('sov')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'sov' ? '#fff' : 'transparent',
                border:
                  activeTab === 'sov'
                    ? '1px solid #e5dfd5'
                    : '1px solid transparent',
                borderBottom:
                  activeTab === 'sov'
                    ? '1px solid #fff'
                    : '1px solid transparent',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                cursor: 'pointer',
                fontWeight: activeTab === 'sov' ? 600 : 400,
                fontSize: 14,
                color: activeTab === 'sov' ? '#0f172a' : '#64748b',
                marginBottom: -1,
                position: 'relative',
                bottom: -1,
              }}
            >
              Schedule of Values ({sovLines.length})
            </button>
            <button
              onClick={() => setActiveTab('payapps')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'payapps' ? '#fff' : 'transparent',
                border:
                  activeTab === 'payapps'
                    ? '1px solid #e5dfd5'
                    : '1px solid transparent',
                borderBottom:
                  activeTab === 'payapps'
                    ? '1px solid #fff'
                    : '1px solid transparent',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                cursor: 'pointer',
                fontWeight: activeTab === 'payapps' ? 600 : 400,
                fontSize: 14,
                color: activeTab === 'payapps' ? '#0f172a' : '#64748b',
                marginBottom: -1,
                position: 'relative',
                bottom: -1,
              }}
            >
              Pay Applications ({payApps.length})
            </button>
          </div>

          {/* SOV Tab */}
          {activeTab === 'sov' && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5dfd5',
                borderRadius: 12,
                borderTopLeftRadius: 0,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                    Schedule of Values
                  </h2>
                  <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                    Total Contract Amount: {money(sovTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openSOVForNew}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  + Add SOV Line
                </button>
              </div>

              {sovLines.length === 0 ? (
                <div
                  style={{
                    padding: 48,
                    textAlign: 'center',
                    background: '#faf8f5',
                    borderRadius: 8,
                    border: '2px dashed #e5dfd5',
                  }}
                >
                  <p
                    style={{
                      color: '#64748b',
                      fontSize: 16,
                      margin: '0 0 8px',
                    }}
                  >
                    No SOV line items yet
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
                    Add line items to build your Schedule of Values before
                    creating pay applications
                  </p>
                </div>
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
                      <tr style={{ background: '#f0ebe3' }}>
                        <th style={th}>Item</th>
                        <th style={th}>Description</th>
                        <th style={th}>Division</th>
                        <th style={th}>Unit</th>
                        <th style={thRight}>Quantity</th>
                        <th style={thRight}>Unit Cost</th>
                        <th style={thRight}>Extended Cost</th>
                        <th style={th}>Category</th>
                        <th style={thRight}>Retainage %</th>
                        <th style={thCenter}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sovLines.map((line) => (
                        <tr key={line.id}>
                          <td style={td}>
                            <span style={{ fontWeight: 600 }}>
                              {line.line_code || '—'}
                            </span>
                          </td>
                          <td style={td}>{line.description}</td>
                          <td style={td}>{line.division || '—'}</td>
                          <td style={td}>{line.unit || '—'}</td>
                          <td style={tdRight}>
                            {line.quantity?.toLocaleString() || '—'}
                          </td>
                          <td style={tdRight}>{money(line.unit_cost)}</td>
                          <td style={tdRight}>
                            <strong>{money(line.extended_cost)}</strong>
                          </td>
                          <td style={td}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 12,
                                background:
                                  line.category === 'Labor'
                                    ? '#e8f0d4'
                                    : line.category === 'Other'
                                      ? '#ebe5db'
                                      : '#e8f0d4',
                                color:
                                  line.category === 'Labor'
                                    ? '#1e40af'
                                    : line.category === 'Other'
                                      ? '#92400e'
                                      : '#166534',
                              }}
                            >
                              {line.category || 'Material'}
                            </span>
                          </td>
                          <td style={tdRight}>{line.retainage_percent}%</td>
                          <td style={tdCenter}>
                            <button
                              type="button"
                              onClick={() => openSOVForEdit(line)}
                              style={{
                                ...btnSmall,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Edit line"
                              aria-label="Edit line"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSOVLine(line.id)}
                              style={{
                                ...btnSmall,
                                marginLeft: 6,
                                background: '#fee2e2',
                                color: '#991b1b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete line"
                              aria-label="Delete line"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#faf8f5', fontWeight: 700 }}>
                        <td
                          colSpan={6}
                          style={{ padding: 12, textAlign: 'right' }}
                        >
                          TOTAL CONTRACT AMOUNT:
                        </td>
                        <td
                          style={{
                            padding: 12,
                            textAlign: 'right',
                            fontSize: 16,
                            color: '#0f172a',
                          }}
                        >
                          {money(sovTotal)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pay Apps Tab */}
          {activeTab === 'payapps' && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5dfd5',
                borderRadius: 12,
                borderTopLeftRadius: 0,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                    Pay Applications ({payApps.length})
                  </h2>
                  <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                    Total Billed: {money(totalAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openForNew}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  + New Pay App
                </button>
              </div>

              {payApps.length === 0 ? (
                <p
                  style={{ color: '#475569', textAlign: 'center', padding: 24 }}
                >
                  No pay applications yet. Click "+ New Pay App" to add one.
                </p>
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
                      <tr style={{ background: '#f0ebe3' }}>
                        <th style={th}>App #</th>
                        <th style={th}>Description</th>
                        <th style={th}>Period</th>
                        <th style={thRight}>Total Completed</th>
                        <th style={thRight}>Total Retainage</th>
                        <th style={thRight}>Current Payment</th>
                        <th style={th}>Date Submitted</th>
                        <th style={th}>Status</th>
                        <th style={thCenter}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payApps.map((app) => (
                        <tr key={app.id}>
                          <td style={td}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {app.pay_app_number ?? '—'}
                            </span>
                          </td>
                          <td style={td}>{app.description}</td>
                          <td style={td}>
                            {app.period_start && app.period_end
                              ? `${dateStr(app.period_start)} - ${dateStr(app.period_end)}`
                              : '—'}
                          </td>
                          <td style={tdRight}>
                            {money(app.total_completed_and_stored || 0)}
                          </td>
                          <td style={tdRight}>
                            <span style={{ color: '#dc2626' }}>
                              {money(app.total_retainage || 0)}
                            </span>
                          </td>
                          <td style={tdRight}>
                            <strong style={{ color: '#1e3a5f', fontSize: 15 }}>
                              {money(
                                app.current_payment_due || app.amount || 0
                              )}
                            </strong>
                          </td>
                          <td style={td}>{dateStr(app.date_submitted)}</td>
                          <td style={td}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                background:
                                  app.status === 'Paid'
                                    ? '#e8f0d4'
                                    : app.status === 'Rejected'
                                      ? '#fee2e2'
                                      : '#ebe5db',
                                border:
                                  app.status === 'Paid'
                                    ? '1px solid #a8c070'
                                    : app.status === 'Rejected'
                                      ? '1px solid #f5c2c7'
                                      : '1px solid #fde68a',
                                color:
                                  app.status === 'Paid'
                                    ? '#4a5d23'
                                    : app.status === 'Rejected'
                                      ? '#991b1b'
                                      : '#854d0e',
                              }}
                            >
                              {app.status ?? 'Submitted'}
                            </span>
                          </td>
                          <td style={tdCenter}>
                            <button
                              type="button"
                              onClick={async () => {
                                setViewingPayApp(app);
                                const { data: progressData } = await supabase
                                  .from('sov_line_progress')
                                  .select('*')
                                  .eq('pay_app_id', app.id);

                                if (progressData) {
                                  setSovLineProgress(
                                    progressData as SOVLineProgress[]
                                  );
                                }
                                setShowG703S(true);
                              }}
                              style={{
                                ...btnSmall,
                                background: '#1e3a5f',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="View G702/G703"
                              aria-label="View G702/G703"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openForEdit(app)}
                              style={{
                                ...btnSmall,
                                marginLeft: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePayApp(app.id)}
                              style={{
                                ...btnSmall,
                                marginLeft: 6,
                                background: '#fee2e2',
                                color: '#991b1b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SOV Line Modal */}
      {showSOVModal && (
        <div style={overlay}>
          <div
            style={{ ...modal, maxWidth: 700 }}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              {editingSOVLine ? 'Edit SOV Line Item' : 'New SOV Line Item'}
            </h2>
            <form onSubmit={saveSOVLine}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 3fr',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <input
                  name="line_code"
                  placeholder="Item #"
                  value={sovForm.line_code}
                  onChange={handleSOVChange}
                  style={input}
                />
                <input
                  name="description"
                  placeholder="Description *"
                  value={sovForm.description}
                  onChange={handleSOVChange}
                  style={input}
                  required
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <input
                  name="division"
                  placeholder="Division"
                  value={sovForm.division}
                  onChange={handleSOVChange}
                  style={input}
                />
                <select
                  name="unit"
                  value={sovForm.unit}
                  onChange={handleSOVChange}
                  style={input}
                >
                  <option value="EA">EA</option>
                  <option value="SF">SF</option>
                  <option value="LF">LF</option>
                  <option value="SY">SY</option>
                  <option value="LS">LS</option>
                  <option value="HR">HR</option>
                </select>
                <select
                  name="category"
                  value={sovForm.category}
                  onChange={handleSOVChange}
                  style={input}
                >
                  <option value="Material">Material</option>
                  <option value="Labor">Labor</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={sovForm.quantity}
                    onChange={handleSOVChange}
                    style={input}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unit Cost</label>
                  <input
                    name="unit_cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={sovForm.unit_cost}
                    onChange={handleSOVChange}
                    style={input}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Retainage %</label>
                  <input
                    name="retainage_percent"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={sovForm.retainage_percent}
                    onChange={handleSOVChange}
                    style={input}
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#faf8f5',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <strong>Extended Cost:</strong>{' '}
                {money(
                  (Number(sovForm.quantity) || 0) *
                    (Number(sovForm.unit_cost) || 0)
                )}
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
                  onClick={() => setShowSOVModal(false)}
                  style={btnCancel}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnSave}>
                  {saving ? 'Saving…' : editingSOVLine ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay}>
          <div
            style={{ ...modal, maxWidth: 800 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payapp-modal-title"
          >
            <h2
              id="payapp-modal-title"
              style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}
            >
              {editingPayApp ? 'Edit Pay Application' : 'New Pay Application'}
            </h2>
            <form onSubmit={savePayApp}>
              {/* Basic Information */}
              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 12,
                    color: '#0f172a',
                  }}
                >
                  Basic Information
                </h3>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr',
                      gap: 12,
                    }}
                  >
                    <input
                      name="pay_app_number"
                      placeholder="App Number *"
                      value={form.pay_app_number}
                      onChange={handleChange}
                      style={input}
                      required
                    />
                    <input
                      name="description"
                      placeholder="Description *"
                      value={form.description}
                      onChange={handleChange}
                      style={input}
                      required
                    />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      >
                        Period Start
                      </label>
                      <input
                        name="period_start"
                        type="date"
                        value={form.period_start}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      >
                        Period End
                      </label>
                      <input
                        name="period_end"
                        type="date"
                        value={form.period_end}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      >
                        Date Submitted
                      </label>
                      <input
                        name="date_submitted"
                        type="date"
                        value={form.date_submitted}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      >
                        Date Paid
                      </label>
                      <input
                        name="date_paid"
                        type="date"
                        value={form.date_paid}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      >
                        Status
                      </label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        style={input}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continuation Sheet Button */}
              <div
                style={{
                  background: '#faf8f5',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid #e5dfd5',
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
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Continuation Sheet (Schedule of Values Progress)
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      // Load SOV lines and prepare continuation sheet
                      if (sovLines.length === 0) {
                        alert('Please add Schedule of Values line items first');
                        return;
                      }

                      // Find the most recent previous pay app
                      // If editing, use that pay app number; otherwise use entered number or find the highest
                      let currentPayAppNum = 0;
                      if (editingPayApp?.pay_app_number) {
                        currentPayAppNum = Number(editingPayApp.pay_app_number);
                      } else if (form.pay_app_number) {
                        currentPayAppNum = Number(form.pay_app_number);
                      } else {
                        // If no pay app number entered yet, find the next number
                        const maxNum = Math.max(
                          0,
                          ...payApps.map((app) =>
                            Number(app.pay_app_number || 0)
                          )
                        );
                        currentPayAppNum = maxNum + 1;
                      }

                      console.log('Current pay app number:', currentPayAppNum);
                      console.log(
                        'Available pay apps:',
                        payApps.map((a) => ({
                          id: a.id,
                          num: a.pay_app_number,
                        }))
                      );

                      const previousPayApps = payApps
                        .filter(
                          (app) =>
                            app.pay_app_number !== null &&
                            Number(app.pay_app_number) < currentPayAppNum
                        )
                        .sort(
                          (a, b) =>
                            Number(b.pay_app_number || 0) -
                            Number(a.pay_app_number || 0)
                        );

                      console.log(
                        'Previous pay apps found:',
                        previousPayApps.map((a) => ({
                          id: a.id,
                          num: a.pay_app_number,
                        }))
                      );

                      const previousPayApp = previousPayApps[0];

                      // Load previous pay app's continuation sheet data
                      let previousProgressMap = new Map<string, number>();
                      if (previousPayApp) {
                        console.log(
                          'Loading progress from pay app:',
                          previousPayApp.id,
                          previousPayApp.pay_app_number
                        );
                        const { data: prevProgress } = await supabase
                          .from('sov_line_progress')
                          .select(
                            'sov_line_id, previous_completed, current_completed, stored_materials'
                          )
                          .eq('pay_app_id', previousPayApp.id);

                        console.log('Previous progress data:', prevProgress);

                        if (prevProgress) {
                          prevProgress.forEach((line) => {
                            // Previous app's "Total to Date" becomes this app's "Previous Completed"
                            const totalToDate =
                              line.previous_completed +
                              line.current_completed +
                              line.stored_materials;
                            previousProgressMap.set(
                              line.sov_line_id,
                              totalToDate
                            );
                          });
                        }
                      } else {
                        console.log('No previous pay app found');
                      }

                      // Initialize continuation sheet with SOV lines
                      const initialProgress: SOVLineProgress[] = sovLines.map(
                        (sovLine) => {
                          const prevCompleted =
                            previousProgressMap.get(sovLine.id) || 0;
                          console.log(
                            `Line ${sovLine.line_code}: previous = ${prevCompleted}`
                          );
                          return {
                            id: undefined,
                            pay_app_id: editingPayApp?.id || '',
                            sov_line_id: sovLine.id,
                            scheduled_value:
                              (sovLine.quantity || 0) *
                              (sovLine.unit_cost || 0),
                            previous_completed: prevCompleted,
                            current_completed: 0,
                            stored_materials: 0,
                            retainage_percent: sovLine.retainage_percent || 5,
                          };
                        }
                      );
                      setSovLineProgress(initialProgress);
                      setShowContinuationSheet(true);
                    }}
                    style={{
                      background: '#1e3a5f',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Fill Continuation Sheet
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  {sovLineProgress.length > 0
                    ? `${sovLineProgress.length} line items entered`
                    : 'Click to enter work completed this period for each SOV line item'}
                </p>
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
                  style={btnCancel}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnSave}>
                  {saving ? 'Saving…' : editingPayApp ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Continuation Sheet Modal */}
      {showContinuationSheet && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 1200 }}>
            <h2 style={{ fontSize: 20, marginBottom: 8, fontWeight: 600 }}>
              Continuation Sheet - Work Completed This Period
            </h2>
            <p
              style={{
                fontSize: 13,
                color: '#64748b',
                marginBottom: 16,
                fontStyle: 'italic',
              }}
            >
              "Previous (D)" is auto-filled from the prior pay application's
              totals. "Remaining" shows work left to complete (Scheduled Value -
              Previous). Enter "This Period (E)" and "Materials (F)" for each
              line item.
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table
                style={{
                  width: '100%',
                  fontSize: 13,
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ background: '#faf8f5' }}>
                    <th style={th}>Item</th>
                    <th style={th}>Description</th>
                    <th style={thRight}>Scheduled Value (C)</th>
                    <th style={thRight}>Previous (D)</th>
                    <th style={thRight}>Remaining</th>
                    <th style={thRight}>This Period (E)</th>
                    <th style={thRight}>Materials (F)</th>
                    <th style={thRight}>Total (G)</th>
                    <th style={thRight}>% (G/C)</th>
                    <th style={thRight}>Balance (H)</th>
                    <th style={thRight}>Retainage</th>
                  </tr>
                </thead>
                <tbody>
                  {sovLineProgress.map((line, idx) => {
                    const sovLine = sovLines.find(
                      (s) => s.id === line.sov_line_id
                    );
                    const totalCompleted =
                      line.previous_completed +
                      line.current_completed +
                      line.stored_materials;
                    const remaining =
                      line.scheduled_value - line.previous_completed;
                    const percentComplete =
                      line.scheduled_value > 0
                        ? (totalCompleted / line.scheduled_value) * 100
                        : 0;
                    const balance = line.scheduled_value - totalCompleted;
                    const retainage =
                      totalCompleted * (line.retainage_percent / 100);

                    return (
                      <tr key={idx}>
                        <td style={td}>{sovLine?.line_code || '-'}</td>
                        <td style={td}>{sovLine?.description || '-'}</td>
                        <td style={tdRight}>
                          ${line.scheduled_value.toLocaleString()}
                        </td>
                        <td style={tdRight}>
                          <input
                            type="number"
                            value={line.previous_completed}
                            readOnly
                            disabled
                            style={{
                              ...input,
                              width: 100,
                              textAlign: 'right',
                              background: '#faf8f5',
                              color: '#64748b',
                              cursor: 'not-allowed',
                            }}
                            title="Auto-filled from previous pay application"
                          />
                        </td>
                        <td style={tdRight}>
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>
                            ${remaining.toLocaleString()}
                          </span>
                        </td>
                        <td style={tdRight}>
                          <input
                            type="number"
                            value={line.current_completed}
                            onChange={(e) => {
                              const updated = [...sovLineProgress];
                              updated[idx].current_completed =
                                Number(e.target.value) || 0;
                              setSovLineProgress(updated);
                            }}
                            style={{ ...input, width: 100, textAlign: 'right' }}
                          />
                        </td>
                        <td style={tdRight}>
                          <input
                            type="number"
                            value={line.stored_materials}
                            onChange={(e) => {
                              const updated = [...sovLineProgress];
                              updated[idx].stored_materials =
                                Number(e.target.value) || 0;
                              setSovLineProgress(updated);
                            }}
                            style={{ ...input, width: 100, textAlign: 'right' }}
                          />
                        </td>
                        <td style={tdRight}>
                          ${totalCompleted.toLocaleString()}
                        </td>
                        <td style={tdRight}>{percentComplete.toFixed(1)}%</td>
                        <td style={tdRight}>${balance.toLocaleString()}</td>
                        <td style={tdRight}>${retainage.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Preview */}
            <div
              style={{
                background: '#faf8f5',
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Payment Summary Preview
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div>Total Completed & Stored:</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  $
                  {sovLineProgress
                    .reduce(
                      (sum, line) =>
                        sum +
                        line.previous_completed +
                        line.current_completed +
                        line.stored_materials,
                      0
                    )
                    .toLocaleString()}
                </div>
                <div>Total Retainage:</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  $
                  {sovLineProgress
                    .reduce((sum, line) => {
                      const total =
                        line.previous_completed +
                        line.current_completed +
                        line.stored_materials;
                      return sum + total * (line.retainage_percent / 100);
                    }, 0)
                    .toLocaleString()}
                </div>
                <div>Current Payment Due:</div>
                <div
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#1e3a5f',
                  }}
                >
                  $
                  {(() => {
                    const totalCompleted = sovLineProgress.reduce(
                      (sum, line) =>
                        sum +
                        line.previous_completed +
                        line.current_completed +
                        line.stored_materials,
                      0
                    );
                    const totalRetainage = sovLineProgress.reduce(
                      (sum, line) => {
                        const total =
                          line.previous_completed +
                          line.current_completed +
                          line.stored_materials;
                        return sum + total * (line.retainage_percent / 100);
                      },
                      0
                    );
                    const previous = payApps
                      .filter(
                        (app) =>
                          form.pay_app_number &&
                          app.pay_app_number &&
                          Number(app.pay_app_number) <
                            Number(form.pay_app_number)
                      )
                      .reduce((sum, app) => sum + app.current_payment_due, 0);
                    return (
                      totalCompleted -
                      totalRetainage -
                      previous
                    ).toLocaleString();
                  })()}
                </div>
              </div>
            </div>

            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowContinuationSheet(false);
                  setSovLineProgress([]);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5dfd5',
                  background: 'white',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowContinuationSheet(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Done - Use These Values
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIA G703S Modal */}
      {showG703S && viewingPayApp && (
        <div style={overlay}>
          <div
            style={{
              ...modal,
              maxWidth: 1400,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                AIA G703S - Application for Payment
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowG703S(false);
                  setViewingPayApp(null);
                  setSovLineProgress([]);
                }}
                style={{
                  background: '#e5dfd5',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  fontSize: 14,
                }}
              >
                Close
              </button>
            </div>

            {/* Application Summary */}
            <div
              style={{
                background: '#faf8f5',
                padding: 20,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                APPLICATION FOR PAYMENT
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <div>Application No:</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  {viewingPayApp.pay_app_number || '—'}
                </div>

                <div>Period:</div>
                <div style={{ textAlign: 'right' }}>
                  {viewingPayApp.period_start && viewingPayApp.period_end
                    ? `${dateStr(viewingPayApp.period_start)} - ${dateStr(viewingPayApp.period_end)}`
                    : '—'}
                </div>

                <div>Date Submitted:</div>
                <div style={{ textAlign: 'right' }}>
                  {dateStr(viewingPayApp.date_submitted)}
                </div>
              </div>

              <div
                style={{
                  borderTop: '2px solid #cbd5e1',
                  marginTop: 16,
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    1. Original Contract Sum
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    {money(project?.contract_amount || 0)}
                  </div>

                  <div style={{ paddingLeft: 16 }}>
                    2. Net Change by Change Orders
                  </div>
                  <div style={{ textAlign: 'right' }}>{money(0)}</div>

                  <div style={{ fontWeight: 600 }}>
                    3. Contract Sum to Date (Line 1 ± 2)
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    {money(project?.contract_amount || 0)}
                  </div>

                  <div style={{ fontWeight: 600 }}>
                    4. Total Completed & Stored to Date
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    {money(viewingPayApp.total_completed_and_stored || 0)}
                  </div>

                  <div style={{ paddingLeft: 16 }}>
                    5a. Retainage (5% of Work Completed)
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {money(viewingPayApp.retainage_completed_work || 0)}
                  </div>

                  <div style={{ paddingLeft: 16 }}>
                    5b. Retainage (5% of Stored Materials)
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {money(viewingPayApp.retainage_stored_materials || 0)}
                  </div>

                  <div style={{ fontWeight: 600 }}>5. Total Retainage</div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#dc2626',
                    }}
                  >
                    {money(viewingPayApp.total_retainage || 0)}
                  </div>

                  <div style={{ fontWeight: 600 }}>
                    6. Total Earned Less Retainage (Line 4 - Line 5)
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    {money(viewingPayApp.total_earned_less_retainage || 0)}
                  </div>

                  <div>7. Less Previous Certificates for Payment</div>
                  <div style={{ textAlign: 'right' }}>
                    {money(viewingPayApp.previous_payments || 0)}
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: '#1e3a5f',
                      paddingTop: 8,
                      borderTop: '2px solid #cbd5e1',
                    }}
                  >
                    8. CURRENT PAYMENT DUE
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: 16,
                      color: '#1e3a5f',
                      paddingTop: 8,
                      borderTop: '2px solid #cbd5e1',
                    }}
                  >
                    {money(viewingPayApp.current_payment_due || 0)}
                  </div>

                  <div>9. Balance to Finish (Line 3 - Line 4)</div>
                  <div style={{ textAlign: 'right' }}>
                    {money(viewingPayApp.balance_to_finish || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Continuation Sheet */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                CONTINUATION SHEET - Schedule of Values
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    fontSize: 13,
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f0ebe3' }}>
                      <th style={th}>Item</th>
                      <th style={th}>Description</th>
                      <th style={thRight}>Scheduled Value (C)</th>
                      <th style={thRight}>Previous (D)</th>
                      <th style={thRight}>Remaining</th>
                      <th style={thRight}>This Period (E)</th>
                      <th style={thRight}>Materials (F)</th>
                      <th style={thRight}>Total to Date (G)</th>
                      <th style={thRight}>% (G/C)</th>
                      <th style={thRight}>Balance (H)</th>
                      <th style={thRight}>Retainage (I)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sovLineProgress.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          style={{
                            ...td,
                            textAlign: 'center',
                            color: '#64748b',
                            padding: 20,
                          }}
                        >
                          No line-by-line progress data available for this pay
                          application.
                        </td>
                      </tr>
                    ) : (
                      sovLineProgress.map((line) => {
                        const sovLine = sovLines.find(
                          (s) => s.id === line.sov_line_id
                        );
                        const totalCompleted =
                          line.previous_completed +
                          line.current_completed +
                          line.stored_materials;
                        const remaining =
                          line.scheduled_value - line.previous_completed;
                        const percentComplete =
                          line.scheduled_value > 0
                            ? (totalCompleted / line.scheduled_value) * 100
                            : 0;
                        const balance = line.scheduled_value - totalCompleted;
                        const retainage =
                          totalCompleted * (line.retainage_percent / 100);

                        return (
                          <tr key={line.id || line.sov_line_id}>
                            <td style={td}>{sovLine?.line_code || '—'}</td>
                            <td style={td}>{sovLine?.description || '—'}</td>
                            <td style={tdRight}>
                              {money(line.scheduled_value)}
                            </td>
                            <td style={tdRight}>
                              {money(line.previous_completed)}
                            </td>
                            <td style={tdRight}>
                              <strong>{money(remaining)}</strong>
                            </td>
                            <td style={tdRight}>
                              {money(line.current_completed)}
                            </td>
                            <td style={tdRight}>
                              {money(line.stored_materials)}
                            </td>
                            <td style={tdRight}>
                              <strong>{money(totalCompleted)}</strong>
                            </td>
                            <td style={tdRight}>
                              {percentComplete.toFixed(1)}%
                            </td>
                            <td style={tdRight}>{money(balance)}</td>
                            <td style={tdRight}>
                              <span style={{ color: '#dc2626' }}>
                                {money(retainage)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {sovLineProgress.length > 0 && (
                    <tfoot>
                      <tr
                        style={{
                          background: '#faf8f5',
                          fontWeight: 600,
                          borderTop: '2px solid #cbd5e1',
                        }}
                      >
                        <td colSpan={2} style={{ ...td, fontWeight: 600 }}>
                          TOTALS
                        </td>
                        <td style={tdRight}>
                          {money(
                            sovLineProgress.reduce(
                              (sum, line) => sum + line.scheduled_value,
                              0
                            )
                          )}
                        </td>
                        <td style={tdRight}>
                          {money(
                            sovLineProgress.reduce(
                              (sum, line) => sum + line.previous_completed,
                              0
                            )
                          )}
                        </td>
                        <td style={tdRight}>
                          <strong>
                            {money(
                              sovLineProgress.reduce(
                                (sum, line) =>
                                  sum +
                                  (line.scheduled_value -
                                    line.previous_completed),
                                0
                              )
                            )}
                          </strong>
                        </td>
                        <td style={tdRight}>
                          {money(
                            sovLineProgress.reduce(
                              (sum, line) => sum + line.current_completed,
                              0
                            )
                          )}
                        </td>
                        <td style={tdRight}>
                          {money(
                            sovLineProgress.reduce(
                              (sum, line) => sum + line.stored_materials,
                              0
                            )
                          )}
                        </td>
                        <td style={tdRight}>
                          <strong>
                            {money(
                              sovLineProgress.reduce(
                                (sum, line) =>
                                  sum +
                                  line.previous_completed +
                                  line.current_completed +
                                  line.stored_materials,
                                0
                              )
                            )}
                          </strong>
                        </td>
                        <td style={tdRight}>
                          {sovLineProgress.reduce(
                            (sum, line) => sum + line.scheduled_value,
                            0
                          ) > 0
                            ? (
                                (sovLineProgress.reduce(
                                  (sum, line) =>
                                    sum +
                                    line.previous_completed +
                                    line.current_completed +
                                    line.stored_materials,
                                  0
                                ) /
                                  sovLineProgress.reduce(
                                    (sum, line) => sum + line.scheduled_value,
                                    0
                                  )) *
                                100
                              ).toFixed(1)
                            : '0.0'}
                          %
                        </td>
                        <td style={tdRight}>
                          {money(
                            sovLineProgress.reduce((sum, line) => {
                              const total =
                                line.previous_completed +
                                line.current_completed +
                                line.stored_materials;
                              return sum + (line.scheduled_value - total);
                            }, 0)
                          )}
                        </td>
                        <td style={tdRight}>
                          <span style={{ color: '#dc2626' }}>
                            {money(
                              sovLineProgress.reduce((sum, line) => {
                                const total =
                                  line.previous_completed +
                                  line.current_completed +
                                  line.stored_materials;
                                return (
                                  sum + total * (line.retainage_percent / 100)
                                );
                              }, 0)
                            )}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => {
                  setShowG703S(false);
                  setViewingPayApp(null);
                  setSovLineProgress([]);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Styles ------------------------------ */
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
  fontWeight: 600,
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = { ...th, textAlign: 'center' };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };

const overlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 600,
  width: '90%',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
};

const input: React.CSSProperties = {
  padding: 8,
  border: '1px solid #e5dfd5',
  borderRadius: 6,
  width: '100%',
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#475569',
  marginBottom: 4,
  display: 'block',
  fontWeight: 500,
};

const btnCancel: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

const btnSave: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: '#1e3a5f',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

const btnSmall: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
