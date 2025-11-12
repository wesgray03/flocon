# Prospects Page - UI Implementation Quick Reference

## Supabase Query Examples

### Fetch All Prospects (with filters)

```typescript
// Get all active prospects
const { data: prospects, error } = await supabase
  .from('v_prospects')
  .select('*')
  .order('probability', { ascending: false });

// Filter by pipeline status
const { data: hotProspects } = await supabase
  .from('v_prospects')
  .select('*')
  .in('pipeline_status', ['negotiation', 'verbal_commit'])
  .order('expected_close_date');

// Search by name or customer
const { data: searchResults } = await supabase
  .from('v_prospects')
  .select('*')
  .or(`name.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
```

### Create New Prospect

```typescript
const newProspect = {
  type: 'prospect',
  name: '1401 Church St Tower 1',
  customer_id: 'customer-uuid',
  sales_contact_id: 'contact-uuid',
  pipeline_status: 'qualified',
  probability: 50,
  expected_close_date: '2025-12-15',
  lead_source: 'repeat_customer',
  bid_amount: 1822700.00,
  manager: 'Hastings',
  owner: 'Adam Builders',
  address: '1401 Church St',
  city: 'Nashville',
  state: 'TN',
  scope_summary: 'Complete flooring package for new construction'
};

const { data, error } = await supabase
  .from('engagements')
  .insert(newProspect)
  .select()
  .single();
```

### Update Prospect

```typescript
const { data, error } = await supabase
  .from('engagements')
  .update({
    pipeline_status: 'negotiation',
    probability: 75,
    expected_close_date: '2025-11-30'
  })
  .eq('id', prospectId)
  .eq('type', 'prospect') // Safety check
  .select()
  .single();
```

### Add Trades to Prospect

```typescript
// First, get available trades
const { data: trades } = await supabase
  .from('trades')
  .select('*')
  .eq('is_active', true)
  .order('code');

// Add selected trades with amounts
const tradesToAdd = [
  {
    engagement_id: prospectId,
    trade_id: 'trade-uuid-1',
    estimated_amount: 500000
  },
  {
    engagement_id: prospectId,
    trade_id: 'trade-uuid-2',
    estimated_amount: 300000
  }
];

const { data, error } = await supabase
  .from('engagement_trades')
  .insert(tradesToAdd);
```

### Get Prospect with Trade Details

```typescript
// Fetch prospect
const { data: prospect } = await supabase
  .from('v_prospects')
  .select('*')
  .eq('id', prospectId)
  .single();

// Fetch associated trades
const { data: trades } = await supabase
  .from('v_engagement_trades_detail')
  .select('*')
  .eq('engagement_id', prospectId);
```

### Promote Prospect to Project

```typescript
const { data, error } = await supabase.rpc('promote_prospect_to_project', {
  p_engagement_id: prospectId,
  p_qbid: 'QB12345',           // Optional: QB ID if already created
  p_contract_amount: 1800000,  // Optional: defaults to bid_amount
  p_initial_stage_id: stageId  // Optional: initial project stage
});

if (!error) {
  // Success! Prospect is now a project
  // Redirect to projects page or show success message
}
```

### Mark Prospect as Lost

```typescript
const { data, error } = await supabase.rpc('mark_prospect_lost', {
  p_engagement_id: prospectId,
  p_lost_reason: 'Lost to competitor - price difference'
});
```

### Pipeline Dashboard Data

```typescript
// Get pipeline summary for dashboard
const { data: pipelineSummary } = await supabase
  .from('v_pipeline_summary')
  .select('*');

// Get hot prospects
const { data: hotProspects } = await supabase
  .from('v_hot_prospects')
  .select('*')
  .limit(10);

// Get recently updated prospects
const { data: recentProspects } = await supabase
  .from('v_prospects')
  .select('*')
  .order('updated_at', { ascending: false })
  .limit(5);
```

---

## Component Structure Suggestions

```
src/
  pages/
    prospects/
      index.tsx              # Main prospects list page
      [id].tsx              # Prospect detail/edit page
      new.tsx               # Create new prospect page
  
  components/
    prospects/
      ProspectList.tsx      # Table/grid of prospects
      ProspectCard.tsx      # Individual prospect card
      ProspectForm.tsx      # Create/edit form
      ProspectFilters.tsx   # Filter by status, probability, etc.
      ProspectTradeSelector.tsx  # Multi-select trades with amounts
      PromoteToProjectModal.tsx  # Promotion confirmation dialog
      MarkLostModal.tsx     # Lost reason dialog
      PipelineDashboard.tsx # Dashboard with metrics
      
    shared/
      TradeSelector.tsx     # Reusable trade picker
      ContactPicker.tsx     # Contact selection component
      CustomerPicker.tsx    # Customer selection component
```

---

## Form Fields Reference

### Prospect Form Fields (Required)
- ✅ Name (text)
- ✅ Customer (select from customers table)
- ✅ Pipeline Status (dropdown: lead/qualified/proposal_sent/etc.)

### Prospect Form Fields (Optional but Recommended)
- Sales Contact (select from contacts filtered by customer_id)
- Probability (slider 0-100%)
- Expected Close Date (date picker)
- Lead Source (dropdown: referral/website/repeat_customer/etc.)
- Bid Amount (currency input)
- Estimated Start Date (date picker)
- Address, City, State (text inputs)
- Manager (text - project manager)
- Owner (text - architect/designer)
- Scope Summary (textarea)
- Notes (textarea)
- Trades (multi-select with amount inputs)

### Promotion Modal Fields
- QuickBooks ID (text, optional)
- Contract Amount (currency, defaults to bid_amount)
- Initial Stage (select from stages table)
- Confirmation checkbox

### Mark Lost Modal Fields
- Lost Reason (textarea, required)
- Competitor Name (text, optional)
- Price Difference (currency, optional)

---

## UI State Management

### Filter State
```typescript
interface ProspectFilters {
  pipeline_status?: PipelineStatus[];
  probability_min?: number;
  probability_max?: number;
  expected_close_before?: string;
  expected_close_after?: string;
  lead_source?: LeadSource[];
  customer_id?: string;
  search?: string;
}
```

### Sort State
```typescript
interface ProspectSort {
  field: 'name' | 'probability' | 'expected_close_date' | 'bid_amount' | 'updated_at';
  direction: 'asc' | 'desc';
}
```

---

## Status Badge Colors (Suggested)

```typescript
const statusColors: Record<PipelineStatus, string> = {
  lead: 'bg-gray-100 text-gray-800',
  qualified: 'bg-blue-100 text-blue-800',
  proposal_prep: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  verbal_commit: 'bg-green-100 text-green-800',
  won: 'bg-emerald-500 text-white',
  lost: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-600'
};
```

---

## Probability Visual Indicators

```typescript
// Probability color coding
const getProbabilityColor = (probability: number | null) => {
  if (!probability) return 'text-gray-400';
  if (probability >= 75) return 'text-green-600';
  if (probability >= 50) return 'text-yellow-600';
  if (probability >= 25) return 'text-orange-600';
  return 'text-red-600';
};

// Probability as progress bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className={`h-2 rounded-full ${getProbabilityColor(probability)}`}
    style={{ width: `${probability}%` }}
  />
</div>
```

---

## Validation Rules

```typescript
const prospectValidation = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 255
  },
  customer_id: {
    required: true
  },
  pipeline_status: {
    required: true,
    enum: ['lead', 'qualified', 'proposal_prep', 'proposal_sent', 
           'negotiation', 'verbal_commit', 'won', 'lost', 'on_hold']
  },
  probability: {
    min: 0,
    max: 100,
    type: 'integer'
  },
  bid_amount: {
    min: 0,
    type: 'number'
  }
};
```

---

## React Query Hooks (Example)

```typescript
// Custom hook for prospects
export function useProspects(filters?: ProspectFilters) {
  return useQuery({
    queryKey: ['prospects', filters],
    queryFn: async () => {
      let query = supabase.from('v_prospects').select('*');
      
      if (filters?.pipeline_status?.length) {
        query = query.in('pipeline_status', filters.pipeline_status);
      }
      if (filters?.probability_min !== undefined) {
        query = query.gte('probability', filters.probability_min);
      }
      // ... apply other filters
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Prospect[];
    }
  });
}

// Mutation for creating prospect
export function useCreateProspect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newProspect: CreateProspectInput) => {
      const { data, error } = await supabase
        .from('engagements')
        .insert({ ...newProspect, type: 'prospect' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    }
  });
}

// Mutation for promoting prospect
export function usePromoteProspect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: PromoteProspectInput) => {
      const { data, error } = await supabase.rpc('promote_prospect_to_project', {
        p_engagement_id: input.engagement_id,
        p_qbid: input.qbid,
        p_contract_amount: input.contract_amount,
        p_initial_stage_id: input.initial_stage_id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}
```

---

## Permission Checks

```typescript
// Check if current user can promote prospects
const canPromoteProspects = (user: User) => {
  return ['Owner', 'Admin'].includes(user.user_type);
};

// Check if current user can edit this prospect
const canEditProspect = (user: User, prospect: Prospect) => {
  if (['Owner', 'Admin'].includes(user.user_type)) return true;
  if (user.user_type === 'Sales') {
    // If using "own prospects only" policy, check owner
    // return prospect.owner === user.email;
    return true; // All sales can edit all prospects
  }
  return false;
};

// Show/hide promote button
{canPromoteProspects(currentUser) && (
  <button onClick={handlePromote}>
    Convert to Project
  </button>
)}
```

---

## Quick Action Buttons

### Prospect Card Actions
- ✏️ Edit
- 🗑️ Delete (if no trades/history)
- 📈 Promote to Project (admin only)
- ❌ Mark as Lost
- ⏸️ Put On Hold
- 📞 Log Call/Activity
- 📧 Send Email
- 📋 Copy Details

### Bulk Actions (Multi-select)
- Update Status (batch)
- Update Probability (batch)
- Assign to User (batch)
- Export to CSV
- Delete Selected

---

## Export/Reporting

```typescript
// Export prospects to CSV
const exportProspects = async (filters?: ProspectFilters) => {
  const { data } = await supabase
    .from('v_prospects')
    .select('*')
    .csv(); // Supabase auto-converts to CSV
  
  // Download file
  const blob = new Blob([data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prospects-${new Date().toISOString()}.csv`;
  a.click();
};

// Get pipeline metrics for dashboard
const { data: metrics } = await supabase
  .from('v_pipeline_summary')
  .select('*');

// Calculate weighted pipeline value
const totalWeightedValue = metrics.reduce(
  (sum, stage) => sum + (stage.weighted_value || 0), 
  0
);
```

---

## Testing Checklist

- [ ] Create new prospect with all fields
- [ ] Create prospect with minimal fields
- [ ] Edit prospect details
- [ ] Add trades to prospect
- [ ] Remove trades from prospect
- [ ] Filter prospects by status
- [ ] Filter prospects by probability range
- [ ] Search prospects by name/customer
- [ ] Sort prospects by different columns
- [ ] Promote prospect to project (admin)
- [ ] Verify promotion preserves data
- [ ] Mark prospect as lost
- [ ] View lost prospects report
- [ ] Export prospects to CSV
- [ ] Verify RLS (sales can't see projects)
- [ ] Verify RLS (ops can't see prospects)
- [ ] Test bulk operations
- [ ] Test mobile responsive layout

---

**Ready to build!** 🎨
