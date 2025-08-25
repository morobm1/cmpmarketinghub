import os
import sys
import re
from typing import Optional, List

try:
    import pandas as pd
except ModuleNotFoundError:
    print("ERROR: pandas is not installed. Run: python -m pip install pandas openpyxl xlsxwriter", file=sys.stderr)
    sys.exit(1)

CSV_PATH = r"c:\\Users\\brian\\Downloads\\Aberrant\\Lead Conversion.csv"
OUTPUT_CSV = r"c:\\Users\\brian\\Downloads\\Aberrant\\Lead_Closing_Ratio_Monthly.csv"
OUTPUT_XLSX = r"c:\\Users\\brian\\Downloads\\Aberrant\\Lead_Closing_Ratio_Monthly.xlsx"

# Column name candidates
CREATED_CANDS = [
    'created on', 'created date', 'lead created', 'created', 'date created', 'lead created on'
]
LEASE_APPROVED_CANDS = [
    'lease - approved', 'lease approved', 'approved (lease)', 'lease approved on', 'approved on', 'approved date'
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
    # contains fallback
    for cand in candidates:
        for c in df.columns:
            if cand in c:
                return c
    return None


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

    created_col = pick_column(df, CREATED_CANDS)
    # Prefer exact 'lease - approved' if present
    if 'lease - approved' in df.columns:
        lease_appr_col = 'lease - approved'
    else:
        lease_appr_col = pick_column(df, LEASE_APPROVED_CANDS)

    if not created_col:
        print("ERROR: Could not find a 'Created On' column.", file=sys.stderr)
        print("Available columns:", list(df.columns), file=sys.stderr)
        sys.exit(1)
    if not lease_appr_col:
        print("ERROR: Could not find a 'Lease - Approved' column.", file=sys.stderr)
        print("Available columns:", list(df.columns), file=sys.stderr)
        sys.exit(1)

    # Parse dates
    df['_created'] = pd.to_datetime(df[created_col], errors='coerce')
    df['_lease_appr'] = pd.to_datetime(df[lease_appr_col], errors='coerce')

    # Leads by Created On month
    leads = df.dropna(subset=['_created']).copy()
    leads['_lead_month'] = leads['_created'].values.astype('datetime64[M]')
    leads_by_month = leads.groupby('_lead_month').size().rename('Leads').to_frame()

    # Lease approvals (ignore Application approvals entirely)
    lease_appr = df.dropna(subset=['_lease_appr']).copy()
    lease_appr['_approval_month'] = lease_appr['_lease_appr'].values.astype('datetime64[M]')
    appr_by_month = lease_appr.groupby('_approval_month').size().rename('Lease Approvals').to_frame()

    # Union months, sorted
    all_months = pd.Index(sorted(set(leads_by_month.index.tolist()) | set(appr_by_month.index.tolist())))
    if len(all_months) == 0:
        print("ERROR: No valid months found from Created On / Lease - Approved.", file=sys.stderr)
        sys.exit(1)

    leads_by_month = leads_by_month.reindex(all_months, fill_value=0)
    appr_by_month = appr_by_month.reindex(all_months, fill_value=0)

    # Closing ratio: approvals in month / leads created in same month
    out = pd.DataFrame(index=all_months)
    out['Leads'] = leads_by_month['Leads']
    out['Lease Approvals'] = appr_by_month['Lease Approvals']
    out['Closing Ratio %'] = (out['Lease Approvals'] / out['Leads'].replace({0: pd.NA}) * 100.0).fillna(0.0).round(2)

    summary = out.reset_index().rename(columns={'index': 'Month'})
    summary['Month'] = summary['Month'].dt.strftime('%b %Y')

    # Save CSV
    try:
        summary.to_csv(OUTPUT_CSV, index=False)
    except Exception as e:
        print(f"ERROR: Failed to write CSV: {e}", file=sys.stderr)

    # Save Excel: columns chart for counts, line (secondary axis) for closing ratio
    wrote_chart = False
    try:
        with pd.ExcelWriter(OUTPUT_XLSX, engine='xlsxwriter') as writer:
            summary.to_excel(writer, sheet_name='Closing Ratio', index=False)
            wb = writer.book
            ws = writer.sheets['Closing Ratio']
            last_row = len(summary) + 1

            chart_cols = wb.add_chart({'type': 'column'})
            chart_cols.add_series({'name': 'Leads', 'categories': ['Closing Ratio', 1, 0, last_row-1, 0], 'values': ['Closing Ratio', 1, 1, last_row-1, 1], 'gap': 10})
            chart_cols.add_series({'name': 'Lease Approvals', 'categories': ['Closing Ratio', 1, 0, last_row-1, 0], 'values': ['Closing Ratio', 1, 2, last_row-1, 2], 'gap': 10})
            chart_cols.set_title({'name': 'Monthly Leads and Lease Approvals'})
            chart_cols.set_x_axis({'name': 'Month'})
            chart_cols.set_y_axis({'name': 'Count'})
            chart_cols.set_legend({'position': 'bottom'})

            chart_line = wb.add_chart({'type': 'line'})
            chart_line.add_series({'name': 'Closing Ratio %', 'categories': ['Closing Ratio', 1, 0, last_row-1, 0], 'values': ['Closing Ratio', 1, 3, last_row-1, 3], 'y2_axis': True})
            chart_line.set_title({'name': 'Closing Ratio %'})
            chart_line.set_x_axis({'name': 'Month'})
            chart_line.set_y2_axis({'name': 'Percent'})

            ws.insert_chart('F2', chart_cols, {'x_scale': 1.25, 'y_scale': 1.25})
            ws.insert_chart('F20', chart_line, {'x_scale': 1.25, 'y_scale': 1.25})
            wrote_chart = True
    except Exception as e:
        print(f"ERROR: Failed to write Excel: {e}", file=sys.stderr)

    # Diagnostics
    print("Detected columns:")
    print(f"  Created On:       {created_col}")
    print(f"  Lease - Approved: {lease_appr_col}")
    print("\nMonthly summary:")
    print(summary.to_string(index=False))
    print(f"\nOutput CSV: {OUTPUT_CSV}")
    print(f"Output Excel: {OUTPUT_XLSX}{' (with charts)' if wrote_chart else ''}")


if __name__ == '__main__':
    main()
