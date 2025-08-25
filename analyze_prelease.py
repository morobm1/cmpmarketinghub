import os
import sys
import re
from typing import Optional, Tuple, List

try:
    import pandas as pd
except ModuleNotFoundError:
    print("ERROR: pandas is not installed. Run: python -m pip install pandas openpyxl xlsxwriter", file=sys.stderr)
    sys.exit(1)

FILE_PATH = r"c:\\Users\\brian\\Downloads\\Aberrant\\Pre-Lease (10).xlsx"
OUTPUT_CSV = r"c:\\Users\\brian\\Downloads\\Aberrant\\Prelease_Summary_Aug2024_Aug2025.csv"
OUTPUT_XLSX = r"c:\\Users\\brian\\Downloads\\Aberrant\\Prelease_Summary_Aug2024_Aug2025.xlsx"
START_DATE = pd.Timestamp('2024-08-01')
END_DATE = pd.Timestamp('2025-08-31 23:59:59')
BEDS = 571

STATUS_CANDIDATES = [
    'lease status', 'status', 'resident status', 'lease type', 'type'
]
DATE_CANDIDATES = [
    'lease start', 'lease start date', 'start date', 'move-in date', 'move in date', 'start',
    'signed date', 'lease signed date', 'lease date', 'created date', 'status date',
    'effective date', 'execution date', 'lease executed date', 'date'
]

MONTH_TOKENS = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
]


def normalize_text(s: object) -> str:
    s = "" if pd.isna(s) else str(s)
    return re.sub(r"\s+", " ", s).strip().lower()


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {c: normalize_text(c) for c in df.columns}
    return df.rename(columns=mapping)


def pick_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    cols = set(df.columns)
    for cand in candidates:
        if cand in cols:
            return cand
    for cand in candidates:
        for c in df.columns:
            if cand in c:
                return c
    return None


def read_sheet_header_none(xls: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
    return pd.read_excel(xls, sheet_name=sheet_name, header=None)


def build_df_from_header_row(df_raw: pd.DataFrame, header_row_idx: int) -> pd.DataFrame:
    header = df_raw.iloc[header_row_idx].fillna('')
    cols = [str(c) for c in header.tolist()]
    df = df_raw.iloc[header_row_idx + 1:].copy()
    # Trim to the number of header columns
    df = df.iloc[:, :len(cols)]
    df.columns = cols
    # Drop empty columns
    df = df.dropna(axis=1, how='all')
    df = df.dropna(how='all')
    df = df.reset_index(drop=True)
    return normalize_columns(df)


def find_details_header_row(df_raw: pd.DataFrame) -> Optional[int]:
    max_rows = min(200, len(df_raw))
    for i in range(max_rows):
        row_vals = [normalize_text(v) for v in df_raw.iloc[i].tolist()]
        row_text = ' | '.join(row_vals)
        if ('lease status' in row_text) and (('lease start' in row_text) or ('start date' in row_text)):
            return i
    return None


def parse_events_from_details_table(xls: pd.ExcelFile, sheet_name: str) -> Optional[pd.DataFrame]:
    try:
        df_raw = read_sheet_header_none(xls, sheet_name)
    except Exception:
        return None
    if df_raw is None or df_raw.empty:
        return None

    hdr_idx = find_details_header_row(df_raw)
    if hdr_idx is None:
        return None

    df = build_df_from_header_row(df_raw, hdr_idx)

    # Try to locate required columns
    status_col = pick_column(df, STATUS_CANDIDATES)
    date_col = pick_column(df, DATE_CANDIDATES)

    if not status_col or not date_col:
        return None

    # Coerce dates
    df['_parsed_date'] = pd.to_datetime(df[date_col], errors='coerce')
    df = df.dropna(subset=['_parsed_date']).copy()

    # Keep only within range
    df = df[(df['_parsed_date'] >= START_DATE) & (df['_parsed_date'] <= END_DATE)].copy()
    if df.empty:
        return None

    return df[[status_col, '_parsed_date']].rename(columns={status_col: '_status'})


def classify_status(val: object) -> Tuple[bool, bool]:
    s = normalize_text(val)
    is_renewal = ('renew' in s) or ('renewal' in s)
    is_new = (not is_renewal) and (('new' in s) or ('lease - new' in s) or ('new lease' in s))
    # Exclusions
    excluded_tokens = ['cancel', 'declin', 'notice', 'denied', 'withdraw', 'transfer pending']
    if any(tok in s for tok in excluded_tokens):
        return False, False
    return is_renewal, is_new


def monthly_from_events(df_events: pd.DataFrame) -> pd.DataFrame:
    flags = df_events['_status'].apply(classify_status).tolist()
    df_events['_is_renewal'] = [r for r, _ in flags]
    df_events['_is_new'] = [n for _, n in flags]
    df_events['_is_counted'] = df_events['_is_renewal'] | df_events['_is_new']
    df_events['_month'] = df_events['_parsed_date'].values.astype('datetime64[M]')

    all_months = pd.date_range(START_DATE, END_DATE, freq='MS')
    g = df_events[df_events['_is_counted']].groupby('_month')
    monthly = pd.DataFrame({
        'renewal_added': g['_is_renewal'].sum().astype(int),
        'total_added': g['_is_counted'].sum().astype(int),
    })
    monthly = monthly.reindex(all_months, fill_value=0)
    return monthly


def write_outputs(summary: pd.DataFrame) -> None:
    try:
        summary.to_csv(OUTPUT_CSV, index=False)
    except Exception as e:
        print(f"ERROR: Failed to write CSV: {e}", file=sys.stderr)

    wrote_chart = False
    try:
        with pd.ExcelWriter(OUTPUT_XLSX, engine='xlsxwriter') as writer:
            summary.to_excel(writer, sheet_name='Summary', index=False)
            workbook  = writer.book
            worksheet = writer.sheets['Summary']
            chart = workbook.add_chart({'type': 'line'})
            last_row = len(summary) + 1
            chart.add_series({
                'name':       'Renewal %',
                'categories': ['Summary', 1, 0, last_row-1, 0],
                'values':     ['Summary', 1, 2, last_row-1, 2],
                'line':       {'color': '#1f77b4'},
            })
            chart.add_series({
                'name':       'Prelease%',
                'categories': ['Summary', 1, 0, last_row-1, 0],
                'values':     ['Summary', 1, 3, last_row-1, 3],
                'line':       {'color': '#ff7f0e'},
            })
            chart.set_title({'name': 'Prelease vs Renewal % (Aug 2024 - Aug 2025)'})
            chart.set_x_axis({'name': 'Month'})
            chart.set_y_axis({'name': 'Percent', 'major_gridlines': {'visible': True}})
            chart.set_legend({'position': 'bottom'})
            worksheet.insert_chart('F2', chart, {'x_scale': 1.3, 'y_scale': 1.3})
            wrote_chart = True
    except Exception:
        try:
            with pd.ExcelWriter(OUTPUT_XLSX, engine='openpyxl') as writer:
                summary.to_excel(writer, sheet_name='Summary', index=False)
        except Exception as e2:
            print(f"ERROR: Failed to write Excel: {e2}", file=sys.stderr)
    print(f"\nOutput CSV: {OUTPUT_CSV}")
    print(f"Output Excel: {OUTPUT_XLSX}{' (with chart)' if wrote_chart else ''}")


def main():
    if not os.path.exists(FILE_PATH):
        print(f"ERROR: File not found: {FILE_PATH}", file=sys.stderr)
        sys.exit(1)

    try:
        xls = pd.ExcelFile(FILE_PATH)
    except Exception as e:
        print(f"ERROR: Failed to open Excel file: {e}", file=sys.stderr)
        sys.exit(1)

    # Prefer sheet that contains a details table with Lease Status + Lease Start
    chosen_df = None
    chosen_sheet = None
    for sheet in xls.sheet_names:
        df_events = parse_events_from_details_table(xls, sheet)
        if df_events is not None:
            chosen_df = df_events
            chosen_sheet = sheet
            break

    if chosen_df is None:
        print("ERROR: Could not detect the detailed table with Lease Status and Lease Start.", file=sys.stderr)
        print("Sheets found:", xls.sheet_names, file=sys.stderr)
        sys.exit(1)

    monthly = monthly_from_events(chosen_df)

    # Rolling totals
    monthly['renewal_cum'] = monthly['renewal_added'].cumsum()
    monthly['total_cum'] = monthly['total_added'].cumsum()

    summary = pd.DataFrame({
        'Month': [d.strftime('%b %Y') for d in monthly.index.to_pydatetime()],
        'Renewal Leases': monthly['renewal_cum'].astype(int).values,
        'Renewal %': (monthly['renewal_cum'] / BEDS * 100.0).round(2).values,
        'Prelease%': (monthly['total_cum'] / BEDS * 100.0).round(2).values,
    })

    print(f"Processed sheet: {chosen_sheet}")
    print('\nSummary (Aug 2024 - Aug 2025)')
    print(summary.to_string(index=False))

    write_outputs(summary)


if __name__ == '__main__':
    main()
