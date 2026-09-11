import React, { useMemo, useState } from 'react';
import { useMPLRStore } from '../store';
import { Button, Card, EmptyState, Field, Input, StatCard, TableWrap, Td, Th } from '../components/ui';
import { computeGoalRows, formatDate, formatPercent } from '../lib/calculations';
import { rid } from '../lib/normalize';

export function GoalsTab() {
  const { data, saveGoals } = useMPLRStore();
  const [newWeek, setNewWeek] = useState('');

  const rows = useMemo(() => computeGoalRows(data.goals, data.totalBeds), [data.goals, data.totalBeds]);
  const last = rows[rows.length - 1];

  function update(id: string, patch: Partial<{ weekOf: string; goalLeases: number; leasesSigned: number }>) {
    saveGoals(data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  function remove(id: string) {
    if (!confirm('Delete this week?')) return;
    saveGoals(data.goals.filter((g) => g.id !== id));
  }
  function addWeek() {
    if (!newWeek) return;
    saveGoals([...data.goals, { id: rid(), weekOf: newWeek, goalLeases: 0, leasesSigned: 0 }]);
    setNewWeek('');
  }

  return (
    <div>
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard label="Season Goal" value={last?.cumulativeGoal ?? 0} />
        <StatCard label="Total Signed" value={last?.cumulativeSigned ?? 0} tone="success" />
        <StatCard label="Prelease % (of beds)" value={formatPercent(last?.preleaseGoalPercent ?? 0)} tone="accent" />
        <StatCard
          label="Variance to Goal"
          value={`${(last?.varianceToGoal ?? 0) >= 0 ? '+' : ''}${last?.varianceToGoal ?? 0}`}
          tone={(last?.varianceToGoal ?? 0) < 0 ? 'danger' : 'success'}
        />
      </div>

      <Card>
        <div className="flex items-end gap-2">
          <Field label="Week Of"><Input type="date" value={newWeek} onChange={(e) => setNewWeek(e.target.value)} /></Field>
          <Button variant="primary" onClick={addWeek}>+ Add Week</Button>
        </div>
      </Card>

      <Card title="Weekly Leasing Pace">
        {rows.length === 0 ? (
          <EmptyState>No weekly goals configured yet. Add a week or import your workbook.</EmptyState>
        ) : (
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Week Of</Th>
                  <Th align="center">Goal # of Leases</Th>
                  <Th align="center">Leases Signed</Th>
                  <Th align="center">Cumulative Goal</Th>
                  <Th align="center">Cumulative Signed</Th>
                  <Th align="center">Prelease %</Th>
                  <Th align="center">+/- Goal</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} className="hover:bg-surface-50">
                    <Td>{formatDate(g.weekOf)}</Td>
                    <Td align="center"><Input type="number" className="w-20 text-center" value={g.goalLeases} onChange={(e) => update(g.id, { goalLeases: parseFloat(e.target.value) || 0 })} /></Td>
                    <Td align="center"><Input type="number" className="w-20 text-center" value={g.leasesSigned} onChange={(e) => update(g.id, { leasesSigned: parseFloat(e.target.value) || 0 })} /></Td>
                    <Td align="center">{g.cumulativeGoal}</Td>
                    <Td align="center">{g.cumulativeSigned}</Td>
                    <Td align="center">{formatPercent(g.preleaseGoalPercent)}</Td>
                    <Td align="center">
                      <span className={g.varianceToGoal < 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                        {g.varianceToGoal >= 0 ? '+' : ''}{g.varianceToGoal}
                      </span>
                    </Td>
                    <Td align="center"><Button size="sm" variant="danger" onClick={() => remove(g.id)}>Delete</Button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
