import type { Fee, GoalWeek, Lease, MPLRData, Relet, RenewalFollowUp, RateTiers, RateTier } from '../types';
import { emptyMPLRData } from '../types';

export function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === '') return 0;
  const cleaned = String(v).replace(/[$,\s]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toUpperCase();
  return s === 'TRUE' || s === 'YES' || s === '1';
}

function normalizeLease(raw: any): Lease {
  // Legacy schema (old mplr.html) used: floorPlan (=aptBed), monthlyRent (=monthlyBaseRent),
  // monthlyUtilities (=single additional fee), no approvalMethod/guaLeaseSigned/etc.
  const additionalFees: Fee[] = Array.isArray(raw.additionalFees)
    ? raw.additionalFees.map((f: any) => ({ label: toStr(f.label), amount: toNum(f.amount) }))
    : raw.monthlyUtilities !== undefined && toNum(raw.monthlyUtilities) !== 0
      ? [{ label: 'Monthly Utilities/Fee', amount: toNum(raw.monthlyUtilities) }]
      : [];

  return {
    id: raw.id || rid(),
    approvedDate: toStr(raw.approvedDate),
    unitType: toStr(raw.unitType),
    leaseType: toStr(raw.leaseType),
    aptBed: toStr(raw.aptBed ?? raw.floorPlan),
    firstName: toStr(raw.firstName),
    lastName: toStr(raw.lastName),
    leaseStart: toStr(raw.leaseStart),
    leaseEnd: toStr(raw.leaseEnd),
    leasingAgent: toStr(raw.leasingAgent),
    monthlyBaseRent: toNum(raw.monthlyBaseRent ?? raw.monthlyRent),
    additionalFees,
    liabilityInsurance: toNum(raw.liabilityInsurance),
    securityDeposit: toNum(raw.securityDeposit),
    approvalMethod: toStr(raw.approvalMethod),
    guaLeaseSigned: toStr(raw.guaLeaseSigned),
    payStubsOrW2: toStr(raw.payStubsOrW2),
    commissionPayout: toNum(raw.commissionPayout),
    leasingTM: toStr(raw.leasingTM),
    datePaid: toStr(raw.datePaid),
    upfrontRent: raw.upfrontRent !== undefined ? toNum(raw.upfrontRent) : undefined,
  };
}

export function totalMonthlyFees(l: Lease): number {
  const feesSum = (l.additionalFees || []).reduce((s, f) => s + toNum(f.amount), 0);
  return toNum(l.monthlyBaseRent) + feesSum + toNum(l.liabilityInsurance);
}

function normalizeTierUnitType(raw: any) {
  return {
    type: toStr(raw.type),
    allowed: toNum(raw.allowed ?? raw.cap),
    offersSent: toNum(raw.offersSent),
    signed: toNum(raw.signed),
    rate: toNum(raw.rate),
  };
}

function normalizeTier(raw: any): RateTier {
  return {
    tier: toStr(raw.tier),
    unitTypes: Array.isArray(raw.unitTypes) ? raw.unitTypes.map(normalizeTierUnitType) : [],
  };
}

function normalizeRateTiers(raw: any): RateTiers {
  if (!raw) {
    return { newLease: [], renewal: [] };
  }
  return {
    newLease: Array.isArray(raw.newLease) ? raw.newLease.map(normalizeTier) : [],
    renewal: Array.isArray(raw.renewal) ? raw.renewal.map(normalizeTier) : [],
  };
}

function normalizeRenewal(raw: any): RenewalFollowUp {
  return {
    id: raw.id || rid(),
    resident: toStr(raw.resident),
    unitBed: toStr(raw.unitBed),
    renewalRateType: toStr(raw.renewalRateType),
    primaryPhone: toStr(raw.primaryPhone),
    email: toStr(raw.email),
    currentLeaseEnd: toStr(raw.currentLeaseEnd),
    marketRent: toNum(raw.marketRent),
    currentLeaseRent: toNum(raw.currentLeaseRent),
    currentMonthlyCharges: toNum(raw.currentMonthlyCharges),
    assignedTier: (raw.assignedTier || '') as RenewalFollowUp['assignedTier'],
    assignedRenewalRateOverride:
      raw.assignedRenewalRateOverride !== undefined && raw.assignedRenewalRateOverride !== ''
        ? toNum(raw.assignedRenewalRateOverride)
        : undefined,
    renewalStatus: toStr(raw.renewalStatus || 'Not Contacted'),
    followUpType: toStr(raw.followUpType),
    followUpDate: toStr(raw.followUpDate),
    followUpTime: toStr(raw.followUpTime),
    assignedTo: toStr(raw.assignedTo),
    lastContact: toStr(raw.lastContact),
    attempts: toNum(raw.attempts),
    outcome: toStr(raw.outcome),
    notes: toStr(raw.notes),
  };
}

function normalizeGoal(raw: any): GoalWeek {
  return {
    id: raw.id || rid(),
    weekOf: toStr(raw.weekOf),
    goalLeases: toNum(raw.goalLeases),
    leasesSigned: toNum(raw.leasesSigned),
  };
}

function normalizeRelet(raw: any): Relet {
  return {
    id: raw.id || rid(),
    oldResident: toStr(raw.oldResident),
    desiredMoveOutDate: toStr(raw.desiredMoveOutDate),
    moveOutReason: toStr(raw.moveOutReason),
    floorplan: toStr(raw.floorplan),
    unit: toStr(raw.unit),
    rent: toNum(raw.rent),
    reletFeePaid: toBool(raw.reletFeePaid),
    documentsSigned: toBool(raw.documentsSigned),
    newResident: toStr(raw.newResident),
    reletComplete: toBool(raw.reletComplete),
    notes: toStr(raw.notes),
  };
}

export function normalizeMPLRData(property: string, raw: any): MPLRData {
  const base = emptyMPLRData(property);
  if (!raw || typeof raw !== 'object') return base;
  return {
    property,
    totalBeds: toNum(raw.totalBeds),
    leases: Array.isArray(raw.leases) ? raw.leases.map(normalizeLease) : [],
    floorPlans: Array.isArray(raw.floorPlans)
      ? raw.floorPlans.map((f: any) => ({ type: toStr(f.type), total: toNum(f.total) }))
      : [],
    rateTiers: normalizeRateTiers(raw.rateTiers ?? { newLease: raw.newLeaseTiers, renewal: raw.renewalTiers }),
    renewals: Array.isArray(raw.renewals) ? raw.renewals.map(normalizeRenewal) : [],
    goals: Array.isArray(raw.goals) ? raw.goals.map(normalizeGoal) : [],
    relets: Array.isArray(raw.relets) ? raw.relets.map(normalizeRelet) : [],
    updatedAt: raw.updatedAt,
  };
}

export { toNum, toStr, toBool };
