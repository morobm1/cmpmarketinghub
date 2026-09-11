import React, { useMemo, useState } from 'react';
import { useMPLRStore } from '../store';
import { Badge, Button, Card, EmptyState, Field, Input, TableWrap, Td, Th } from '../components/ui';
import { computeTierProgress, formatCurrency, formatPercent } from '../lib/calculations';
import type { RateTier } from '../types';

function TierSection({ category, tiers, leases, onChange }: { category: 'new' | 'renewal'; tiers: RateTier[]; leases: any[]; onChange: (tiers: RateTier[]) => void }) {
  const [newTierName, setNewTierName] = useState('');
  const progress = useMemo(() => computeTierProgress(tiers, leases, category), [tiers, leases, category]);

  function addTier() {
    const name = newTierName.trim();
    if (!name) return;
    if (tiers.some((t) => t.tier.toLowerCase() === name.toLowerCase())) {
      alert('A tier with this name already exists.');
      return;
    }
    onChange([...tiers, { tier: name, unitTypes: [] }]);
    setNewTierName('');
  }
  function deleteTier(tierName: string) {
    if (!confirm(`Delete ${tierName} and all its unit types?`)) return;
    onChange(tiers.filter((t) => t.tier !== tierName));
  }
  function addUnitType(tierName: string) {
    onChange(
      tiers.map((t) => (t.tier === tierName ? { ...t, unitTypes: [...t.unitTypes, { type: '', allowed: 0, offersSent: 0, signed: 0, rate: 0 }] } : t))
    );
  }
  function updateUnitType(tierName: string, idx: number, patch: Partial<RateTier['unitTypes'][number]>) {
    onChange(
      tiers.map((t) =>
        t.tier === tierName ? { ...t, unitTypes: t.unitTypes.map((ut, i) => (i === idx ? { ...ut, ...patch } : ut)) } : t
      )
    );
  }
  function removeUnitType(tierName: string, idx: number) {
    onChange(tiers.map((t) => (t.tier === tierName ? { ...t, unitTypes: t.unitTypes.filter((_, i) => i !== idx) } : t)));
  }

  return (
    <div>
      <div className="flex items-end gap-2 mb-4">
        <Field label="New Tier Name">
          <Input value={newTierName} onChange={(e) => setNewTierName(e.target.value)} placeholder="e.g. Tier 3" />
        </Field>
        <Button variant="primary" onClick={addTier}>+ Add Tier</Button>
      </div>

      {tiers.length === 0 ? (
        <EmptyState>No tiers configured yet for {category === 'new' ? 'new leases' : 'renewals'}.</EmptyState>
      ) : (
        progress.map((tierProg, ti) => {
          const tier = tiers.find((t) => t.tier === tierProg.tier)!;
          return (
            <div key={tierProg.tier} className="mb-6 border border-surface-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-surface-200">
                <h4 className="font-bold text-surface-700 m-0">{tierProg.tier}</h4>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addUnitType(tier.tier)}>+ Add Unit Type</Button>
                  <Button size="sm" variant="danger" onClick={() => deleteTier(tier.tier)}>Delete Tier</Button>
                </div>
              </div>
              <TableWrap>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr>
                      <Th>Unit Type</Th>
                      <Th align="center">Allowed</Th>
                      <Th align="center">Offers Sent</Th>
                      <Th align="center">Signed</Th>
                      <Th align="center">Actual Signed (live)</Th>
                      <Th align="center">Offers Left</Th>
                      <Th align="center">% Filled</Th>
                      <Th align="right">Rate</Th>
                      <Th align="center">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierProg.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-surface-50">
                        <Td>
                          <Input value={row.type} onChange={(e) => updateUnitType(tier.tier, i, { type: e.target.value })} placeholder="Unit type" />
                        </Td>
                        <Td align="center"><Input type="number" className="w-20 text-center" value={row.allowed} onChange={(e) => updateUnitType(tier.tier, i, { allowed: parseFloat(e.target.value) || 0 })} /></Td>
                        <Td align="center"><Input type="number" className="w-20 text-center" value={row.offersSent} onChange={(e) => updateUnitType(tier.tier, i, { offersSent: parseFloat(e.target.value) || 0 })} /></Td>
                        <Td align="center"><Input type="number" className="w-20 text-center" value={row.signed} onChange={(e) => updateUnitType(tier.tier, i, { signed: parseFloat(e.target.value) || 0 })} /></Td>
                        <Td align="center">
                          <Badge tone={row.actualSigned === row.signed ? 'success' : 'warning'}>{row.actualSigned}</Badge>
                        </Td>
                        <Td align="center">{row.offersLeft}</Td>
                        <Td align="center">{formatPercent(row.percentFilled)}</Td>
                        <Td align="right"><Input type="number" step="0.01" className="w-24 text-right" value={row.rate} onChange={(e) => updateUnitType(tier.tier, i, { rate: parseFloat(e.target.value) || 0 })} /></Td>
                        <Td align="center"><Button size="sm" variant="danger" onClick={() => removeUnitType(tier.tier, i)}>Remove</Button></Td>
                      </tr>
                    ))}
                    {tierProg.rows.length > 0 && (
                      <tr className="bg-surface-50 font-bold">
                        <Td>Total</Td>
                        <Td align="center">{tierProg.totals.allowed}</Td>
                        <Td align="center">{tierProg.totals.offersSent}</Td>
                        <Td align="center">{tierProg.totals.signed}</Td>
                        <Td align="center">{tierProg.totals.actualSigned}</Td>
                        <Td align="center">{tierProg.totals.offersLeft}</Td>
                        <Td colSpan={2} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          );
        })
      )}
    </div>
  );
}

export function TierTrackerTab() {
  const { data, saveRateTiers } = useMPLRStore();
  const [category, setCategory] = useState<'new' | 'renewal'>('new');

  return (
    <div>
      <Card>
        <div className="flex gap-2">
          <Button variant={category === 'new' ? 'primary' : 'default'} onClick={() => setCategory('new')}>New Lease Tiers</Button>
          <Button variant={category === 'renewal' ? 'primary' : 'default'} onClick={() => setCategory('renewal')}>Renewal Tiers</Button>
        </div>
      </Card>

      <Card title={category === 'new' ? 'New Lease Base Rates' : 'Renewal Base Rates'}>
        {category === 'new' ? (
          <TierSection
            category="new"
            tiers={data.rateTiers.newLease}
            leases={data.leases}
            onChange={(newLease) => saveRateTiers({ ...data.rateTiers, newLease })}
          />
        ) : (
          <TierSection
            category="renewal"
            tiers={data.rateTiers.renewal}
            leases={data.leases}
            onChange={(renewal) => saveRateTiers({ ...data.rateTiers, renewal })}
          />
        )}
      </Card>
    </div>
  );
}
