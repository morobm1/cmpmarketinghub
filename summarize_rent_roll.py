import sys
import csv
from collections import defaultdict

def parse_money(s: str) -> float:
    if s is None:
        return 0.0
    s = str(s).strip()
    if not s:
        return 0.0
    neg = False
    if s.startswith('(') and s.endswith(')'):
        neg = True
        s = s[1:-1]
    # remove currency formatting
    s = s.replace(',', '').replace(' ', '').replace('$', '')
    try:
        val = float(s)
    except Exception:
        val = 0.0
    return -val if neg else val


def load_rows(path: str):
    # Read file and find header row that starts with the actual CSV headers
    with open(path, 'r', encoding='utf-8-sig', newline='') as f:
        lines = f.read().splitlines()
    header_idx = None
    for i, line in enumerate(lines):
        if line.startswith('Bldg-Unit,Unit Type'):
            header_idx = i
            break
    if header_idx is None:
        raise RuntimeError('Could not locate header row starting with "Bldg-Unit,Unit Type"')
    reader = csv.DictReader(lines[header_idx:])
    rows = []
    for r in reader:
        b = (r.get('Bldg-Unit') or '').strip()
        if not b or 'Total' in b:
            continue
        r['MR'] = parse_money(r.get('Market Rent'))
        r['SCH'] = parse_money(r.get('Scheduled Charges'))
        rows.append(r)
    return rows


def summarize(rows):
    groups = defaultdict(list)
    for r in rows:
        groups[r.get('Unit Type', '').strip()].append(r)

    summary = []
    for fp in sorted(groups.keys()):
        g = groups[fp]
        total = len(g)
        vacant = sum(1 for r in g if (r.get('Unit Status') or '').startswith('Vacant'))
        vacpct = round((vacant / total) * 100, 1) if total else 0.0
        mr_sum = round(sum(r['MR'] for r in g), 2)
        sch_sum = round(sum(r['SCH'] for r in g), 2)
        summary.append({
            'Floorplan': fp,
            'Units': total,
            'Vacant': vacant,
            'Vacancy%': vacpct,
            'MarketRent_Sum': mr_sum,
            'ScheduledRent_Sum': sch_sum,
        })

    total_units = len(rows)
    total_vacant = sum(1 for r in rows if (r.get('Unit Status') or '').startswith('Vacant'))
    total_vacpct = round((total_vacant / total_units) * 100, 1) if total_units else 0.0
    overall = {
        'Floorplan': 'TOTAL',
        'Units': total_units,
        'Vacant': total_vacant,
        'Vacancy%': total_vacpct,
        'MarketRent_Sum': round(sum(r['MR'] for r in rows), 2),
        'ScheduledRent_Sum': round(sum(r['SCH'] for r in rows), 2),
    }

    return summary, overall


def fmt_money(n):
    return f"{n:,.2f}"


def print_report(summary, overall):
    headers = (
        ('Floorplan', 30),
        ('Units', 7),
        ('Vacant', 8),
        ('Vac%', 7),
        ('Market Rent Sum', 20),
        ('Scheduled Rent Sum', 22),
    )
    # Header
    line = []
    for h, w in headers:
        align = '>' if h != 'Floorplan' else '<'
        line.append(f"{h:{align}{w}}")
    print(' '.join(line))
    print('-' * (sum(w for _, w in headers) + len(headers) - 1))

    for row in summary:
        print(f"{row['Floorplan']:<30} {row['Units']:>7} {row['Vacant']:>8} {row['Vacancy%']:>7.1f} {fmt_money(row['MarketRent_Sum']):>20} {fmt_money(row['ScheduledRent_Sum']):>22}")

    print('-' * (sum(w for _, w in headers) + len(headers) - 1))
    print(f"{overall['Floorplan']:<30} {overall['Units']:>7} {overall['Vacant']:>8} {overall['Vacancy%']:>7.1f} {fmt_money(overall['MarketRent_Sum']):>20} {fmt_money(overall['ScheduledRent_Sum']):>22}")


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'Rent Roll (4)(Meridian On Main).csv'
    rows = load_rows(path)
    summary, overall = summarize(rows)
    print_report(summary, overall)
