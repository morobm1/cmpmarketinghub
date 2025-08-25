import openpyxl
import csv

EXCEL_PATH = 'Bothell_Transfer_with_distances.xlsx'
CSV_PATH = 'Bothell_Transfer_with_distances.csv'

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb.active

with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for row in ws.iter_rows(values_only=True):
        writer.writerow(list(row))

print(f'Converted {EXCEL_PATH} to {CSV_PATH}')
