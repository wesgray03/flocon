import type { Project } from '@/domain/projects/types';
import { money } from '@/lib/format';
import * as styles from '@/styles/projectDetailStyles';
import { colors } from '@/styles/theme';

// Centralized Financial Overview component consolidating duplicated desktop/mobile markup.
// Currently uses placeholder zeros for metrics not yet implemented.
// Extend by passing computed financial aggregates (billings, retainage, costs, etc.) via props later.
export function FinancialOverview({
  project,
  variant = 'desktop',
}: {
  project: Project;
  variant?: 'desktop' | 'mobile';
}) {
  // Desktop variant shows two side-by-side columns; mobile stacks sections.
  const isDesktop = variant === 'desktop';

  return (
    <div style={styles.cardStyle}>
      <h2 style={styles.sectionHeaderStyle}>Financial Overview</h2>
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
                  value={money(project.contract_amount || 0)}
                  bold
                />
                <Row label="Change Orders" value={money(0)} bold />
                <Row label="Billings-to-date" value={money(0)} bold />
                <Row label="Retainage-to-date" value={money(0)} bold />
                <Row label="Remaining Billings" value={money(0)} bold />
                <Row label="% Complete Revenue" value={'0%'} bold />
              </>
            ) : (
              <>
                <Row
                  label="Contract Amount"
                  value={money(project.contract_amount || 0)}
                  bold
                />
                <Row label="Billed to Date" value={money(0)} bold />
                <Row label="Remaining to Bill" value={money(0)} bold />
                <Row label="% Complete Billed" value={'0%'} bold />
              </>
            )}
          </Table>

          {isDesktop && (
            <>
              <SectionHeading title="Profit" marginTop />
              <Table>
                <Row label="Contract Profit %" value={'0%'} bold />
                <Row label="Change Order Profit %" value={'0%'} bold />
                {/* Consolidated: "Total GM %" and "Unadjusted GM%" */}
                <Row label="Total Profit %" value={'0%'} bold />
                {/* Consolidated: "Expected GM %" and "Projected GP %" */}
                <Row label="Projected Profit %" value={'0%'} bold />
                {/* From former Gross Profit section */}
                <Row label="Projected Profit ($)" value={money(0)} bold />
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
                <Row label="Contract Budget" value={money(0)} bold />
                <Row label="Change Order Cost Budget" value={money(0)} bold />
                <Row label="Total Contract Cost Budget" value={money(0)} bold />
                <Row label="Cost-to-date" value={money(0)} bold />
                <Row label="Remaining Cost" value={money(0)} bold />
                <Row label="% Complete Cost" value={'0%'} bold />
              </>
            ) : (
              <>
                <Row label="Total Budget Cost" value={money(0)} bold />
                <Row label="Spent to Date" value={money(0)} bold />
                <Row label="Remaining Cost" value={money(0)} bold />
                <Row label="% Complete Cost" value={'0%'} bold />
              </>
            )}
          </Table>

          {isDesktop ? (
            <>
              <SectionHeading title="Cash Flow" marginTop />
              <Table>
                <Row label="Cash In" value={money(0)} bold />
                <Row label="Cash Out" value={money(0)} bold />
                <Row label="Net Cash Flow" value={money(0)} bold />
                <Row label="Cash Position (+/-)" value={'0%'} bold />
              </Table>
            </>
          ) : (
            <>
              <SectionHeading title="Cash Flow" marginTop />
              <Table>
                <Row label="Cash In" value={money(0)} bold />
                <Row label="Cash Out" value={money(0)} bold />
                <Row label="Net Cash Flow" value={money(0)} bold />
              </Table>
              <SectionHeading title="Profit" marginTop />
              <Table>
                {/* Mobile view shows a concise subset */}
                <Row label="Total Profit %" value={'0%'} bold />
                <Row label="Projected Profit %" value={'0%'} bold />
                <Row label="Projected Profit ($)" value={money(0)} bold />
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
