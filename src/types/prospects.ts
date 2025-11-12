/**
 * TypeScript Type Definitions for Prospects & Projects
 *
 * Use these types in your Next.js frontend for type safety
 */

// Enums from database
export type EngagementType = 'prospect' | 'project';

export type PipelineStatus =
  | 'lead' // Initial contact/inquiry
  | 'qualified' // Qualified lead worth pursuing
  | 'proposal_prep' // Preparing proposal/estimate
  | 'proposal_sent' // Proposal submitted, awaiting response
  | 'negotiation' // In negotiations
  | 'verbal_commit' // Verbal agreement received
  | 'won' // Contract signed (ready to convert)
  | 'lost' // Did not win the bid
  | 'on_hold'; // Paused/delayed by customer

export type LeadSource =
  | 'referral'
  | 'website'
  | 'repeat_customer'
  | 'trade_show'
  | 'cold_call'
  | 'architect'
  | 'gc_relationship'
  | 'other';

// Lost reason lookup type
export interface LostReason {
  id: string;
  reason: string;
  description: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

// Core engagement type (both prospects and projects)
// Note: Party relationships (customer, PM, architect) are managed via engagement_parties junction table
export interface Engagement {
  id: string;
  type: EngagementType;
  name: string;

  // Related entities
  stage_id: string | null;

  // Basic info
  address: string | null;
  city: string | null;
  state: string | null;
  manager: string | null;
  user_id: string | null; // FK to users table for engagement owner
  project_number: string | null;

  // Financial
  bid_amount: number | null;
  contract_amount: number | null;

  // Dates
  start_date: string | null; // Actual start (projects only)
  end_date: string | null;
  est_start_date: string | null; // Estimated/planned start
  expected_close_date: string | null; // When we expect to win (prospects)

  // Prospect-specific fields (null for projects)
  // Note: pipeline_status removed - not in current schema
  probability_level_id: string | null; // FK to probability_levels table
  lead_source: LeadSource | null;
  lost_reason: string | null; // Legacy text field
  lost_reason_id: string | null; // FK to lost_reasons table

  // Tracking fields
  last_call: string | null; // Date of last contact
  active: boolean; // Whether engagement is actively being pursued

  // Project-specific fields (null for prospects)
  sharepoint_folder: string | null;

  // Conversion tracking
  converted_to_project_at: string | null;
  converted_by_user_id: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_from_excel: boolean;
}

// Prospect view (cleaner for UI)
// Note: customer_name is resolved via engagement_parties_detailed view, not a direct FK
export interface Prospect {
  id: string;
  name: string;
  customer_name: string | null; // Resolved from engagement_parties
  address: string | null;
  city: string | null;
  state: string | null;
  manager: string | null;
  user_id: string | null; // FK to users table for prospect owner

  // Legacy fields for backward compatibility
  sales_contact_name: string | null;
  sales_contact_email: string | null;
  sales_contact_phone: string | null;

  // Note: pipeline_status removed - not in current schema
  probability_level_id: string | null;
  expected_close_date: string | null;
  lead_source: LeadSource | null;
  bid_amount: number | null;
  est_start_date: string | null;
  lost_reason: string | null;
  lost_reason_id: string | null;
  last_call: string | null;
  active: boolean;

  // Aggregated trade info
  trade_count: number;
  total_estimated: number | null;

  created_at: string;
  updated_at: string;
}

// Project view (replaces old projects queries)
// Note: customer_name is resolved via engagement_parties_detailed view, not a direct FK
export interface Project {
  id: string;
  project_number: string | null; // QuickBooks ID (formerly qbid)
  name: string;
  customer_name: string | null; // Resolved from engagement_parties
  address: string | null;
  city: string | null;
  state: string | null;
  manager: string | null;
  user_id: string | null; // FK to users table for project owner

  stage_id: string | null;
  stage_name: string | null;

  contract_amount: number | null;
  bid_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  est_start_date: string | null;

  sharepoint_folder: string | null;

  converted_to_project_at: string | null;
  converted_by_user_id: string | null;
  converted_by_name: string | null;

  // Aggregated trade info
  trade_count: number;
  total_estimated: number | null;
  total_actual_cost: number | null;

  created_at: string;
  updated_at: string;
}

// Trade reference
export interface Trade {
  id: string;
  code: string; // e.g., "06.61.13"
  name: string; // e.g., "Milladen"
  division: string | null; // e.g., "06 - Wood & Plastics"
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Engagement-Trade relationship
export interface EngagementTrade {
  id: string;
  engagement_id: string;
  trade_id: string;
  estimated_amount: number | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Detailed trade view (with joined data)
export interface EngagementTradeDetail {
  engagement_id: string;
  engagement_name: string;
  engagement_type: EngagementType;
  trade_code: string;
  trade_name: string;
  trade_division: string | null;
  estimated_amount: number | null;
  actual_cost: number | null;
  trade_notes: string | null;
  trade_added_at: string;
}

// Hot prospect (for dashboard)
export interface HotProspect {
  id: string;
  name: string;
  customer_name: string | null;
  // Note: pipeline_status removed - not in current schema
  probability: number | null;
  expected_close_date: string | null;
  bid_amount: number | null;
  manager: string | null;
  user_id: string | null; // FK to users table
  sales_contact_name: string | null;
  sales_contact_phone: string | null;
  days_until_close: number | null;
  total_estimated: number | null;
}

// Pipeline summary (for metrics)
export interface PipelineSummary {
  // Note: pipeline_status removed - not in current schema
  prospect_count: number;
  total_bid_amount: number | null;
  avg_probability: number | null;
  weighted_value: number | null; // bid_amount * probability
}

// Form data types for creating/editing
// Note: Party relationships are managed via syncCorePrimaryParties helper, not direct FK assignment
export interface CreateProspectInput {
  name: string;
  // Note: pipeline_status removed - not in current schema
  probability?: number;
  expected_close_date?: string;
  lead_source?: LeadSource;
  bid_amount?: number;
  est_start_date?: string;
  address?: string;
  city?: string;
  state?: string;
  manager?: string;
  owner?: string;
  scope_summary?: string;
  notes?: string;
}

export interface UpdateProspectInput extends Partial<CreateProspectInput> {
  id: string;
}

export interface PromoteProspectInput {
  engagement_id: string;
  project_number?: string; // QuickBooks ID (renamed from qbid)
  contract_amount?: number;
  initial_stage_id?: string;
}

export interface MarkLostInput {
  engagement_id: string;
  lost_reason: string;
}

// Supabase RPC function types
export interface ProspectPromotionResult {
  success: boolean;
  engagement_id: string;
  error?: string;
}

// React Query hook types (example)
export type UseProspectsQueryResult = {
  prospects: Prospect[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export type UseProjectsQueryResult = {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

// Filter/sort options for UI
export interface ProspectFilters {
  // Note: pipeline_status removed - not in current schema
  probability_min?: number;
  probability_max?: number;
  expected_close_before?: string;
  expected_close_after?: string;
  lead_source?: LeadSource[];
  manager?: string;
  owner?: string;
}

export interface ProspectSortOptions {
  field:
    | 'name'
    | 'probability'
    | 'expected_close_date'
    | 'bid_amount'
    | 'updated_at';
  direction: 'asc' | 'desc';
}

// Contact type (from existing contacts table)
export interface Contact {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  contact_type:
    | 'Project Manager'
    | 'Superintendent'
    | 'Estimator'
    | 'Accounting'
    | 'Other';
  created_at: string;
  updated_at: string;
}

// Customer/Company type (referenced by engagements)
export interface Company {
  id: string;
  name: string;
  company_type: 'Contractor' | 'Architect' | 'Owner';
  is_customer: boolean;
  // Add other company fields as needed
}

// Stage type (for projects)
export interface Stage {
  id: string;
  name: string;
  created_at: string;
}

// User type (for permissions and tracking)
export interface User {
  id: string;
  name: string;
  email: string;
  user_type: 'Admin' | 'Office' | 'Field';
  can_manage_prospects?: boolean;
  can_manage_projects?: boolean;
  created_at: string;
  updated_at: string;
}
