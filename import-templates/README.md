# Additional Import Templates

These templates are for additional features and extension tables. Import these AFTER the core data (templates 01-10).

All templates now use sequential UUIDs in the 80000000+ range for easy identification.

## Company Extension Tables

### 11. Vendor Details

**File:** `11-company-vendor-details-template.csv`  
**Table:** `company_vendor_details`  
**Purpose:** Vendor-specific information for companies marked as vendors

Columns: `id`, `company_id`, `account_number`, `w9_status`, `payment_terms`, `preferred_vendor`, `notes`, `created_at`

**Note:** Only create records for companies where `is_vendor = true`

### 12. Subcontractor Details

**File:** `12-company-subcontractor-details-template.csv`  
**Table:** `company_subcontractor_details`  
**Purpose:** Subcontractor-specific information (insurance, licenses, compliance)

Columns: `id`, `company_id`, `insurance_status`, `insurance_exp_date`, `license_number`, `license_state`, `license_exp_date`, `scope_of_work`, `compliance_status`, `notes`, `created_at`

**Note:** Only create records for companies where `is_subcontractor = true`

## Stage Tasks

### 13. Engagement Tasks (Stage Templates)

**File:** `13-engagement-tasks-template.csv`  
**Table:** `engagement_tasks`  
**Purpose:** Define reusable task templates per stage

Columns: `id`, `name`, `stage_id`, `order_num`, `description`, `created_at`

**Example:** "Submit insurance documents" task for "Contract Onboarding" stage

### 14. Task Completion Tracking

**File:** `14-engagement-task-completion-template.csv`  
**Table:** `engagement_task_completion`  
**Purpose:** Track which tasks are completed for specific engagements

Columns: `id`, `engagement_id`, `task_id`, `complete`, `completed_at`, `completed_by_user_id`, `created_at`

**Note:** Only needed if you want to pre-populate task completion status for existing projects

## Comments and Activity

### 15. Engagement Comments

**File:** `15-engagement-comments-template.csv`  
**Table:** `engagement_comments`  
**Purpose:** Comments and notes on engagements

Columns: `id`, `engagement_id`, `user_id`, `comment_text`, `created_at`, `updated_at`

**Note:** Use datetime format `YYYY-MM-DD HH:MM:SS` for timestamps

## Financial Details

### 16. Schedule of Values (SOV)

**File:** `16-engagement-sov-lines-template.csv`  
**Table:** `engagement_sov_lines`  
**Purpose:** Detailed line items for project billing (schedule of values)

Columns: `id`, `engagement_id`, `line_number`, `description`, `scheduled_value`, `work_completed`, `materials_stored`, `total_completed`, `percent_complete`, `created_at`

**Note:** Line items should sum to contract amount + change orders. Used for detailed AIA-style billing.

## Import Order for Optional Templates

Import these **after** core templates (01-10):

1. **11-company-vendor-details** (references companies)
2. **12-company-subcontractor-details** (references companies)
3. **13-engagement-tasks** (references stages)
4. **14-engagement-task-completion** (references engagements and tasks)
5. **15-engagement-comments** (references engagements and users)
6. **16-engagement-sov-lines** (references engagements)

## UUID Ranges

- **81000000** series: Vendor details
- **82000000** series: Subcontractor details
- **83000000** series: Engagement tasks (stage templates)
- **84000000** series: Task completion tracking
- **85000000** series: Comments
- **86000000** series: SOV lines
