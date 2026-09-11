import * as XLSX from 'xlsx';
import type { GoalWeek, Lease, RateTier, RateTiers, Relet, RenewalFollowUp } from '../types';
import { rid, toNum, toStr, toBool } from './normalize';

export interface ImportResult {
  leases: Lease[];
  rateTiers: RateTiers;
  renewals: RenewalFollowUp[];
  goals: GoalWeek[];
  relets: Relet[];
  totalBedsHint: number | null;
  matchedSheets: { domain: string; sheetName: string; rows: number }[];
  unmatchedSheets: string[];
  warnings: string[];
}

type AOA = any[][];

function sheetToAOA(ws: XLSX.WorkSheet): AOA {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: true }) as AOA;
}

function findSheet(names: string[], matcher: (nameLower: string) => boolean): string | null {
  for (const n of names) {
    if (matcher(n.toLowerCase())) return n;
  }
  return null;
}

// ---------- Lease Registry ("MPLR" sheet) ----------
function parseLeaseRegistry(ws: XLSX.WorkSheet): Lease[] {
  const aoa = sheetToAOA(ws);
  // Row 0 = grouped section headers, Row 1 = actual column headers, data starts row 2
  const headerRow = (aoa[1] || []).map((h: any) => toStr(h).trim());
  const colIndex = (label: string) => headerRow.findIndex((h) => h === label);

  const idx = {
    approvedDate: colIndex('Approved Date'),
    unitType: colIndex('Unit Type'),
    leaseType: colIndex('Lease Type'),
    aptBed: colIndex('Apt/Bed'),
    firstName: colIndex('First Name'),
    lastName: colIndex('Last Name'),
    leaseStart: colIndex('Lease Start'),
    leaseEnd: colIndex('Lease End'),
    leasingAgent: colIndex('Leasing Agent'),
    monthlyBaseRent: colIndex('Monthly Base Rent'),
    valetTrash: colIndex('VALET TRASH'),
    liabilityInsurance: colIndex('Liability Insurance Premium'),
    securityDeposit: colIndex('Security Deposit'),
    approvalMethod: colIndex('Approval Method'),
    guaLeaseSigned: colIndex('GUA Lease Signed'),
    payStubsOrW2: colIndex('Pay Stubs or W2 in Entrata'),
    commissionPayout: colIndex('COMMISSION PAYOUT'),
    leasingTM: colIndex('LEASING TM'),
    datePaid: colIndex('DATE PAID'),
  };

  const leases: Lease[] = [];
  for (let r = 2; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const firstName = idx.firstName >= 0 ? toStr(row[idx.firstName]).trim() : '';
    const lastName = idx.lastName >= 0 ? toStr(row[idx.lastName]).trim() : '';
    if (!firstName && !lastName) continue; // skip blank template rows

    const additionalFees = [];
    if (idx.valetTrash >= 0 && toNum(row[idx.valetTrash]) !== 0) {
      additionalFees.push({ label: 'Valet Trash', amount: toNum(row[idx.valetTrash]) });
    }

    leases.push({
      id: rid(),
      approvedDate: parseExcelDate(row[idx.approvedDate]),
      unitType: toStr(row[idx.unitType]).trim(),
      leaseType: mapLeaseTypeCode(toStr(row[idx.leaseType]).trim()),
      aptBed: toStr(row[idx.aptBed]).trim(),
      firstName,
      lastName,
      leaseStart: parseExcelDate(row[idx.leaseStart]),
      leaseEnd: parseExcelDate(row[idx.leaseEnd]),
      leasingAgent: toStr(row[idx.leasingAgent]).trim(),
      monthlyBaseRent: toNum(row[idx.monthlyBaseRent]),
      additionalFees,
      liabilityInsurance: toNum(row[idx.liabilityInsurance]),
      securityDeposit: toNum(row[idx.securityDeposit]),
      approvalMethod: toStr(row[idx.approvalMethod]).trim(),
      guaLeaseSigned: toStr(row[idx.guaLeaseSigned]).trim(),
      payStubsOrW2: toStr(row[idx.payStubsOrW2]).trim(),
      commissionPayout: toNum(row[idx.commissionPayout]),
      leasingTM: toStr(row[idx.leasingTM]).trim(),
      datePaid: parseExcelDate(row[idx.datePaid]),
    });
  }
  return leases;
}

function mapLeaseTypeCode(raw: string): string {
  const up = raw.toUpperCase();
  if (up === 'N') return 'New Lease';
  if (up === 'R') return 'Renewal';
  if (up === 'RT' || up === 'R/T') return 'Renewal Transfer';
  return raw;
}

function parseExcelDate(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  }
  if (typeof value === 'number') {
    const date = (XLSX as any).SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  return '';
}

// ---------- Tier Tracker sheet ----------
function parseTierTracker(ws: XLSX.WorkSheet): RateTiers {
  const aoa = sheetToAOA(ws);
  const tiers: RateTiers = { newLease: [], renewal: [] };
  let section: 'newLease' | 'renewal' = 'newLease';

  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const c0 = toStr(row[0]).trim().toUpperCase();
    if (c0.includes('NEW LEASE')) {
      section = 'newLease';
      continue;
    }
    if (c0.includes('RENEWAL') && c0.includes('BASE')) {
      section = 'renewal';
      continue;
    }

    for (let c = 0; c < row.length; c++) {
      const cell = toStr(row[c]).trim();
      const m = cell.match(/^TIER\s*(\d+)\s*PRICING$/i);
      if (!m) continue;
      const nextCell = toStr(row[c + 1]).trim().toLowerCase();
      if (nextCell !== 'lease type') continue;

      const tierLabel = `Tier ${m[1]}`;
      const unitTypes: RateTier['unitTypes'] = [];
      let rr = r + 1;
      while (rr < aoa.length) {
        const dataRow = aoa[rr] || [];
        const label = toStr(dataRow[c + 1]).trim();
        if (!label || label.toLowerCase() === 'total') break;
        unitTypes.push({
          type: label,
          allowed: toNum(dataRow[c + 2]),
          offersSent: toNum(dataRow[c + 3]),
          signed: toNum(dataRow[c + 4]),
          rate: toNum(dataRow[c + 6]),
        });
        rr++;
      }
      if (unitTypes.length) {
        tiers[section].push({ tier: tierLabel, unitTypes });
      }
    }
  }
  return tiers;
}

// ---------- Resident Renewal Follow-Up sheet ----------
function parseRenewalFollowUp(ws: XLSX.WorkSheet): RenewalFollowUp[] {
  const aoa = sheetToAOA(ws);
  let headerRowIdx = -1;
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    if (toStr(row[0]).trim() === 'Resident' && toStr(row[1]).trim().toLowerCase().includes('unit')) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) return [];

  const headerRow = (aoa[headerRowIdx] || []).map((h: any) => toStr(h).trim());
  const colIndex = (label: string) => headerRow.findIndex((h) => h === label);
  const idx = {
    resident: colIndex('Resident'),
    unitBed: colIndex('Unit / Bed'),
    renewalRateType: colIndex('Renewal Rate Type'),
    primaryPhone: colIndex('Primary Phone'),
    email: colIndex('Email'),
    currentLeaseEnd: colIndex('Current Lease End'),
    marketRent: colIndex('Market Rent'),
    currentLeaseRent: colIndex('Current Lease Rent'),
    currentMonthlyCharges: colIndex('Current Monthly Charges'),
    assignedTier: colIndex('Assigned Tier'),
    renewalStatus: colIndex('Renewal Status'),
    followUpType: colIndex('Follow-Up Type'),
    followUpDate: colIndex('Follow-Up Date'),
    followUpTime: colIndex('Follow-Up Time'),
    assignedTo: colIndex('Assigned To'),
    lastContact: colIndex('Last Contact'),
    attempts: colIndex('Attempts'),
    outcome: colIndex('Outcome / Response'),
    notes: colIndex('Notes'),
  };

  const renewals: RenewalFollowUp[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const resident = toStr(row[idx.resident]).trim();
    if (!resident) continue;
    renewals.push({
      id: rid(),
      resident,
      unitBed: toStr(row[idx.unitBed]).trim(),
      renewalRateType: toStr(row[idx.renewalRateType]).trim(),
      primaryPhone: toStr(row[idx.primaryPhone]).trim(),
      email: toStr(row[idx.email]).trim(),
      currentLeaseEnd: parseExcelDate(row[idx.currentLeaseEnd]),
      marketRent: toNum(row[idx.marketRent]),
      currentLeaseRent: toNum(row[idx.currentLeaseRent]),
      currentMonthlyCharges: toNum(row[idx.currentMonthlyCharges]),
      assignedTier: (toStr(row[idx.assignedTier]).trim() || '') as RenewalFollowUp['assignedTier'],
      renewalStatus: toStr(row[idx.renewalStatus]).trim() || 'Not Contacted',
      followUpType: toStr(row[idx.followUpType]).trim(),
      followUpDate: parseExcelDate(row[idx.followUpDate]),
      followUpTime: toStr(row[idx.followUpTime]).trim(),
      assignedTo: toStr(row[idx.assignedTo]).trim(),
      lastContact: parseExcelDate(row[idx.lastContact]),
      attempts: toNum(row[idx.attempts]),
      outcome: toStr(row[idx.outcome]).trim(),
      notes: toStr(row[idx.notes]).trim(),
    });
  }
  return renewals;
}

// ---------- Goals & Actuals sheet ----------
function parseGoalsAndActuals(ws: XLSX.WorkSheet): { goals: GoalWeek[]; totalBedsHint: number | null } {
  const aoa = sheetToAOA(ws);
  const totalBedsHint = aoa[0] && toNum(aoa[0][1]) > 0 ? toNum(aoa[0][1]) : null;

  let headerRowIdx = -1;
  for (let r = 0; r < aoa.length; r++) {
    if (toStr((aoa[r] || [])[0]).trim() === 'Week Of') {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) return { goals: [], totalBedsHint };

  const goals: GoalWeek[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const weekOf = toStr(row[0]).trim();
    if (!weekOf || weekOf.toUpperCase() === 'TOTALS') break;
    goals.push({
      id: rid(),
      weekOf: parseExcelDate(weekOf) || weekOf,
      goalLeases: toNum(row[1]),
      leasesSigned: toNum(row[3]),
    });
  }
  return { goals, totalBedsHint };
}

// ---------- Resident Relets sheet ----------
function parseResidentRelets(ws: XLSX.WorkSheet): Relet[] {
  const aoa = sheetToAOA(ws);
  const headerRow = (aoa[0] || []).map((h: any) => toStr(h).trim());
  const colIndex = (label: string) => headerRow.findIndex((h) => h === label);
  const idx = {
    oldResident: colIndex('Old Resident'),
    desiredMoveOutDate: colIndex('Desired Move Out Date'),
    moveOutReason: colIndex('Move Out Reason'),
    floorplan: colIndex('Floorplan'),
    unit: colIndex('Unit'),
    rent: colIndex('Rent'),
    reletFeePaid: colIndex('Relet Fee Paid'),
    documentsSigned: colIndex('Documents Signed'),
    newResident: colIndex('New Resident'),
    reletComplete: colIndex('Relet Complete'),
    notes: colIndex('Notes'),
  };

  const relets: Relet[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const oldResident = toStr(row[idx.oldResident]).trim();
    const newResident = toStr(row[idx.newResident]).trim();
    if (!oldResident && !newResident) continue;
    relets.push({
      id: rid(),
      oldResident,
      desiredMoveOutDate: parseExcelDate(row[idx.desiredMoveOutDate]),
      moveOutReason: toStr(row[idx.moveOutReason]).trim(),
      floorplan: toStr(row[idx.floorplan]).trim(),
      unit: toStr(row[idx.unit]).trim(),
      rent: toNum(row[idx.rent]),
      reletFeePaid: toBool(row[idx.reletFeePaid]),
      documentsSigned: toBool(row[idx.documentsSigned]),
      newResident,
      reletComplete: toBool(row[idx.reletComplete]),
      notes: toStr(row[idx.notes]).trim(),
    });
  }
  return relets;
}

export function parseMPLRWorkbook(data: ArrayBuffer): ImportResult {
  const wb = XLSX.read(data, { type: 'array' });
  const names = wb.SheetNames;
  const warnings: string[] = [];
  const matchedSheets: ImportResult['matchedSheets'] = [];
  const unmatched = new Set(names);

  const result: ImportResult = {
    leases: [],
    rateTiers: { newLease: [], renewal: [] },
    renewals: [],
    goals: [],
    relets: [],
    totalBedsHint: null,
    matchedSheets,
    unmatchedSheets: [],
    warnings,
  };

  const leaseSheetName =
    findSheet(names, (n) => n === 'mplr') ||
    findSheet(names, (n) => n.includes('lease') && n.includes('registry')) ||
    findSheet(names, (n) => n.includes('lease') && !n.includes('renewal'));
  if (leaseSheetName) {
    result.leases = parseLeaseRegistry(wb.Sheets[leaseSheetName]);
    matchedSheets.push({ domain: 'Lease Registry', sheetName: leaseSheetName, rows: result.leases.length });
    unmatched.delete(leaseSheetName);
  } else {
    warnings.push('Could not find a Lease Registry sheet (expected a tab named "MPLR").');
  }

  const tierSheetName = findSheet(names, (n) => n.includes('tier'));
  if (tierSheetName) {
    result.rateTiers = parseTierTracker(wb.Sheets[tierSheetName]);
    const rowCount = result.rateTiers.newLease.reduce((s, t) => s + t.unitTypes.length, 0) +
      result.rateTiers.renewal.reduce((s, t) => s + t.unitTypes.length, 0);
    matchedSheets.push({ domain: 'Rate & Tier Tracker', sheetName: tierSheetName, rows: rowCount });
    unmatched.delete(tierSheetName);
  } else {
    warnings.push('Could not find a Tier Tracker sheet.');
  }

  const renewalSheetName = findSheet(names, (n) => n.includes('renewal') && n.includes('follow'));
  if (renewalSheetName) {
    result.renewals = parseRenewalFollowUp(wb.Sheets[renewalSheetName]);
    matchedSheets.push({ domain: 'Resident Renewal Follow-Up', sheetName: renewalSheetName, rows: result.renewals.length });
    unmatched.delete(renewalSheetName);
  } else {
    warnings.push('Could not find a Resident Renewal Follow-Up sheet.');
  }

  const goalsSheetName = findSheet(names, (n) => n.includes('goal'));
  if (goalsSheetName) {
    const { goals, totalBedsHint } = parseGoalsAndActuals(wb.Sheets[goalsSheetName]);
    result.goals = goals;
    result.totalBedsHint = totalBedsHint;
    matchedSheets.push({ domain: 'Goals & Actuals', sheetName: goalsSheetName, rows: goals.length });
    unmatched.delete(goalsSheetName);
  } else {
    warnings.push('Could not find a Goals & Actuals sheet.');
  }

  const reletSheetName = findSheet(names, (n) => n.includes('relet'));
  if (reletSheetName) {
    result.relets = parseResidentRelets(wb.Sheets[reletSheetName]);
    matchedSheets.push({ domain: 'Resident Relets', sheetName: reletSheetName, rows: result.relets.length });
    unmatched.delete(reletSheetName);
  } else {
    warnings.push('Could not find a Resident Relets sheet.');
  }

  result.unmatchedSheets = Array.from(unmatched);
  return result;
}
