// pages/prospects/[id].tsx
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SharedMenu } from '@/components/layout/SharedMenu';
import { CompaniesModal } from '@/components/modals/CompaniesModal';
import { ContactsModal } from '@/components/modals/ContactsModal';
import { CommentsSection } from '@/components/project/CommentsSection';
import { useMenuModals } from '@/hooks/useMenuModals';
import {
  getPrimaryPartiesForEngagements,
  setPrimaryParty,
  type PartyRole,
} from '@/lib/engagementParties';
import {
  getPrimaryUserRolesForEngagements,
  setPrimaryUserRole,
  type UserRole,
} from '@/lib/engagementUserRoles';
import { dateStr } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectDetailStyles';
import { colors } from '@/styles/theme';
import { ChevronDown, Folder, Pencil, Plus, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

type Prospect = {
  id: string;
  name: string;
  type?: 'prospect' | 'project' | null;
  customer_name?: string | null;
  contact_name?: string | null; // Prospect Contact
  architect?: string | null;
  company_owner?: string | null; // Owner (building owner)
  owner?: string | null; // Sales Lead
  start_date?: string | null;
  bid_date?: string | null;
  estimating_type?: 'Budget' | 'Construction' | null;
  probability_level_id?: string | null;
  sharepoint_folder?: string | null;
  active?: boolean | null;
  trades?: { id: string; code: string; name: string; amount: number }[];
  extended?: number | null;
};

type Contact = { id: string; name: string };
type Company = { id: string; name: string };

type ProjectComment = {
  id: string;
  engagement_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_name?: string;
  user_type?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  user_type: 'Admin' | 'Office' | 'Field';
};

export default function ProspectDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { menuCallbacks, renderModals } = useMenuModals(() => {
    loadDropdownOptions();
  });
  const [loading, setLoading] = useState(true);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [partiesLoaded, setPartiesLoaded] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editTradesMode, setEditTradesMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    customer_name: '',
    contact_name: '',
    architect: '',
    company_owner: '',
    owner: '',
    start_date: '',
    bid_date: '',
    estimating_type: '',
    probability_level_id: '',
    sharepoint_folder: '',
  });

  // Trade lines for editing
  const [tradeLines, setTradeLines] = useState<
    { trade_id: string; amount: string }[]
  >([]);

  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  const [customerOptions, setCustomerOptions] = useState<Company[]>([]);
  const [architectOptions, setArchitectOptions] = useState<Company[]>([]);
  const [ownerCompanyOptions, setOwnerCompanyOptions] = useState<Company[]>([]);
  const [userOptions, setUserOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [probabilityLevels, setProbabilityLevels] = useState<
    { id: string; name: string; percentage: number; color: string }[]
  >([]);
  const [tradeOptions, setTradeOptions] = useState<
    { id: string; code: string; name: string }[]
  >([]);
  const [lostReasons, setLostReasons] = useState<
    { id: string; reason: string }[]
  >([]);

  const [companiesModal, setCompaniesModal] = useState<{
    open: boolean;
    companyType: 'Contractor' | 'Architect' | 'Owner' | 'Subcontractor' | null;
    label: string;
  }>({ open: false, companyType: null, label: '' });
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedLostReasonId, setSelectedLostReasonId] = useState<string>('');
  const [showProspectMenu, setShowProspectMenu] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [converting, setConverting] = useState(false);

  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionEmail(session?.user?.email || null);
    });
  }, []);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    loadProspect();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Close prospect menu when clicking outside
  useEffect(() => {
    if (!showProspectMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.prospect-action-buttons')) {
        setShowProspectMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProspectMenu]);

  const loadProspect = async () => {
    if (!id || typeof id !== 'string') return;

    setLoading(true);
    try {
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects_v')
        .select(
          `
          *,
          engagement_trades (
            trade_id,
            estimated_amount,
            trade:trades (code, name)
          )
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (prospectError) throw prospectError;

      const data = prospectData
        ? ({
            id: prospectData.id,
            name: prospectData.name,
            type: prospectData.type,
            estimating_type: prospectData.estimating_type,
            probability_level_id: prospectData.probability_level_id,
            start_date: prospectData.est_start_date,
            bid_date: prospectData.bid_date,
            sharepoint_folder: prospectData.sharepoint_folder,
            active: prospectData.active,
            trades: (prospectData.engagement_trades || []).map(
              (et: {
                trade_id: string;
                trade?: { code: string; name: string } | null;
                estimated_amount: number | null;
              }) => ({
                id: et.trade_id,
                code: et.trade?.code || '',
                name: et.trade?.name || '',
                amount: et.estimated_amount || 0,
              })
            ),
            extended: (prospectData.engagement_trades || []).reduce(
              (sum: number, et: { estimated_amount: number | null }) =>
                sum + (et.estimated_amount || 0),
              0
            ),
          } as Prospect)
        : null;

      // Overlay primary parties and user roles
      if (data && data.id) {
        try {
          // Fetch parties (customer, prospect_contact, architect, owner)
          const partyRoles: PartyRole[] = [
            'customer',
            'prospect_contact',
            'architect',
            'owner',
          ];
          const parties = await getPrimaryPartiesForEngagements(
            [data.id],
            partyRoles
          );
          for (const p of parties) {
            if (p.role === 'customer')
              data.customer_name = p.party_name ?? data.customer_name;
            if (p.role === 'prospect_contact')
              data.contact_name = p.party_name ?? data.contact_name;
            if (p.role === 'architect')
              data.architect = p.party_name ?? data.architect;
            if (p.role === 'owner')
              data.company_owner = p.party_name ?? data.company_owner;
          }

          // Fetch user roles (sales_lead for prospects)
          const userRoles: UserRole[] = ['sales_lead'];
          const userRoleAssignments = await getPrimaryUserRolesForEngagements(
            [data.id],
            userRoles
          );
          for (const ur of userRoleAssignments) {
            if (ur.role === 'sales_lead')
              data.owner = ur.user_name ?? data.owner;
          }

          setPartiesLoaded(true);
        } catch (partyErr) {
          console.error('Failed loading primary parties/user roles:', partyErr);
        }
      }

      setProspect(data);

      // Load comments
      const { data: commentsData, error: commentsErr } = await supabase
        .from('engagement_comments')
        .select(
          `
          id,
          engagement_id,
          user_id,
          comment_text,
          created_at,
          users (name, user_type)
        `
        )
        .eq('engagement_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (commentsErr) {
        console.error('Comments load error:', commentsErr);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedComments = (commentsData ?? []).map((c: any) => ({
          id: c.id,
          engagement_id: c.engagement_id,
          user_id: c.user_id,
          comment_text: c.comment_text,
          created_at: c.created_at,
          user_name: c.users?.name || 'Unknown',
          user_type: c.users?.user_type || 'Unknown',
        }));
        setComments(mappedComments);
      }

      // Load current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, user_type')
          .eq('email', session.user.email)
          .maybeSingle();
        if (userData) {
          setCurrentUser(userData as User);
        }
      }

      // Initialize edit form
      if (data) {
        setEditForm({
          name: data.name || '',
          customer_name: data.customer_name || '',
          contact_name: data.contact_name || '',
          architect: data.architect || '',
          company_owner: data.company_owner || '',
          owner: data.owner || '',
          start_date: data.start_date || '',
          bid_date: data.bid_date || '',
          estimating_type: data.estimating_type || '',
          probability_level_id: data.probability_level_id || '',
          sharepoint_folder: data.sharepoint_folder || '',
        });
        setTradeLines(
          (data.trades || []).map((t) => ({
            trade_id: t.id,
            amount: t.amount.toString(),
          }))
        );
      }
    } catch (err) {
      console.error('Error loading prospect:', err);
      notify('Failed to load prospect', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownOptions = async () => {
    try {
      // Load contacts (Project Manager, Estimator)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('contact_type', ['Project Manager', 'Estimator'])
        .order('name');
      setContactOptions(contacts || []);

      // Load customers
      const { data: customers } = await supabase
        .from('companies')
        .select('id, name')
        .eq('company_type', 'Customer')
        .order('name');
      setCustomerOptions(customers || []);

      // Load architects
      const { data: architects } = await supabase
        .from('companies')
        .select('id, name')
        .eq('company_type', 'Architect')
        .order('name');
      setArchitectOptions(architects || []);

      // Load owner companies
      const { data: owners } = await supabase
        .from('companies')
        .select('id, name')
        .eq('company_type', 'Owner')
        .order('name');
      setOwnerCompanyOptions(owners || []);

      // Load users
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .order('name');
      setUserOptions(users || []);

      // Load probability levels
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

      // Load active trades
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

      // Load lost reasons
      const { data: reasons } = await supabase
        .from('lost_reasons')
        .select('id, reason')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false });
      setLostReasons(reasons || []);
    } catch (err) {
      console.error('Error loading dropdown options:', err);
    }
  };

  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Map probability to default percentage
  const getProbabilityPercent = (probability: string): string => {
    // First try to find in loaded probability levels
    const level = probabilityLevels.find((l) => l.name === probability);
    if (level) {
      return level.percentage.toString();
    }

    // Fallback to hardcoded mapping for legacy values
    const mapping: Record<string, string> = {
      Doubtful: '10',
      Possible: '25',
      Probable: '50',
      Definite: '75',
      // Legacy values if they exist
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

  const startEdit = () => {
    setEditMode(true);
  };

  const startTradesEdit = () => {
    setEditTradesMode(true);
  };

  const cancelTradesEdit = () => {
    setEditTradesMode(false);
    if (prospect) {
      // Reset trade lines to current prospect trades
      setTradeLines(
        (prospect.trades || []).map((t) => ({
          trade_id: t.id,
          amount: t.amount.toString(),
        }))
      );
    }
  };

  const saveTradesEdit = async () => {
    if (!prospect) return;

    setSaving(true);
    try {
      // Delete existing trade lines
      await supabase
        .from('engagement_trades')
        .delete()
        .eq('engagement_id', prospect.id);

      // Insert new trade lines
      const inserts = tradeLines
        .filter(
          (l) => l.trade_id && l.amount && !Number.isNaN(Number(l.amount))
        )
        .map((l) => ({
          engagement_id: prospect.id,
          trade_id: l.trade_id,
          estimated_amount: Number(l.amount),
        }));

      if (inserts.length) {
        const { error: tradesErr } = await supabase
          .from('engagement_trades')
          .insert(inserts);
        if (tradesErr) throw tradesErr;
      }

      notify('Bid breakdown updated successfully', 'success');
      setEditTradesMode(false);
      await loadProspect();
    } catch (err) {
      console.error('Error saving trades:', err);
      notify('Failed to save bid breakdown', 'error');
    } finally {
      setSaving(false);
    }
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

  const modalExtended = useMemo(
    () =>
      tradeLines.reduce((sum, l) => {
        const amt = Number(l.amount);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0),
    [tradeLines]
  );

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const cancelEdit = () => {
    setEditMode(false);
    if (prospect) {
      setEditForm({
        name: prospect.name || '',
        customer_name: prospect.customer_name || '',
        contact_name: prospect.contact_name || '',
        architect: prospect.architect || '',
        company_owner: prospect.company_owner || '',
        owner: prospect.owner || '',
        start_date: prospect.start_date || '',
        bid_date: prospect.bid_date || '',
        estimating_type: prospect.estimating_type || '',
        probability_level_id: prospect.probability_level_id || '',
        sharepoint_folder: prospect.sharepoint_folder || '',
      });
      setTradeLines(
        (prospect.trades || []).map((t) => ({
          trade_id: t.id,
          amount: t.amount.toString(),
        }))
      );
    }
  };

  const saveEdit = async () => {
    if (!prospect) return;

    setSaving(true);
    try {
      // Update engagements table
      const { error: updateError } = await supabase
        .from('engagements')
        .update({
          name: editForm.name,
          estimating_type: editForm.estimating_type || null,
          probability_level_id: editForm.probability_level_id || null,
          est_start_date: editForm.start_date || null,
          bid_date: editForm.bid_date || null,
          sharepoint_folder: editForm.sharepoint_folder || null,
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      // Update parties via junction tables
      const customerCompany = customerOptions.find(
        (c) => c.name === editForm.customer_name
      );
      if (customerCompany) {
        await setPrimaryParty({
          engagementId: prospect.id,
          role: 'customer',
          partyType: 'company',
          partyId: customerCompany.id,
        });
      }

      const prospectContact = contactOptions.find(
        (c) => c.name === editForm.contact_name
      );
      if (prospectContact) {
        await setPrimaryParty({
          engagementId: prospect.id,
          role: 'prospect_contact',
          partyType: 'contact',
          partyId: prospectContact.id,
        });
      }

      const architectCompany = architectOptions.find(
        (a) => a.name === editForm.architect
      );
      if (architectCompany) {
        await setPrimaryParty({
          engagementId: prospect.id,
          role: 'architect',
          partyType: 'company',
          partyId: architectCompany.id,
        });
      }

      const ownerCompany = ownerCompanyOptions.find(
        (o) => o.name === editForm.company_owner
      );
      if (ownerCompany) {
        await setPrimaryParty({
          engagementId: prospect.id,
          role: 'owner',
          partyType: 'company',
          partyId: ownerCompany.id,
        });
      }

      // Update prospect owner via user roles
      const ownerUser = userOptions.find((u) => u.name === editForm.owner);
      if (ownerUser) {
        await setPrimaryUserRole({
          engagementId: prospect.id,
          role: 'sales_lead',
          userId: ownerUser.id,
        });
      }

      // Upsert trade lines
      await supabase
        .from('engagement_trades')
        .delete()
        .eq('engagement_id', prospect.id);
      const inserts = tradeLines
        .filter(
          (l) => l.trade_id && l.amount && !Number.isNaN(Number(l.amount))
        )
        .map((l) => ({
          engagement_id: prospect.id,
          trade_id: l.trade_id,
          estimated_amount: Number(l.amount),
        }));
      if (inserts.length) {
        const { error: tradesErr } = await supabase
          .from('engagement_trades')
          .insert(inserts);
        if (tradesErr) throw tradesErr;
      }

      notify('Prospect updated successfully', 'success');
      setEditMode(false);
      await loadProspect();
    } catch (err) {
      console.error('Error saving prospect:', err);
      notify('Failed to save prospect', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsLost = () => {
    setShowLostModal(true);
  };

  const confirmMarkAsLost = async () => {
    if (!prospect || !selectedLostReasonId) return;

    setConverting(true);
    try {
      // Get the lost reason name
      const lostReason = lostReasons.find((r) => r.id === selectedLostReasonId);
      const reasonText = lostReason?.reason || 'Unknown reason';

      // Update engagement to mark as lost using active flag and lost_reason_id
      const { error: updateError } = await supabase
        .from('engagements')
        .update({
          active: false,
          lost_reason_id: selectedLostReasonId,
          prospect_status: 'lost',
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      // Get current user from auth
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      // Find the matching user in the users table by email
      let userId = null;
      if (authUser?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .maybeSingle();
        userId = userData?.id || null;
      }

      // Create automatic comment
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const commentText = `Prospect was marked as lost on ${formattedDate} at ${formattedTime}. The lost reason is ${reasonText}.`;

      const { data: commentData, error: commentError } = await supabase
        .from('engagement_comments')
        .insert({
          engagement_id: prospect.id,
          comment_text: commentText,
          user_id: userId,
          is_follow_up: true,
        })
        .select();

      if (commentError) {
        console.error('Error creating auto-comment:', commentError);
        alert('Warning: Comment creation failed - ' + commentError.message);
        // Don't fail the whole operation if comment fails
      } else {
        console.log('Auto-comment created successfully:', commentData);

        // Update last_call since this comment is marked as follow-up
        const { error: lastCallError } = await supabase
          .from('engagements')
          .update({ last_call: new Date().toISOString().split('T')[0] })
          .eq('id', prospect.id);

        if (lastCallError) {
          console.error('Error updating last_call:', lastCallError);
        }
      }

      notify('Marked as lost successfully', 'success');
      setShowLostModal(false);
      // Redirect back to prospects list
      setTimeout(() => {
        router.push('/prospects');
      }, 1500);
    } catch (err) {
      console.error('Error marking as lost:', err);
      notify('Failed to mark as lost', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!prospect) return;

    const confirmed = window.confirm(
      `Convert "${prospect.name}" to a project? This will move it to the Projects list.`
    );
    if (!confirmed) return;

    setConverting(true);
    try {
      // Generate next project number
      const { data: projectNumbers, error: fetchError } = await supabase
        .from('engagements')
        .select('project_number')
        .eq('type', 'project')
        .not('project_number', 'is', null);

      if (fetchError) throw fetchError;

      // Parse all project numbers as integers and find the max
      let maxNumber = 0;
      if (projectNumbers && projectNumbers.length > 0) {
        projectNumbers.forEach((row) => {
          const num = parseInt(row.project_number || '0', 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        });
      }

      // Generate next project number (start at 1000 if no projects exist)
      const nextProjectNumber = maxNumber > 0 ? maxNumber + 1 : 1000;

      // Get the first stage (stage with order = 1)
      const { data: stages, error: stageError } = await supabase
        .from('stages')
        .select('id')
        .order('order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (stageError) throw stageError;

      // Use the RPC function to properly convert prospect to project
      // This function handles: type conversion, timestamp tracking, user tracking, and validation
      const { error: convertError } = await supabase.rpc(
        'promote_prospect_to_project',
        {
          p_engagement_id: prospect.id,
          p_qbid: null, // QB ID will be set later
          p_contract_amount: null, // Will use bid_amount from engagement
          p_initial_stage_id: stages?.id || null,
        }
      );

      if (convertError) throw convertError;

      // Update project number (RPC doesn't handle this)
      const { error: projectNumberError } = await supabase
        .from('engagements')
        .update({
          project_number: nextProjectNumber.toString(),
          prospect_status: 'won',
        })
        .eq('id', prospect.id);

      if (projectNumberError) throw projectNumberError;

      // Migrate prospect_contact → project_manager role
      const { error: roleError } = await supabase
        .from('engagement_parties')
        .update({ role: 'project_manager' })
        .eq('engagement_id', prospect.id)
        .eq('role', 'prospect_contact');

      if (roleError) throw roleError;

      // Note: prospect_owner role is kept as-is for historical purposes
      // project_owner is a different role and will be assigned manually later

      // Sync to QuickBooks and create new project there
      try {
        await fetch('/api/qbo/sync-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engagementId: prospect.id,
            createIfNotFound: true, // Create new QB project when converting
          }),
        });
        console.log('✓ Project synced to QuickBooks');
      } catch (qboError) {
        console.warn('Non-blocking: QB sync failed', qboError);
        // Don't block conversion if QB sync fails
      }

      notify(
        `Converted to project successfully (Project #${nextProjectNumber})`,
        'success'
      );
      // Redirect to the new project detail page
      setTimeout(() => {
        router.push(`/projects/${prospect.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error converting to project:', err);
      notify('Failed to convert to project', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleMarkAsDelayed = async () => {
    if (!prospect) return;

    const confirmed = window.confirm(
      `Mark "${prospect.name}" as delayed? The prospect will remain active but be marked as delayed.`
    );
    if (!confirmed) return;

    setConverting(true);
    try {
      const { error: updateError } = await supabase
        .from('engagements')
        .update({
          prospect_status: 'delayed',
          active: true, // Delayed prospects stay active
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      notify('Marked as delayed successfully', 'success');
      setShowProspectMenu(false);
      await loadProspect();
    } catch (err) {
      console.error('Error marking as delayed:', err);
      notify('Failed to mark as delayed', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleMarkAsCancelled = async () => {
    if (!prospect) return;

    const confirmed = window.confirm(
      `Mark "${prospect.name}" as cancelled? This will set the prospect to inactive.`
    );
    if (!confirmed) return;

    setConverting(true);
    try {
      const { error: updateError } = await supabase
        .from('engagements')
        .update({
          prospect_status: 'cancelled',
          active: false, // Cancelled prospects become inactive
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      notify('Marked as cancelled successfully', 'success');
      setShowProspectMenu(false);
      // Redirect back to prospects list
      setTimeout(() => {
        router.push('/prospects');
      }, 1500);
    } catch (err) {
      console.error('Error marking as cancelled:', err);
      notify('Failed to mark as cancelled', 'error');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div style={styles.pageContainerStyle}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Dashboard Header with Menu */}
      <DashboardHeader
        sessionEmail={sessionEmail}
        activeTab="prospects"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuItems={
          <SharedMenu onClose={() => setMenuOpen(false)} {...menuCallbacks} />
        }
        actionButton={
          <div style={{ width: 145, minWidth: 145, visibility: 'hidden' }} />
        }
        exportButton={
          <button
            disabled
            style={{
              background: '#f5f5f5',
              color: '#999',
              border: '1px solid #e5dfd5',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            Export CSV
          </button>
        }
      />

      {/* Header */}
      <div style={styles.headerStyle}>
        <Link
          href="/prospects"
          style={{
            color: colors.navy,
            textDecoration: 'none',
            fontSize: 14,
            marginBottom: 8,
            display: 'inline-block',
          }}
        >
          ← Back to Prospects
        </Link>

        {loading ? (
          <p style={{ color: colors.textSecondary }}>Loading…</p>
        ) : !prospect ? (
          <p style={{ color: colors.textSecondary }}>Prospect not found.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={styles.titleStyle}>{prospect.name}</h1>
              {prospect.sharepoint_folder && (
                <a
                  href={prospect.sharepoint_folder}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open SharePoint Folder"
                  style={{
                    color: colors.navy,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Folder size={18} />
                </a>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
              }}
              className="prospect-action-buttons"
            >
              {!editMode &&
                !editTradesMode &&
                prospect?.active !== false &&
                prospect?.type === 'prospect' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowProspectMenu(!showProspectMenu)}
                      disabled={converting}
                      style={{
                        padding: '10px 24px',
                        background: colors.navy,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: converting ? 'not-allowed' : 'pointer',
                        opacity: converting ? 0.7 : 1,
                        transition: 'all 0.2s',
                        minWidth: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        if (!converting) {
                          e.currentTarget.style.background = '#0d1b2a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.navy;
                      }}
                    >
                      Prospect Options
                      <ChevronDown size={16} />
                    </button>

                    {showProspectMenu && !converting && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: 8,
                          background: '#fff',
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          minWidth: 200,
                          zIndex: 1000,
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowProspectMenu(false);
                            handleConvertToProject();
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `1px solid ${colors.border}`,
                            textAlign: 'left',
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          🚀 Mark as Won (Convert to Project)
                        </button>
                        <button
                          onClick={() => {
                            setShowProspectMenu(false);
                            handleMarkAsLost();
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `1px solid ${colors.border}`,
                            textAlign: 'left',
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ❌ Mark as Lost
                        </button>
                        <button
                          onClick={() => {
                            setShowProspectMenu(false);
                            handleMarkAsDelayed();
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `1px solid ${colors.border}`,
                            textAlign: 'left',
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ⏸️ Mark as Delayed
                        </button>
                        <button
                          onClick={() => {
                            setShowProspectMenu(false);
                            handleMarkAsCancelled();
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            borderBottomLeftRadius: 8,
                            borderBottomRightRadius: 8,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          🚫 Mark as Cancelled
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
            <div style={{ width: 0 }} />
          </div>
        )}
      </div>

      {loading || !prospect ? null : (
        <div style={styles.contentWrapperStyle} className="content-wrapper">
          {/* 3-Column Layout: Prospect Info + Main Content + Comments */}
          <div
            style={styles.threeColumnLayoutStyle}
            className="prospect-detail-layout three-column-layout"
          >
            {/* Left Sidebar - Prospect Information */}
            <div
              style={styles.leftSidebarStyle}
              className="prospect-info-card left-sidebar"
            >
              <div style={styles.stickyContainerStyle}>
                {/* Prospect Information Card */}
                <div
                  style={{
                    background: '#faf8f5',
                    border: '1px solid #e5dfd5',
                    borderRadius: 12,
                    padding: 20,
                  }}
                  className="project-info-card"
                >
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
                      Prospect Information
                    </h2>
                    {!editMode ? (
                      <button
                        onClick={startEdit}
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
                        title="Edit prospect"
                        aria-label="Edit prospect"
                      >
                        <Pencil size={16} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={cancelEdit}
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
                          onClick={saveEdit}
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

                  {/* Prospect Details / Edit Form */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {editMode && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {/* Project Name */}
                        <div>
                          <label style={styles.labelStyle}>Project Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            style={styles.inputStyle}
                          />
                        </div>

                        {/* Estimating Type */}
                        <div>
                          <label style={styles.labelStyle}>
                            Estimating Type
                          </label>
                          <select
                            value={editForm.estimating_type}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                estimating_type: e.target.value,
                              })
                            }
                            style={styles.inputStyle}
                          >
                            <option value="">Select type...</option>
                            <option value="Budget">Budget</option>
                            <option value="Construction">Construction</option>
                          </select>
                        </div>

                        {/* Probability */}
                        <div>
                          <label style={styles.labelStyle}>Probability</label>
                          <select
                            value={editForm.probability_level_id}
                            onChange={(e) => {
                              setEditForm({
                                ...editForm,
                                probability_level_id: e.target.value,
                              });
                            }}
                            style={styles.inputStyle}
                          >
                            <option value="">Select probability...</option>
                            {probabilityLevels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.name} ({level.percentage}%)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Estimated Start Date */}
                        <div>
                          <label style={styles.labelStyle}>
                            Estimated Start Date
                          </label>
                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                start_date: e.target.value,
                              })
                            }
                            style={styles.inputStyle}
                          />
                        </div>

                        {/* Bid Date */}
                        <div>
                          <label style={styles.labelStyle}>Bid Date</label>
                          <input
                            type="date"
                            value={editForm.bid_date}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                bid_date: e.target.value,
                              })
                            }
                            style={styles.inputStyle}
                          />
                        </div>

                        {/* Sales Lead */}
                        <div>
                          <label style={styles.labelStyle}>Sales Lead</label>
                          <input
                            type="text"
                            value={editForm.owner}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                owner: e.target.value,
                              })
                            }
                            list="user-list"
                            style={styles.inputStyle}
                          />
                          <datalist id="user-list">
                            {userOptions.map((u) => (
                              <option key={u.id} value={u.name} />
                            ))}
                          </datalist>
                        </div>

                        {/* Section Divider */}
                        <div style={styles.sectionDividerStyle}>
                          <p style={styles.sectionTitleStyle}>
                            Customer / Parties
                          </p>
                        </div>

                        {/* Customer */}
                        <div>
                          <label style={styles.labelStyle}>Customer</label>
                          <input
                            type="text"
                            value={editForm.customer_name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                customer_name: e.target.value,
                              })
                            }
                            list="customer-list"
                            style={styles.inputStyle}
                          />
                          <datalist id="customer-list">
                            {customerOptions.map((c) => (
                              <option key={c.id} value={c.name} />
                            ))}
                          </datalist>
                        </div>

                        {/* Prospect Contact */}
                        <div>
                          <label style={styles.labelStyle}>
                            Prospect Contact
                          </label>
                          <input
                            type="text"
                            value={editForm.contact_name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                contact_name: e.target.value,
                              })
                            }
                            list="contact-list"
                            style={styles.inputStyle}
                          />
                          <datalist id="contact-list">
                            {contactOptions.map((c) => (
                              <option key={c.id} value={c.name} />
                            ))}
                          </datalist>
                        </div>

                        {/* Architect */}
                        <div>
                          <label style={styles.labelStyle}>Architect</label>
                          <input
                            type="text"
                            value={editForm.architect}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                architect: e.target.value,
                              })
                            }
                            list="architect-list"
                            style={styles.inputStyle}
                          />
                          <datalist id="architect-list">
                            {architectOptions.map((a) => (
                              <option key={a.id} value={a.name} />
                            ))}
                          </datalist>
                        </div>

                        {/* Owner */}
                        <div>
                          <label style={styles.labelStyle}>Owner</label>
                          <input
                            type="text"
                            value={editForm.company_owner}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                company_owner: e.target.value,
                              })
                            }
                            list="owner-list"
                            style={styles.inputStyle}
                          />
                          <datalist id="owner-list">
                            {ownerCompanyOptions.map((o) => (
                              <option key={o.id} value={o.name} />
                            ))}
                          </datalist>
                        </div>

                        {/* Section Divider */}
                        <div style={styles.sectionDividerStyle}>
                          <p style={styles.sectionTitleStyle}>Links</p>
                        </div>

                        {/* SharePoint Folder */}
                        <div>
                          <label style={styles.labelStyle}>
                            SharePoint Folder
                          </label>
                          <input
                            type="text"
                            value={editForm.sharepoint_folder}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                sharepoint_folder: e.target.value,
                              })
                            }
                            style={styles.inputStyle}
                          />
                        </div>
                      </div>
                    )}

                    {!editMode && (
                      <>
                        {/* Display Mode */}

                        <div>
                          <p style={styles.detailLabelStyle}>Estimating Type</p>
                          <p style={styles.detailValueStyle}>
                            {prospect.estimating_type || '—'}
                          </p>
                        </div>

                        <div>
                          <p style={styles.detailLabelStyle}>Probability</p>
                          <p style={styles.detailValueStyle}>
                            {prospect.probability_level_id
                              ? (() => {
                                  const level = probabilityLevels.find(
                                    (l) =>
                                      l.id === prospect.probability_level_id
                                  );
                                  return level
                                    ? `${level.name} (${level.percentage}%)`
                                    : '—';
                                })()
                              : '—'}
                          </p>
                        </div>

                        <div>
                          <p style={styles.detailLabelStyle}>
                            Estimated Start Date
                          </p>
                          <p style={styles.detailValueStyle}>
                            {dateStr(prospect.start_date)}
                          </p>
                        </div>

                        <div>
                          <p style={styles.detailLabelStyle}>Bid Date</p>
                          <p style={styles.detailValueStyle}>
                            {dateStr(prospect.bid_date)}
                          </p>
                        </div>

                        <div>
                          <p style={styles.detailLabelStyle}>Sales Lead</p>
                          <p style={styles.detailValueStyle}>
                            {prospect.owner || '—'}
                          </p>
                        </div>

                        <div style={styles.sectionDividerStyle}>
                          <p style={styles.sectionTitleStyle}>
                            Customer / Parties
                          </p>
                          <DetailItem
                            label="Customer"
                            value={prospect.customer_name}
                          />
                          <div style={{ marginTop: 8 }}>
                            <DetailItem
                              label="Prospect Contact"
                              value={prospect.contact_name}
                            />
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <DetailItem
                              label="Architect"
                              value={prospect.architect}
                            />
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <DetailItem
                              label="Owner"
                              value={prospect.company_owner}
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area - Bid & Trades */}
            <div
              style={styles.mainContentStyle}
              className="prospect-trades-card main-content"
            >
              <div
                style={{
                  background: '#faf8f5',
                  border: '1px solid #e5dfd5',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
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
                    Bid Breakdown
                  </h2>
                  <div
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    {!editMode && !editTradesMode && (
                      <button
                        type="button"
                        onClick={startTradesEdit}
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
                        title="Edit Bid Breakdown"
                        aria-label="Edit Bid Breakdown"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {!editMode && editTradesMode && (
                      <>
                        <button
                          onClick={cancelTradesEdit}
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
                          onClick={saveTradesEdit}
                          disabled={saving}
                          style={{
                            padding: '6px 12px',
                            background: colors.navy,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: saving ? 0.7 : 1,
                          }}
                        >
                          {saving ? (
                            'Saving…'
                          ) : (
                            <>
                              <Save size={14} />
                              Save
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!editMode && !editTradesMode && (
                  <div>
                    {!prospect?.trades || prospect.trades.length === 0 ? (
                      <p style={{ color: colors.textSecondary, margin: 0 }}>
                        No trades added yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {prospect.trades.map((trade, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '12px',
                              background: '#fff',
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: 600,
                                  color: colors.textPrimary,
                                }}
                              >
                                {trade.code} — {trade.name}
                              </p>
                            </div>
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: 700,
                                  color: colors.navy,
                                }}
                              >
                                {formatCurrency(trade.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '16px 12px',
                            background: '#e5dfd5',
                            borderRadius: 8,
                            marginTop: 8,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 16,
                              color: colors.textPrimary,
                            }}
                          >
                            Total Bid Amount
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 16,
                              color: colors.navy,
                            }}
                          >
                            {formatCurrency(prospect.extended)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!editMode && editTradesMode && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 16,
                      }}
                    >
                      <button
                        type="button"
                        onClick={addTradeLine}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: colors.navy,
                          color: '#fff',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Add Trade
                      </button>
                    </div>
                    {tradeLines.length === 0 && (
                      <p
                        style={{
                          color: colors.textSecondary,
                          margin: '0 0 12px 0',
                        }}
                      >
                        No trades added yet. Click &quot;Add Trade&quot; to
                        begin.
                      </p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {tradeLines.map((line, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 40px',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <select
                            value={line.trade_id}
                            onChange={(e) =>
                              updateTradeLine(idx, { trade_id: e.target.value })
                            }
                            style={styles.inputStyle}
                          >
                            <option value="">Select trade...</option>
                            {tradeOptions.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.code} — {t.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={line.amount}
                            onChange={(e) =>
                              updateTradeLine(idx, { amount: e.target.value })
                            }
                            placeholder="Amount"
                            style={styles.inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => removeTradeLine(idx)}
                            style={{
                              background: colors.logoRed,
                              color: '#fff',
                              border: 'none',
                              padding: 8,
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        marginTop: 16,
                        padding: '12px',
                        background: '#e5dfd5',
                        borderRadius: 8,
                        textAlign: 'right',
                      }}
                    >
                      <strong
                        style={{ fontSize: 14, color: colors.textSecondary }}
                      >
                        Total Bid (Extended): {formatCurrency(modalExtended)}
                      </strong>
                    </div>
                  </div>
                )}

                {editMode && (
                  <div>
                    {!prospect?.trades || prospect.trades.length === 0 ? (
                      <p style={{ color: colors.textSecondary, margin: 0 }}>
                        No trades added yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {prospect.trades.map((trade, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '12px',
                              background: '#fff',
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: 600,
                                  color: colors.textPrimary,
                                }}
                              >
                                {trade.code} — {trade.name}
                              </p>
                            </div>
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: 700,
                                  color: colors.navy,
                                }}
                              >
                                {formatCurrency(trade.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '16px 12px',
                            background: '#e5dfd5',
                            borderRadius: 8,
                            marginTop: 8,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 16,
                              color: colors.textPrimary,
                            }}
                          >
                            Total Bid Amount
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 16,
                              color: colors.navy,
                            }}
                          >
                            {formatCurrency(prospect.extended)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Comments */}
            <div style={styles.rightSidebarStyle} className="right-sidebar">
              <div style={{ position: 'sticky', top: 24 }}>
                {id && typeof id === 'string' && (
                  <CommentsSection
                    comments={comments}
                    setComments={setComments}
                    currentUser={currentUser}
                    projectId={id}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {companiesModal.open && companiesModal.companyType && (
        <CompaniesModal
          open={companiesModal.open}
          onClose={() => {
            setCompaniesModal({ open: false, companyType: null, label: '' });
            loadDropdownOptions();
          }}
          companyType={companiesModal.companyType}
          label={companiesModal.label}
        />
      )}

      {showContactsModal && (
        <ContactsModal
          open={showContactsModal}
          onClose={() => {
            setShowContactsModal(false);
            loadDropdownOptions();
          }}
        />
      )}

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div
          onClick={() => setShowLostModal(false)}
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
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBackground,
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 16,
                color: colors.textPrimary,
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Mark as Lost
            </h2>
            <p style={{ marginBottom: 20, color: colors.textSecondary }}>
              Select a reason for marking "{prospect?.name}" as lost:
            </p>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                Lost Reason *
              </label>
              <select
                value={selectedLostReasonId}
                onChange={(e) => setSelectedLostReasonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  background: '#fff',
                }}
              >
                <option value="">Select a reason...</option>
                {lostReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.reason}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => {
                  setShowLostModal(false);
                  setSelectedLostReasonId('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: colors.textPrimary,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsLost}
                disabled={!selectedLostReasonId || converting}
                style={{
                  padding: '10px 20px',
                  background:
                    selectedLostReasonId && !converting ? '#ef4444' : '#d1d5db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    selectedLostReasonId && !converting
                      ? 'pointer'
                      : 'not-allowed',
                  opacity: selectedLostReasonId && !converting ? 1 : 0.7,
                }}
              >
                {converting ? 'Marking as Lost...' : 'Mark as Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renderModals()}
    </div>
  );
}

// Toast UI
const Toast = ({
  message,
  type,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
}) => <div style={styles.getToastStyle(type)}>{message}</div>;

// Helper Components
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
