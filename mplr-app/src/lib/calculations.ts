import type { GoalWeek, Lease, MPLRData, RateTier, RenewalFollowUp } from '../types';
import { totalMonthlyFees } from './normalize';

export function isRenewalType(leaseType: string): boolean {
  const t = (leaseType || '').toUpperCase();
  return t.includes('RENEWAL') || t === 'RT' || t === 'R/T';
}

export function isTransferType(leaseType: string): boolean {
  const t = (leaseType || '').toUpperCase();
  return t.includes('TRANSFER') || t === 'RT' || t === 'R/T';
}

export function isNewLeaseType(leaseType: string): boolean {
  return (leaseType || '').toLowerCase().includes('new');
}

export interface DashboardStats {
  totalBedsLeased: number;
  propertyTotalBeds: number;
  preleasePercent: number;
  leftToLease: number;
  totalRenewals: number;
  renewalRatio: number;
  renewalTransfer: number;
}

export function computeDashboardStats(data: MPLRData): DashboardStats {
  const totalBedsLeased = data.leases.length;
  const propertyTotalBeds = data.totalBeds || 0;
  const preleasePercent = propertyTotalBeds > 0 ? (totalBedsLeased / propertyTotalBeds) * 100 : 0;
  const leftToLease = Math.max(0, propertyTotalBeds - totalBedsLeased);
  const totalRenewals = data.leases.filter((l) => isRenewalType(l.leaseType)).length;
  const renewalRatio = propertyTotalBeds > 0 ? (totalRenewals / propertyTotalBeds) * 100 : 0;
  const renewalTransfer = data.leases.filter((l) => isTransferType(l.leaseType)).length;
  return { totalBedsLeased, propertyTotalBeds, preleasePercent, leftToLease, totalRenewals, renewalRatio, renewalTransfer };
}

export interface FloorPlanProgress {
  type: string;
  total: number;
  leased: number;
  available: number;
  percentLeased: number;
}

export function computeFloorPlanProgress(data: MPLRData): FloorPlanProgress[] {
  const leasedCounts: Record<string, number> = {};
  data.leases.forEach((l) => {
    leasedCounts[l.unitType] = (leasedCounts[l.unitType] || 0) + 1;
  });
  return [...data.floorPlans]
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((fp) => {
      const leased = leasedCounts[fp.type] || 0;
      const available = Math.max(0, fp.total - leased);
      const percentLeased = fp.total > 0 ? (leased / fp.total) * 100 : 0;
      return { type: fp.type, total: fp.total, leased, available, percentLeased };
    });
}

export interface TierRow {
  type: string;
  allowed: number;
  offersSent: number;
  signed: number;
  actualSigned: number; // cross-checked live count from lease registry matching unitType+rate
  offersLeft: number;
  percentFilled: number;
  rate: number;
}

export interface TierProgress {
  tier: string;
  rows: TierRow[];
  totals: { allowed: number; offersSent: number; signed: number; actualSigned: number; offersLeft: number };
}

export function computeTierProgress(tiers: RateTier[], leases: Lease[], category: 'new' | 'renewal'): TierProgress[] {
  const relevantLeases = leases.filter((l) =>
    category === 'new' ? isNewLeaseType(l.leaseType) : isRenewalType(l.leaseType)
  );
  const leaseCounts: Record<string, number> = {};
  relevantLeases.forEach((l) => {
    const key = `${l.unitType}|${l.monthlyBaseRent}`;
    leaseCounts[key] = (leaseCounts[key] || 0) + 1;
  });

  return tiers.map((tier) => {
    let tAllowed = 0,
      tOffersSent = 0,
      tSigned = 0,
      tActual = 0,
      tOffersLeft = 0;
    const rows: TierRow[] = tier.unitTypes.map((ut) => {
      const key = `${ut.type}|${ut.rate}`;
      const actualSigned = leaseCounts[key] || 0;
      const offersLeft = Math.max(0, ut.allowed - ut.signed);
      const percentFilled = ut.allowed > 0 ? (ut.signed / ut.allowed) * 100 : 0;
      tAllowed += ut.allowed;
      tOffersSent += ut.offersSent;
      tSigned += ut.signed;
      tActual += actualSigned;
      tOffersLeft += offersLeft;
      return { type: ut.type, allowed: ut.allowed, offersSent: ut.offersSent, signed: ut.signed, actualSigned, offersLeft, percentFilled, rate: ut.rate };
    });
    return { tier: tier.tier, rows, totals: { allowed: tAllowed, offersSent: tOffersSent, signed: tSigned, actualSigned: tActual, offersLeft: tOffersLeft } };
  });
}

export interface RenewalSnapshot {
  currentResidents: number;
  renewalSigned: number;
  interested: number;
  dueToday: number;
  overdue: number;
  tierNotAssigned: number;
  avgCurrentRent: number;
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
}

export function computeRenewalSnapshot(renewals: RenewalFollowUp[]): RenewalSnapshot {
  const currentResidents = renewals.length;
  const renewalSigned = renewals.filter((r) => r.renewalStatus === 'Renewal Signed').length;
  const interested = renewals.filter((r) => r.renewalStatus === 'Interested').length;
  const activeStatuses = (r: RenewalFollowUp) => !['Renewal Signed', 'Declined', 'Moving Out'].includes(r.renewalStatus);
  const dueToday = renewals.filter((r) => activeStatuses(r) && isToday(r.followUpDate)).length;
  const overdue = renewals.filter((r) => activeStatuses(r) && r.followUpDate && isPast(r.followUpDate)).length;
  const tierNotAssigned = renewals.filter((r) => !r.assignedTier).length;
  const avgCurrentRent =
    currentResidents > 0 ? renewals.reduce((s, r) => s + r.currentMonthlyCharges, 0) / currentResidents : 0;
  return { currentResidents, renewalSigned, interested, dueToday, overdue, tierNotAssigned, avgCurrentRent };
}

export interface RenewalTierOffer {
  tier: string;
  rate: number | null;
  delta: number | null;
}

// Look up the rate for a given unit type across all configured renewal tiers.
export function computeRenewalTierOffers(renewalTiers: RateTier[], unitType: string, currentMonthlyCharges: number): RenewalTierOffer[] {
  return renewalTiers.map((tier) => {
    const ut = tier.unitTypes.find((u) => u.type.toLowerCase() === unitType.toLowerCase());
    const rate = ut ? ut.rate : null;
    const delta = rate !== null ? rate - currentMonthlyCharges : null;
    return { tier: tier.tier, rate, delta };
  });
}

export function computeAssignedRenewalRate(renewal: RenewalFollowUp, renewalTiers: RateTier[]): number | null {
  if (renewal.assignedRenewalRateOverride !== undefined) return renewal.assignedRenewalRateOverride;
  if (!renewal.assignedTier) return null;
  const tier = renewalTiers.find((t) => t.tier === renewal.assignedTier);
  if (!tier) return null;
  const ut = tier.unitTypes.find((u) => u.type.toLowerCase() === renewal.renewalRateType.toLowerCase());
  return ut ? ut.rate : null;
}

export interface GoalRow extends GoalWeek {
  cumulativeGoal: number;
  cumulativeSigned: number;
  preleaseGoalPercent: number;
  varianceToGoal: number;
}

export function computeGoalRows(goals: GoalWeek[], totalBeds: number): GoalRow[] {
  let cumulativeGoal = 0;
  let cumulativeSigned = 0;
  return goals.map((g) => {
    cumulativeGoal += g.goalLeases;
    cumulativeSigned += g.leasesSigned;
    const preleaseGoalPercent = totalBeds > 0 ? (cumulativeSigned / totalBeds) * 100 : 0;
    const varianceToGoal = cumulativeSigned - cumulativeGoal;
    return { ...g, cumulativeGoal, cumulativeSigned, preleaseGoalPercent, varianceToGoal };
  });
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '$0.00';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return '0%';
  return n.toFixed(digits) + '%';
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export { totalMonthlyFees };
