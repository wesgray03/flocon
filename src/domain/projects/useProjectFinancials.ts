import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export type ProjectFinancials = {
  coSalesTotal: number;
  coBudgetTotal: number;
};

/**
 * Lightweight hook to fetch per-project financial aggregates used by
 * the Financial Overview: change order sales total and CO budget total.
 */
export function useProjectFinancials(projectId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [financials, setFinancials] = useState<ProjectFinancials>({
    coSalesTotal: 0,
    coBudgetTotal: 0,
  });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('engagement_change_orders')
          .select('amount, budget_amount')
          .eq('engagement_id', projectId)
          .eq('deleted', false);
        if (error) {
          console.error('Failed to load change order totals:', error);
          if (!cancelled) {
            setFinancials({ coSalesTotal: 0, coBudgetTotal: 0 });
          }
          return;
        }
        const rows = data ?? [];
        const coSalesTotal = rows.reduce(
          (sum, r) => sum + (Number(r.amount) || 0),
          0
        );
        const coBudgetTotal = rows.reduce(
          (sum, r) => sum + (Number(r.budget_amount) || 0),
          0
        );
        if (!cancelled) setFinancials({ coSalesTotal, coBudgetTotal });
      } catch (e) {
        console.error('Unexpected error loading project financials:', e);
        if (!cancelled) setFinancials({ coSalesTotal: 0, coBudgetTotal: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { loading, financials };
}
