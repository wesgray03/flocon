import csv
from pathlib import Path

csv_path = Path("C:/Users/WesGray/OneDrive - Floors Unlimited USA/import prospects.csv")

# Try with UTF-8-sig to handle BOM
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    first_row = next(reader)
    
    print("Column names with utf-8-sig:")
    for col in reader.fieldnames:
        print(f"  '{col}' (repr: {repr(col)})")
    
    print("\nFirst row data:")
    for key, val in first_row.items():
        print(f"  {key}: {val}")
