import type { Project } from '@/domain/projects/types';
import { useProjectFinancials } from '@/domain/projects/useProjectFinancials';
import { money } from '@/lib/format';
import * as styles from '@/styles/projectDetailStyles';
import { colors } from '@/styles/theme';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

// Centralized Financial Overview component consolidating duplicated desktop/mobile markup.
// Pulls live data from FloCon (pay apps, change orders, trades) and QuickBooks (payments).
export function FinancialOverview({
  project,
  variant = 'desktop',
}: {
  project: Project;
  variant?: 'desktop' | 'mobile';
}) {
  // Desktop variant shows two side-by-side columns; mobile stacks sections.
  const isDesktop = variant === 'desktop';
  const { financials, loading, refresh } = useProjectFinancials(
    project?.id,
    project?.contract_amount || 0,
    project?.contract_budget || 0,
    project?.qbo_job_id
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Helper to format percentages
  const pct = (value: number) => `${Math.round(value)}%`;

  return (
    <div style={styles.cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={styles.sectionHeaderStyle}>Financial Overview</h2>
        {project?.qbo_job_id && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: refreshing || loading ? '#f0f0f0' : '#0078d4',
              color: refreshing || loading ? '#999' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: refreshing || loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        )}
      </div>
      {loading && (
        <div style={{ color: colors.textSecondary }}>
          Loading financial data...
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
          gap: 24,
        }}
      >
        {/* Revenue / (Profit for desktop) */}
        <div>
          <SectionHeading title="Revenue" />
          <Table>
            {isDesktop ? (
              <>
                <Row
                  label="Contract Amount"
                  value={money(financials.contractAmount)}
                  bold
                />
                <Row
                  label="Change Orders"
                  value={money(financials.coSalesTotal)}
                  bold
                />
                <Row
                  label="Billings-to-date"
                  value={money(financials.billingsToDate)}
                  bold
                />
                <Row
                  label="Retainage-to-date"
                  value={money(financials.retainageToDate)}
                  bold
                />
                <Row
                  label="Remaining Billings"
                  value={money(financials.remainingBillings)}
                  bold
                />
                <Row
                  label="% Complete Revenue"
                  value={pct(financials.percentCompleteRevenue)}
                  bold
                />
              </>
            ) : (
              <>
                <Row
                  label="Contract Amount"
                  value={money(financials.contractAmount)}
                  bold
                />
                <Row
                  label="Billed to Date"
                  value={money(financials.billingsToDate)}
                  bold
                />
                <Row
                  label="Remaining to Bill"
                  value={money(financials.remainingBillings)}
                  bold
                />
                <Row
                  label="% Complete Billed"
                  value={pct(financials.percentCompleteRevenue)}
                  bold
                />
              </>
            )}
          </Table>

          {isDesktop && (
            <>
              <SectionHeading title="Profit" marginTop />
              <Table>
                {/* Consolidated: "Total GM %" and "Unadjusted GM%" */}
                <Row
                  label="Total Profit %"
                  value={pct(financials.totalProfitPercent)}
                  bold
                />
                {/* Consolidated: "Expected GM %" and "Projected GP %" */}
                <Row
                  label="Projected Profit %"
                  value={pct(financials.projectedProfitPercent)}
                  bold
                />
                {/* From former Gross Profit section */}
                <Row
                  label="Projected Profit ($)"
                  value={money(financials.projectedProfitDollar)}
                  bold
                />
              </Table>
            </>
          )}
        </div>

        {/* Cost / (Cash Flow for desktop) */}
        <div>
          <SectionHeading title="Cost" />
          <Table>
            {isDesktop ? (
              <>
                <Row
                  label="Contract Budget"
                  value={money(financials.contractBudget)}
                  bold
                />
                <Row
                  label="Change Order Cost Budget"
                  value={money(financials.coBudgetTotal)}
                  bold
                />
                <Row
                  label="Total Contract Cost Budget"
                  value={money(financials.totalContractBudget)}
                  bold
                />
                <Row
                  label="Cost-to-date"
                  value={money(financials.costToDate)}
                  bold
                />
                <Row
                  label="Remaining Cost"
                  value={money(financials.remainingCost)}
                  bold
                />
                <Row
                  label="% Complete Cost"
                  value={pct(financials.percentCompleteCost)}
                  bold
                />
              </>
            ) : (
              <>
                <Row
                  label="Total Budget Cost"
                  value={money(financials.totalContractBudget)}
                  bold
                />
                <Row
                  label="Spent to Date"
                  value={money(financials.costToDate)}
                  bold
                />
                <Row
                  label="Remaining Cost"
                  value={money(financials.remainingCost)}
                  bold
                />
                <Row
                  label="% Complete Cost"
                  value={pct(financials.percentCompleteCost)}
                  bold
                />
              </>
            )}
          </Table>

          {isDesktop ? (
            <>
              <SectionHeading title="Cash Flow" marginTop />
              <Table>
                <Row label="Cash In" value={money(financials.cashIn)} bold />
                <Row label="Cash Out" value={money(financials.cashOut)} bold />
                <Row
                  label="Net Cash Flow"
                  value={money(financials.netCashFlow)}
                  bold
                />
                <Row
                  label="Cash Position (+/-)"
                  value={pct(financials.cashPositionPercent)}
                  bold
                />
              </Table>
            </>
          ) : (
            <>
              <SectionHeading title="Cash Flow" marginTop />
              <Table>
                <Row label="Cash In" value={money(financials.cashIn)} bold />
                <Row label="Cash Out" value={money(financials.cashOut)} bold />
                <Row
                  label="Net Cash Flow"
                  value={money(financials.netCashFlow)}
                  bold
                />
              </Table>
              <SectionHeading title="Profit" marginTop />
              <Table>
                {/* Mobile view shows a concise subset */}
                <Row
                  label="Total Profit %"
                  value={pct(financials.totalProfitPercent)}
                  bold
                />
                <Row
                  label="Projected Profit %"
                  value={pct(financials.projectedProfitPercent)}
                  bold
                />
                <Row
                  label="Projected Profit ($)"
                  value={money(financials.projectedProfitDollar)}
                  bold
                />
              </Table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  marginTop = false,
}: {
  title: string;
  marginTop?: boolean;
}) {
  return (
    <h3
      style={{
        fontSize: 18,
        fontWeight: 700,
        margin: marginTop ? '32px 0 16px 0' : '0 0 16px 0',
        color: colors.textPrimary,
      }}
    >
      {title}
    </h3>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>{children}</tbody>
    </table>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <tr style={{ borderBottom: '1px solid #e5dfd5' }}>
      <td
        style={{
          padding: '8px 0',
          fontSize: 14,
          color: colors.textSecondary,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '8px 0',
          fontSize: 14,
          textAlign: 'right',
          fontWeight: bold ? 600 : 400,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
