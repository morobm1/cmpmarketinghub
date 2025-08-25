import openpyxl

EXCEL_PATH = 'list 1.xlsx'

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb.active
headers = [cell.value for cell in ws[1]]
print('Headers:', headers)
