import pandas as pd
from pandas import ExcelFile

path = r"c:\\Users\\brian\\Downloads\\Aberrant\\Pre-Lease (10).xlsx"

xls = ExcelFile(path)
print("Sheets:", xls.sheet_names)

# Try to read the sheet suspected earlier
sheet = 'Continuum Apartments'
try:
    df = pd.read_excel(xls, sheet_name=sheet, header=None)
except Exception as e:
    print('Error reading sheet:', e)
    raise

pd.set_option('display.max_columns', 80)
pd.set_option('display.width', 240)

print("\nTop 25 rows (header=None):")
print(df.head(25))

# Also show the first non-empty rows with many non-NaN entries to guess header area
non_empty_counts = df.notna().sum(axis=1)
idxs = non_empty_counts.sort_values(ascending=False).index[:10].tolist()
idxs = sorted(set([i for i in idxs if i < 60]))
print("\nRows with most non-empty cells (first 60 rows):", idxs)
for i in idxs:
    row = df.iloc[i].fillna('')
    print(f"Row {i}:", list(row.astype(str).values)[:60])
