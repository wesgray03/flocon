import { supabase } from '@/lib/supabaseClient';

export type PartyRole =
  | 'customer'
  | 'architect'
  | 'general_contractor'
  | 'project_manager'
  | 'prospect_contact'
  | 'superintendent'
  | 'foreman'
  | 'estimator'
  | 'owner'
  | 'sales_contact'
  | 'subcontractor'
  | 'other';

export type PartyType = 'contact' | 'company';

export type EngagementPartyDetailed = {
  id: string;
  engagement_id: string;
  party_type: PartyType;
  party_id: string;
  role: PartyRole;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  engagement_name: string;
  party_name: string | null;
  party_email: string | null;
  party_phone: string | null;
  company_type: string | null;
};

// Fetch all primary parties for a set of engagements and roles
export async function getPrimaryPartiesForEngagements(
  engagementIds: string[],
  roles: PartyRole[]
): Promise<EngagementPartyDetailed[]> {
  if (engagementIds.length === 0) return [];
  
  // Query directly with joins instead of using view
  const { data, error } = await supabase
    .from('engagement_parties')
    .select(`
      id,
      engagement_id,
      party_type,
      party_id,
      role,
      is_primary,
      notes,
      created_at,
      updated_at,
      engagements!inner(name),
      contacts(name, email, phone, company_type:contact_type),
      companies(name, email, phone, company_type)
    `)
    .in('engagement_id', engagementIds)
    .in('role', roles)
    .eq('is_primary', true);
  
  if (error) throw error;
  
  // Map to the detailed format
  return (data ?? []).map((row: any) => ({
    id: row.id,
    engagement_id: row.engagement_id,
    party_type: row.party_type,
    party_id: row.party_id,
    role: row.role,
    is_primary: row.is_primary,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    engagement_name: row.engagements?.name || '',
    party_name: row.party_type === 'contact' ? row.contacts?.name : row.companies?.name,
    party_email: row.party_type === 'contact' ? row.contacts?.email : row.companies?.email,
    party_phone: row.party_type === 'contact' ? row.contacts?.phone : row.companies?.phone,
    company_type: row.party_type === 'contact' ? row.contacts?.company_type : row.companies?.company_type,
  })) as EngagementPartyDetailed[];
}

// Set primary party for a role, clearing any previous primary
export async function setPrimaryParty(options: {
  engagementId: string;
  role: PartyRole;
  partyType: PartyType;
  partyId: string | null;
  notes?: string | null;
}): Promise<void> {
  const { engagementId, role, partyType, partyId, notes = null } = options;

  // Clear existing primary for this role
  const { error: clearErr } = await supabase
    .from('engagement_parties')
    .update({ is_primary: false })
    .eq('engagement_id', engagementId)
    .eq('role', role)
    .eq('is_primary', true);
  if (clearErr) throw clearErr;

  if (!partyId) {
    // If null, we've cleared the primary and are done
    return;
  }

  // Upsert the specific party-role and set as primary
  const { error: upsertErr } = await supabase.from('engagement_parties').upsert(
    [
      {
        engagement_id: engagementId,
        party_type: partyType,
        party_id: partyId,
        role,
        is_primary: true,
        notes,
      },
    ],
    { onConflict: 'engagement_id,party_id,role' }
  );
  if (upsertErr) throw upsertErr;
}

// Convenience: sync three common roles based on optional IDs
export async function syncCorePrimaryParties(params: {
  engagementId: string;
  customerCompanyId?: string | null; // company_id
  projectManagerContactId?: string | null; // contact_id
  architectCompanyId?: string | null; // architect_id
}): Promise<void> {
  const {
    engagementId,
    customerCompanyId = null,
    projectManagerContactId = null,
    architectCompanyId = null,
  } = params;

  // Run sequentially to preserve constraint guarantees
  await setPrimaryParty({
    engagementId,
    role: 'customer',
    partyType: 'company',
    partyId: customerCompanyId ?? null,
  });

  await setPrimaryParty({
    engagementId,
    role: 'project_manager',
    partyType: 'contact',
    partyId: projectManagerContactId ?? null,
  });

  await setPrimaryParty({
    engagementId,
    role: 'architect',
    partyType: 'company',
    partyId: architectCompanyId ?? null,
  });
}
