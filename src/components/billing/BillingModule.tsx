// components/billing/BillingModule.tsx
// Consolidated billing module used by both /billings/[projectId] page and project detail Billing tab
import {
  useBillingCore,
  type PayApp,
  type SOVLine,
} from '@/domain/billing/useBillingCore';
import { dateStr, money, toDateString, todayString } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

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

type BillingModuleProps = {
  projectId: string;
  variant?: 'standalone' | 'embedded'; // standalone for full page, embedded for project detail
};

export default function BillingModule({
  projectId,
  variant = 'embedded',
}: BillingModuleProps) {
  const {
    project,
    payApps,
    setPayApps,
    sovLines,
    setSovLines,
    sovTotal,
    totalBilled,
    loading,
  } = useBillingCore(projectId);

  const [sovLineProgress, setSovLineProgress] = useState<SOVLineProgress[]>([]);
  const [showPayAppModal, setShowPayAppModal] = useState(false);
  const [showSOVModal, setShowSOVModal] = useState(false);
  const [showG703S, setShowG703S] = useState(false);
  const [viewingPayApp, setViewingPayApp] = useState<PayApp | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPayApp, setEditingPayApp] = useState<PayApp | null>(null);
  const [editingSOVLine, setEditingSOVLine] = useState<SOVLine | null>(null);
  const [activeTab, setActiveTab] = useState<'payapps' | 'sov'>('sov');
  const [g703Tab, setG703Tab] = useState<'summary' | 'continuation'>('summary');

  const [payAppForm, setPayAppForm] = useState({
    pay_app_number: '',
    description: '',
    period_start: '',
    period_end: '',
    date_submitted: '',
    date_paid: '',
    status: 'Submitted',
    billRetainage: false,
  });

  const [sovForm, setSovForm] = useState({
    line_code: '',
    description: '',
    division: '',
    unit: 'EA',
    quantity: '',
    unit_cost: '',
    category: 'MatLab',
    retainage_percent: '5.00',
  });

  // Intentionally do not close modals on Escape; only explicit buttons close

  // Pay App handlers
  const openPayAppForNew = async () => {
    setEditingPayApp(null);

    // Get first and last day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setPayAppForm({
      pay_app_number: '',
      description: '',
      period_start: toDateString(firstDay),
      period_end: toDateString(lastDay),
      date_submitted: todayString(),
      date_paid: '',
      status: 'Submitted',
      billRetainage: false,
    });

    // Auto-load continuation sheet data from previous pay app
    if (sovLines.length > 0) {
      const { data: previousPayApps } = await supabase
        .from('engagement_pay_apps')
        .select('*')
        .eq('engagement_id', projectId)
        .not('id', 'is', null)
        .order('date_submitted', { ascending: false });

      const sortedPayApps = (previousPayApps || [])
        .filter((app) => app.pay_app_number)
        .sort(
          (a, b) =>
            Number(b.pay_app_number || 0) - Number(a.pay_app_number || 0)
        );

      // Determine next pay app number and prefill the form (editable)
      const lastNumber = sortedPayApps.length
        ? Number(sortedPayApps[0].pay_app_number || 0)
        : 0;
      const nextNumber = String(lastNumber + 1);
      setPayAppForm((f) => ({ ...f, pay_app_number: nextNumber }));

      const previousPayApp = sortedPayApps[0];

      // Load previous pay app's continuation sheet data
      const previousProgressMap = new Map<string, number>();
      if (previousPayApp) {
        const { data: prevProgress } = await supabase
          .from('engagement_sov_line_progress')
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

    setShowPayAppModal(true);
  };

  const openPayAppForEdit = async (app: PayApp) => {
    setEditingPayApp(app);
    setPayAppForm({
      pay_app_number: app.pay_app_number || '',
      description: app.description,
      period_start: app.period_start || '',
      period_end: app.period_end || '',
      date_submitted: app.date_submitted || '',
      date_paid: app.date_paid || '',
      status: app.status || 'Submitted',
      billRetainage: false,
    });

    // Load existing continuation sheet data
    if (app.id) {
      const { data: progressData } = await supabase
        .from('engagement_sov_line_progress')
        .select('*')
        .eq('pay_app_id', app.id);

      if (progressData && progressData.length > 0) {
        setSovLineProgress(progressData as SOVLineProgress[]);
      }
    }

    setShowPayAppModal(true);
  };

  const savePayApp = async (e: FormEvent) => {
    e.preventDefault();
    if (!payAppForm.description.trim()) return alert('Description is required');

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
            payAppForm.pay_app_number &&
            app.pay_app_number !== null &&
            Number(app.pay_app_number) < Number(payAppForm.pay_app_number)
        )
        .reduce((sum, app) => sum + app.current_payment_due, 0);

      // Calculate retainage held from all previous pay apps
      const retainageHeld = payApps
        .filter(
          (app) =>
            payAppForm.pay_app_number &&
            app.pay_app_number !== null &&
            Number(app.pay_app_number) < Number(payAppForm.pay_app_number)
        )
        .reduce((sum, app) => sum + (app.total_retainage || 0), 0);

      // If billing retainage, the current payment is the retainage balance
      // Otherwise, calculate normal current payment due
      const currentPaymentDue = payAppForm.billRetainage
        ? retainageHeld
        : totalEarnedLessRetainage - previousPayments;
      const balanceToFinish = totalScheduledValue - totalCompletedAndStored;

      const payload = {
        engagement_id: projectId,
        pay_app_number: payAppForm.pay_app_number || null,
        description: payAppForm.description,
        period_start: payAppForm.period_start || null,
        period_end: payAppForm.period_end || null,
        date_submitted: payAppForm.date_submitted || null,
        date_paid: payAppForm.date_paid || null,
        status: payAppForm.status || 'Submitted',
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

      // Enforce unique pay app number per engagement
      if (payload.pay_app_number) {
        let dupQuery = supabase
          .from('engagement_pay_apps')
          .select('id, pay_app_number')
          .eq('engagement_id', projectId)
          .eq('pay_app_number', payload.pay_app_number);
        if (editingPayApp) {
          dupQuery = dupQuery.neq('id', editingPayApp.id);
        }
        const { data: dupes, error: dupErr } = await dupQuery;
        if (dupErr) throw dupErr;
        if (dupes && dupes.length > 0) {
          alert(
            `Application Number ${payload.pay_app_number} already exists for this project. Please choose a different number.`
          );
          setSaving(false);
          return;
        }
      }

      let payAppId: string | null = null;
      if (editingPayApp) {
        const { error: err } = await supabase
          .from('engagement_pay_apps')
          .update(payload)
          .eq('id', editingPayApp.id);
        if (err) throw err;
        payAppId = editingPayApp.id;
      } else {
        const { data, error: err } = await supabase
          .from('engagement_pay_apps')
          .insert([payload])
          .select('id')
          .single();
        if (err) throw err;
        payAppId = data?.id || null;
      }

      // Save continuation sheet line progress
      if (payAppId && sovLineProgress.length > 0) {
        // Delete existing progress for this pay app
        await supabase
          .from('engagement_sov_line_progress')
          .delete()
          .eq('pay_app_id', payAppId);

        // Insert all progress lines
        const progressInserts = sovLineProgress.map((line) => ({
          pay_app_id: payAppId,
          sov_line_id: line.sov_line_id,
          scheduled_value: line.scheduled_value,
          previous_completed: line.previous_completed,
          current_completed: line.current_completed,
          stored_materials: line.stored_materials,
          retainage_percent: line.retainage_percent,
        }));

        const { error: progressErr } = await supabase
          .from('engagement_sov_line_progress')
          .insert(progressInserts);

        if (progressErr) throw progressErr;
      }

      setShowPayAppModal(false);
      setSovLineProgress([]);
      // Reload pay apps
      const { data: apps } = await supabase
        .from('engagement_pay_apps')
        .select('*')
        .eq('engagement_id', projectId)
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

    const { error } = await supabase
      .from('engagement_pay_apps')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting pay app: ' + error.message);
    } else {
      setPayApps((prev) => prev.filter((app) => app.id !== id));
    }
  };

  const openG703Viewer = async (app: PayApp) => {
    setViewingPayApp(app);

    // Load continuation sheet data for this pay app
    const { data: progressData } = await supabase
      .from('engagement_sov_line_progress')
      .select('*')
      .eq('pay_app_id', app.id);

    if (progressData && progressData.length > 0) {
      setSovLineProgress(progressData as SOVLineProgress[]);
    }

    setShowG703S(true);
  };

  // SOV Line handlers
  const openSOVForNew = () => {
    setEditingSOVLine(null);
    setSovForm({
      line_code: '',
      description: '',
      division: '',
      unit: 'EA',
      quantity: '',
      unit_cost: '',
      category: 'MatLab',
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
      category: line.category || 'MatLab',
      retainage_percent: line.retainage_percent?.toString() || '5.00',
    });
    setShowSOVModal(true);
  };

  const saveSOVLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!sovForm.description.trim()) return alert('Description is required');

    setSaving(true);
    try {
      const qty = Number(sovForm.quantity) || 1;
      const cost = Number(sovForm.unit_cost) || 0;
      const extended = qty * cost;

      const payload = {
        engagement_id: projectId,
        line_code: sovForm.line_code || null,
        description: sovForm.description,
        division: sovForm.division || null,
        unit: sovForm.unit || null,
        quantity: qty,
        unit_cost: cost,
        extended_cost: extended,
        category: sovForm.category || null,
        retainage_percent: Number(sovForm.retainage_percent) || 5.0,
      };

      if (editingSOVLine) {
        const { error: err } = await supabase
          .from('engagement_sov_lines')
          .update(payload)
          .eq('id', editingSOVLine.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('engagement_sov_lines')
          .insert([payload]);
        if (err) throw err;
      }

      setShowSOVModal(false);
      // Reload SOV lines
      const { data: sov } = await supabase
        .from('engagement_sov_lines')
        .select('*')
        .eq('engagement_id', projectId)
        .order('line_code', { ascending: true });
      setSovLines((sov ?? []) as SOVLine[]);
    } catch (err) {
      console.error('Unexpected error saving SOV line:', err);
      alert('Unexpected error saving SOV line. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSOVLine = async (id: string) => {
    if (!confirm('Delete this SOV line item?')) return;

    const { error } = await supabase
      .from('engagement_sov_lines')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting SOV line: ' + error.message);
    } else {
      setSovLines((prev) => prev.filter((line) => line.id !== id));
    }
  };

  const moveSOVLineUp = (index: number) => {
    if (index === 0) return; // Already at top
    const newLines = [...sovLines];
    [newLines[index - 1], newLines[index]] = [
      newLines[index],
      newLines[index - 1],
    ];
    setSovLines(newLines);
  };

  const moveSOVLineDown = (index: number) => {
    if (index === sovLines.length - 1) return; // Already at bottom
    const newLines = [...sovLines];
    [newLines[index], newLines[index + 1]] = [
      newLines[index + 1],
      newLines[index],
    ];
    setSovLines(newLines);
  };

  // G703 derived values
  const originalContractSum = sovLines.reduce(
    (sum, s) => sum + (s.quantity || 0) * (s.unit_cost || 0),
    0
  );
  const netChangeByChangeOrders = 0; // TODO: Sum approved change orders
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

  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: colors.textSecondary }}>
          Loading billing data…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <button
          onClick={() => setActiveTab('sov')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'sov'
                ? `3px solid ${colors.navy}`
                : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'sov' ? 600 : 400,
            fontSize: 15,
            color: activeTab === 'sov' ? colors.navy : colors.textSecondary,
            marginBottom: -2,
          }}
        >
          Schedule of Values ({sovLines.length})
        </button>
        <button
          onClick={() => setActiveTab('payapps')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'payapps'
                ? `3px solid ${colors.navy}`
                : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'payapps' ? 600 : 400,
            fontSize: 15,
            color: activeTab === 'payapps' ? colors.navy : colors.textSecondary,
            marginBottom: -2,
          }}
        >
          Pay Applications ({payApps.length})
        </button>
      </div>

      {/* SOV Tab */}
      {activeTab === 'sov' && (
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                Schedule of Values
              </h2>
              <p
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                  margin: 0,
                }}
              >
                Total Contract Value: {money(sovTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={openSOVForNew}
              style={{
                background: colors.navy,
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={16} />
              New SOV Line
            </button>
          </div>

          {sovLines.length === 0 ? (
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              No SOV lines yet. Click "New SOV Line" to create one.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Description</th>
                    <th style={thRightStyle}>Scheduled Value</th>
                    <th style={thCenterStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sovLines.map((line, idx) => (
                    <tr key={line.id} style={trStyle}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>{line.description}</td>
                      <td style={tdRightStyle}>
                        {money((line.quantity || 0) * (line.unit_cost || 0))}
                      </td>
                      <td style={tdCenterStyle}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'center',
                          }}
                        >
                          <button
                            onClick={() => moveSOVLineUp(idx)}
                            disabled={idx === 0}
                            style={{
                              ...iconButtonStyle,
                              opacity: idx === 0 ? 0.3 : 1,
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            }}
                            title="Move Up"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => moveSOVLineDown(idx)}
                            disabled={idx === sovLines.length - 1}
                            style={{
                              ...iconButtonStyle,
                              opacity: idx === sovLines.length - 1 ? 0.3 : 1,
                              cursor:
                                idx === sovLines.length - 1
                                  ? 'not-allowed'
                                  : 'pointer',
                            }}
                            title="Move Down"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => openSOVForEdit(line)}
                            style={iconButtonStyle}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteSOVLine(line.id)}
                            style={{
                              ...iconButtonStyle,
                              color: colors.logoRed,
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pay Apps Tab */}
      {activeTab === 'payapps' && (
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                Pay Applications
              </h2>
              <p
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                  margin: 0,
                }}
              >
                Total Billed: {money(totalBilled)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={async () => {
                  if (
                    !confirm(
                      'Sync all pay applications to QuickBooks?\n\nThis will create invoices for all pay apps in QuickBooks.'
                    )
                  )
                    return;
                  try {
                    // Sync pay apps to QuickBooks
                    const response = await fetch('/api/qbo/sync-billing', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId }),
                    });
                    const result = await response.json();

                    if (result.success) {
                      alert(
                        `Synced ${result.syncedCount || 0} pay app(s) to QuickBooks`
                      );
                      // Reload pay apps to get updated QB sync status
                      const { data: apps } = await supabase
                        .from('engagement_pay_apps')
                        .select('*')
                        .eq('engagement_id', projectId)
                        .order('date_submitted', { ascending: false });
                      setPayApps((apps ?? []) as PayApp[]);
                    } else {
                      alert(
                        'Sync failed: ' + (result.error || 'Unknown error')
                      );
                    }
                  } catch (err) {
                    console.error('Sync error:', err);
                    alert('Error syncing pay apps. See console for details.');
                  }
                }}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Sync to QuickBooks
              </button>
              <button
                type="button"
                onClick={openPayAppForNew}
                style={{
                  background: colors.navy,
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={16} />
                New Pay App
              </button>
            </div>
          </div>

          {payApps.length === 0 ? (
            <p style={{ color: colors.textSecondary, margin: 0 }}>
              No pay applications yet. Click "New Pay App" to create one.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>App #</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Period</th>
                    <th style={thStyle}>Date Submitted</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thCenterStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payApps.map((app) => (
                    <tr key={app.id} style={trStyle}>
                      <td style={tdStyle}>{app.pay_app_number || '—'}</td>
                      <td style={tdStyle}>{app.description}</td>
                      <td style={tdStyle}>
                        {app.period_start && app.period_end
                          ? `${dateStr(app.period_start)} – ${dateStr(app.period_end)}`
                          : '—'}
                      </td>
                      <td style={tdStyle}>{dateStr(app.date_submitted)}</td>
                      <td style={tdRightStyle}>{money(app.amount)}</td>
                      <td style={tdStyle}>
                        <span style={getStatusBadgeStyle(app.status)}>
                          {app.status || 'Submitted'}
                        </span>
                      </td>
                      <td style={tdCenterStyle}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'center',
                          }}
                        >
                          <button
                            onClick={() => openG703Viewer(app)}
                            style={iconButtonStyle}
                            title="View G702/G703"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => openPayAppForEdit(app)}
                            style={iconButtonStyle}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deletePayApp(app.id)}
                            style={{
                              ...iconButtonStyle,
                              color: colors.logoRed,
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pay App Modal (TODO: Implement full modal with continuation sheet) */}
      {showPayAppModal && (
        <div style={overlayStyle}>
          <div
            style={{ ...modalStyle, maxWidth: 1100 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                {editingPayApp ? 'Edit Pay Application' : 'New Pay Application'}
              </h2>
              <button
                onClick={() => setShowPayAppModal(false)}
                style={closeButtonStyle}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePayApp}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label style={labelStyle}>Application Number</label>
                  <input
                    type="text"
                    name="pay_app_number"
                    value={payAppForm.pay_app_number}
                    onChange={(e) =>
                      setPayAppForm({
                        ...payAppForm,
                        pay_app_number: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description *</label>
                  <input
                    type="text"
                    name="description"
                    value={payAppForm.description}
                    onChange={(e) =>
                      setPayAppForm({
                        ...payAppForm,
                        description: e.target.value,
                      })
                    }
                    required
                    style={inputStyle}
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
                      type="date"
                      name="period_start"
                      value={payAppForm.period_start}
                      onChange={(e) =>
                        setPayAppForm({
                          ...payAppForm,
                          period_start: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Period End</label>
                    <input
                      type="date"
                      name="period_end"
                      value={payAppForm.period_end}
                      onChange={(e) =>
                        setPayAppForm({
                          ...payAppForm,
                          period_end: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Date Submitted</label>
                    <input
                      type="date"
                      name="date_submitted"
                      value={payAppForm.date_submitted}
                      onChange={(e) =>
                        setPayAppForm({
                          ...payAppForm,
                          date_submitted: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Date Paid</label>
                    <input
                      type="date"
                      name="date_paid"
                      value={payAppForm.date_paid}
                      onChange={(e) =>
                        setPayAppForm({
                          ...payAppForm,
                          date_paid: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Bill Retainage Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="billRetainage"
                    checked={payAppForm.billRetainage}
                    onChange={(e) =>
                      setPayAppForm({
                        ...payAppForm,
                        billRetainage: e.target.checked,
                      })
                    }
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="billRetainage"
                    style={{
                      ...labelStyle,
                      margin: 0,
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: colors.navy,
                    }}
                  >
                    Bill Retainage (Release retained amounts from previous pay
                    apps)
                  </label>
                </div>

                {/* Continuation Sheet Section */}
                {sovLineProgress.length > 0 && (
                  <div
                    style={{
                      borderTop: `2px solid ${colors.border}`,
                      paddingTop: 16,
                      marginTop: 8,
                    }}
                  >
                    <h3 style={{ fontSize: 16, marginBottom: 12 }}>
                      AIA G703 Continuation Sheet
                    </h3>
                    <div
                      style={{
                        maxHeight: 400,
                        overflowY: 'auto',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 6,
                      }}
                    >
                      <table style={{ ...tableStyle, marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, fontSize: 12 }}>Item</th>
                            <th style={{ ...thStyle, fontSize: 12 }}>
                              Description
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Scheduled Value
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Previous
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Remaining
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Current
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Materials
                            </th>
                            <th style={{ ...thRightStyle, fontSize: 12 }}>
                              Total Complete
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sovLineProgress.map((progress, idx) => {
                            const sovLine = sovLines.find(
                              (s) => s.id === progress.sov_line_id
                            );
                            const totalComplete =
                              progress.previous_completed +
                              progress.current_completed +
                              progress.stored_materials;
                            const remaining =
                              progress.scheduled_value -
                              progress.previous_completed;
                            return (
                              <tr key={idx} style={trStyle}>
                                <td style={{ ...tdStyle, fontSize: 12 }}>
                                  {idx + 1}
                                </td>
                                <td style={{ ...tdStyle, fontSize: 12 }}>
                                  {sovLine?.description || '-'}
                                </td>
                                <td style={{ ...tdRightStyle, fontSize: 12 }}>
                                  {money(progress.scheduled_value)}
                                </td>
                                <td style={{ ...tdRightStyle, fontSize: 12 }}>
                                  {money(progress.previous_completed)}
                                </td>
                                <td
                                  style={{
                                    ...tdRightStyle,
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {money(remaining)}
                                </td>
                                <td style={{ ...tdRightStyle, fontSize: 12 }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={progress.current_completed}
                                    onChange={(e) => {
                                      const updated = [...sovLineProgress];
                                      updated[idx].current_completed = Number(
                                        e.target.value
                                      );
                                      setSovLineProgress(updated);
                                    }}
                                    style={{
                                      ...inputStyle,
                                      width: 100,
                                      padding: '4px 8px',
                                      fontSize: 12,
                                    }}
                                  />
                                </td>
                                <td style={{ ...tdRightStyle, fontSize: 12 }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={progress.stored_materials}
                                    onChange={(e) => {
                                      const updated = [...sovLineProgress];
                                      updated[idx].stored_materials = Number(
                                        e.target.value
                                      );
                                      setSovLineProgress(updated);
                                    }}
                                    style={{
                                      ...inputStyle,
                                      width: 100,
                                      padding: '4px 8px',
                                      fontSize: 12,
                                    }}
                                  />
                                </td>
                                <td style={{ ...tdRightStyle, fontSize: 12 }}>
                                  {money(totalComplete)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 24,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPayAppModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={primaryButtonStyle}
                >
                  {saving ? 'Saving...' : 'Save Pay App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOV Line Modal */}
      {showSOVModal && (
        <div style={overlayStyle}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                {editingSOVLine ? 'Edit SOV Line' : 'New SOV Line'}
              </h2>
              <button
                onClick={() => setShowSOVModal(false)}
                style={closeButtonStyle}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSOVLine}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label style={labelStyle}>Description *</label>
                  <input
                    type="text"
                    value={sovForm.description}
                    onChange={(e) =>
                      setSovForm({ ...sovForm, description: e.target.value })
                    }
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Scheduled Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sovForm.unit_cost}
                    onChange={(e) =>
                      setSovForm({
                        ...sovForm,
                        unit_cost: e.target.value,
                        quantity: '1',
                      })
                    }
                    style={inputStyle}
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
                    <label style={labelStyle}>Category</label>
                    <select
                      value={sovForm.category}
                      onChange={(e) =>
                        setSovForm({ ...sovForm, category: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="MatLab">MatLab</option>
                      <option value="Material">Material</option>
                      <option value="Labor">Labor</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Retainage %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={sovForm.retainage_percent}
                      onChange={(e) =>
                        setSovForm({
                          ...sovForm,
                          retainage_percent: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 24,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSOVModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={primaryButtonStyle}
                >
                  {saving ? 'Saving...' : 'Save SOV Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* G702/G703 Viewer Modal */}
      {showG703S && viewingPayApp && (
        <div style={overlayStyle} onClick={() => setShowG703S(false)}>
          <div
            style={{ ...modalStyle, maxWidth: 1000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                AIA G702/G703 - Pay App #{viewingPayApp.pay_app_number || '—'}
              </h2>
              <button
                onClick={() => setShowG703S(false)}
                style={closeButtonStyle}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-tabs for Summary vs Continuation */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                borderBottom: `2px solid ${colors.border}`,
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => setG703Tab('summary')}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    g703Tab === 'summary'
                      ? `3px solid ${colors.navy}`
                      : '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: g703Tab === 'summary' ? 600 : 400,
                  fontSize: 14,
                  color:
                    g703Tab === 'summary' ? colors.navy : colors.textSecondary,
                  marginBottom: -2,
                }}
              >
                G702 Summary
              </button>
              <button
                onClick={() => setG703Tab('continuation')}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    g703Tab === 'continuation'
                      ? `3px solid ${colors.navy}`
                      : '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: g703Tab === 'continuation' ? 600 : 400,
                  fontSize: 14,
                  color:
                    g703Tab === 'continuation'
                      ? colors.navy
                      : colors.textSecondary,
                  marginBottom: -2,
                }}
              >
                G703 Continuation Sheet
              </button>
            </div>

            {/* G702 Summary Tab */}
            {g703Tab === 'summary' && (
              <div>
                <table style={tableStyle}>
                  <tbody>
                    <tr style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        Original Contract Sum
                      </td>
                      <td style={tdRightStyle}>{money(originalContractSum)}</td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        Net Change by Change Orders
                      </td>
                      <td style={tdRightStyle}>
                        {money(netChangeByChangeOrders)}
                      </td>
                    </tr>
                    <tr
                      style={{
                        ...trStyle,
                        background: '#f3f4f6',
                        fontWeight: 600,
                      }}
                    >
                      <td style={tdStyle}>Contract Sum to Date</td>
                      <td style={tdRightStyle}>{money(contractSumToDate)}</td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        Total Completed and Stored to Date
                      </td>
                      <td style={tdRightStyle}>
                        {money(totalCompletedAndStoredToDate)}
                      </td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={tdStyle}>
                        &nbsp;&nbsp;Retainage on Work (
                        {workRetainagePercentDisplay})
                      </td>
                      <td style={tdRightStyle}>{money(retainageOnWork)}</td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={tdStyle}>
                        &nbsp;&nbsp;Retainage on Materials (
                        {materialRetainagePercentDisplay})
                      </td>
                      <td style={tdRightStyle}>
                        {money(retainageOnMaterials)}
                      </td>
                    </tr>
                    <tr
                      style={{
                        ...trStyle,
                        background: '#f3f4f6',
                        fontWeight: 600,
                      }}
                    >
                      <td style={tdStyle}>Total Retainage</td>
                      <td style={tdRightStyle}>{money(totalRetainageG702)}</td>
                    </tr>
                    <tr
                      style={{
                        ...trStyle,
                        background: '#f3f4f6',
                        fontWeight: 600,
                      }}
                    >
                      <td style={tdStyle}>Total Earned Less Retainage</td>
                      <td style={tdRightStyle}>
                        {money(totalEarnedLessRetainageG702)}
                      </td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        Less Previous Certificates for Payment
                      </td>
                      <td style={tdRightStyle}>
                        {money(previousCertificates)}
                      </td>
                    </tr>
                    <tr
                      style={{
                        ...trStyle,
                        background: colors.navy + '15',
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      <td style={tdStyle}>Current Payment Due</td>
                      <td style={tdRightStyle}>
                        {money(currentPaymentDueG702)}
                      </td>
                    </tr>
                    <tr style={trStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        Balance to Finish (Including Retainage)
                      </td>
                      <td style={tdRightStyle}>
                        {money(balanceToFinishIncludingRetainage)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* G703 Continuation Sheet Tab */}
            {g703Tab === 'continuation' && (
              <div
                style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}
              >
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Description</th>
                      <th style={thRightStyle}>Scheduled Value</th>
                      <th style={thRightStyle}>Previous</th>
                      <th style={thRightStyle}>Current</th>
                      <th style={thRightStyle}>Materials</th>
                      <th style={thRightStyle}>Total Complete</th>
                      <th style={thRightStyle}>% Complete</th>
                      <th style={thRightStyle}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sovLineProgress.map((progress, idx) => {
                      const sovLine = sovLines.find(
                        (s) => s.id === progress.sov_line_id
                      );
                      const totalComplete =
                        progress.previous_completed +
                        progress.current_completed +
                        progress.stored_materials;
                      const percentComplete =
                        progress.scheduled_value > 0
                          ? (totalComplete / progress.scheduled_value) * 100
                          : 0;
                      const balance = progress.scheduled_value - totalComplete;

                      return (
                        <tr key={idx} style={trStyle}>
                          <td style={tdStyle}>
                            {sovLine?.line_code || `Line ${idx + 1}`}
                          </td>
                          <td style={tdStyle}>{sovLine?.description || '—'}</td>
                          <td style={tdRightStyle}>
                            {money(progress.scheduled_value)}
                          </td>
                          <td style={tdRightStyle}>
                            {money(progress.previous_completed)}
                          </td>
                          <td style={tdRightStyle}>
                            {money(progress.current_completed)}
                          </td>
                          <td style={tdRightStyle}>
                            {money(progress.stored_materials)}
                          </td>
                          <td style={tdRightStyle}>{money(totalComplete)}</td>
                          <td style={tdRightStyle}>
                            {percentComplete.toFixed(1)}%
                          </td>
                          <td style={tdRightStyle}>{money(balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const cardStyle: React.CSSProperties = {
  background: '#faf8f5',
  border: '1px solid #e5dfd5',
  borderRadius: 12,
  padding: 24,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: 0,
};

const thStyle: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 13,
  color: colors.textPrimary,
  borderBottom: `2px solid ${colors.border}`,
  background: '#f9fafb',
};

const thRightStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: 'right',
};

const thCenterStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: 'center',
};

const trStyle: React.CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 14,
  color: colors.textPrimary,
};

const tdRightStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
};

const tdCenterStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
};

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: colors.navy,
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const getStatusBadgeStyle = (status: string | null): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  };

  switch (status) {
    case 'Approved':
      return { ...baseStyle, background: '#dcfce7', color: '#166534' };
    case 'Paid':
      return { ...baseStyle, background: '#dbeafe', color: '#1e40af' };
    case 'Rejected':
      return { ...baseStyle, background: '#fee2e2', color: '#991b1b' };
    default:
      return { ...baseStyle, background: '#f3f4f6', color: '#374151' };
  }
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 700,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: `2px solid ${colors.border}`,
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: colors.textSecondary,
  padding: 4,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: colors.textPrimary,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  background: colors.navy,
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: '#f3f4f6',
  color: colors.textPrimary,
  padding: '10px 20px',
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};
