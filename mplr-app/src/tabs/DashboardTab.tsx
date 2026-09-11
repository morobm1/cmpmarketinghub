import React, { useMemo } from 'react';
import { useMPLRStore } from '../store';
import { Card, ProgressBar, StatCard } from '../components/ui';
import {
  computeDashboardStats,
  computeFloorPlanProgress,
  computeGoalRows,
  computeRenewalSnapshot,
  formatCurrency,
  formatPercent,
} from '../lib/calculations';

export function DashboardTab() {
  const { data, setActiveTab } = useMPLRStore();
  const stats = useMemo(() => computeDashboardStats(data), [data]);

  // Prefer the New Lease Tier 1 unit type list (allowed counts = capacity) if present,
  // falling back to the legacy manual Floor Plans list.
  const unitTypeCapacity = useMemo(() => {
    const tierUnitTypes = data.rateTiers.newLease.flatMap((t) => t.unitTypes);
    if (tierUnitTypes.length) {
      return tierUnitTypes.map((ut) => ({ type: ut.type, total: ut.allowed }));
    }
    return data.floorPlans;
  }, [data.rateTiers.newLease, data.floorPlans]);

  const floorPlanProgress = useMemo(
    () => computeFloorPlanProgress({ ...data, floorPlans: unitTypeCapacity }),
    [data, unitTypeCapacity]
  );

  const renewalSnapshot = useMemo(() => computeRenewalSnapshot(data.renewals), [data.renewals]);
  const goalRows = useMemo(() => computeGoalRows(data.goals, data.totalBeds), [data.goals, data.totalBeds]);
  const latestGoal = goalRows[goalRows.length - 1];
  const nextUpcomingGoal = goalRows.find((g) => g.leasesSigned === 0 && g.goalLeases > 0) || goalRows[0];

  return (
    <div>
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard label="Prelease %" value={formatPercent(stats.preleasePercent, 2)} tone="accent" />
        <StatCard label="Total Beds Leased" value={stats.totalBedsLeased} subtext={`of ${stats.propertyTotalBeds || '—'} beds`} />
        <StatCard label="Left to Lease" value={stats.leftToLease} tone="warning" />
        <StatCard label="Total Renewals" value={stats.totalRenewals} />
        <StatCard label="Renewal Ratio" value={formatPercent(stats.renewalRatio, 2)} />
        <StatCard label="Renewal Transfers" value={stats.renewalTransfer} />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <Card title="Occupancy by Unit Type">
          {floorPlanProgress.length === 0 ? (
            <div className="text-sm text-surface-400">
              No unit types configured yet. Add rate tiers or floor plans, or import your workbook.
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {floorPlanProgress.map((fp) => (
                <div key={fp.type} className="border border-surface-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold text-surface-500 uppercase tracking-wide">{fp.type}</span>
                    <span className="text-lg font-bold text-brand-primary">{formatPercent(fp.percentLeased, 1)}</span>
                  </div>
                  <ProgressBar percent={fp.percentLeased} />
                  <div className="flex justify-between text-xs text-surface-500 mt-2">
                    <span>{fp.leased}/{fp.total} leased</span>
                    <span>{fp.available} available</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div>
          <Card title="Renewal Campaign Snapshot" actions={<button className="text-xs font-semibold text-brand-primary" onClick={() => setActiveTab('renewals')}>View all &rarr;</button>}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SnapshotStat label="Current Residents" value={renewalSnapshot.currentResidents} />
              <SnapshotStat label="Renewal Signed" value={renewalSnapshot.renewalSigned} tone="success" />
              <SnapshotStat label="Interested" value={renewalSnapshot.interested} tone="accent" />
              <SnapshotStat label="Tier Not Assigned" value={renewalSnapshot.tierNotAssigned} tone="warning" />
              <SnapshotStat label="Due Today" value={renewalSnapshot.dueToday} />
              <SnapshotStat label="Overdue" value={renewalSnapshot.overdue} tone="danger" />
            </div>
            <div className="mt-3 pt-3 border-t border-surface-200 flex justify-between text-sm">
              <span className="text-surface-500">Avg Current Rent</span>
              <span className="font-bold">{formatCurrency(renewalSnapshot.avgCurrentRent)}</span>
            </div>
          </Card>

          <Card title="Leasing Pace" actions={<button className="text-xs font-semibold text-brand-primary" onClick={() => setActiveTab('goals')}>View all &rarr;</button>}>
            {!latestGoal ? (
              <div className="text-sm text-surface-400">No weekly goals configured yet.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-surface-500 uppercase tracking-wide">Season Prelease Progress</span>
                  <span className="text-lg font-bold text-brand-primary">{formatPercent(latestGoal.preleaseGoalPercent, 1)}</span>
                </div>
                <ProgressBar percent={latestGoal.preleaseGoalPercent} />
                <div className="flex justify-between text-xs text-surface-500 mt-2 mb-4">
                  <span>{latestGoal.cumulativeSigned} signed</span>
                  <span>{latestGoal.cumulativeGoal} goal</span>
                </div>
                {nextUpcomingGoal && (
                  <div className="flex justify-between text-sm border-t border-surface-200 pt-3">
                    <span className="text-surface-500">Next week goal ({nextUpcomingGoal.weekOf})</span>
                    <span className={`font-bold ${nextUpcomingGoal.varianceToGoal < 0 ? 'text-danger' : 'text-success'}`}>
                      {nextUpcomingGoal.varianceToGoal >= 0 ? '+' : ''}
                      {nextUpcomingGoal.varianceToGoal} vs goal
                    </span>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SnapshotStat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'danger' | 'accent' }) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-brand-accent-2' : 'text-surface-900';
  return (
    <div>
      <div className="text-[11px] text-surface-500">{label}</div>
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
