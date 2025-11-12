import {
  getPrimaryPartiesForEngagements,
  type PartyRole,
} from '@/lib/engagementParties';
import {
  getPrimaryUserRolesForEngagements,
  type UserRole,
} from '@/lib/engagementUserRoles';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useMemo, useState } from 'react';

// Row shape used by the projects list (engagement dashboard)
export type ProjectListRow = {
  id: string;
  project_number: string | null;
  project_name: string;
  customer_name: string | null;
  project_manager: string | null;
  owner: string | null;
  superintendent: string | null;
  foreman: string | null;
  architect: string | null;
  stage: string | null;
  stage_id?: string | null;
  stage_order?: number | null;
  sharepoint_folder?: string | null;
  contract_amt: number;
  co_amt: number;
  total_amt: number;
  billed_amt: number;
  balance: number;
  start_date: string | null;
  end_date: string | null;
};

export type SortKey = keyof ProjectListRow | 'none';
export type SortOrder = 'asc' | 'desc';

export type Filters = {
  project_number: string[];
  project_name: string[];
  customer_name: string[];
  owner: string[];
  stage: string[];
};

interface StageData {
  id?: string;
  name: string;
  order?: number | null;
}

interface ProjectDashboardRow {
  id: string;
  name: string;
  project_number?: string | null;
  stage_id?: string | null;
  sharepoint_folder?: string | null;
  contract_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  // Note: customer_name, owner, superintendent, foreman, architect loaded separately
  // via engagement_parties and engagement_user_roles tables
}

/**
 * Central hook for the Projects index page.
 * Encapsulates: loading, normalization, filtering, sorting & derived suggestions.
 * Keeps the page component declarative and focused on layout / modals.
 */
export function useProjectsListCore() {
  const [rows, setRows] = useState<ProjectListRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sorting state
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const raw = localStorage.getItem('projects:list:filters');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Basic shape validation
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray(parsed.project_number)
        ) {
          return {
            project_number: parsed.project_number || [],
            project_name: parsed.project_name || [],
            customer_name: parsed.customer_name || [],
            owner: parsed.owner || [],
            stage: parsed.stage || [],
          } as Filters;
        }
      }
    } catch {}
    return {
      project_number: [],
      project_name: [],
      customer_name: [],
      owner: [],
      stage: [],
    };
  });
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try {
      const raw = localStorage.getItem('projects:list:sort');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.sortKey) return parsed.sortKey as SortKey;
      }
    } catch {}
    return 'project_name';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    try {
      const raw = localStorage.getItem('projects:list:sort');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.sortOrder === 'asc' || parsed?.sortOrder === 'desc')
          return parsed.sortOrder as SortOrder;
      }
    } catch {}
    return 'asc';
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('projects_v').select('*');
      if (error) {
        console.error('Project dashboard load error:', error.message ?? error);
        setRows([]);
        return;
      }

      const rowsData = (data ?? []) as ProjectDashboardRow[];

      // Build stage maps from canonical stages table
      const stagesMap: Record<string, string> = {};
      const normalizedNameMap: Record<string, string> = {};
      const stageOrderMap: Record<string, number | null> = {};
      try {
        const { data: stagesData, error: stagesErr } = await supabase
          .from('stages')
          .select('id,name,order');
        if (!stagesErr && stagesData) {
          (stagesData as StageData[]).forEach((s) => {
            if (s?.id && s?.name) {
              const displayName = s.order ? `${s.order}. ${s.name}` : s.name;
              stagesMap[s.id] = displayName;
              stageOrderMap[s.id] = s.order || null;
              const key = (String(s.name) || '').trim().toLowerCase();
              normalizedNameMap[key] = displayName;
            }
          });
        }
      } catch {
        // non-blocking
      }

      // Gather engagement ids to load primary parties (customer, project_manager, architect, superintendent)
      const engagementIds = rowsData.map((r) => r.id);
      const roles: PartyRole[] = [
        'customer',
        'project_manager',
        'architect',
        'superintendent',
      ];
      const parties = await getPrimaryPartiesForEngagements(
        engagementIds,
        roles
      );
      const partyByKey = new Map<string, { id: string; name: string | null }>();
      for (const p of parties) {
        partyByKey.set(`${p.engagement_id}-${p.role}`, {
          id: p.party_id,
          name: p.party_name ?? null,
        });
      }

      // Load user roles (project_lead/owner, foreman)
      const userRoles: UserRole[] = ['project_lead', 'foreman'];
      const userRoleAssignments = await getPrimaryUserRolesForEngagements(
        engagementIds,
        userRoles
      );
      const userRoleByKey = new Map<string, string | null>();
      for (const ur of userRoleAssignments) {
        userRoleByKey.set(`${ur.engagement_id}-${ur.role}`, ur.user_name);
      }

      // Load financial data (change orders and pay apps)
      const financialByEngagement = new Map<
        string,
        { co_amt: number; billed_amt: number }
      >();
      try {
        const { data: coData } = await supabase
          .from('engagement_change_orders')
          .select('engagement_id, amount')
          .in('engagement_id', engagementIds);
        const { data: paData } = await supabase
          .from('engagement_pay_apps')
          .select('engagement_id, amount')
          .in('engagement_id', engagementIds);

        for (const eid of engagementIds) {
          const cos = coData?.filter((co) => co.engagement_id === eid) ?? [];
          const pas = paData?.filter((pa) => pa.engagement_id === eid) ?? [];
          financialByEngagement.set(eid, {
            co_amt: cos.reduce((sum, co) => sum + (co.amount ?? 0), 0),
            billed_amt: pas.reduce((sum, pa) => sum + (pa.amount ?? 0), 0),
          });
        }
      } catch {
        // non-blocking
      }

      const mapped: ProjectListRow[] = rowsData.map((r): ProjectListRow => {
        const customer = partyByKey.get(`${r.id}-customer`);
        const architect = partyByKey.get(`${r.id}-architect`);
        const superintendent = partyByKey.get(`${r.id}-superintendent`);
        const projectManager = partyByKey.get(`${r.id}-project_manager`);
        const owner = userRoleByKey.get(`${r.id}-project_lead`) ?? null;
        const foreman = userRoleByKey.get(`${r.id}-foreman`) ?? null;
        const financial = financialByEngagement.get(r.id) ?? {
          co_amt: 0,
          billed_amt: 0,
        };
        const contract_amt = r.contract_amount ?? 0;
        const total_amt = contract_amt + financial.co_amt;
        const balance = total_amt - financial.billed_amt;

        // Get stage display name
        let stage: string | null = null;
        let stage_order: number | null = null;
        if (r.stage_id && stagesMap[r.stage_id]) {
          stage = stagesMap[r.stage_id];
          stage_order = stageOrderMap[r.stage_id] ?? null;
        }

        return {
          id: r.id,
          project_number: r.project_number ?? null,
          project_name: r.name,
          customer_name: customer?.name ?? null,
          project_manager: projectManager?.name ?? null,
          owner,
          superintendent: superintendent?.name ?? null,
          foreman,
          architect: architect?.name ?? null,
          stage,
          stage_id: r.stage_id ?? null,
          stage_order,
          sharepoint_folder: r.sharepoint_folder ?? null,
          contract_amt,
          co_amt: financial.co_amt,
          total_amt,
          billed_amt: financial.billed_amt,
          balance,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
        };
      });
      setRows(mapped);
    } catch (err) {
      console.error('Unexpected error loading projects:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Unique suggestions for filter inputs
  const uniqueValues = useMemo(
    () => ({
      project_number: Array.from(
        new Set(
          rows.map((r) => r.project_number).filter((v): v is string => !!v)
        )
      ),
      project_name: Array.from(new Set(rows.map((r) => r.project_name))),
      customer_name: Array.from(
        new Set(
          rows.map((r) => r.customer_name).filter((v): v is string => !!v)
        )
      ),
      owner: Array.from(
        new Set(rows.map((r) => r.owner).filter((v): v is string => !!v))
      ),
      stage: Array.from(
        new Set(rows.map((r) => r.stage).filter((v): v is string => !!v))
      ),
    }),
    [rows]
  );

  const filteredAndSortedRows = useMemo(() => {
    const matchesTokens = (
      value: string | null | undefined,
      tokens: string[]
    ) => {
      if (!tokens || tokens.length === 0) return true;
      if (!value) return false;
      const v = String(value).toLowerCase();
      return tokens.some((t) => v.includes(String(t).toLowerCase()));
    };

    const out = rows.filter((row) => {
      return (
        matchesTokens(row.project_number, filters.project_number) &&
        matchesTokens(row.project_name, filters.project_name) &&
        matchesTokens(row.customer_name, filters.customer_name) &&
        matchesTokens(row.owner, filters.owner) &&
        matchesTokens(row.stage, filters.stage)
      );
    });

    if (sortKey === 'none') return out;

    out.sort((a, b) => {
      if (sortKey === 'stage') {
        const aOrder = a.stage_order ?? Infinity;
        const bOrder = b.stage_order ?? Infinity;
        const aName = (a.stage || '').toLowerCase();
        const bName = (b.stage || '').toLowerCase();
        if (aOrder !== bOrder) {
          return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        }
        return sortOrder === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum =
        typeof aVal === 'number' ? aVal : Date.parse(String(aVal)) || NaN;
      const bNum =
        typeof bVal === 'number' ? bVal : Date.parse(String(bVal)) || NaN;
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return out;
  }, [rows, sortKey, sortOrder, filters]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  const sortIndicator = (key: SortKey) =>
    key !== sortKey ? '' : sortOrder === 'asc' ? ' ▲' : ' ▼';

  // Persistence side-effects
  useEffect(() => {
    try {
      localStorage.setItem('projects:list:filters', JSON.stringify(filters));
    } catch {}
  }, [filters]);
  useEffect(() => {
    try {
      localStorage.setItem(
        'projects:list:sort',
        JSON.stringify({ sortKey, sortOrder })
      );
    } catch {}
  }, [sortKey, sortOrder]);

  return {
    // data
    rows,
    loading,
    // filtering & sorting
    filters,
    setFilters,
    uniqueValues,
    filteredAndSortedRows,
    sortKey,
    sortOrder,
    handleSort,
    sortIndicator,
    // helpers
    refresh: loadProjects,
  };
}
