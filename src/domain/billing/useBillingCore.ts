import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

export type BillingProject = {
  id: string;
  project_number: string | null;
  name: string;
  contract_amount?: number;
};

export type SOVLine = {
  id: string;
  engagement_id: string;
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

export type PayApp = {
  id: string;
  engagement_id: string;
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

export function useBillingCore(projectId?: string) {
  const [project, setProject] = useState<BillingProject | null>(null);
  const [payApps, setPayApps] = useState<PayApp[]>([]);
  const [sovLines, setSovLines] = useState<SOVLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // Project
      const { data: proj } = await supabase
        .from('engagements')
        .select('id,project_number,name,contract_amount')
        .eq('id', projectId)
        .maybeSingle();
      if (!cancelled) setProject((proj ?? null) as BillingProject | null);

      // Pay apps
      const { data: apps } = await supabase
        .from('engagement_pay_apps')
        .select('*')
        .eq('engagement_id', projectId)
        .order('date_submitted', { ascending: false });
      if (!cancelled) setPayApps((apps ?? []) as PayApp[]);

      // SOV lines
      const { data: sov } = await supabase
        .from('engagement_sov_lines')
        .select('*')
        .eq('engagement_id', projectId)
        .order('line_code', { ascending: true });
      if (!cancelled) setSovLines((sov ?? []) as SOVLine[]);

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const sovTotal = useMemo(
    () => sovLines.reduce((sum, line) => sum + (line.extended_cost || 0), 0),
    [sovLines]
  );

  const totalBilled = useMemo(
    () => payApps.reduce((sum, app) => sum + (app.amount ?? 0), 0),
    [payApps]
  );

  return {
    project,
    setProject,
    payApps,
    setPayApps,
    sovLines,
    setSovLines,
    sovTotal,
    totalBilled,
    loading,
  };
}
