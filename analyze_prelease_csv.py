import os
import sys
import re
import json
from typing import Optional, List, Tuple

try:
    import pandas as pd
except ModuleNotFoundError:
    print("ERROR: pandas is not installed. Run: python -m pip install pandas openpyxl xlsxwriter", file=sys.stderr)
    sys.exit(1)

CSV_PATH = r"c:\\Users\\brian\\Downloads\\Aberrant\\Pre-Lease - Details.csv"
OUTPUT_CSV = r"c:\\Users\\brian\\Downloads\\Aberrant\\Prelease_Summary_Aug2024_Aug2025.csv"
OUTPUT_XLSX = r"c:\\Users\\brian\\Downloads\\Aberrant\\Prelease_Summary_Aug2024_Aug2025.xlsx"
OUTPUT_JS = r"c:\\Users\\brian\\Downloads\\Aberrant\\prelease_data.js"
START_DATE = pd.Timestamp('2024-08-01')
END_DATE = pd.Timestamp('2025-08-31 23:59:59')
BEDS = 571

# Exact preferred names first, then looser fallbacks
DATE_PREFS_EXACT = [
    'lease - approved',
    'lease - completed',
]
DATE_CANDIDATES = [
    'lease approved', 'approved date', 'approved', 'signed date', 'lease signed', 'lease signed date',
    'lease start', 'lease start date', 'start date', 'move-in date', 'move in date'
]
STATUS_CANDIDATES = [
    'lease status', 'status', 'resident status', 'lease type', 'type'
]


def normalize_text(s: object) -> str:
    s = "" if pd.isna(s) else str(s)
    return re.sub(r"\s+", " ", s).strip().lower()


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={c: normalize_text(c) for c in df.columns})


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


def choose_date_column(df: pd.DataFrame) -> Tuple[str, pd.Series]:
    # Prefer exact names first
    for name in DATE_PREFS_EXACT:
        if name in df.columns:
            return name, df[name]
    # Fall back to contains-based pick
    cand = pick_column(df, DATE_CANDIDATES)
    if cand:
        return cand, df[cand]
    raise KeyError('No suitable date column found')


def classify_status_strict(val: object) -> Tuple[bool, bool]:
    """
    Strict classification per user spec:
      - New lease counted ONLY if Lease Status is 'Lease Approved' (case-insensitive), i.e., contains 'lease' and 'approved' and NOT 'renewal'.
      - Renewal counted ONLY if Lease Status is 'Renewal Lease Approved' (contains 'renewal', 'lease', 'approved').
      - Everything else excluded from prelease counts.
    """
    s = normalize_text(val)
    excluded_tokens = ['cancel', 'declin', 'notice', 'denied', 'withdraw', 'transfer pending']
    if any(tok in s for tok in excluded_tokens):
        return False, False

    has_lease = 'lease' in s
    has_approved = 'approved' in s
    has_renewal = 'renewal' in s

    is_renewal_approved = has_lease and has_approved and has_renewal
    is_new_approved = has_lease and has_approved and (not has_renewal)

    return is_renewal_approved, is_new_approved


def main():
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: File not found: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    try:
        df = pd.read_csv(CSV_PATH, dtype=str, low_memory=False)
    except Exception as e:
        print(f"ERROR: Failed to read CSV: {e}", file=sys.stderr)
        sys.exit(1)

    if df is None or df.empty:
        print("ERROR: CSV is empty.", file=sys.stderr)
        sys.exit(1)

    df = normalize_columns(df)

    status_col = pick_column(df, STATUS_CANDIDATES)
    if not status_col:
        print("ERROR: Could not find a status column (e.g., 'Lease Status').", file=sys.stderr)
        print("Available columns:", list(df.columns), file=sys.stderr)
        sys.exit(1)

    try:
        date_col_name, date_series = choose_date_column(df)
    except KeyError:
        print("ERROR: Could not find a date column (e.g., 'Lease - Approved').", file=sys.stderr)
        print("Available columns:", list(df.columns), file=sys.stderr)
        sys.exit(1)

    signed_date = None
    if 'lease - approved' in df.columns:
        signed_date = df['lease - approved']
    if signed_date is None or pd.isna(signed_date).all():
        if 'lease - completed' in df.columns:
            signed_date = df['lease - completed']
    if signed_date is None:
        signed_date = date_series

    df['_parsed_date'] = pd.to_datetime(signed_date, errors='coerce')
    df = df.dropna(subset=['_parsed_date']).copy()

    df = df[(df['_parsed_date'] >= START_DATE) & (df['_parsed_date'] <= END_DATE)].copy()
    if df.empty:
        print(f"ERROR: No records within range {START_DATE.date()} to {END_DATE.date()}.", file=sys.stderr)
        all_dates = pd.to_datetime(signed_date, errors='coerce').dropna()
        if not all_dates.empty:
            print(f"Date range in file: {all_dates.min().date()} .. {all_dates.max().date()}", file=sys.stderr)
        sys.exit(1)

    flags = df[status_col].apply(classify_status_strict).tolist()
    df['_is_renewal'] = [r for r, _ in flags]
    df['_is_new'] = [n for _, n in flags]
    df['_is_counted'] = df['_is_renewal'] | df['_is_new']

    df['_month'] = df['_parsed_date'].values.astype('datetime64[M]')

    g = df[df['_is_counted']].groupby('_month')
    monthly = pd.DataFrame({
        'renewal_added': g['_is_renewal'].sum().astype(int),
        'new_added': g['_is_new'].sum().astype(int),
    })
    monthly['total_added'] = monthly['renewal_added'] + monthly['new_added']

    all_months = pd.date_range(START_DATE, END_DATE, freq='MS')
    monthly = monthly.reindex(all_months, fill_value=0)

    monthly['renewal_cum'] = monthly['renewal_added'].cumsum()
    monthly['total_cum'] = monthly['total_added'].cumsum()

    summary = pd.DataFrame({
        'Month': [d.strftime('%b %Y') for d in monthly.index.to_pydatetime()],
        'Renewal Leases': monthly['renewal_cum'].astype(int).values,
        'Renewal %': (monthly['renewal_cum'] / BEDS * 100.0).round(2).values,
        'Prelease%': (monthly['total_cum'] / BEDS * 100.0).round(2).values,
    })

    try:
        summary.to_csv(OUTPUT_CSV, index=False)
    except Exception as e:
        print(f"ERROR: Failed to write CSV: {e}", file=sys.stderr)

    wrote_chart = False
    try:
        with pd.ExcelWriter(OUTPUT_XLSX, engine='xlsxwriter') as writer:
            summary.to_excel(writer, sheet_name='Summary', index=False)
            workbook = writer.book
            worksheet = writer.sheets['Summary']
            chart = workbook.add_chart({'type': 'line'})
            last_row = len(summary) + 1
            chart.add_series({'name': 'Renewal %', 'categories': ['Summary', 1, 0, last_row-1, 0], 'values': ['Summary', 1, 2, last_row-1, 2], 'line': {'color': '#1f77b4'}})
            chart.add_series({'name': 'Prelease%', 'categories': ['Summary', 1, 0, last_row-1, 0], 'values': ['Summary', 1, 3, last_row-1, 3], 'line': {'color': '#ff7f0e'}})
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

    # Write JS data
    labels = [d.strftime('%b %Y') for d in monthly.index.to_pydatetime()]
    renewal_leases = monthly['renewal_cum'].astype(int).tolist()
    renewal_pct = (monthly['renewal_cum'] / BEDS * 100.0).round(2).tolist()
    prelease_pct = (monthly['total_cum'] / BEDS * 100.0).round(2).tolist()

    try:
        with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
            f.write('// Auto-generated by analyze_prelease_csv.py\n')
            f.write('window.preleaseData = ' + json.dumps({
                'labels': labels,
                'renewalLeases': renewal_leases,
                'renewalPct': renewal_pct,
                'preleasePct': prelease_pct,
            }) + ';\n')
    except Exception as e:
        print(f"ERROR: Failed to write JS data file: {e}", file=sys.stderr)

    # Diagnostics
    print("Chosen date column:", date_col_name)
    print("Chosen status column:", status_col)
    diag = monthly[['renewal_added','new_added','total_added']].copy()
    diag.index = [d.strftime('%Y-%m') for d in monthly.index.to_pydatetime()]
    print("\nRaw monthly additions (strict approved-only):")
    print(diag.to_string())

    print("\nSummary (Aug 2024 - Aug 2025):")
    print(summary.to_string(index=False))
    print(f"\nOutput CSV: {OUTPUT_CSV}")
    print(f"Output Excel: {OUTPUT_XLSX}{' (with chart)' if wrote_chart else ''}")
    print(f"JS data for HTML: {OUTPUT_JS}")


if __name__ == '__main__':
    main()
