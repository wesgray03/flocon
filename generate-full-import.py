#!/usr/bin/env python3
"""
Generate SQL migration to import prospects from CSV with trade breakdowns
Usage: python generate-full-import.py > db/migrations/2025-11-09-import-all-prospects-with-trades.sql
"""

import csv
from pathlib import Path

# CSV file path
csv_path = Path("C:/Users/WesGray/OneDrive - Floors Unlimited USA/import prospects.csv")

def clean_currency(value):
    """Convert currency string to numeric or NULL"""
    if not value or value.strip() in ('', '-', ' - ', ' -   '):
        return 'NULL'
    clean = value.replace(',', '').replace('$', '').replace(' ', '').strip()
    try:
        val = float(clean)
        return str(val) if val != 0 else 'NULL'
    except:
        return 'NULL'

def escape_sql(value):
    """Escape single quotes for SQL"""
    if not value:
        return ''
    return str(value).replace("'", "''")

# Read CSV (utf-8-sig handles BOM)
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    all_rows = [r for r in reader if r['Project'] != 'Total']

# Trade code mapping
trade_map = {
    '06 61 13': '06.61.13',
    '09 30 00': '09.30.00', 
    '09 64 00': '09.64.00',
    '09 65 00': '09.65.00',
    '09 68 00': '09.68.00',
    '10 28 13': '10.28.00',
    '10 28 19': '10.28.00',
    '12 36 00': '12.36.00',
    '22 40 00': '22.40.00'
}

# Extract unique customers
unique_customers = sorted(set(row['Customer'] for row in all_rows if row['Customer']))

# Generate SQL
print("""-- Migration: Import all prospects with trades
-- Date: 2025-11-09
-- Generated: Python script

BEGIN;

-- First, ensure all GC customers exist
DO $$
DECLARE
  v_customer_names TEXT[] := ARRAY[""")

for i, customer in enumerate(unique_customers):
    comma = ',' if i < len(unique_customers) - 1 else ''
    print(f"    '{escape_sql(customer)}'{comma}")

print("""  ];
  v_name TEXT;
BEGIN
  FOREACH v_name IN ARRAY v_customer_names
  LOOP
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = v_name) THEN
      INSERT INTO companies (name, company_type, is_customer, created_at)
      VALUES (v_name, 'Contractor', true, NOW());
    END IF;
  END LOOP;
END $$;""")
print()
print("-- Insert all prospects")
print("INSERT INTO public.engagements (")
print("  type, name, company_id, probability, probability_percent,")
print("  bid_amount, lead_source, owner, sales, notes")
print(") VALUES")

for i, row in enumerate(all_rows):
    name = escape_sql(row['Project'])
    customer = escape_sql(row['Customer'])
    contact = escape_sql(row['Contact'])
    pm = escape_sql(row['Project Manager'])
    architect = escape_sql(row['Architect/Designer'])
    sales = escape_sql(row['Sales'])
    bid_date = row['Bid Date']
    status = row['Pipeline Status']
    prob = row['Probability'].replace('%', '') if row['Probability'] else 'NULL'
    amount = clean_currency(row['Revenue Est.'])
    
    # Use the status directly from CSV (don't map it)
    # Pipeline Status values: Landed, Probable, Questionable, Doubtful
    probability_status = escape_sql(status) if status else 'Unknown'
    
    # Build notes
    notes_list = []
    if contact:
        notes_list.append(f"Contact: {contact}")
    if pm:
        notes_list.append(f"PM: {pm}")
    if architect:
        notes_list.append(f"Architect: {architect}")
    if bid_date:
        notes_list.append(f"Bid: {bid_date}")
    notes = escape_sql(' | '.join(notes_list))
    
    # Lead source
    lead_src = 'architect' if (architect and architect.lower() != 'na') else 'gc_relationship'
    
    comma = ',' if i < len(all_rows) - 1 else ';'
    
    print(f"('prospect', '{name}',")
    print(f" (SELECT id FROM companies WHERE name = '{customer}' LIMIT 1),")
    print(f" '{probability_status}', {prob}, {amount}, '{lead_src}',")
    print(f" '{pm}', '{sales}', '{notes}'){comma}")

print("\n-- Now insert trades for each prospect")
print("DO $$")
print("DECLARE")
print("  v_eng_id UUID;")
print("  v_trade_id UUID;")
print("BEGIN")

for i, row in enumerate(all_rows):
    name = escape_sql(row['Project'])[:40]
    print(f"\n  -- {i+1}. {name}")
    print(f"  SELECT id INTO v_eng_id FROM engagements WHERE name = '{escape_sql(row['Project'])}' AND type = 'prospect' LIMIT 1;")
    print(f"  IF v_eng_id IS NOT NULL THEN")
    
    for csv_col, trade_code in trade_map.items():
        amt = clean_currency(row.get(csv_col, ''))
        if amt != 'NULL':
            print(f"    SELECT id INTO v_trade_id FROM trades WHERE code = '{trade_code}' LIMIT 1;")
            print(f"    IF v_trade_id IS NOT NULL THEN")
            print(f"      INSERT INTO engagement_trades (engagement_id, trade_id, estimated_amount)")
            print(f"      VALUES (v_eng_id, v_trade_id, {amt}) ON CONFLICT DO NOTHING;")
            print(f"    END IF;")
    
    print(f"  END IF;")

print("\nEND $$;")
print("\nCOMMIT;")
print("\n-- Verify: SELECT COUNT(*) FROM engagements WHERE type='prospect';")
