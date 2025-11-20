// pages/prospects/index.tsx — Prospects Dashboard (with Bid Date + Trade Editing)
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SharedMenu } from '@/components/layout/SharedMenu';
import { CompaniesModal } from '@/components/modals/CompaniesModal';
import { ContactsModal } from '@/components/modals/ContactsModal';
import { LostReasonsModal } from '@/components/modals/LostReasonsModal';
import { MasterDataModal } from '@/components/modals/MasterDataModal';
import { UsersModal } from '@/components/modals/UsersModal';
import { MultiFilterInput } from '@/components/ui/multi-filter-input';
import {
  getPrimaryPartiesForEngagements,
  setPrimaryParty,
  syncCorePrimaryParties,
  type PartyRole,
} from '@/lib/engagementParties';
import {
  getPrimaryUserRolesForEngagements,
  setPrimaryUserRole,
} from '@/lib/engagementUserRoles';
import { dateStr } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectStyles';
import { colors } from '@/styles/theme';
import { Folder, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Filters = {
  name: string[];
  customer: string[];
  contact: string[];
  owner: string[];
  architect: string[];
  estimating_type: string[];
  probability_level: string[];
};

type SortKey =
  | 'none'
  | 'name'
  | 'customer_name'
  | 'owner_name'
  | 'probability_level_name'
  | 'probability_percentage'
  | 'extended'
  | 'estimating_type'
  | 'bid_amount'
  | 'bid_date'
  | 'last_call';

type SortOrder = 'asc' | 'desc';

interface Prospect {
  id: string;
  name: string;
  company_id: string | null;
  customer_name: string | null; // Joined from companies
  contact_id: string | null;
  contact_name: string | null; // Joined from contacts
  user_id: string | null; // FK to users table for prospect owner
  owner_name: string | null; // Resolved owner name from user_id
  architect_id: string | null;
  architect_name: string | null; // Joined from companies
  bid_date: string | null;
  estimating_type: 'Budget' | 'Construction' | null;
  stage: string | null;
  last_call: string | null;
  status: string | null;
  lost_reason_name: string | null;
  probability_level_id: string | null;
  probability_level_name: string | null;
  probability_percentage: number | null;
  est_start: string | null;
  trades: { id: string; code: string; name: string; amount: number }[]; // include trade_id for editing
  extended: number | null;
  bid_amount: number | null;
  sharepoint_folder: string | null;
}

export default function ProspectsPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal states
  const [companiesModal, setCompaniesModal] = useState<{
    open: boolean;
    companyType:
      | 'Contractor'
      | 'Architect'
      | 'Owner'
      | 'Subcontractor'
      | 'Vendor'
      | null;
    label: string;
  }>({ open: false, companyType: null, label: '' });
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showLostReasonsModal, setShowLostReasonsModal] = useState(false);

  const [showMaster, setShowMaster] = useState<null | {
    table: 'stages' | 'engagement_tasks';
    label: string;
  }>(null);
  const openMaster = (table: 'stages' | 'engagement_tasks', label: string) => {
    setShowMaster({ table, label });
  };
  const closeMaster = () => setShowMaster(null);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Sort and Filter state
  const [sortKey, setSortKey] = useState<SortKey>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<Filters>({
    name: [],
    customer: [],
    contact: [],
    owner: [],
    architect: [],
    estimating_type: [],
    probability_level: [],
  });

  // Edit/Delete state
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company_id: '',
    contact_id: '',
    owner: '',
    architect_id: '',
    estimating_type: 'Budget' as 'Budget' | 'Construction',
    probability_level_id: '',
    bid_date: '',
    last_call: '',
    active: 'true',
    lost_reason_id: '',
    sharepoint_folder: '',
  });

  // Trades editing state (array of lines)
  const [tradeLines, setTradeLines] = useState<
    { trade_id: string; amount: string }[]
  >([]);

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [contactOptions, setContactOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [ownerOptions, setOwnerOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [architectOptions, setArchitectOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [probabilityLevels, setProbabilityLevels] = useState<
    { id: string; name: string; percentage: number; color: string }[]
  >([]);
  const [lostReasons, setLostReasons] = useState<
    { id: string; reason: string }[]
  >([]);
  const [tradeOptions, setTradeOptions] = useState<
    { id: string; code: string; name: string }[]
  >([]);

  // Unique values for filter suggestions
  const uniqueValues = useMemo(
    () => ({
      name: Array.from(new Set(prospects.map((p) => p.name))),
      customer: Array.from(
        new Set(
          prospects.map((p) => p.customer_name).filter((v): v is string => !!v)
        )
      ),
      contact: Array.from(
        new Set(
          prospects.map((p) => p.contact_name).filter((v): v is string => !!v)
        )
      ),
      owner: Array.from(
        new Set(
          prospects.map((p) => p.owner_name).filter((v): v is string => !!v)
        )
      ),
      architect: Array.from(
        new Set(
          prospects.map((p) => p.architect_name).filter((v): v is string => !!v)
        )
      ),
      estimating_type: Array.from(
        new Set(
          prospects
            .map((p) => p.estimating_type)
            .filter((v): v is 'Budget' | 'Construction' => !!v)
        )
      ),
      probability_level: Array.from(
        new Set(
          prospects
            .map((p) => p.probability_level_name)
            .filter((v): v is string => !!v)
        )
      ),
    }),
    [prospects]
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
      } else {
        setSessionEmail(session.user.email ?? null);

        // Fetch user type
        if (session.user.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('email', session.user.email)
            .maybeSingle();

          setUserType(userData?.user_type || null);
        }
      }
    };
    checkSession();
  }, [router]);

  const loadOptions = useCallback(async () => {
    try {
      const { data: customers } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_customer', true)
        .order('name', { ascending: true });
      setCustomerOptions(
        (customers ?? []).map((c) => ({ id: c.id, name: c.name }))
      );

      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('contact_type', ['Project Manager', 'Estimator'])
        .order('name', { ascending: true });
      setContactOptions(
        (contacts ?? []).map((c) => ({ id: c.id, name: c.name }))
      );

      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .order('name', { ascending: true });
      setOwnerOptions((users ?? []).map((u) => ({ id: u.id, name: u.name })));

      const { data: architects } = await supabase
        .from('companies')
        .select('id, name')
        .eq('company_type', 'Architect')
        .order('name', { ascending: true });
      setArchitectOptions(
        (architects ?? []).map((a) => ({ id: a.id, name: a.name }))
      );

      const { data: probLevels } = await supabase
        .from('probability_levels')
        .select('id, name, percentage, color')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      setProbabilityLevels(
        (probLevels ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          percentage: p.percentage,
          color: p.color || '#64748b',
        }))
      );

      // Load active lost reasons
      const { data: lostReasonsData } = await supabase
        .from('lost_reasons')
        .select('id, reason')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false });
      setLostReasons(
        (lostReasonsData ?? []).map((lr) => ({
          id: lr.id,
          reason: lr.reason,
        }))
      );

      // Load active trade options
      const { data: tradesData } = await supabase
        .from('trades')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code', { ascending: true });
      setTradeOptions(
        (tradesData ?? []).map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
        }))
      );
    } catch (e) {
      console.error('Error loading options:', e);
    }
  }, []);

  type EngagementTradeRow = {
    trade_id: string;
    estimated_amount: number | null;
    trade?: { code: string | null; name: string | null } | null;
  };

  type EngagementRow = {
    id: string;
    name: string;
    probability_level_id: string | null;
    probability_level?: {
      id: string;
      name: string;
      percentage: number;
      color: string | null;
    } | null;
    lost_reason?: {
      reason: string;
    } | null;
    user_id: string | null;
    bid_date: string | null;
    last_call: string | null;
    estimating_type: 'Budget' | 'Construction' | null;
    est_start_date: string | null;
    sharepoint_folder: string | null;
    type: string;
    active: boolean;
    engagement_trades?: EngagementTradeRow[] | null;
    users?: { name: string | null } | null;
  };

  const loadProspects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: engagementsData, error: engagementsError } = await supabase
        .from('prospects_v')
        .select(
          `
          *,
          probability_level:probability_levels ( id, name, percentage, color ),
          lost_reason:lost_reasons ( reason ),
          engagement_trades (
            trade_id,
            estimated_amount,
            trade:trades ( code, name )
          )
        `
        )
        .order('bid_date', { ascending: false });

      if (engagementsError) throw engagementsError;

      const engagementIds = (engagementsData ?? []).map(
        (e: EngagementRow) => e.id
      );
      const roles: PartyRole[] = ['customer', 'prospect_contact', 'architect'];
      const parties = await getPrimaryPartiesForEngagements(
        engagementIds,
        roles
      );
      const partyByKey = new Map<
        string,
        { id: string; type: 'contact' | 'company'; name: string | null }
      >();
      for (const p of parties) {
        partyByKey.set(`${p.engagement_id}-${p.role}`, {
          id: p.party_id,
          type: p.party_type,
          name: p.party_name ?? null,
        });
      }

      const userRoles = await getPrimaryUserRolesForEngagements(engagementIds, [
        'sales_lead',
        'project_lead',
      ]);
      const ownerByEngagement = new Map<string, { id: string; name: string }>();
      for (const ur of userRoles) {
        const existing = ownerByEngagement.get(ur.engagement_id);
        if (!existing || ur.role === 'sales_lead') {
          ownerByEngagement.set(ur.engagement_id, {
            id: ur.user_id,
            name: ur.user_name,
          });
        }
      }

      const transformedData = (engagementsData || []).map(
        (item: EngagementRow) => {
          const trades = (item.engagement_trades || []).map(
            (et: EngagementTradeRow) => ({
              id: et.trade_id,
              code: et.trade?.code || '',
              name: et.trade?.name || '',
              amount: et.estimated_amount || 0,
            })
          );
          const extended = trades.reduce((sum, t) => sum + t.amount, 0);
          const probabilityPercentage = item.probability_level?.percentage || 0;
          const revenueEst = extended * (probabilityPercentage / 100);

          const customer = partyByKey.get(`${item.id}-customer`);
          const pm = partyByKey.get(`${item.id}-prospect_contact`);
          const architect = partyByKey.get(`${item.id}-architect`);
          const owner = ownerByEngagement.get(item.id);

          return {
            id: item.id,
            name: item.name,
            company_id: customer?.id ?? null,
            customer_name: customer?.name ?? null,
            contact_id: pm?.id ?? null,
            contact_name: pm?.name ?? null,
            user_id: owner?.id ?? null,
            owner_name: owner?.name ?? null,
            architect_id: architect?.id ?? null,
            architect_name: architect?.name ?? null,
            bid_date: item.bid_date,
            estimating_type: item.estimating_type || 'Budget',
            stage: 'Construction',
            last_call: item.last_call,
            status:
              item.active === false
                ? item.lost_reason?.reason
                  ? `Inactive - ${item.lost_reason.reason}`
                  : 'Inactive'
                : 'Active',
            lost_reason_name: item.lost_reason?.reason || null,
            probability_level_id: item.probability_level_id,
            probability_level_name: item.probability_level?.name || null,
            probability_percentage: probabilityPercentage,
            est_start: item.est_start_date,
            trades,
            extended,
            bid_amount: revenueEst,
            sharepoint_folder: item.sharepoint_folder,
          };
        }
      );

      setProspects(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [showActiveOnly]);

  // Filter prospects by active status
  const displayedProspects = useMemo(() => {
    if (showActiveOnly) {
      return prospects.filter((p) => p.status === 'Active');
    }
    return prospects;
  }, [prospects, showActiveOnly]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setProspects(prospects.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      alert(
        `Error deleting prospect: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  const openSharePointFolder = (url: string | null) => {
    if (url) window.open(url, '_blank');
    else alert('No SharePoint folder URL set for this prospect');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProbabilityColor = (probability: string | null | undefined) => {
    if (!probability) return '#64748b';
    const probabilityColors: Record<string, string> = {
      Landed: '#10b981',
      Probable: '#10b981',
      Questionable: '#3b82f6',
      Doubtful: '#94a3b8',
      landed: '#10b981',
      probable: '#10b981',
      questionable: '#3b82f6',
      doubtful: '#94a3b8',
      verbal_commit: '#10b981',
      negotiation: '#f59e0b',
      proposal_sent: '#3b82f6',
      proposal_prep: '#8b5cf6',
      qualified: '#6366f1',
      lead: '#64748b',
      on_hold: '#94a3b8',
      lost: '#ef4444',
      won: '#10b981',
    };
    return probabilityColors[probability] || '#64748b';
  };

  useEffect(() => {
    loadProspects();
    loadOptions();
  }, [loadProspects, loadOptions, showActiveOnly]);

  const formatProbability = (probability: string | null | undefined) => {
    if (!probability) return '—';
    if (probability.includes('_')) {
      return probability
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return probability;
  };

  const getProbabilityPercent = (probability: string): string => {
    const level = probabilityLevels.find((l) => l.name === probability);
    if (level) return level.percentage.toString();
    const mapping: Record<string, string> = {
      Doubtful: '10',
      Possible: '25',
      Probable: '50',
      Definite: '75',
      qualified: '20',
      proposal_prep: '30',
      proposal_sent: '40',
      verbal_commit: '60',
      negotiation: '70',
      won: '100',
      lost: '0',
    };
    return mapping[probability] || '';
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setForm({
      name: prospect.name,
      company_id: prospect.company_id || '',
      contact_id: prospect.contact_id || '',
      owner: prospect.user_id || '',
      architect_id: prospect.architect_id || '',
      estimating_type: prospect.estimating_type || 'Budget',
      probability_level_id: prospect.probability_level_id || '',
      bid_date: prospect.bid_date || '',
      last_call: prospect.last_call || '',
      active: 'true',
      lost_reason_id: '',
      sharepoint_folder: prospect.sharepoint_folder || '',
    });
    setTradeLines(
      prospect.trades.map((t) => ({
        trade_id: t.id,
        amount: t.amount.toString(),
      }))
    );
    setShowModal(true);
  };

  const addTradeLine = () =>
    setTradeLines((lines) => [...lines, { trade_id: '', amount: '' }]);
  const updateTradeLine = (
    index: number,
    patch: Partial<{ trade_id: string; amount: string }>
  ) => {
    setTradeLines((lines) =>
      lines.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };
  const removeTradeLine = (index: number) =>
    setTradeLines((lines) => lines.filter((_, i) => i !== index));

  const saveProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Project name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        estimating_type: form.estimating_type,
        type: 'prospect' as const,
        sharepoint_folder: form.sharepoint_folder
          ? form.sharepoint_folder.trim()
          : null,
        probability_level_id: form.probability_level_id || null,
        bid_date: form.bid_date ? form.bid_date : null,
        last_call: form.last_call ? form.last_call : null,
        active: form.active === 'true',
        lost_reason_id: form.lost_reason_id || null,
      };

      let engagementId: string | null = null;
      let error = null;
      if (editingProspect) {
        engagementId = editingProspect.id;
        const { error: err } = await supabase
          .from('engagements')
          .update(payload)
          .eq('id', engagementId);
        error = err;
        if (!error && engagementId) {
          const eid = engagementId as string;
          await syncCorePrimaryParties({
            engagementId: eid,
            customerCompanyId: form.company_id || null,
            projectManagerContactId: null,
            architectCompanyId: form.architect_id || null,
          });
          await setPrimaryParty({
            engagementId: eid,
            role: 'prospect_contact',
            partyType: 'contact',
            partyId: form.contact_id || null,
          });
          await setPrimaryUserRole({
            engagementId: eid,
            role: 'sales_lead',
            userId: form.owner || null,
          });
        }
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('engagements')
          .insert([payload])
          .select('id')
          .maybeSingle();
        error = insErr;
        if (!error && inserted?.id) {
          engagementId = inserted.id;
          const eid = inserted.id as string;
          await syncCorePrimaryParties({
            engagementId: eid,
            customerCompanyId: form.company_id || null,
            projectManagerContactId: null,
            architectCompanyId: form.architect_id || null,
          });
          await setPrimaryParty({
            engagementId: eid,
            role: 'prospect_contact',
            partyType: 'contact',
            partyId: form.contact_id || null,
          });
          await setPrimaryUserRole({
            engagementId: eid,
            role: 'sales_lead',
            userId: form.owner || null,
          });
        }
      }

      // Upsert trade lines
      if (!error && engagementId) {
        // Simplest: delete existing then insert current set
        await supabase
          .from('engagement_trades')
          .delete()
          .eq('engagement_id', engagementId);
        const inserts = tradeLines
          .filter(
            (l) => l.trade_id && l.amount && !Number.isNaN(Number(l.amount))
          )
          .map((l) => ({
            engagement_id: engagementId!,
            trade_id: l.trade_id,
            estimated_amount: Number(l.amount),
          }));
        if (inserts.length) {
          const { error: tradesErr } = await supabase
            .from('engagement_trades')
            .insert(inserts);
          if (tradesErr) error = tradesErr;
        }
      }

      if (error) alert('Error saving prospect: ' + error.message);
      else {
        setShowModal(false);
        await loadProspects();
      }
    } catch (err) {
      console.error('Unexpected error saving prospect:', err);
      alert('Unexpected error saving prospect. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAndSortedProspects = useMemo(() => {
    const matchesTokens = (
      value: string | null | undefined,
      tokens: string[]
    ) => {
      if (!tokens || tokens.length === 0) return true;
      if (!value) return false;
      const v = String(value).toLowerCase();
      return tokens.some((t) => v.includes(String(t).toLowerCase()));
    };

    // First filter by active status if showActiveOnly is true
    let result = showActiveOnly
      ? prospects.filter((p) => p.status === 'Active')
      : prospects;

    const filtered = result.filter(
      (prospect) =>
        matchesTokens(prospect.name, filters.name) &&
        matchesTokens(prospect.customer_name, filters.customer) &&
        matchesTokens(prospect.contact_name, filters.contact) &&
        matchesTokens(prospect.owner_name, filters.owner) &&
        matchesTokens(prospect.architect_name, filters.architect) &&
        matchesTokens(prospect.estimating_type, filters.estimating_type) &&
        matchesTokens(
          prospect.probability_level_name,
          filters.probability_level
        )
    );

    if (sortKey === 'none') return filtered;

    filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum = typeof aVal === 'number' ? aVal : NaN;
      const bNum = typeof bVal === 'number' ? bVal : NaN;
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum))
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return filtered;
  }, [prospects, sortKey, sortOrder, filters, showActiveOnly]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  const sortIndicator = (key: SortKey) =>
    key !== sortKey ? '' : sortOrder === 'asc' ? ' ▲' : ' ▼';

  const totals = useMemo(() => {
    const totalExtended = filteredAndSortedProspects.reduce(
      (sum, p) => sum + (p.extended || 0),
      0
    );
    const totalRevenue = filteredAndSortedProspects.reduce(
      (sum, p) => sum + (p.bid_amount || 0),
      0
    );
    return { totalExtended, totalRevenue };
  }, [filteredAndSortedProspects]);

  const modalExtended = useMemo(
    () =>
      tradeLines.reduce((sum, l) => {
        const amt = Number(l.amount);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0),
    [tradeLines]
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f1ea', padding: 24 }}>
      <DashboardHeader
        sessionEmail={sessionEmail}
        activeTab="prospects"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        showInactive={showActiveOnly}
        onToggleInactive={() => setShowActiveOnly(!showActiveOnly)}
        menuItems={
          <SharedMenu
            onClose={() => setMenuOpen(false)}
            onOpenMasterData={(table, label) =>
              openMaster(table as 'stages' | 'engagement_tasks', label)
            }
            onOpenCompanies={(companyType, label) => {
              setCompaniesModal({ open: true, companyType, label });
            }}
            onOpenContacts={() => setShowContactsModal(true)}
            onOpenUsers={() => setShowUsersModal(true)}
            onOpenLostReasons={() => setShowLostReasonsModal(true)}
          />
        }
        actionButton={
          <button
            type="button"
            className="desktop-new-button"
            onClick={() => {
              setEditingProspect(null);
              setForm({
                name: '',
                company_id: '',
                contact_id: '',
                owner: '',
                architect_id: '',
                estimating_type: 'Budget',
                probability_level_id: '',
                bid_date: '',
                last_call: '',
                active: 'true',
                lost_reason_id: '',
                sharepoint_folder: '',
              });
              setTradeLines([]);
              setShowModal(true);
            }}
            style={{
              background: colors.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'none',
              minWidth: 145,
              width: 145,
            }}
          >
            + New Prospect
          </button>
        }
        exportButton={
          <button
            type="button"
            className="projects-export-button"
            onClick={() => {
              if (!filteredAndSortedProspects.length) return;
              const headers = [
                'id',
                'name',
                'customer_name',
                'contact_name',
                'architect_name',
                'owner_name',
                'estimating_type',
                'probability_level_name',
                'probability_percentage',
                'start_date',
                'bid_date',
                'extended',
                'trade_breakdown',
              ];
              const lines = [
                headers.join(','),
                ...filteredAndSortedProspects.map((p) => {
                  const tradeBreakdown =
                    p.trades
                      ?.map((t) => `${t.code}-${t.name}: $${t.amount}`)
                      .join('; ') || '';
                  const values = [
                    p.id,
                    p.name,
                    p.customer_name,
                    p.contact_name,
                    p.architect_name,
                    p.owner_name,
                    p.estimating_type,
                    p.probability_level_name,
                    p.probability_percentage,
                    p.est_start,
                    p.bid_date,
                    p.extended,
                    tradeBreakdown,
                  ];
                  return values
                    .map((val) => {
                      if (val == null) return '';
                      const str = String(val).replace(/"/g, '""');
                      return /[",\n]/.test(str) ? `"${str}"` : str;
                    })
                    .join(',');
                }),
              ];
              const blob = new Blob([lines.join('\n')], {
                type: 'text/csv',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `prospects-export-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={filteredAndSortedProspects.length === 0}
            style={{
              background:
                filteredAndSortedProspects.length > 0 ? '#ebe5db' : '#f5f5f5',
              color:
                filteredAndSortedProspects.length > 0
                  ? colors.textPrimary
                  : '#999',
              border: '1px solid #e5dfd5',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor:
                filteredAndSortedProspects.length > 0
                  ? 'pointer'
                  : 'not-allowed',
              opacity: filteredAndSortedProspects.length > 0 ? 1 : 0.5,
            }}
          >
            Export CSV
          </button>
        }
      />

      {/* Mobile Filters Button + New Prospect Button */}
      <div className="projects-mobile-filters">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            style={{
              flex: '1 1 50%',
              background: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {(filters.name.length > 0 ||
              filters.customer.length > 0 ||
              filters.owner.length > 0) && (
              <span
                style={{
                  background: '#c8102e',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {filters.name.length +
                  filters.customer.length +
                  filters.owner.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingProspect(null);
              setForm({
                name: '',
                company_id: '',
                contact_id: '',
                owner: '',
                architect_id: '',
                estimating_type: 'Budget',
                probability_level_id: '',
                bid_date: '',
                last_call: '',
                active: 'true',
                lost_reason_id: '',
                sharepoint_folder: '',
              });
              setTradeLines([]);
              setShowModal(true);
            }}
            style={{
              flex: '1 1 50%',
              background: colors.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + New Prospect
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#faf8f5',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 24,
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: colors.textMuted }}>Loading prospects...</p>
          </div>
        )}
        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <p style={{ color: '#991b1b', margin: 0 }}>Error: {error}</p>
          </div>
        )}
        {!loading && !error && prospects.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: colors.textMuted, fontSize: 18 }}>
              No prospects found. Add your first prospect to get started!
            </p>
          </div>
        )}
        {!loading &&
          !error &&
          filteredAndSortedProspects.length === 0 &&
          prospects.length > 0 && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: colors.textMuted, fontSize: 18 }}>
                No prospects match the current filters.
              </p>
            </div>
          )}

        {!loading && !error && filteredAndSortedProspects.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div
              className="prospects-table-container"
              style={{ overflowX: 'auto' }}
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
                      background: colors.tableHeader,
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <th style={thProject} onClick={() => handleSort('name')}>
                      Prospect{sortIndicator('name')}
                    </th>
                    <th
                      style={thCustomer}
                      onClick={() => handleSort('customer_name')}
                    >
                      Customer{sortIndicator('customer_name')}
                    </th>
                    <th style={thContact}>Prospect Contact</th>
                    <th
                      style={thManager}
                      onClick={() => handleSort('owner_name')}
                    >
                      Sales Lead{sortIndicator('owner_name')}
                    </th>
                    <th style={thArchitect}>Architect</th>
                    <th
                      style={thStatus}
                      onClick={() => handleSort('estimating_type')}
                    >
                      Type{sortIndicator('estimating_type')}
                    </th>
                    <th
                      style={thProbability}
                      onClick={() => handleSort('probability_level_name')}
                    >
                      Probability{sortIndicator('probability_level_name')}
                    </th>
                    <th
                      style={thBidDate}
                      onClick={() => handleSort('bid_date')}
                    >
                      Bid Date{sortIndicator('bid_date')}
                    </th>
                    <th
                      style={thBidDate}
                      onClick={() => handleSort('last_call')}
                    >
                      Last Follow Up{sortIndicator('last_call')}
                    </th>
                    <th style={thStatus}>Status</th>
                    <th style={thMoney} onClick={() => handleSort('extended')}>
                      Bid Amount{sortIndicator('extended')}
                    </th>
                    <th
                      style={thMoney}
                      onClick={() => handleSort('bid_amount')}
                    >
                      Revenue Est.{sortIndicator('bid_amount')}
                    </th>
                    <th style={thActions}>Actions</th>
                  </tr>
                  <tr>
                    <th style={thProject}>
                      <MultiFilterInput
                        values={filters.name}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, name: vals }))
                        }
                        suggestions={uniqueValues.name}
                        placeholder="Filter project..."
                      />
                    </th>
                    <th style={thCustomer}>
                      <MultiFilterInput
                        values={filters.customer}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, customer: vals }))
                        }
                        suggestions={uniqueValues.customer}
                        placeholder="Filter customer..."
                      />
                    </th>
                    <th style={thContact}>
                      <MultiFilterInput
                        values={filters.contact}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, contact: vals }))
                        }
                        suggestions={uniqueValues.contact}
                        placeholder="Filter contact..."
                      />
                    </th>
                    <th style={thManager}>
                      <MultiFilterInput
                        values={filters.owner}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, owner: vals }))
                        }
                        suggestions={uniqueValues.owner}
                        placeholder="Filter sales lead..."
                      />
                    </th>
                    <th style={thArchitect}>
                      <MultiFilterInput
                        values={filters.architect}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, architect: vals }))
                        }
                        suggestions={uniqueValues.architect}
                        placeholder="Filter architect..."
                      />
                    </th>
                    <th style={thStatus}>
                      <MultiFilterInput
                        values={filters.estimating_type}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, estimating_type: vals }))
                        }
                        suggestions={uniqueValues.estimating_type}
                        placeholder="Filter type..."
                      />
                    </th>
                    <th style={thStatus}>
                      <MultiFilterInput
                        values={filters.probability_level}
                        onChangeValues={(vals) =>
                          setFilters((f) => ({ ...f, probability_level: vals }))
                        }
                        suggestions={uniqueValues.probability_level}
                        placeholder="Filter probability..."
                      />
                    </th>
                    <th style={thBidDate}></th>
                    <th style={thBidDate}></th>
                    <th style={thStatus}></th>
                    <th
                      style={{
                        ...thMoney,
                        fontWeight: 700,
                        color: colors.navy,
                      }}
                    >
                      {formatCurrency(totals.totalExtended)}
                    </th>
                    <th
                      style={{
                        ...thMoney,
                        fontWeight: 700,
                        color: colors.navy,
                      }}
                    >
                      {formatCurrency(totals.totalRevenue)}
                    </th>
                    <th style={thActions}>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            name: [],
                            customer: [],
                            contact: [],
                            owner: [],
                            architect: [],
                            estimating_type: [],
                            probability_level: [],
                          })
                        }
                        style={{
                          background: colors.toggleBackground,
                          color: colors.textPrimary,
                          border: `1px solid ${colors.border}`,
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
                        Clear
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedProspects.map((prospect) => (
                    <tr
                      key={prospect.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.tableHeader;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => {
                        router.push(`/prospects/${prospect.id}`);
                      }}
                    >
                      <td style={td}>
                        <span
                          style={{
                            color: colors.textPrimary,
                            fontWeight: 500,
                            display: 'inline-block',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'bottom',
                          }}
                          title={prospect.name}
                        >
                          {prospect.name}
                        </span>
                      </td>
                      <td style={td}>{prospect.customer_name || '—'}</td>
                      <td style={td}>{prospect.contact_name || '—'}</td>
                      <td style={td}>
                        <div>
                          <div>{prospect.owner_name || '—'}</div>
                        </div>
                      </td>
                      <td style={td}>{prospect.architect_name || '—'}</td>
                      <td style={td}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              prospect.estimating_type === 'Construction'
                                ? '#4CAF5020'
                                : '#2196F320',
                            color:
                              prospect.estimating_type === 'Construction'
                                ? '#4CAF50'
                                : '#2196F3',
                          }}
                        >
                          {prospect.estimating_type || 'Budget'}
                        </span>
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            background: prospect.probability_level_name
                              ? getProbabilityColor(
                                  prospect.probability_level_name
                                ) + '20'
                              : '#64748b20',
                            color: prospect.probability_level_name
                              ? getProbabilityColor(
                                  prospect.probability_level_name
                                )
                              : '#64748b',
                          }}
                        >
                          {prospect.probability_level_name
                            ? `${prospect.probability_level_name}${prospect.probability_percentage ? ` (${prospect.probability_percentage}%)` : ''}`
                            : '—'}
                        </span>
                      </td>
                      <td style={td}>{dateStr(prospect.bid_date)}</td>
                      <td style={td}>{dateStr(prospect.last_call)}</td>
                      <td style={td}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              prospect.status === 'Active'
                                ? '#4CAF5020'
                                : '#94a3b820',
                            color:
                              prospect.status === 'Active'
                                ? '#4CAF50'
                                : '#64748b',
                          }}
                        >
                          {prospect.status || 'Active'}
                        </span>
                      </td>
                      <td
                        style={tdRight}
                        title={
                          prospect.trades && prospect.trades.length > 0
                            ? prospect.trades
                                .map(
                                  (t) =>
                                    `${t.name} (${t.code}): ${formatCurrency(t.amount)}`
                                )
                                .join('\n')
                            : undefined
                        }
                      >
                        {prospect.extended
                          ? formatCurrency(prospect.extended)
                          : '—'}
                      </td>
                      <td
                        style={{
                          ...tdRight,
                          fontWeight: 600,
                          color: colors.textPrimary,
                        }}
                        title={
                          prospect.trades && prospect.trades.length > 0
                            ? prospect.trades
                                .map(
                                  (t) =>
                                    `${t.name} (${t.code}): ${formatCurrency(t.amount)}`
                                )
                                .join('\n')
                            : undefined
                        }
                      >
                        {prospect.bid_amount
                          ? formatCurrency(prospect.bid_amount)
                          : '—'}
                      </td>
                      <td style={tdCenter}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {prospect.sharepoint_folder && (
                            <a
                              href={prospect.sharepoint_folder}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: colors.navy,
                                padding: 4,
                                display: 'flex',
                              }}
                            >
                              <Folder size={16} />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openForEdit(prospect);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: colors.navy,
                              transition: 'color 0.2s',
                            }}
                            title="Edit Prospect"
                          >
                            <Pencil size={16} />
                          </button>
                          {userType === 'Admin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(prospect.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: colors.logoRed,
                                transition: 'color 0.2s',
                              }}
                              title="Delete Prospect"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="prospects-mobile-cards" style={{ display: 'none' }}>
              {filteredAndSortedProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="prospect-card"
                  onClick={() => router.push(`/prospects/${prospect.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-card-header">
                    <div>
                      <h3 className="project-card-title">{prospect.name}</h3>
                      {prospect.customer_name && (
                        <div className="project-card-qbid">
                          {prospect.customer_name}
                        </div>
                      )}
                    </div>
                    <div className="project-card-actions">
                      {prospect.sharepoint_folder && (
                        <a
                          href={prospect.sharepoint_folder}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: colors.navy,
                            padding: 8,
                            display: 'flex',
                          }}
                        >
                          <Folder size={20} />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openForEdit(prospect);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.navy,
                          padding: 8,
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <Pencil size={20} />
                      </button>
                    </div>
                  </div>

                  {prospect.contact_name && (
                    <div className="project-card-row">
                      <span className="project-card-label">Contact</span>
                      <span className="project-card-value">
                        {prospect.contact_name}
                      </span>
                    </div>
                  )}

                  {prospect.owner_name && (
                    <div className="project-card-row">
                      <span className="project-card-label">Sales Lead</span>
                      <span className="project-card-value">
                        <div>{prospect.owner_name}</div>
                      </span>
                    </div>
                  )}

                  {prospect.architect_name && (
                    <div className="project-card-row">
                      <span className="project-card-label">Architect</span>
                      <span className="project-card-value">
                        {prospect.architect_name}
                      </span>
                    </div>
                  )}

                  <div className="project-card-row">
                    <span className="project-card-label">Type</span>
                    <span
                      className="project-card-value"
                      style={{
                        fontWeight: 600,
                        color:
                          prospect.estimating_type === 'Construction'
                            ? '#4CAF50'
                            : '#2196F3',
                      }}
                    >
                      {prospect.estimating_type || 'Budget'}
                    </span>
                  </div>

                  {prospect.probability_level_name && (
                    <div className="project-card-row">
                      <span className="project-card-label">Probability</span>
                      <span
                        className="project-card-value"
                        style={{
                          fontWeight: 600,
                          color: getProbabilityColor(
                            prospect.probability_level_name
                          ),
                        }}
                      >
                        {prospect.probability_level_name}
                        {prospect.probability_percentage
                          ? ` (${prospect.probability_percentage}%)`
                          : ''}
                      </span>
                    </div>
                  )}

                  {prospect.bid_date && (
                    <div className="project-card-row">
                      <span className="project-card-label">Bid Date</span>
                      <span className="project-card-value">
                        {dateStr(prospect.bid_date)}
                      </span>
                    </div>
                  )}

                  <div
                    className="project-card-row"
                    style={{
                      borderTop: '1px solid #e5dfd5',
                      paddingTop: 12,
                      marginTop: 8,
                    }}
                  >
                    <span className="project-card-label">Bid Amount</span>
                    <span className="project-card-value project-card-money">
                      {prospect.extended
                        ? formatCurrency(prospect.extended)
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filters Modal */}
      {showFiltersModal && (
        <div style={styles.overlay}>
          <div
            style={{
              ...styles.modal,
              maxWidth: '90%',
              width: 400,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-modal-title"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2
                id="filters-modal-title"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: 0,
                  color: colors.textPrimary,
                }}
              >
                Filter Prospects
              </h2>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Prospect Name
                </label>
                <MultiFilterInput
                  values={filters.name}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, name: vals }))
                  }
                  suggestions={uniqueValues.name}
                  placeholder="Filter prospects..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Customer
                </label>
                <MultiFilterInput
                  values={filters.customer}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, customer: vals }))
                  }
                  suggestions={uniqueValues.customer}
                  placeholder="Filter customers..."
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Sales Lead
                </label>
                <MultiFilterInput
                  values={filters.owner}
                  onChangeValues={(vals) =>
                    setFilters((f) => ({ ...f, owner: vals }))
                  }
                  suggestions={uniqueValues.owner}
                  placeholder="Filter sales leads..."
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid #e5dfd5',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    name: [],
                    customer: [],
                    contact: [],
                    owner: [],
                    architect: [],
                    estimating_type: [],
                    probability_level: [],
                  });
                }}
                style={{
                  flex: 1,
                  background: '#ebe5db',
                  color: colors.textPrimary,
                  border: '1px solid #e5dfd5',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                style={{
                  flex: 1,
                  background: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: colors.cardBackground,
              borderRadius: 12,
              padding: 24,
              maxWidth: 700,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 20,
                color: colors.textPrimary,
              }}
            >
              {editingProspect ? 'Edit Prospect' : 'New Prospect'}
            </h2>
            <form onSubmit={saveProspect}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label style={labelStyle}>Project Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Customer</label>
                  <select
                    name="company_id"
                    value={form.company_id}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">Select customer...</option>
                    {customerOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prospect Contact</label>
                  <select
                    name="contact_id"
                    value={form.contact_id}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">Select contact...</option>
                    {contactOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Sales Lead</label>
                  <select
                    name="owner"
                    value={form.owner}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">Select sales lead...</option>
                    {ownerOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Architect</label>
                  <select
                    name="architect_id"
                    value={form.architect_id}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">Select architect...</option>
                    {architectOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estimate Type</label>
                  <select
                    name="estimating_type"
                    value={form.estimating_type}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="Budget">
                      Budget (no construction docs)
                    </option>
                    <option value="Construction">
                      Construction (based on plans)
                    </option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bid Date</label>
                  <input
                    type="date"
                    name="bid_date"
                    value={form.bid_date}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Probability</label>
                  <select
                    name="probability_level_id"
                    value={form.probability_level_id}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="">Select probability...</option>
                    {probabilityLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name} ({level.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Last Call / Follow-Up</label>
                  <input
                    type="date"
                    name="last_call"
                    value={form.last_call}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>SharePoint Folder URL</label>
                  <input
                    type="text"
                    name="sharepoint_folder"
                    value={form.sharepoint_folder}
                    onChange={handleChange}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 24,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    background: 'white',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: colors.navy,
                    color: 'white',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: colors.textPrimary }}>
              Delete Prospect?
            </h3>
            <p style={{ color: colors.textSecondary }}>
              Are you sure you want to delete this prospect? This action cannot
              be undone.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                marginTop: 24,
              }}
            >
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #e5dfd5',
                  background: 'white',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: colors.logoRed,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {companiesModal.open && companiesModal.companyType && (
        <CompaniesModal
          open={companiesModal.open}
          onClose={() => {
            setCompaniesModal({ open: false, companyType: null, label: '' });
            loadProspects();
          }}
          companyType={companiesModal.companyType}
          label={companiesModal.label}
        />
      )}
      {showContactsModal && (
        <ContactsModal
          open={showContactsModal}
          onClose={() => setShowContactsModal(false)}
        />
      )}
      {showUsersModal && (
        <UsersModal
          open={showUsersModal}
          onClose={() => setShowUsersModal(false)}
        />
      )}
      {showMaster && (
        <MasterDataModal
          open={true}
          onClose={closeMaster}
          table={showMaster.table}
          label={showMaster.label}
        />
      )}
      {showLostReasonsModal && (
        <LostReasonsModal
          open={showLostReasonsModal}
          onClose={() => {
            setShowLostReasonsModal(false);
            loadOptions(); // Reload lost reasons after editing
          }}
        />
      )}
    </div>
  );
}

/* ========================= STYLES ========================= */
const th: React.CSSProperties = {
  fontWeight: 600,
  color: colors.textPrimary,
  textAlign: 'left',
  padding: 8,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: colors.tableHeader,
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = {
  ...th,
  textAlign: 'center',
  cursor: 'default',
};
const thProject: React.CSSProperties = { ...th, width: 250, minWidth: 200 };
const thCustomer: React.CSSProperties = { ...th, width: 180, minWidth: 150 };
const thContact: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thManager: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thArchitect: React.CSSProperties = { ...th, width: 140, minWidth: 120 };
const thProbability: React.CSSProperties = { ...th, width: 140, minWidth: 130 };
const thBidDate: React.CSSProperties = { ...th, width: 100, minWidth: 90 };
const thStatus: React.CSSProperties = { ...th, width: 190, minWidth: 180 };
const thMoney: React.CSSProperties = { ...thRight, width: 110, minWidth: 100 };
const thActions: React.CSSProperties = {
  ...thCenter,
  width: 100,
  minWidth: 100,
};
const td: React.CSSProperties = {
  padding: 8,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: colors.textPrimary,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
};
const smallButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 6,
  background: colors.navy,
  color: '#fff',
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
const removeButtonStyle: React.CSSProperties = {
  background: colors.logoRed,
  color: '#fff',
  border: 'none',
  padding: 6,
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
