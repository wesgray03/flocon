// QuickBooks Vendor Sync Service
// Handles pulling vendors/subcontractors from QuickBooks to FloCon
import { createClient } from '@supabase/supabase-js';
import { makeQBORequest } from './qboClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QBOVendor {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Vendor1099?: boolean;
  Balance?: number;
  BillAddr?: {
    Line1?: string;
    Line2?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  CustomField?: Array<{
    DefinitionId: string;
    Name: string;
    Type: string;
    StringValue?: string;
  }>;
}

interface QBOCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Balance?: number;
  BillAddr?: {
    Line1?: string;
    Line2?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}

interface PullSubcontractorsResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
  vendors?: Array<{ name: string; qboId: string; action: string }>;
}

/**
 * Pull subcontractors from QuickBooks
 * Identifies subcontractors as vendors with:
 * - Vendor1099 = true (track payments for 1099)
 * OR potentially: vendors set up for direct deposit
 */
export async function pullSubcontractorsFromQBO(): Promise<PullSubcontractorsResult> {
  try {
    console.log('Pulling subcontractors from QuickBooks...');

    // Query for all vendors (can't filter by Vendor1099 in query)
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';

    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    // Filter vendors that have Vendor1099 = true
    const allVendors: QBOVendor[] = data.QueryResponse?.Vendor || [];
    const vendors = allVendors.filter((v) => v.Vendor1099 === true);

    console.log(
      `Found ${vendors.length} 1099 vendors (out of ${allVendors.length} total)`
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const results: Array<{ name: string; qboId: string; action: string }> = [];

    for (const vendor of vendors) {
      try {
        const vendorName = vendor.DisplayName || vendor.CompanyName || '';
        if (!vendorName) {
          console.log(`Skipping vendor ${vendor.Id} - no name`);
          skipped++;
          continue;
        }

        // Check if company already exists with this QB ID
        const { data: existingByQbId } = await supabase
          .from('companies')
          .select('id, name, is_subcontractor')
          .eq('qbo_id', vendor.Id)
          .maybeSingle();

        if (existingByQbId) {
          // Update existing company
          const updateData: any = {
            name: vendorName,
            is_subcontractor: true,
            qbo_last_synced_at: new Date().toISOString(),
          };

          // Add optional fields if available
          if (vendor.PrimaryEmailAddr?.Address) {
            updateData.email = vendor.PrimaryEmailAddr.Address;
          }
          if (vendor.PrimaryPhone?.FreeFormNumber) {
            updateData.phone = vendor.PrimaryPhone.FreeFormNumber;
          }

          const { error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', existingByQbId.id);

          if (updateError) {
            console.error(`Error updating ${vendorName}:`, updateError);
            skipped++;
          } else {
            console.log(`✓ Updated: ${vendorName}`);
            updated++;
            results.push({
              name: vendorName,
              qboId: vendor.Id,
              action: 'updated',
            });
          }
        } else {
          // Check if company exists by name (to avoid duplicates)
          const { data: existingByName } = await supabase
            .from('companies')
            .select('id, qbo_id')
            .ilike('name', vendorName)
            .maybeSingle();

          if (existingByName) {
            // Company exists by name - update it with QB ID
            const { error: linkError } = await supabase
              .from('companies')
              .update({
                qbo_id: vendor.Id,
                is_subcontractor: true,
                qbo_last_synced_at: new Date().toISOString(),
              })
              .eq('id', existingByName.id);

            if (linkError) {
              console.error(`Error linking ${vendorName}:`, linkError);
              skipped++;
            } else {
              console.log(`✓ Linked: ${vendorName}`);
              updated++;
              results.push({
                name: vendorName,
                qboId: vendor.Id,
                action: 'linked',
              });
            }
          } else {
            // Create new company
            const insertData: any = {
              name: vendorName,
              company_type: 'Subcontractor',
              is_subcontractor: true,
              qbo_id: vendor.Id,
              qbo_last_synced_at: new Date().toISOString(),
            };

            // Add optional fields
            if (vendor.PrimaryEmailAddr?.Address) {
              insertData.email = vendor.PrimaryEmailAddr.Address;
            }
            if (vendor.PrimaryPhone?.FreeFormNumber) {
              insertData.phone = vendor.PrimaryPhone.FreeFormNumber;
            }

            const { error: insertError } = await supabase
              .from('companies')
              .insert([insertData]);

            if (insertError) {
              console.error(`Error creating ${vendorName}:`, insertError);
              skipped++;
            } else {
              console.log(`✓ Created: ${vendorName}`);
              created++;
              results.push({
                name: vendorName,
                qboId: vendor.Id,
                action: 'created',
              });
            }
          }
        }
      } catch (vendorError: any) {
        console.error(`Error processing vendor ${vendor.Id}:`, vendorError);
        skipped++;
      }
    }

    console.log(`\nSubcontractor Pull Complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${vendors.length}`);

    return {
      success: true,
      created,
      updated,
      skipped,
      total: vendors.length,
      vendors: results,
    };
  } catch (error: any) {
    console.error('Pull subcontractors error:', error);
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: error.message || 'Unknown error during pull',
    };
  }
}

/**
 * Pull vendors from QuickBooks
 * Pulls ALL vendors from QuickBooks into companies table
 * The qbo_vendor_import_list controls which ones show in dropdowns
 */
export async function pullVendorsFromQBO(): Promise<PullSubcontractorsResult> {
  try {
    console.log('Pulling vendors from QuickBooks...');

    // Query for all vendors from QuickBooks
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';

    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const vendors: QBOVendor[] = data.QueryResponse?.Vendor || [];

    console.log(`Found ${vendors.length} vendors in QuickBooks`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const results: Array<{ name: string; qboId: string; action: string }> = [];

    for (const vendor of vendors) {
      try {
        const vendorName = vendor.DisplayName || vendor.CompanyName || '';
        if (!vendorName) {
          console.log(`Skipping vendor ${vendor.Id} - no name`);
          skipped++;
          continue;
        }

        // Check if company already exists with this QB ID
        const { data: existingByQbId } = await supabase
          .from('companies')
          .select('*')
          .eq('qbo_id', vendor.Id)
          .single();

        if (existingByQbId) {
          // Update existing company
          const updateData: any = {
            name: vendorName,
            is_vendor: true,
            qbo_last_synced_at: new Date().toISOString(),
          };

          if (vendor.PrimaryEmailAddr?.Address) {
            updateData.email = vendor.PrimaryEmailAddr.Address;
          }
          if (vendor.PrimaryPhone?.FreeFormNumber) {
            updateData.phone = vendor.PrimaryPhone.FreeFormNumber;
          }

          const { error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', existingByQbId.id);

          if (updateError) {
            console.error(`Error updating ${vendorName}:`, updateError);
            skipped++;
          } else {
            console.log(`✓ Updated: ${vendorName}`);
            updated++;
            results.push({
              name: vendorName,
              qboId: vendor.Id,
              action: 'updated',
            });
          }
        } else {
          // Check if company exists by name
          const { data: existingByName } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', vendorName)
            .single();

          if (existingByName) {
            // Update with QB ID
            const updateData: any = {
              is_vendor: true,
              qbo_id: vendor.Id,
              qbo_last_synced_at: new Date().toISOString(),
            };

            if (vendor.PrimaryEmailAddr?.Address) {
              updateData.email = vendor.PrimaryEmailAddr.Address;
            }
            if (vendor.PrimaryPhone?.FreeFormNumber) {
              updateData.phone = vendor.PrimaryPhone.FreeFormNumber;
            }

            const { error: updateError } = await supabase
              .from('companies')
              .update(updateData)
              .eq('id', existingByName.id);

            if (updateError) {
              console.error(`Error linking ${vendorName}:`, updateError);
              skipped++;
            } else {
              console.log(`✓ Linked: ${vendorName}`);
              updated++;
              results.push({
                name: vendorName,
                qboId: vendor.Id,
                action: 'updated',
              });
            }
          } else {
            // Create new company
            const insertData: any = {
              name: vendorName,
              company_type: 'Vendor',
              is_vendor: true,
              qbo_id: vendor.Id,
              qbo_last_synced_at: new Date().toISOString(),
            };

            if (vendor.PrimaryEmailAddr?.Address) {
              insertData.email = vendor.PrimaryEmailAddr.Address;
            }
            if (vendor.PrimaryPhone?.FreeFormNumber) {
              insertData.phone = vendor.PrimaryPhone.FreeFormNumber;
            }

            const { error: insertError } = await supabase
              .from('companies')
              .insert([insertData]);

            if (insertError) {
              console.error(`Error creating ${vendorName}:`, insertError);
              skipped++;
            } else {
              console.log(`✓ Created: ${vendorName}`);
              created++;
              results.push({
                name: vendorName,
                qboId: vendor.Id,
                action: 'created',
              });
            }
          }
        }
      } catch (vendorError: any) {
        console.error(`Error processing vendor ${vendor.Id}:`, vendorError);
        skipped++;
      }
    }

    console.log(`\nVendor Pull Complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${vendors.length}`);

    return {
      success: true,
      created,
      updated,
      skipped,
      total: vendors.length,
      vendors: results,
    };
  } catch (error: any) {
    console.error('Pull vendors error:', error);
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: error.message || 'Unknown error during pull',
    };
  }
}

/**
 * Pull customers from QuickBooks
 * Pulls ALL customers from QuickBooks into companies table
 */
export async function pullCustomersFromQBO(): Promise<PullSubcontractorsResult> {
  try {
    console.log('Pulling customers from QuickBooks...');

    // Query for all customers from QuickBooks
    const query = 'SELECT * FROM Customer MAXRESULTS 1000';

    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const customers: QBOCustomer[] = data.QueryResponse?.Customer || [];

    // Filter out sub-customers (projects) - they have a ParentRef field
    const topLevelCustomers = customers.filter((c: any) => !c.ParentRef);

    console.log(
      `Found ${topLevelCustomers.length} top-level customers in QuickBooks (filtered out ${customers.length - topLevelCustomers.length} sub-customers/projects)`
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const results: Array<{ name: string; qboId: string; action: string }> = [];

    for (const customer of topLevelCustomers) {
      try {
        const customerName = customer.DisplayName || customer.CompanyName || '';
        if (!customerName) {
          console.log(`Skipping customer ${customer.Id} - no name`);
          skipped++;
          continue;
        }

        // Check if company already exists with this QB ID
        const { data: existingByQbId } = await supabase
          .from('companies')
          .select('*')
          .eq('qbo_id', customer.Id)
          .single();

        if (existingByQbId) {
          // Update existing company
          const updateData: any = {
            name: customerName,
            is_customer: true,
            qbo_last_synced_at: new Date().toISOString(),
          };

          if (customer.PrimaryEmailAddr?.Address) {
            updateData.email = customer.PrimaryEmailAddr.Address;
          }
          if (customer.PrimaryPhone?.FreeFormNumber) {
            updateData.phone = customer.PrimaryPhone.FreeFormNumber;
          }

          const { error: updateError } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', existingByQbId.id);

          if (updateError) {
            console.error(`Error updating ${customerName}:`, updateError);
            skipped++;
          } else {
            console.log(`✓ Updated: ${customerName}`);
            updated++;
            results.push({
              name: customerName,
              qboId: customer.Id,
              action: 'updated',
            });
          }
        } else {
          // Check if company exists by name
          const { data: existingByName } = await supabase
            .from('companies')
            .select('*')
            .ilike('name', customerName)
            .single();

          if (existingByName) {
            // Update existing company with QB ID
            const updateData: any = {
              name: customerName,
              is_customer: true,
              qbo_id: customer.Id,
              qbo_last_synced_at: new Date().toISOString(),
            };

            if (customer.PrimaryEmailAddr?.Address) {
              updateData.email = customer.PrimaryEmailAddr.Address;
            }
            if (customer.PrimaryPhone?.FreeFormNumber) {
              updateData.phone = customer.PrimaryPhone.FreeFormNumber;
            }

            const { error: updateError } = await supabase
              .from('companies')
              .update(updateData)
              .eq('id', existingByName.id);

            if (updateError) {
              console.error(`Error updating ${customerName}:`, updateError);
              skipped++;
            } else {
              console.log(`✓ Linked & Updated: ${customerName}`);
              updated++;
              results.push({
                name: customerName,
                qboId: customer.Id,
                action: 'linked',
              });
            }
          } else {
            // Create new company
            const insertData: any = {
              name: customerName,
              company_type: 'Contractor',
              is_customer: true,
              qbo_id: customer.Id,
              qbo_last_synced_at: new Date().toISOString(),
            };

            if (customer.PrimaryEmailAddr?.Address) {
              insertData.email = customer.PrimaryEmailAddr.Address;
            }
            if (customer.PrimaryPhone?.FreeFormNumber) {
              insertData.phone = customer.PrimaryPhone.FreeFormNumber;
            }

            const { error: insertError } = await supabase
              .from('companies')
              .insert([insertData]);

            if (insertError) {
              console.error(`Error creating ${customerName}:`, insertError);
              skipped++;
            } else {
              console.log(`✓ Created: ${customerName}`);
              created++;
              results.push({
                name: customerName,
                qboId: customer.Id,
                action: 'created',
              });
            }
          }
        }
      } catch (customerError: any) {
        console.error(
          `Error processing customer ${customer.Id}:`,
          customerError
        );
        skipped++;
      }
    }

    console.log(`\nCustomer Pull Complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${topLevelCustomers.length}`);

    return {
      success: true,
      created,
      updated,
      skipped,
      total: topLevelCustomers.length,
      vendors: results,
    };
  } catch (error: any) {
    console.error('Pull customers error:', error);
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: error.message || 'Unknown error during pull',
    };
  }
}
