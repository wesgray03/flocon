import type { Project } from '@/domain/projects/types';
import { dateStr, money } from '@/lib/format';
import * as styles from '@/styles/projectDetailStyles';
import { colors } from '@/styles/theme';
import { Pencil, Save } from 'lucide-react';
import SubcontractorsSection from './SubcontractorsSection';

type StageOpt = { id: string; name: string; order: number };

export type EditForm = {
  name: string;
  project_number: string;
  customer_name: string;
  manager: string;
  architect: string;
  owner_company: string;
  superintendent: string;
  project_lead: string;
  foreman: string;
  sales_lead: string;
  start_date: string;
  end_date: string;
  stage_id: string;
  contract_amount: string;
  contract_budget: string;
};

export function ProjectInfoCard(props: {
  project: Project;
  projectId: string;
  editMode: boolean;
  editForm: EditForm;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChange: (field: keyof EditForm, value: string) => void;
  saving: boolean;
  partiesLoaded: boolean;
  stageOptions: StageOpt[];
  customerOptions: string[];
  managerOptions: string[];
  architectOptions: string[];
  ownerCompanyOptions: string[];
  superintendentOptions: string[];
  userOptions: string[];
}) {
  const {
    project,
    editMode,
    editForm,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onChange,
    saving,
    partiesLoaded,
    stageOptions,
    customerOptions,
    managerOptions,
    architectOptions,
    ownerCompanyOptions,
    superintendentOptions,
    userOptions,
  } = props;

  return (
    <div style={styles.projectInfoCardStyle} className="project-info-card">
      {/* Header with Edit/Save/Cancel Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '2px solid #1e3a5f',
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            color: colors.textPrimary,
          }}
        >
          Project Information
        </h2>
        {!editMode ? (
          <button
            onClick={onStartEdit}
            style={{
              padding: '6px 8px',
              background: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Edit project"
            aria-label="Edit project"
          >
            <Pencil size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCancelEdit}
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
              onClick={onSaveEdit}
              disabled={saving}
              style={{
                padding: '6px 12px',
                background: '#1e3a5f',
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
              {saving ? (
                'Saving…'
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Save size={16} />
                  Save
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {editMode && (
          <div style={styles.editFormContainerStyle}>
            {/* General Info */}
            <div style={styles.sectionDividerStyle}>
              <p style={styles.sectionTitleStyle}>General</p>
              {project.type === 'project' && (
                <div style={styles.formFieldStyle}>
                  <label style={styles.labelStyle}>Project Number</label>
                  <input
                    value={editForm.project_number}
                    onChange={(e) => onChange('project_number', e.target.value)}
                    style={styles.inputStyle}
                    placeholder="Project Number"
                  />
                </div>
              )}
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Project Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Project Name"
                />
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Contract Amount</label>
                <input
                  type="number"
                  value={editForm.contract_amount}
                  onChange={(e) => onChange('contract_amount', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="0.00"
                />
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Contract Budget</label>
                <input
                  type="number"
                  value={editForm.contract_budget}
                  onChange={(e) => onChange('contract_budget', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="0.00"
                />
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => onChange('start_date', e.target.value)}
                  style={styles.inputStyle}
                />
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Finish Date</label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => onChange('end_date', e.target.value)}
                  style={styles.inputStyle}
                />
              </div>
            </div>

            {/* Customer / Parties */}
            <div style={styles.sectionDividerStyle}>
              <p style={styles.sectionTitleStyle}>Customer / Parties</p>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Customer</label>
                <input
                  list="customer-options"
                  value={editForm.customer_name}
                  onChange={(e) => onChange('customer_name', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Customer Name"
                />
                <datalist id="customer-options">
                  {customerOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Project Manager</label>
                <input
                  list="manager-options"
                  value={editForm.manager}
                  onChange={(e) => onChange('manager', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Project Manager"
                />
                <datalist id="manager-options">
                  {managerOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Owner</label>
                <input
                  list="owner-company-options"
                  value={editForm.owner_company}
                  onChange={(e) => onChange('owner_company', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Owner"
                />
                <datalist id="owner-company-options">
                  {ownerCompanyOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Architect</label>
                <input
                  list="architect-options"
                  value={editForm.architect}
                  onChange={(e) => onChange('architect', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Architect"
                />
                <datalist id="architect-options">
                  {architectOptions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Superintendent</label>
                <input
                  list="superintendent-options"
                  value={editForm.superintendent}
                  onChange={(e) => onChange('superintendent', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Superintendent"
                />
                <datalist id="superintendent-options">
                  {superintendentOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Team */}
            <div style={styles.sectionDividerStyle}>
              <p style={styles.sectionTitleStyle}>Team</p>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Project Lead</label>
                <input
                  list="project-lead-options"
                  value={editForm.project_lead}
                  onChange={(e) => onChange('project_lead', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Project Lead"
                />
                <datalist id="project-lead-options">
                  {userOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Foreman</label>
                <input
                  list="foreman-options"
                  value={editForm.foreman}
                  onChange={(e) => onChange('foreman', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Foreman"
                />
                <datalist id="foreman-options">
                  {userOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <div style={styles.formFieldStyle}>
                <label style={styles.labelStyle}>Sales Lead</label>
                <input
                  list="sales-lead-options"
                  value={editForm.sales_lead}
                  onChange={(e) => onChange('sales_lead', e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Sales Lead"
                />
                <datalist id="sales-lead-options">
                  {userOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
            </div>
            {/* Stage selection removed; now handled in stage/task modal */}
          </div>
        )}

        {!editMode && (
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                color: colors.gray,
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
                color: colors.textPrimary,
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
                color: colors.gray,
                marginBottom: 4,
              }}
            >
              Contract Budget
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: colors.textPrimary,
              }}
            >
              {money(project.contract_budget || 0)}
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
                color: colors.gray,
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
                color: colors.textPrimary,
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
                color: colors.gray,
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
                color: colors.textPrimary,
              }}
            >
              {dateStr(project.end_date)}
            </p>
          </div>
        )}

        {!editMode && (
          <div style={styles.sectionDividerStyle}>
            <p style={styles.sectionTitleStyle}>Customer / Parties</p>
            <DetailItem label="Customer" value={project.customer_name} />
            <div style={{ marginTop: 8 }}>
              <DetailItem label="Project Manager" value={project.manager} />
            </div>
            <div style={{ marginTop: 8 }}>
              <DetailItem label="Owner" value={project.company_owner} />
            </div>
            <div style={{ marginTop: 8 }}>
              <DetailItem label="Architect" value={project.architect} />
            </div>
            <div style={{ marginTop: 8 }}>
              <DetailItem
                label="Superintendent"
                value={project.superintendent}
              />
            </div>
            {!partiesLoaded && (
              <p
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 12,
                }}
              >
                Loading parties…
              </p>
            )}
          </div>
        )}

        {!editMode && (
          <div style={styles.sectionDividerStyle}>
            <p style={styles.sectionTitleStyle}>Team</p>
            <DetailItem label="Project Lead" value={project.project_lead} />
            <div style={{ marginTop: 8 }}>
              <DetailItem label="Foreman" value={project.foreman} />
            </div>
            <div style={{ marginTop: 8 }}>
              <DetailItem label="Sales Lead" value={project.sales_lead} />
            </div>
          </div>
        )}

        {!editMode && (
          <div style={styles.sectionDividerStyle}>
            <SubcontractorsSection projectId={props.projectId} />
          </div>
        )}
      </div>
    </div>
  );
}

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div>
    <p style={styles.detailLabelStyle}>{label}</p>
    <p style={styles.detailValueStyle}>{value || '—'}</p>
  </div>
);
