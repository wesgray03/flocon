import csv
from pathlib import Path
from collections import Counter

# CSV file path
csv_path = Path("C:/Users/WesGray/OneDrive - Floors Unlimited USA/import prospects.csv")

# Read CSV
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    all_rows = [r for r in reader if r['Project'] != 'Total']

# Get all unique customer names from CSV
customers = [row['Customer'] for row in all_rows if row['Customer']]
customer_counts = Counter(customers)

print("=== CUSTOMERS IN CSV ===")
for customer in sorted(set(customers)):
    print(f"  {customer} ({customer_counts[customer]} prospects)")

print("\n=== POTENTIAL DUPLICATES ===")
# Group similar names
customer_groups = {}
for customer in set(customers):
    # Normalize for comparison (lowercase, remove punctuation/spaces)
    normalized = customer.lower().replace('.', '').replace(',', '').replace(' ', '')
    
    if normalized not in customer_groups:
        customer_groups[normalized] = []
    customer_groups[normalized].append(customer)

# Show groups with potential duplicates
for normalized, names in sorted(customer_groups.items()):
    if len(names) > 1:
        print(f"\nPotential duplicates for '{normalized}':")
        for name in names:
            print(f"  - {name}")
