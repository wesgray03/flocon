import { StageBadge } from '@/components/project/StageBadge';
import { MultiFilterInput } from '@/components/ui/multi-filter-input';
import type {
  Filters,
  ProjectListRow as Row,
  SortKey,
} from '@/domain/projects/useProjectsListCore';
import { dateStr, money } from '@/lib/format';
import { colors } from '@/styles/theme';
import { Folder, Pencil, Trash2 } from 'lucide-react';
import React from 'react';

export type UniqueValues = {
  project_number: string[];
  project_name: string[];
  customer_name: string[];
  owner: string[];
  stage: string[];
};

type Props = {
  rows: Row[]; // filtered and sorted rows to render
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  uniqueValues: UniqueValues;
  onSort: (key: SortKey) => void;
  sortIndicator: (key: SortKey) => string;
  onRowClick: (row: Row) => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => Promise<void> | void;
};

export function ProjectsTable({
  rows,
  filters,
  setFilters,
  uniqueValues,
  onSort,
  sortIndicator,
  onRowClick,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className="projects-table-container"
      style={{
        background: '#faf8f5',
        border: '1px solid #e5dfd5',
        borderRadius: 12,
        padding: 16,
        overflowX: 'auto',
        overflowY: 'visible',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <table
        style={{
          width: '100%',
          fontSize: 14,
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr
            style={{
              background: '#f0ebe3',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <th style={thQBID} onClick={() => onSort('project_number')}>
              Project #{sortIndicator('project_number')}
            </th>
            <th style={thProjectName} onClick={() => onSort('project_name')}>
              Project Name{sortIndicator('project_name')}
            </th>
            <th style={thCustomer} onClick={() => onSort('customer_name')}>
              Customer{sortIndicator('customer_name')}
            </th>
            <th
              style={thProjectManager}
              onClick={() => onSort('project_manager')}
            >
              Project Manager{sortIndicator('project_manager')}
            </th>
            <th style={thOwner} onClick={() => onSort('owner')}>
              Project Lead{sortIndicator('owner')}
            </th>
            <th style={thStage} onClick={() => onSort('stage')}>
              Stage{sortIndicator('stage')}
            </th>
            <th style={thMoney} onClick={() => onSort('contract_amt')}>
              Contract{sortIndicator('contract_amt')}
            </th>
            <th style={thMoney} onClick={() => onSort('co_amt')}>
              Change Orders{sortIndicator('co_amt')}
            </th>
            <th style={thMoney} onClick={() => onSort('total_amt')}>
              Total{sortIndicator('total_amt')}
            </th>
            <th style={thMoney} onClick={() => onSort('billed_amt')}>
              Billings{sortIndicator('billed_amt')}
            </th>
            <th style={thMoney} onClick={() => onSort('balance')}>
              Balance{sortIndicator('balance')}
            </th>
            <th style={thDate} onClick={() => onSort('start_date')}>
              Start{sortIndicator('start_date')}
            </th>
            <th style={thDate} onClick={() => onSort('end_date')}>
              End{sortIndicator('end_date')}
            </th>
            <th style={thActions}>Actions</th>
          </tr>
          {/* Filter row */}
          <tr>
            <th style={thQBID}>
              <MultiFilterInput
                values={filters.project_number}
                onChangeValues={(vals) =>
                  setFilters((f) => ({ ...f, project_number: vals }))
                }
                suggestions={uniqueValues.project_number}
                placeholder="Filter Project #..."
              />
            </th>
            <th style={thProjectName}>
              <MultiFilterInput
                values={filters.project_name}
                onChangeValues={(vals) =>
                  setFilters((f) => ({ ...f, project_name: vals }))
                }
                suggestions={uniqueValues.project_name}
                placeholder="Filter project name..."
              />
            </th>
            <th style={thCustomer}>
              <MultiFilterInput
                values={filters.customer_name}
                onChangeValues={(vals) =>
                  setFilters((f) => ({ ...f, customer_name: vals }))
                }
                suggestions={uniqueValues.customer_name}
                placeholder="Filter customer..."
              />
            </th>
            <th style={thProjectManager}></th>
            <th style={thOwner}>
              <MultiFilterInput
                values={filters.owner}
                onChangeValues={(vals) =>
                  setFilters((f) => ({ ...f, owner: vals }))
                }
                suggestions={uniqueValues.owner}
                placeholder="Filter owner..."
              />
            </th>
            <th style={thStage}>
              <MultiFilterInput
                values={filters.stage}
                onChangeValues={(vals) =>
                  setFilters((f) => ({ ...f, stage: vals }))
                }
                suggestions={uniqueValues.stage}
                placeholder="Filter stage..."
              />
            </th>
            {/* Empty cells for non-filtered columns */}
            <th style={thMoney}></th>
            <th style={thMoney}></th>
            <th style={thMoney}></th>
            <th style={thMoney}></th>
            <th style={thMoney}></th>
            <th style={thDate}></th>
            <th style={thDate}></th>
            <th style={thActions}>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    project_number: [],
                    project_name: [],
                    customer_name: [],
                    owner: [],
                    stage: [],
                  });
                }}
                style={{
                  background: '#ebe5db',
                  color: colors.textPrimary,
                  border: '1px solid #e5dfd5',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 13,
                  cursor: 'pointer',
                  margin: 0,
                  minWidth: 0,
                  minHeight: 0,
                  lineHeight: 1.2,
                }}
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.tagName === 'A' ||
                  target.tagName === 'BUTTON' ||
                  target.closest('a') ||
                  target.closest('button')
                ) {
                  return;
                }
                onRowClick(r);
              }}
              style={{
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                  '#f0ebe3';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                  'transparent';
              }}
            >
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{r.project_number ?? '—'}</span>
                  {r.qbo_job_id && (
                    <span
                      title="Synced to QuickBooks"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#10b981',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      QB
                    </span>
                  )}
                </div>
              </td>
              <td style={td}>
                <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
                  {r.project_name}
                </span>
              </td>
              <td style={td}>{r.customer_name ?? '—'}</td>
              <td style={td}>{r.project_manager ?? '—'}</td>
              <td style={td}>{r.owner ?? '—'}</td>
              <td style={td}>
                <StageBadge stage={r.stage} order={r.stage_order} />
              </td>
              <td style={tdRight}>{money(r.contract_amt)}</td>
              <td style={tdRight}>{money(r.co_amt)}</td>
              <td style={tdRight}>{money(r.total_amt)}</td>
              <td style={tdRight}>{money(r.billed_amt)}</td>
              <td style={tdRight}>{money(r.balance)}</td>
              <td style={td}>{dateStr(r.start_date)}</td>
              <td style={td}>{dateStr(r.end_date)}</td>
              <td style={tdCenter} onClick={(e) => e.stopPropagation()}>
                {r.sharepoint_folder && (
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: colors.navy,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        r.sharepoint_folder!,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    title="Open project folder in SharePoint"
                    aria-label="Open project folder"
                  >
                    <Folder size={16} />
                  </button>
                )}
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: colors.navy,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => onEdit(r)}
                  title="Edit project"
                  aria-label="Edit project"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: colors.logoRed,
                    marginLeft: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={async () => {
                    await onDelete(r);
                  }}
                  title="Delete project"
                  aria-label="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  fontWeight: 600,
  color: colors.textPrimary,
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: '#f0ebe3',
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = {
  ...th,
  textAlign: 'center',
  cursor: 'default',
};
const thQBID: React.CSSProperties = {
  ...th,
  width: 80,
  minWidth: 80,
  maxWidth: 80,
};
const thProjectName: React.CSSProperties = { ...th, width: 250, minWidth: 200 };
const thCustomer: React.CSSProperties = { ...th, width: 180, minWidth: 150 };
const thProjectManager: React.CSSProperties = {
  ...th,
  width: 180,
  minWidth: 150,
};
const thOwner: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thStage: React.CSSProperties = { ...th, width: 160, minWidth: 140 };
const thMoney: React.CSSProperties = { ...thRight, width: 110, minWidth: 100 };
const thDate: React.CSSProperties = { ...th, width: 100, minWidth: 90 };
const thActions: React.CSSProperties = { ...thCenter, width: 80, minWidth: 80 };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };
