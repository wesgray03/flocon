import pandas as pd
import os
from datetime import datetime

# Configuration
EXCEL_FILE = 'import-templates/prod import.xlsx'
OUTPUT_DIR = 'import-templates/parsed'

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# UUID counter for generating engagement_parties IDs
party_id_counter = 60000001

def generate_party_id():
    global party_id_counter
    party_id = f"{party_id_counter:08d}-0000-0000-0000-000000000001"
    party_id_counter += 1
    return party_id

def parse_excel_file():
    """Read Excel file and process all sheets"""
    print(f"Reading Excel file: {EXCEL_FILE}")
    
    # Read all sheets
    excel_data = pd.read_excel(EXCEL_FILE, sheet_name=None)
    
    print(f"Found {len(excel_data)} sheets:")
    for sheet_name in excel_data.keys():
        print(f"  - {sheet_name}")
    
    return excel_data

def process_engagements_sheet(df):
    """Process engagements sheet and extract engagement_parties data"""
    print("\nProcessing engagements sheet...")
    
    # Columns that should be moved to engagement_parties
    party_columns = [
        'customer_id', 'customer_company_id',
        'project_manager_id', 'project_manager_contact_id',
        'superintendent_id', 'superintendent_contact_id',
        'architect_id', 'architect_contact_id',
        'owner_id', 'owner_contact_id',
        'prospect_contact_id'
    ]
    
    # Check which party columns exist
    existing_party_cols = [col for col in party_columns if col in df.columns]
    print(f"Found party columns: {existing_party_cols}")
    
    # Create engagement_parties records
    parties_records = []
    
    for idx, row in df.iterrows():
        engagement_id = row.get('id')
        if pd.isna(engagement_id):
            continue
            
        # Customer (company)
        if 'customer_company_id' in df.columns and not pd.isna(row.get('customer_company_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'company',
                'company_id': row['customer_company_id'],
                'contact_id': None,
                'role': 'customer',
                'is_primary': True
            })
        elif 'customer_id' in df.columns and not pd.isna(row.get('customer_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'company',
                'company_id': row['customer_id'],
                'contact_id': None,
                'role': 'customer',
                'is_primary': True
            })
        
        # Project Manager (contact)
        if 'project_manager_contact_id' in df.columns and not pd.isna(row.get('project_manager_contact_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['project_manager_contact_id'],
                'role': 'project_manager',
                'is_primary': True
            })
        elif 'project_manager_id' in df.columns and not pd.isna(row.get('project_manager_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['project_manager_id'],
                'role': 'project_manager',
                'is_primary': True
            })
        
        # Superintendent (contact)
        if 'superintendent_contact_id' in df.columns and not pd.isna(row.get('superintendent_contact_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['superintendent_contact_id'],
                'role': 'superintendent',
                'is_primary': False
            })
        elif 'superintendent_id' in df.columns and not pd.isna(row.get('superintendent_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['superintendent_id'],
                'role': 'superintendent',
                'is_primary': False
            })
        
        # Architect (contact or company)
        if 'architect_contact_id' in df.columns and not pd.isna(row.get('architect_contact_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['architect_contact_id'],
                'role': 'architect',
                'is_primary': True
            })
        elif 'architect_id' in df.columns and not pd.isna(row.get('architect_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'company',
                'company_id': row['architect_id'],
                'contact_id': None,
                'role': 'architect',
                'is_primary': True
            })
        
        # Owner (contact or company)
        if 'owner_contact_id' in df.columns and not pd.isna(row.get('owner_contact_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['owner_contact_id'],
                'role': 'owner',
                'is_primary': True
            })
        elif 'owner_id' in df.columns and not pd.isna(row.get('owner_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'company',
                'company_id': row['owner_id'],
                'contact_id': None,
                'role': 'owner',
                'is_primary': True
            })
        
        # Prospect Contact
        if 'prospect_contact_id' in df.columns and not pd.isna(row.get('prospect_contact_id')):
            parties_records.append({
                'id': generate_party_id(),
                'engagement_id': engagement_id,
                'party_type': 'contact',
                'company_id': None,
                'contact_id': row['prospect_contact_id'],
                'role': 'prospect_contact',
                'is_primary': True
            })
    
    # Create engagement_parties DataFrame
    parties_df = pd.DataFrame(parties_records)
    print(f"Created {len(parties_df)} engagement_parties records")
    
    # Remove party columns from engagements
    clean_engagements_df = df.drop(columns=existing_party_cols, errors='ignore')
    
    return clean_engagements_df, parties_df

def export_to_csv(sheet_name, df, custom_filename=None):
    """Export a DataFrame to CSV"""
    if df.empty:
        print(f"  Skipping empty sheet: {sheet_name}")
        return
    
    filename = custom_filename if custom_filename else f"{sheet_name}.csv"
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    # Convert to CSV
    df.to_csv(output_path, index=False)
    print(f"  Exported {sheet_name}: {len(df)} records -> {output_path}")

def main():
    print("=" * 60)
    print("Excel Import File Parser")
    print("=" * 60)
    
    # Read Excel file
    excel_data = parse_excel_file()
    
    # Process each sheet
    for sheet_name, df in excel_data.items():
        print(f"\nProcessing: {sheet_name}")
        print(f"  Rows: {len(df)}")
        print(f"  Columns: {list(df.columns)}")
        
        # Special handling for engagements sheet
        if 'engagement' in sheet_name.lower():
            clean_df, parties_df = process_engagements_sheet(df)
            export_to_csv(sheet_name, clean_df, '05-engagements.csv')
            export_to_csv('engagement_parties', parties_df, '06-engagement-parties.csv')
        else:
            # Export as-is
            export_to_csv(sheet_name, df)
    
    print("\n" + "=" * 60)
    print("✅ Processing complete!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review the generated CSV files in import-templates/parsed/")
    print("2. Follow PRODUCTION-IMPORT-PROCEDURE.md to import")
    print("3. Run post-import script to auto-complete tasks")

if __name__ == "__main__":
    main()
