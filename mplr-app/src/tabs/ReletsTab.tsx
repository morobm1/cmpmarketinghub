import React, { useState } from 'react';
import { useMPLRStore } from '../store';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, TableWrap, Td, Th } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/calculations';
import { rid } from '../lib/normalize';
import type { Relet } from '../types';

function emptyRelet(): Relet {
  return {
    id: rid(),
    oldResident: '',
    desiredMoveOutDate: '',
    moveOutReason: '',
    floorplan: '',
    unit: '',
    rent: 0,
    reletFeePaid: false,
    documentsSigned: false,
    newResident: '',
    reletComplete: false,
    notes: '',
  };
}

export function ReletsTab() {
  const { data, saveRelets } = useMPLRStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Relet | null>(null);

  function openAdd() {
    setEditing(emptyRelet());
    setModalOpen(true);
  }
  function openEdit(r: Relet) {
    setEditing({ ...r });
    setModalOpen(true);
  }
  function remove(id: string) {
    if (!confirm('Delete this relet record?')) return;
    saveRelets(data.relets.filter((r) => r.id !== id));
  }
  function submit() {
    if (!editing) return;
    if (!editing.oldResident) {
      alert('Old resident name is required.');
      return;
    }
    const exists = data.relets.some((r) => r.id === editing.id);
    const next = exists ? data.relets.map((r) => (r.id === editing.id ? editing : r)) : [...data.relets, editing];
    saveRelets(next);
    setModalOpen(false);
  }

  return (
    <div>
      <Card
        title={`Resident Relets (${data.relets.length})`}
        actions={<Button variant="primary" onClick={openAdd}>+ Add Relet</Button>}
      >
        {data.relets.length === 0 ? (
          <EmptyState>No relets tracked yet. Turnover/relet events will show here.</EmptyState>
        ) : (
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Old Resident</Th>
                  <Th>Move Out Date</Th>
                  <Th>Reason</Th>
                  <Th>Floorplan</Th>
                  <Th>Unit</Th>
                  <Th align="right">Rent</Th>
                  <Th align="center">Fee Paid</Th>
                  <Th align="center">Docs Signed</Th>
                  <Th>New Resident</Th>
                  <Th align="center">Complete</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.relets.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-50">
                    <Td>{r.oldResident}</Td>
                    <Td>{formatDate(r.desiredMoveOutDate)}</Td>
                    <Td>{r.moveOutReason}</Td>
                    <Td>{r.floorplan}</Td>
                    <Td>{r.unit}</Td>
                    <Td align="right">{formatCurrency(r.rent)}</Td>
                    <Td align="center"><Badge tone={r.reletFeePaid ? 'success' : 'neutral'}>{r.reletFeePaid ? 'Yes' : 'No'}</Badge></Td>
                    <Td align="center"><Badge tone={r.documentsSigned ? 'success' : 'neutral'}>{r.documentsSigned ? 'Yes' : 'No'}</Badge></Td>
                    <Td>{r.newResident}</Td>
                    <Td align="center"><Badge tone={r.reletComplete ? 'success' : 'warning'}>{r.reletComplete ? 'Complete' : 'In Progress'}</Badge></Td>
                    <Td align="center">
                      <div className="flex gap-1.5 justify-center">
                        <Button size="sm" onClick={() => openEdit(r)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(r.id)}>Delete</Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing && data.relets.some((r) => r.id === editing.id) ? 'Edit Relet' : 'Add Relet'}
        wide
        footer={<><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Save</Button></>}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Old Resident"><Input value={editing.oldResident} onChange={(e) => setEditing({ ...editing, oldResident: e.target.value })} /></Field>
            <Field label="Desired Move Out Date"><Input type="date" value={editing.desiredMoveOutDate} onChange={(e) => setEditing({ ...editing, desiredMoveOutDate: e.target.value })} /></Field>
            <Field label="Move Out Reason"><Input value={editing.moveOutReason} onChange={(e) => setEditing({ ...editing, moveOutReason: e.target.value })} /></Field>
            <Field label="Floorplan"><Input value={editing.floorplan} onChange={(e) => setEditing({ ...editing, floorplan: e.target.value })} /></Field>
            <Field label="Unit"><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></Field>
            <Field label="Rent"><Input type="number" step="0.01" value={editing.rent} onChange={(e) => setEditing({ ...editing, rent: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="New Resident"><Input value={editing.newResident} onChange={(e) => setEditing({ ...editing, newResident: e.target.value })} /></Field>
            <div className="flex gap-6 items-center pt-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.reletFeePaid} onChange={(e) => setEditing({ ...editing, reletFeePaid: e.target.checked })} /> Fee Paid</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.documentsSigned} onChange={(e) => setEditing({ ...editing, documentsSigned: e.target.checked })} /> Docs Signed</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.reletComplete} onChange={(e) => setEditing({ ...editing, reletComplete: e.target.checked })} /> Complete</label>
            </div>
            <div className="col-span-2">
              <Field label="Notes"><Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
