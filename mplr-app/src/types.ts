// Shared MPLR data model. This is the standard schema for every property's
// MPLR dashboard - not just Meridian on Main. Fields are intentionally
// generic (e.g. `additionalFees`) since fee names/structures vary by
// property (e.g. "Valet Trash" vs "Monthly Parking Fee").

export type ID = string;

export interface Fee {
  label: string;
  amount: number;
}

export interface Lease {
  id: ID;
  approvedDate: string; // ISO date (yyyy-mm-dd) or ''
  unitType: string; // floor plan / unit type label, e.g. "2BR/2BA - Newark"
  leaseType: string; // 'New Lease' | 'Renewal' | 'Renewal Transfer' | custom
  aptBed: string; // unit/bed code, e.g. "A-204-A2"
  firstName: string;
  lastName: string;
  leaseStart: string;
  leaseEnd: string;
  leasingAgent: string;
  monthlyBaseRent: number;
  additionalFees: Fee[]; // e.g. Valet Trash, Parking
  liabilityInsurance: number;
  securityDeposit: number;
  approvalMethod: string;
  guaLeaseSigned: string;
  payStubsOrW2: string;
  commissionPayout: number;
  leasingTM: string;
  datePaid: string;
  upfrontRent?: number;
}

export interface FloorPlan {
  type: string;
  total: number;
}

export interface TierUnitType {
  type: string; // unit type / floor plan label
  allowed: number; // cap for this tier
  offersSent: number;
  signed: number; // manually tracked, cross-checked against live lease counts
  rate: number; // current rate available
}

export interface RateTier {
  tier: string; // "Tier 1", "Tier 2", ...
  unitTypes: TierUnitType[];
}

export interface RateTiers {
  newLease: RateTier[];
  renewal: RateTier[];
}

export type RenewalStatus =
  | 'Not Contacted'
  | 'Interested'
  | 'Renewal Signed'
  | 'Declined'
  | 'Moving Out'
  | string;

export interface RenewalFollowUp {
  id: ID;
  resident: string;
  unitBed: string;
  renewalRateType: string; // unit type used to look up tier rates
  primaryPhone: string;
  email: string;
  currentLeaseEnd: string;
  marketRent: number;
  currentLeaseRent: number;
  currentMonthlyCharges: number;
  assignedTier: '' | 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';
  assignedRenewalRateOverride?: number; // optional manual override of computed rate
  renewalStatus: RenewalStatus;
  followUpType: string;
  followUpDate: string;
  followUpTime: string;
  assignedTo: string;
  lastContact: string;
  attempts: number;
  outcome: string;
  notes: string;
}

export interface GoalWeek {
  id: ID;
  weekOf: string;
  goalLeases: number;
  leasesSigned: number;
}

export interface Relet {
  id: ID;
  oldResident: string;
  desiredMoveOutDate: string;
  moveOutReason: string;
  floorplan: string;
  unit: string;
  rent: number;
  reletFeePaid: boolean;
  documentsSigned: boolean;
  newResident: string;
  reletComplete: boolean;
  notes: string;
}

export interface MPLRData {
  property: string;
  totalBeds: number;
  leases: Lease[];
  floorPlans: FloorPlan[];
  rateTiers: RateTiers;
  renewals: RenewalFollowUp[];
  goals: GoalWeek[];
  relets: Relet[];
  updatedAt?: string;
}

export function emptyMPLRData(property: string): MPLRData {
  return {
    property,
    totalBeds: 0,
    leases: [],
    floorPlans: [],
    rateTiers: { newLease: [], renewal: [] },
    renewals: [],
    goals: [],
    relets: [],
  };
}

export interface CurrentUser {
  username: string;
  role: 'admin' | 'user' | string;
  properties: string[] | '*';
}

export type TabKey =
  | 'dashboard'
  | 'leases'
  | 'tiers'
  | 'renewals'
  | 'goals'
  | 'relets'
  | 'import'
  | 'settings';
