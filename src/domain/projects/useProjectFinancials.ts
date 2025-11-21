import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export type ProjectFinancials = {
  // Revenue (FloCon data)
  contractAmount: number;
  coSalesTotal: number;
  billingsToDate: number;
  retainageToDate: number;
  remainingBillings: number;
  percentCompleteRevenue: number;

  // Cost (FloCon + QBO data)
  contractBudget: number;
  coBudgetTotal: number;
  totalContractBudget: number;
  costToDate: number; // QBO - future
  remainingCost: number;
  percentCompleteCost: number;

  // Profit (calculations)
  contractProfitPercent: number;
  changeOrderProfitPercent: number;
  totalProfitPercent: number;
  projectedProfitPercent: number;
  projectedProfitDollar: number;

  // Cash Flow (QBO cash basis)
  cashIn: number; // QBO payments received
  cashOut: number; // QBO bills paid - future
  netCashFlow: number;
  cashPositionPercent: number;
};

/**
 * Comprehensive hook to fetch per-project financial aggregates used by
 * the Financial Overview. Combines data from FloCon (pay apps, change orders)
 * and QuickBooks (payments, bills).
 */
export function useProjectFinancials(
  projectId?: string | null,
  contractAmount: number = 0,
  contractBudget: number = 0,
  qboJobId?: string | null
) {
  const [loading, setLoading] = useState(false);
  const [financials, setFinancials] = useState<ProjectFinancials>({
    contractAmount: 0,
    coSalesTotal: 0,
    billingsToDate: 0,
    retainageToDate: 0,
    remainingBillings: 0,
    percentCompleteRevenue: 0,
    contractBudget: 0,
    coBudgetTotal: 0,
    totalContractBudget: 0,
    costToDate: 0,
    remainingCost: 0,
    percentCompleteCost: 0,
    contractProfitPercent: 0,
    changeOrderProfitPercent: 0,
    totalProfitPercent: 0,
    projectedProfitPercent: 0,
    projectedProfitDollar: 0,
    cashIn: 0,
    cashOut: 0,
    netCashFlow: 0,
    cashPositionPercent: 0,
  });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch change orders
        const { data: changeOrders, error: coError } = await supabase
          .from('engagement_change_orders')
          .select('amount, budget_amount')
          .eq('engagement_id', projectId)
          .eq('deleted', false);

        if (coError) {
          console.error('Failed to load change orders:', coError);
        }

        // Fetch pay apps for billings and retainage
        const { data: payApps, error: paError } = await supabase
          .from('engagement_pay_apps')
          .select(
            'current_payment_due, retainage_completed_work, is_retainage_billing, qbo_payment_total, status'
          )
          .eq('engagement_id', projectId);

        if (paError) {
          console.error('Failed to load pay apps:', paError);
        }

        if (cancelled) return;

        // Calculate change order totals
        const coRows = changeOrders ?? [];
        const coSalesTotal = coRows.reduce(
          (sum, r) => sum + (Number(r.amount) || 0),
          0
        );
        const coBudgetTotal = coRows.reduce(
          (sum, r) => sum + (Number(r.budget_amount) || 0),
          0
        );

        // Calculate billings and retainage from pay apps
        const payAppRows = payApps ?? [];
        const billingsToDate = payAppRows.reduce(
          (sum, r) => sum + (Number(r.current_payment_due) || 0),
          0
        );
        // Calculate net retainage: sum retainage held, subtract retainage released
        let retainageToDate = Math.round(
          payAppRows.reduce(
            (sum, r) => {
              if (r.is_retainage_billing) {
                // Retainage release - subtract the payment amount
                return sum - (Number(r.current_payment_due) || 0);
              } else {
                // Normal billing - add the retainage withheld
                return sum + (Number(r.retainage_completed_work) || 0);
              }
            },
            0
          ) * 100
        ) / 100;
        // Fix negative zero display
        if (retainageToDate === 0) retainageToDate = 0;

        // Fetch QBO cash flow data (cash basis P&L)
        let cashIn = 0;
        let cashOut = 0;
        let qboCosts = { costToDate: 0, cashOut: 0 };
        
        if (qboJobId) {
          try {
            console.log(
              'Fetching QBO cash flow for job:',
              qboJobId,
              'engagement:',
              projectId
            );
            
            // Fetch cash basis P&L for cash flow
            const cashFlowResponse = await fetch(
              `/api/qbo/profit-loss-cash?qboJobId=${qboJobId}`
            );
            
            if (cashFlowResponse.ok) {
              const cashFlowData = await cashFlowResponse.json();
              console.log('Cash flow data received:', cashFlowData);
              cashIn = cashFlowData.income || 0;
              cashOut = (cashFlowData.cogs || 0) + (cashFlowData.expenses || 0);
            }
            
            // Fetch accrual costs for cost-to-date
            const costResponse = await fetch(
              `/api/qbo/project-costs-cached?qboJobId=${qboJobId}&engagementId=${projectId}`
            );
            console.log(
              'Cost response status:',
              costResponse.status,
              costResponse.ok
            );
            if (costResponse.ok) {
              const costData = await costResponse.json();
              console.log('Cost data received:', costData);
              qboCosts.costToDate = costData.netCostToDate || 0;
              console.log('Parsed QBO costs:', qboCosts);
            } else {
              console.error('Cost response not OK:', await costResponse.text());
            }
          } catch (err) {
            console.error('Failed to fetch QBO data:', err);
          }
        }

        // Revenue calculations
        const totalRevenue = contractAmount + coSalesTotal;
        const remainingBillings = totalRevenue - billingsToDate;
        const percentCompleteRevenue =
          totalRevenue > 0 ? (billingsToDate / totalRevenue) * 100 : 0;

        // Cost calculations (contract_budget passed as parameter from engagement)
        const totalContractBudget = contractBudget + coBudgetTotal;
        const costToDate = qboCosts.costToDate;
        const remainingCost = totalContractBudget - costToDate;
        const percentCompleteCost =
          totalContractBudget > 0
            ? (costToDate / totalContractBudget) * 100
            : 0;

        // Profit calculations
        const contractProfit = contractAmount - contractBudget;
        const contractProfitPercent =
          contractAmount > 0 ? (contractProfit / contractAmount) * 100 : 0;

        const coProfit = coSalesTotal - coBudgetTotal;
        const changeOrderProfitPercent =
          coSalesTotal > 0 ? (coProfit / coSalesTotal) * 100 : 0;

        const totalProfit = contractProfit + coProfit;
        const totalProfitPercent =
          totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        const projectedProfitDollar = totalRevenue - costToDate;
        const projectedProfitPercent =
          totalRevenue > 0 ? (projectedProfitDollar / totalRevenue) * 100 : 0;

        // Cash flow calculations
        const netCashFlow = cashIn - cashOut;
        const cashPositionPercent =
          cashOut > 0 ? (cashIn / cashOut) * 100 : 0;

        if (!cancelled) {
          setFinancials({
            contractAmount,
            coSalesTotal,
            billingsToDate,
            retainageToDate,
            remainingBillings,
            percentCompleteRevenue,
            contractBudget,
            coBudgetTotal,
            totalContractBudget,
            costToDate,
            remainingCost,
            percentCompleteCost,
            contractProfitPercent,
            changeOrderProfitPercent,
            totalProfitPercent,
            projectedProfitPercent,
            projectedProfitDollar,
            cashIn,
            cashOut,
            netCashFlow,
            cashPositionPercent,
          });
        }
      } catch (e) {
        console.error('Unexpected error loading project financials:', e);
        if (!cancelled) {
          setFinancials({
            contractAmount: 0,
            coSalesTotal: 0,
            billingsToDate: 0,
            retainageToDate: 0,
            remainingBillings: 0,
            percentCompleteRevenue: 0,
            contractBudget: 0,
            coBudgetTotal: 0,
            totalContractBudget: 0,
            costToDate: 0,
            remainingCost: 0,
            percentCompleteCost: 0,
            contractProfitPercent: 0,
            changeOrderProfitPercent: 0,
            totalProfitPercent: 0,
            projectedProfitPercent: 0,
            projectedProfitDollar: 0,
            cashIn: 0,
            cashOut: 0,
            netCashFlow: 0,
            cashPositionPercent: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, contractAmount, contractBudget, qboJobId]);

  return { loading, financials };
}
