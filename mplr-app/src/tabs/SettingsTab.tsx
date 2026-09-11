import React, { useState } from 'react';
import { useMPLRStore } from '../store';
import { Button, Card, Field, Input, TableWrap, Td, Th } from '../components/ui';

export function SettingsTab() {
  const { data, saveTotalBeds, saveAll, clearAllData } = useMPLRStore();
  const [totalBeds, setTotalBeds] = useState(String(data.totalBeds || ''));
  const [newFpType, setNewFpType] = useState('');
  const [newFpTotal, setNewFpTotal] = useState('');

  React.useEffect(() => {
    setTotalBeds(String(data.totalBeds || ''));
  }, [data.totalBeds]);

  function saveBeds() {
    const v = parseInt(totalBeds, 10);
    if (isNaN(v) || v < 0) {
      alert('Please enter a valid number of beds.');
      return;
    }
    saveTotalBeds(v);
  }

  function addFloorPlan() {
    const type = newFpType.trim();
    const total = parseInt(newFpTotal, 10);
    if (!type || isNaN(total) || total < 0) {
      alert('Please enter a valid floor plan type and total.');
      return;
    }
    const existing = data.floorPlans.find((f) => f.type.toLowerCase() === type.toLowerCase());
    const next = existing
      ? data.floorPlans.map((f) => (f.type.toLowerCase() === type.toLowerCase() ? { ...f, total } : f))
      : [...data.floorPlans, { type, total }];
    saveAll({ floorPlans: next });
    setNewFpType('');
    setNewFpTotal('');
  }

  function removeFloorPlan(type: string) {
    saveAll({ floorPlans: data.floorPlans.filter((f) => f.type !== type) });
  }

  async function handleClearAll() {
    const totalRecords = data.leases.length + data.renewals.length + data.relets.length + data.goals.length;
    if (totalRecords === 0) {
      alert('There is no data to clear.');
      return;
    }
    if (!confirm(`WARNING: This will permanently delete ALL MPLR data for ${data.property} (${totalRecords}+ records). This cannot be undone. Continue?`)) return;
    if (!confirm('SECOND WARNING: This action is permanent and irreversible. Click OK to proceed to final confirmation.')) return;
    const typed = prompt('Type "DELETE" (all capital letters) to permanently delete all MPLR data for ' + data.property + ':');
    if (typed !== 'DELETE') {
      alert('Deletion cancelled. The text did not match "DELETE".');
      return;
    }
    await clearAllData();
    alert('All MPLR data has been permanently removed.');
  }

  return (
    <div>
      <Card title="Property Configuration">
        <div className="flex items-end gap-3">
          <Field label="Total Beds in Property">
            <Input type="number" value={totalBeds} onChange={(e) => setTotalBeds(e.target.value)} className="w-40" />
          </Field>
          <Button variant="primary" onClick={saveBeds}>Save</Button>
        </div>
        <p className="text-xs text-surface-400 mt-2">Used to compute Prelease % and Left to Lease across the dashboard.</p>
      </Card>

      <Card title="Floor Plans (legacy capacity list)">
        <p className="text-xs text-surface-400 mb-3">
          Optional. If Rate &amp; Tier Tracker unit types are configured, the Dashboard uses those "Allowed" counts
          for occupancy tracking instead. Use this list only if you don't track tiers for this property.
        </p>
        <div className="flex items-end gap-3 mb-4">
          <Field label="Floor Plan Type"><Input value={newFpType} onChange={(e) => setNewFpType(e.target.value)} /></Field>
          <Field label="Total Units"><Input type="number" value={newFpTotal} onChange={(e) => setNewFpTotal(e.target.value)} className="w-28" /></Field>
          <Button onClick={addFloorPlan}>+ Add</Button>
        </div>
        {data.floorPlans.length > 0 && (
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th align="center">Total Units</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.floorPlans.map((f) => (
                  <tr key={f.type}>
                    <Td>{f.type}</Td>
                    <Td align="center">{f.total}</Td>
                    <Td align="center"><Button size="sm" variant="danger" onClick={() => removeFloorPlan(f.type)}>Remove</Button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Card title="Danger Zone">
        <p className="text-sm text-surface-500 mb-3">
          Permanently delete all MPLR data (leases, tiers, renewals, goals, relets) for <strong>{data.property}</strong>.
          This cannot be undone.
        </p>
        <Button variant="danger" onClick={handleClearAll}>Clear All MPLR Data</Button>
      </Card>
    </div>
  );
}
