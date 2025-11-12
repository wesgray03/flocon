export type Project = {
  id: string;
  name: string;
  type?: 'project' | 'prospect'; // Engagement type
  project_number?: string | null; // QuickBooks ID (renamed from qbid)
  customer_name?: string | null; // From project_dashboard view (computed from engagement_parties)
  manager?: string | null; // From project_dashboard view (computed from engagement_parties)
  company_owner?: string | null; // From engagement_parties with role='owner' (building owner company)
  architect?: string | null; // From project_dashboard view (computed from engagement_parties)
  project_lead?: string | null; // From project_dashboard view (computed from engagement_user_roles with role='project_lead')
  superintendent?: string | null; // From project_dashboard view (computed from engagement_user_roles)
  foreman?: string | null; // From project_dashboard view (computed from engagement_user_roles)
  sales_lead?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  contract_amount?: number | null;
  stage?: string | null; // Stage name
  stage_id?: string | null;
  stage_order?: number | null;
};

export type Stage = {
  id: string;
  name: string;
  order: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  user_type: 'Admin' | 'Office' | 'Field';
};

export type ProjectComment = {
  id: string;
  engagement_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_name?: string;
  user_type?: string;
};
