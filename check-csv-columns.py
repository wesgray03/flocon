import csv
from pathlib import Path

csv_path = Path("C:/Users/WesGray/OneDrive - Floors Unlimited USA/import prospects.csv")

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    print("CSV Columns found:")
    for col in reader.fieldnames:
        print(f"  '{col}'")
