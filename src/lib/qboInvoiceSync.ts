/**
 * QuickBooks Invoice Sync Service
 * Handles pushing FloCon pay apps (invoices) to QuickBooks
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { makeQBORequest } from './qboClient';
import { supabase } from './supabaseClient';

type QBOInvoice = {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef: {
    value: string;
  };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'SalesItemLineDetail';
    SalesItemLineDetail: {
      ItemRef: {
        value: string; // Service item ID
      };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  TotalAmt?: number;
  Balance?: number;
};

type PayApp = {
  id: string;
  engagement_id: string;
  pay_app_number: string | null;
  description: string;
  amount: number;
  current_payment_due: number;
  period_end: string | null;
  date_submitted: string | null;
  status: string | null;
  qbo_invoice_id: string | null;
};

/**
 * Get or create the default service item for construction line items
 */
async function getOrCreateServiceItem(): Promise<string> {
  try {
    // Search for existing service item
    const query = `SELECT * FROM Item WHERE Name = 'Construction Services' AND Type = 'Service'`;
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    if (data.QueryResponse?.Item?.length > 0) {
      return data.QueryResponse.Item[0].Id;
    }

    // Need to find a valid income account first
    console.log('Finding income account...');
    const accountQuery = `SELECT * FROM Account WHERE AccountType = 'Income' AND AccountSubType = 'ServiceFeeIncome' MAXRESULTS 1`;
    const accountData = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(accountQuery)}`
    );

    let incomeAccountId = '79'; // Default Services income account ID (common in QB)

    if (accountData.QueryResponse?.Account?.length > 0) {
      incomeAccountId = accountData.QueryResponse.Account[0].Id;
      console.log(
        `Using income account: ${incomeAccountId} (${accountData.QueryResponse.Account[0].Name})`
      );
    } else {
      // Try to find ANY income account
      const anyIncomeQuery = `SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 1`;
      const anyIncomeData = await makeQBORequest(
        'GET',
        `query?query=${encodeURIComponent(anyIncomeQuery)}`
      );

      if (anyIncomeData.QueryResponse?.Account?.length > 0) {
        incomeAccountId = anyIncomeData.QueryResponse.Account[0].Id;
        console.log(
          `Using income account: ${incomeAccountId} (${anyIncomeData.QueryResponse.Account[0].Name})`
        );
      }
    }

    // Create service item
    const itemData = {
      Name: 'Construction Services',
      Type: 'Service',
      IncomeAccountRef: {
        value: incomeAccountId,
      },
    };

    console.log('Creating service item with account:', incomeAccountId);
    const response = await makeQBORequest('POST', 'item', itemData);
    return response.Item.Id;
  } catch (error) {
    console.error('Error with service item:', error);
    throw error;
  }
}

/**
 * Sync a pay app (invoice) to QuickBooks
 */
export async function syncPayAppToQBO(
  payAppId: string,
  supabaseClient?: SupabaseClient
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  // Use provided client or fall back to default
  const client = supabaseClient || supabase;

  try {
    console.log(`Starting sync for pay app: ${payAppId}`);

    // 1. Get pay app details
    const { data: payApp, error: payAppError } = await client
      .from('engagement_pay_apps')
      .select('*')
      .eq('id', payAppId)
      .single();

    if (payAppError || !payApp) {
      return {
        success: false,
        error: 'Pay app not found',
      };
    }

    // 2. Get engagement to find QB job ID
    const { data: engagement, error: engagementError } = await client
      .from('engagements')
      .select('id, name, project_number, qbo_job_id')
      .eq('id', payApp.engagement_id)
      .single();

    if (engagementError || !engagement) {
      return {
        success: false,
        error: 'Engagement not found',
      };
    }

    if (!engagement.qbo_job_id) {
      return {
        success: false,
        error: 'Project must be synced to QuickBooks first',
      };
    }

    // 3. Get or create service item
    const serviceItemId = await getOrCreateServiceItem();

    // 4. Build invoice with single line for current payment due
    const paymentAmount = payApp.current_payment_due || 0;

    // Build DocNumber in format: ProjectNumber-PayAppNumber (e.g., "1289-1")
    const docNumber =
      engagement.project_number && payApp.pay_app_number
        ? `${engagement.project_number}-${payApp.pay_app_number}`
        : payApp.pay_app_number || undefined;

    const lines: QBOInvoice['Line'] = [
      {
        Description:
          payApp.description ||
          `Payment Application #${payApp.pay_app_number || payApp.id}`,
        Amount: paymentAmount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: serviceItemId,
          },
          Qty: 1,
          UnitPrice: paymentAmount,
        },
      },
    ];

    // 5. Build invoice data
    const invoiceData: QBOInvoice = {
      CustomerRef: {
        value: engagement.qbo_job_id, // Bill to the job/project
      },
      Line: lines,
      DocNumber: docNumber,
      TxnDate: payApp.period_end || new Date().toISOString().split('T')[0],
    };

    // 6. Create or update invoice in QuickBooks
    let qboInvoice;
    if (payApp.qbo_invoice_id) {
      // Update existing invoice - need to fetch current SyncToken first
      console.log(`Updating existing invoice: ${payApp.qbo_invoice_id}`);

      try {
        // Fetch current invoice to get SyncToken
        const query = `SELECT * FROM Invoice WHERE Id = '${payApp.qbo_invoice_id}'`;
        const existingData = await makeQBORequest(
          'GET',
          `query?query=${encodeURIComponent(query)}`
        );

        if (!existingData.QueryResponse?.Invoice?.[0]) {
          throw new Error('Existing invoice not found in QuickBooks');
        }

        const existingInvoice = existingData.QueryResponse.Invoice[0];

        // Update with current SyncToken
        const response = await makeQBORequest('POST', 'invoice', {
          ...invoiceData,
          Id: payApp.qbo_invoice_id,
          SyncToken: existingInvoice.SyncToken,
          sparse: true, // Only update fields we're sending
        });
        qboInvoice = response.Invoice;
      } catch (updateError: any) {
        console.error(
          'Update failed, invoice may have been deleted. Creating new invoice.'
        );
        // If update fails, create a new invoice instead
        const response = await makeQBORequest('POST', 'invoice', invoiceData);
        qboInvoice = response.Invoice;
      }
    } else {
      // No qbo_invoice_id stored, but invoice might already exist in QB
      // Check by DocNumber first to avoid duplicates
      console.log(
        `Checking if invoice already exists with DocNumber: ${docNumber}`
      );

      try {
        if (docNumber) {
          const query = `SELECT * FROM Invoice WHERE DocNumber = '${docNumber}'`;
          const existingData = await makeQBORequest(
            'GET',
            `query?query=${encodeURIComponent(query)}`
          );

          const existingInvoice = existingData.QueryResponse?.Invoice?.[0];

          if (existingInvoice) {
            console.log(
              `Found existing invoice with ID: ${existingInvoice.Id}`
            );
            // Link to existing invoice
            qboInvoice = existingInvoice;
          } else {
            // Create new invoice
            console.log('No existing invoice found, creating new one');
            const response = await makeQBORequest(
              'POST',
              'invoice',
              invoiceData
            );
            qboInvoice = response.Invoice;
          }
        } else {
          // No DocNumber, just create
          console.log('Creating new invoice (no DocNumber)');
          const response = await makeQBORequest('POST', 'invoice', invoiceData);
          qboInvoice = response.Invoice;
        }
      } catch (queryError) {
        console.error('Error checking for existing invoice:', queryError);
        // If query fails, try to create anyway
        console.log('Query failed, attempting to create new invoice');
        const response = await makeQBORequest('POST', 'invoice', invoiceData);
        qboInvoice = response.Invoice;
      }
    }

    // 7. Update pay app with QB invoice ID
    const { error: updateError } = await client
      .from('engagement_pay_apps')
      .update({
        qbo_invoice_id: qboInvoice.Id,
        qbo_sync_status: 'synced',
        qbo_synced_at: new Date().toISOString(),
        qbo_sync_error: null,
      })
      .eq('id', payAppId);

    if (updateError) {
      console.error('Error updating pay app:', updateError);
      return {
        success: false,
        error: 'Invoice created but failed to update FloCon record',
        invoiceId: qboInvoice.Id,
      };
    }

    return {
      success: true,
      invoiceId: qboInvoice.Id,
    };
  } catch (error: any) {
    console.error('Error syncing pay app:', error);

    // Get more detailed error message
    let errorMessage = error.message || 'Unknown error';
    if (error.response?.data) {
      errorMessage += ` - ${JSON.stringify(error.response.data)}`;
    }
    if (error.intuit_tid) {
      errorMessage += ` [Intuit TID: ${error.intuit_tid}]`;
    }

    // Store error in database
    await client
      .from('engagement_pay_apps')
      .update({
        qbo_sync_status: 'error',
        qbo_sync_error: errorMessage,
      })
      .eq('id', payAppId);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Pull payment information from QuickBooks for an invoice
 */
export async function pullPaymentFromQBO(
  payAppId: string,
  supabaseClient?: SupabaseClient
): Promise<{ success: boolean; paymentTotal?: number; error?: string }> {
  // Use provided client or fall back to default
  const client = supabaseClient || supabase;

  try {
    // 1. Get pay app with QB invoice ID
    const { data: payApp, error: payAppError } = await client
      .from('engagement_pay_apps')
      .select('qbo_invoice_id')
      .eq('id', payAppId)
      .single();

    if (payAppError || !payApp || !payApp.qbo_invoice_id) {
      return {
        success: false,
        error: 'Invoice not synced to QuickBooks',
      };
    }

    // 2. Query QB for invoice details
    const query = `SELECT * FROM Invoice WHERE Id = '${payApp.qbo_invoice_id}'`;
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    if (!data.QueryResponse?.Invoice?.[0]) {
      return {
        success: false,
        error: 'Invoice not found in QuickBooks',
      };
    }

    const invoice = data.QueryResponse.Invoice[0];
    const balance = invoice.Balance || 0;
    const totalAmount = invoice.TotalAmt || 0;
    const paymentTotal = totalAmount - balance;

    // 3. Update pay app with payment info and status
    const { error: updateError } = await client
      .from('engagement_pay_apps')
      .update({
        qbo_payment_total: paymentTotal,
        status:
          balance === 0 ? 'Paid' : paymentTotal > 0 ? 'Partial' : 'Submitted',
      })
      .eq('id', payAppId);

    if (updateError) {
      console.error('Error updating payment info:', updateError);
      return {
        success: false,
        error: 'Failed to update payment information',
      };
    }

    return {
      success: true,
      paymentTotal,
    };
  } catch (error: any) {
    console.error('Error pulling payment info:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}
