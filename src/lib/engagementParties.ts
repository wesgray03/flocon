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

  // Fetch the parties first (without joins to avoid PostgREST complexity)
  const { data: parties, error: partiesError } = await supabase
    .from('engagement_parties')
    .select('*')
    .in('engagement_id', engagementIds)
    .in('role', roles)
    .eq('is_primary', true);

  if (partiesError) throw partiesError;
  if (!parties || parties.length === 0) return [];

  // Separate party IDs by type
  const contactIds = parties
    .filter((p) => p.party_type === 'contact')
    .map((p) => p.party_id);
  const companyIds = parties
    .filter((p) => p.party_type === 'company')
    .map((p) => p.party_id);

  // Fetch engagements, contacts, and companies in parallel
  const [engagementsRes, contactsRes, companiesRes] = await Promise.all([
    supabase.from('engagements').select('id, name').in('id', engagementIds),
    contactIds.length > 0
      ? supabase
          .from('contacts')
          .select('id, name, email, phone, contact_type')
          .in('id', contactIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length > 0
      ? supabase
          .from('companies')
          .select('id, name, email, phone, company_type')
          .in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (engagementsRes.error) throw engagementsRes.error;
  if (contactsRes.error) throw contactsRes.error;
  if (companiesRes.error) throw companiesRes.error;

  // Build lookup maps
  const engagementsMap = new Map(
    (engagementsRes.data || []).map((e) => [e.id, e])
  );
  const contactsMap = new Map((contactsRes.data || []).map((c) => [c.id, c]));
  const companiesMap = new Map((companiesRes.data || []).map((c) => [c.id, c]));

  // Map to detailed format
  return parties.map((party) => {
    const engagement = engagementsMap.get(party.engagement_id);
    const contact =
      party.party_type === 'contact' ? contactsMap.get(party.party_id) : null;
    const company =
      party.party_type === 'company' ? companiesMap.get(party.party_id) : null;

    return {
      id: party.id,
      engagement_id: party.engagement_id,
      party_type: party.party_type as PartyType,
      party_id: party.party_id,
      role: party.role as PartyRole,
      is_primary: party.is_primary,
      notes: party.notes,
      created_at: party.created_at,
      updated_at: party.updated_at,
      engagement_name: engagement?.name || '',
      party_name: contact?.name || company?.name || null,
      party_email: contact?.email || company?.email || null,
      party_phone: contact?.phone || company?.phone || null,
      company_type: contact?.contact_type || company?.company_type || null,
    };
  }) as EngagementPartyDetailed[];
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
