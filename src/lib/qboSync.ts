// QuickBooks Sync Service
// Handles syncing engagements to QuickBooks as Customers and Jobs
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from './qboClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QBOCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
}

interface QBOJob {
  Id: string;
  DisplayName: string;
  ParentRef: { value: string };
}

interface SyncResult {
  success: boolean;
  customerId?: string;
  jobId?: string;
  error?: string;
}

/**
 * Make a QuickBooks API request
 */
async function makeQBORequest(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
): Promise<any> {
  const { client, realmId } = await getAuthenticatedClient();
  const token = client.getToken();

  const environment = (process.env.QBO_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production';
  const baseUrl =
    environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QBO API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Search for existing customer by name
 */
async function findCustomerByName(
  customerName: string
): Promise<QBOCustomer | null> {
  try {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${customerName.replace(/'/g, "\\'")}' AND Active IN (true, false)`;
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    if (data.QueryResponse?.Customer?.length > 0) {
      return data.QueryResponse.Customer[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding customer:', error);
    return null;
  }
}

/**
 * Create a new customer in QuickBooks
 */
async function createCustomer(customerName: string): Promise<QBOCustomer> {
  const customerData = {
    DisplayName: customerName,
    CompanyName: customerName,
  };

  const response = await makeQBORequest('POST', 'customer', customerData);
  return response.Customer;
}

/**
 * Update an existing customer in QuickBooks
 */
async function updateCustomer(
  customerId: string,
  newName: string
): Promise<QBOCustomer> {
  // First fetch the customer to get the SyncToken
  const existingCustomer = await makeQBORequest(
    'GET',
    `customer/${customerId}`
  );

  const customerData = {
    ...existingCustomer.Customer,
    DisplayName: newName,
    CompanyName: newName,
  };

  const response = await makeQBORequest('POST', 'customer', customerData);
  return response.Customer;
}

/**
 * Find an existing job by project number or name
 */
async function findJobByProjectNumber(
  projectNumber: string,
  customerId?: string
): Promise<QBOJob | null> {
  try {
    // Search for jobs that start with the project number (including inactive)
    const query = `SELECT * FROM Customer WHERE Job = true AND DisplayName LIKE '${projectNumber}%' AND Active IN (true, false)`;
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    if (data.QueryResponse?.Customer?.length > 0) {
      // If customerId provided, filter by parent
      if (customerId) {
        const job = data.QueryResponse.Customer.find(
          (c: QBOJob) => c.ParentRef?.value === customerId
        );
        return job || null;
      }
      // Otherwise return first match
      return data.QueryResponse.Customer[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding job:', error);
    return null;
  }
}

/**
 * Create a job (sub-customer) under a customer
 */
async function createJob(
  customerId: string,
  projectName: string,
  projectNumber: string
): Promise<QBOJob> {
  const jobData = {
    DisplayName: `${projectNumber} ${projectName}`,
    Job: true,
    BillWithParent: true, // Required to convert to project
    ParentRef: {
      value: customerId,
    },
  };

  const response = await makeQBORequest('POST', 'customer', jobData);
  return response.Customer;
}

/**
 * Get the customer info for an engagement
 */
async function getCustomerInfo(engagementId: string): Promise<{
  companyId: string;
  name: string;
  qboId: string | null;
} | null> {
  // First get the customer party from engagement_parties
  const { data: party, error: partyError } = await supabase
    .from('engagement_parties')
    .select('party_id, party_type')
    .eq('engagement_id', engagementId)
    .eq('role', 'customer')
    .eq('is_primary', true)
    .maybeSingle();

  if (partyError || !party) {
    console.error('Error getting customer party:', partyError);
    return null;
  }

  // Now get the company name (customers should be companies, not contacts)
  if (party.party_type !== 'company') {
    console.error('Customer party is not a company');
    return null;
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .eq('id', party.party_id)
    .single();

  if (companyError || !company) {
    console.error('Error getting company name:', companyError);
    return null;
  }

  return {
    companyId: company.id,
    name: company.name,
    qboId: company.qbo_id,
  };
}

/**
 * Sync a single engagement to QuickBooks
 * @param createIfNotFound - If true, creates new QB project if not found. If false, only links to existing.
 */
export async function syncEngagementToQBO(
  engagementId: string,
  createIfNotFound: boolean = false
): Promise<SyncResult> {
  try {
    // Get engagement details
    const { data: engagement, error: engError } = await supabase
      .from('engagements')
      .select('id, name, project_number, qbo_customer_id, qbo_job_id')
      .eq('id', engagementId)
      .single();

    if (engError || !engagement) {
      return { success: false, error: 'Engagement not found' };
    }

    if (!engagement.project_number) {
      return {
        success: false,
        error:
          'Project must have a project_number before syncing to QuickBooks',
      };
    }

    // Get customer info from engagement_parties and companies
    const customerInfo = await getCustomerInfo(engagementId);
    if (!customerInfo) {
      return {
        success: false,
        error: 'No customer found for this engagement',
      };
    }

    // Step 1: Find or create customer
    let customer: QBOCustomer;

    if (customerInfo.qboId) {
      // Customer already synced - check if name changed
      console.log(`Customer already synced with QB ID: ${customerInfo.qboId}`);

      try {
        // Fetch current QB customer to check name
        const qbCustomer = await makeQBORequest(
          'GET',
          `customer/${customerInfo.qboId}`
        );
        customer = qbCustomer.Customer;

        // If name changed, update in QB
        if (customer.DisplayName !== customerInfo.name) {
          console.log(
            `Customer name changed: "${customer.DisplayName}" -> "${customerInfo.name}"`
          );
          customer = await updateCustomer(
            customerInfo.qboId,
            customerInfo.name
          );
          console.log(`Updated customer name in QuickBooks`);
        }
      } catch (error) {
        console.error(
          'Error fetching QB customer, will search by name:',
          error
        );
        // Fallback to search by name
        const foundCustomer = await findCustomerByName(customerInfo.name);
        if (foundCustomer) {
          customer = foundCustomer;
        } else {
          console.log(`Creating new customer: ${customerInfo.name}`);
          customer = await createCustomer(customerInfo.name);
        }
      }
    } else {
      // Not yet synced - find or create
      const foundCustomer = await findCustomerByName(customerInfo.name);
      if (foundCustomer) {
        console.log(
          `Found existing customer: ${customerInfo.name} (${foundCustomer.Id})`
        );
        customer = foundCustomer;
      } else {
        console.log(`Creating new customer: ${customerInfo.name}`);
        customer = await createCustomer(customerInfo.name);
      }
    }

    // Step 2: Find existing job under customer
    let job = await findJobByProjectNumber(
      engagement.project_number,
      customer.Id
    );

    if (job) {
      console.log(`Found existing job: ${job.DisplayName} (${job.Id})`);
    } else if (createIfNotFound) {
      console.log(
        `Creating job: ${engagement.project_number} - ${engagement.name}`
      );
      job = await createJob(
        customer.Id,
        engagement.name,
        engagement.project_number
      );
    } else {
      // Project not found and we're not creating new ones
      return {
        success: false,
        error: `QuickBooks project not found for ${engagement.project_number}. Create it in QuickBooks first or use "Create New Project" action.`,
      };
    }
        customer.Id,
        engagement.name,
        engagement.project_number
      );
    }

    // Step 3: Update engagement with QB IDs
    const { error: updateError } = await supabase
      .from('engagements')
      .update({
        qbo_customer_id: customer.Id,
        qbo_job_id: job.Id,
        qbo_last_synced_at: new Date().toISOString(),
      })
      .eq('id', engagementId);

    if (updateError) {
      console.error('Error updating engagement:', updateError);
      return {
        success: false,
        error: 'Failed to update engagement with QB IDs',
      };
    }

    // Step 4: Update company with QB ID
    const { error: companyUpdateError } = await supabase
      .from('companies')
      .update({
        qbo_id: customer.Id,
        qbo_last_synced_at: new Date().toISOString(),
      })
      .eq('id', customerInfo.companyId);

    if (companyUpdateError) {
      console.error('Error updating company with QB ID:', companyUpdateError);
      // Don't fail the whole sync for this
    }

    return {
      success: true,
      customerId: customer.Id,
      jobId: job.Id,
    };
  } catch (error: any) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during sync',
    };
  }
}

/**
 * Sync multiple engagements to QuickBooks
 */
export async function syncMultipleEngagements(
  engagementIds: string[]
): Promise<{ success: number; failed: number; results: SyncResult[] }> {
  const results: SyncResult[] = [];
  let success = 0;
  let failed = 0;

  for (const id of engagementIds) {
    const result = await syncEngagementToQBO(id);
    results.push(result);

    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed, results };
}
