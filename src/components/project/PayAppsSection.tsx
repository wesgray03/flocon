// components/project/PayAppsSection.tsx
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

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

export default function PayAppsSection({ projectId }: { projectId: string }) {
  const [payApps, setPayApps] = useState<PayApp[]>([]);
  const [sovLines, setSovLines] = useState<SOVLine[]>([]);
  const [sovLineProgress, setSovLineProgress] = useState<SOVLineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showG703S, setShowG703S] = useState(false);
  const [viewingPayApp, setViewingPayApp] = useState<PayApp | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPayApp, setEditingPayApp] = useState<PayApp | null>(null);
  const [g703Tab, setG703Tab] = useState<'summary' | 'continuation'>('summary');

  const [form, setForm] = useState({
    pay_app_number: '',
    description: '',
    period_start: '',
    period_end: '',
    date_submitted: '',
    date_paid: '',
    status: 'Submitted',
  });

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);

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

  // Derived G702/G703 summary numbers for the viewer
  const originalContractSum = sovLines.reduce(
    (sum, s) => sum + (s.quantity || 0) * (s.unit_cost || 0),
    0
  );
  // TODO: Sum approved change orders when available
  const netChangeByChangeOrders = 0;
  const contractSumToDate = originalContractSum + netChangeByChangeOrders;

  const totalCompletedAndStoredToDate = sovLineProgress.reduce(
    (sum, l) =>
      sum + l.previous_completed + l.current_completed + l.stored_materials,
    0
  );
  const retainageOnWork = sovLineProgress.reduce(
    (sum, l) =>
      sum +
      (l.previous_completed + l.current_completed) *
        (l.retainage_percent / 100),
    0
  );
  const retainageOnMaterials = sovLineProgress.reduce(
    (sum, l) => sum + l.stored_materials * (l.retainage_percent / 100),
    0
  );
  const totalRetainageG702 = retainageOnWork + retainageOnMaterials;
  const totalEarnedLessRetainageG702 =
    totalCompletedAndStoredToDate - totalRetainageG702;
  const previousCertificates = viewingPayApp?.previous_payments || 0;
  const currentPaymentDueG702 =
    totalEarnedLessRetainageG702 - previousCertificates;
  const balanceToFinishIncludingRetainage =
    contractSumToDate - totalEarnedLessRetainageG702;

  const workRetainagePercentDisplay = (() => {
    const set = new Set(
      sovLineProgress
        .filter((l) => l.previous_completed + l.current_completed > 0)
        .map((l) => l.retainage_percent || 0)
    );
    return set.size === 1 ? `${Array.from(set)[0]}%` : '—%';
  })();
  const materialRetainagePercentDisplay = (() => {
    const set = new Set(
      sovLineProgress
        .filter((l) => l.stored_materials > 0)
        .map((l) => l.retainage_percent || 0)
    );
    return set.size === 1 ? `${Array.from(set)[0]}%` : '—%';
  })();

  const money = (n: number | null | undefined) =>
    n == null
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const dateStr = (d: string | null) => {
    if (!d) return '—';
    // Parse as local date to avoid timezone conversion issues
    const [year, month, day] = d.split('T')[0].split('-');
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString();
  };

  const totalAmount = useMemo(() => {
    return payApps.reduce((sum, app) => sum + (app.amount ?? 0), 0);
  }, [payApps]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = async () => {
    setEditingPayApp(null);

    // Get first and last day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setForm({
      pay_app_number: '',
      description: '',
      period_start: firstDay.toISOString().split('T')[0],
      period_end: lastDay.toISOString().split('T')[0],
      date_submitted: new Date().toISOString().split('T')[0],
      date_paid: '',
      status: 'Submitted',
    });

    // Auto-load continuation sheet data
    if (sovLines.length > 0 && projectId) {
      const { data: previousPayApps } = await supabase
        .from('pay_apps')
        .select('*')
        .eq('project_id', projectId)
        .not('id', 'is', null)
        .order('date_submitted', { ascending: false });

      const sortedPayApps = (previousPayApps || [])
        .filter((app) => app.pay_app_number)
        .sort(
          (a, b) =>
            Number(b.pay_app_number || 0) - Number(a.pay_app_number || 0)
        );

      const previousPayApp = sortedPayApps[0];

      // Load previous pay app's continuation sheet data
      let previousProgressMap = new Map<string, number>();
      if (previousPayApp) {
        const { data: prevProgress } = await supabase
          .from('sov_line_progress')
          .select(
            'sov_line_id, previous_completed, current_completed, stored_materials'
          )
          .eq('pay_app_id', previousPayApp.id);

        if (prevProgress) {
          prevProgress.forEach((line) => {
            const totalToDate =
              line.previous_completed +
              line.current_completed +
              line.stored_materials;
            previousProgressMap.set(line.sov_line_id, totalToDate);
          });
        }
      }

      // Initialize continuation sheet with SOV lines
      const initialProgress: SOVLineProgress[] = sovLines.map((sovLine) => {
        const prevCompleted = previousProgressMap.get(sovLine.id) || 0;
        return {
          id: undefined,
          pay_app_id: '',
          sov_line_id: sovLine.id,
          scheduled_value: (sovLine.quantity || 0) * (sovLine.unit_cost || 0),
          previous_completed: prevCompleted,
          current_completed: 0,
          stored_materials: 0,
          retainage_percent: sovLine.retainage_percent || 5,
        };
      });
      setSovLineProgress(initialProgress);
    }

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

  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: '#64748b' }}>Loading pay applications…</p>
      </div>
    );
  }

  return (
    <>
      <div style={cardStyle}>
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
              background: '#2563eb',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Add pay application"
            aria-label="Add pay application"
          >
            <Plus size={18} />
          </button>
        </div>

        {payApps.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>
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
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={th}>App #</th>
                  <th style={th}>Description</th>
                  <th style={th}>Period</th>
                  <th style={thRight}>Total Completed</th>
                  <th style={thRight}>Total Retainage</th>
                  <th style={thRight}>Current Payment</th>
                  <th style={thRight}>Balance to Finish</th>
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
                      <strong style={{ color: '#2563eb', fontSize: 15 }}>
                        {money(app.current_payment_due || app.amount || 0)}
                      </strong>
                    </td>
                    <td style={tdRight}>
                      <span style={{ color: '#64748b' }}>
                        {money(app.balance_to_finish || 0)}
                      </span>
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
                                : '#fef3c7',
                          color:
                            app.status === 'Paid'
                              ? '#166534'
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
                          // Load continuation sheet data for this pay app
                          const { data: progressData } = await supabase
                            .from('sov_line_progress')
                            .select('*')
                            .eq('pay_app_id', app.id);

                          if (progressData) {
                            setSovLineProgress(
                              progressData as SOVLineProgress[]
                            );
                          }
                          setG703Tab('summary');
                          setShowG703S(true);
                        }}
                        style={{
                          ...btnSmall,
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
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
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
                        }}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePayApp(app.id)}
                        style={{
                          ...btnSmall,
                          marginLeft: 6,
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
                        }}
                        title="Delete"
                        aria-label="Delete"
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
      </div>

      {/* Pay App Modal */}
      {showModal && (
        <div style={overlay}>
          <div
            style={{ ...modal, maxWidth: 1600 }}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
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
                      <label style={labelStyle}>Period Start</label>
                      <input
                        name="period_start"
                        type="date"
                        value={form.period_start}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Period End</label>
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
                      <label style={labelStyle}>Date Submitted</label>
                      <input
                        name="date_submitted"
                        type="date"
                        value={form.date_submitted}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Date Paid</label>
                      <input
                        name="date_paid"
                        type="date"
                        value={form.date_paid}
                        onChange={handleChange}
                        style={input}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
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

              {/* Continuation Sheet Table - shown inline when data is loaded */}
              {sovLineProgress.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: '#0f172a',
                    }}
                  >
                    Work Completed This Period
                  </h3>
                  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table
                      style={{
                        width: '100%',
                        fontSize: 12,
                        borderCollapse: 'collapse',
                      }}
                    >
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={th}>Item</th>
                          <th style={th}>Description</th>
                          <th style={thRight}>Scheduled</th>
                          <th style={thRight}>Previous</th>
                          <th style={thRight}>Remaining</th>
                          <th style={thRight}>This Period</th>
                          <th style={thRight}>Materials</th>
                          <th style={thRight}>Total</th>
                          <th style={thRight}>%</th>
                          <th style={thRight}>Balance</th>
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
                                ${line.previous_completed.toLocaleString()}
                              </td>
                              <td style={tdRight}>
                                <strong>${remaining.toLocaleString()}</strong>
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
                                  style={{
                                    ...input,
                                    width: 90,
                                    textAlign: 'right',
                                    fontSize: 12,
                                    padding: 4,
                                  }}
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
                                  style={{
                                    ...input,
                                    width: 90,
                                    textAlign: 'right',
                                    fontSize: 12,
                                    padding: 4,
                                  }}
                                />
                              </td>
                              <td style={tdRight}>
                                <strong>
                                  ${totalCompleted.toLocaleString()}
                                </strong>
                              </td>
                              <td style={tdRight}>
                                {percentComplete.toFixed(1)}%
                              </td>
                              <td style={tdRight}>
                                ${balance.toLocaleString()}
                              </td>
                              <td style={tdRight}>
                                <span style={{ color: '#dc2626' }}>
                                  ${retainage.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Summary */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: 12,
                      borderRadius: 6,
                      marginBottom: 12,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      Payment Summary
                    </h4>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr',
                        gap: 6,
                        fontSize: 12,
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
                          color: '#3b82f6',
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
                              return (
                                sum + total * (line.retainage_percent / 100)
                              );
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
                            .reduce(
                              (sum, app) => sum + app.current_payment_due,
                              0
                            );
                          return (
                            totalCompleted -
                            totalRetainage -
                            previous
                          ).toLocaleString();
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      {/* G703S Viewer Modal - Full G703S Continuation Sheet */}
      {showG703S && viewingPayApp && (
        <div style={overlay}>
          <div
            style={{
              ...modal,
              maxWidth: g703Tab === 'continuation' ? 1600 : 900,
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
                Pay Application #{viewingPayApp.pay_app_number || '—'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowG703S(false);
                  setViewingPayApp(null);
                  setSovLineProgress([]);
                }}
                style={{
                  background: '#e5e7eb',
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

            {/* Tabs for Summary and Continuation Sheet */}
            <div style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setG703Tab('summary')}
                  style={{
                    ...btnSmall,
                    background: g703Tab === 'summary' ? '#1d4ed8' : '#e2e8f0',
                    color: g703Tab === 'summary' ? '#fff' : '#0f172a',
                  }}
                >
                  Summary (G702)
                </button>
                <button
                  type="button"
                  onClick={() => setG703Tab('continuation')}
                  style={{
                    ...btnSmall,
                    background:
                      g703Tab === 'continuation' ? '#1d4ed8' : '#e2e8f0',
                    color: g703Tab === 'continuation' ? '#fff' : '#0f172a',
                  }}
                >
                  Continuation Sheet (G703)
                </button>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ ...btnSmall, background: '#4a5d23', color: '#fff' }}
                >
                  Print
                </button>
              </div>
            </div>

            {g703Tab === 'summary' && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: 20,
                  borderRadius: 8,
                  margin: '0 20px 20px',
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  Application for Payment (G702)
                </h3>
                <table
                  style={{
                    width: '100%',
                    fontSize: 14,
                    borderCollapse: 'collapse',
                  }}
                >
                  <tbody>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8 }}>Original Contract Sum</td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(originalContractSum)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 8 }}>Net Change by Change Order</td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(netChangeByChangeOrders)}
                      </td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>
                        Contract Sum to Date (Line 1 + 2)
                      </td>
                      <td style={{ padding: 8 }}></td>
                      <td
                        style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                        }}
                      >
                        {money(contractSumToDate)}
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: 8 }}>
                        Total Completed and Stored to Date
                      </td>
                      <td style={{ padding: 8, color: '#64748b' }}>
                        (Column G on G703)
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(totalCompletedAndStoredToDate)}
                      </td>
                    </tr>

                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>Retainage</td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8 }}></td>
                    </tr>
                    <tr>
                      <td style={{ padding: 8 }}>
                        % of Completed Work (Columns D & E on G703)
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {workRetainagePercentDisplay}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(retainageOnWork)}
                      </td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8 }}>
                        % of Stored Materials (Column F on G703)
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {materialRetainagePercentDisplay}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(retainageOnMaterials)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 8 }}>
                        Total Earned Less Retainage (Line 4 less Line 5 Total)
                      </td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(totalEarnedLessRetainageG702)}
                      </td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8 }}>
                        Less Previous Certificates for Payment
                      </td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(previousCertificates)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 700 }}>
                        Current Payment Due
                      </td>
                      <td style={{ padding: 8 }}></td>
                      <td
                        style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#2563eb',
                        }}
                      >
                        {money(Math.max(0, currentPaymentDueG702))}
                      </td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: 8 }}>
                        Balance to Finish, Including Retainage
                      </td>
                      <td style={{ padding: 8 }}></td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {money(balanceToFinishIncludingRetainage)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Continuation Sheet Table (G703) */}
            {g703Tab === 'continuation' && (
              <div style={{ overflowX: 'auto', margin: '0 20px 16px' }}>
                <table
                  style={{
                    width: '100%',
                    fontSize: 13,
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>Item</th>
                      <th style={th}>Description of Work</th>
                      <th style={thRight}>Scheduled Value (C)</th>
                      <th style={thRight}>Work Completed From Previous (D)</th>
                      <th style={thRight}>Work Completed This Period (E)</th>
                      <th style={thRight}>Materials Presently Stored (F)</th>
                      <th style={thRight}>Total Completed & Stored (G)</th>
                      <th style={thRight}>% (H)</th>
                      <th style={thRight}>Balance to Finish (I)</th>
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
                            ${line.previous_completed.toLocaleString()}
                          </td>
                          <td style={tdRight}>
                            ${line.current_completed.toLocaleString()}
                          </td>
                          <td style={tdRight}>
                            ${line.stored_materials.toLocaleString()}
                          </td>
                          <td style={tdRight}>
                            <strong>${totalCompleted.toLocaleString()}</strong>
                          </td>
                          <td style={tdRight}>{percentComplete.toFixed(1)}%</td>
                          <td style={tdRight}>${balance.toLocaleString()}</td>
                          <td style={tdRight}>
                            <span style={{ color: '#dc2626' }}>
                              ${retainage.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Retainage calculated per line at its retainage percent.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Styles ------------------------------ */
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
  fontWeight: 600,
  fontSize: 13,
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = { ...th, textAlign: 'center' };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
  fontSize: 13,
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
  border: '1px solid #e5e7eb',
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
  background: '#2563eb',
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
