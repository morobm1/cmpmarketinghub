import React, { useMemo, useState } from 'react';
import { useMPLRStore } from '../store';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, StatCard, TableWrap, Td, Th } from '../components/ui';
import {
  computeAssignedRenewalRate,
  computeRenewalSnapshot,
  computeRenewalTierOffers,
  formatCurrency,
  formatDate,
} from '../lib/calculations';
import { rid } from '../lib/normalize';
import type { RenewalFollowUp } from '../types';

const STATUSES = ['Not Contacted', 'Interested', 'Renewal Signed', 'Declined', 'Moving Out'];
const TIER_OPTIONS = ['', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

function emptyRenewal(): RenewalFollowUp {
  return {
    id: rid(),
    resident: '',
    unitBed: '',
    renewalRateType: '',
    primaryPhone: '',
    email: '',
    currentLeaseEnd: '',
    marketRent: 0,
    currentLeaseRent: 0,
    currentMonthlyCharges: 0,
    assignedTier: '',
    renewalStatus: 'Not Contacted',
    followUpType: '',
    followUpDate: '',
    followUpTime: '',
    assignedTo: '',
    lastContact: '',
    attempts: 0,
    outcome: '',
    notes: '',
  };
}

export function RenewalsTab() {
  const { data, saveRenewals } = useMPLRStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [notesModal, setNotesModal] = useState<RenewalFollowUp | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<RenewalFollowUp>(emptyRenewal());

  const snapshot = useMemo(() => computeRenewalSnapshot(data.renewals), [data.renewals]);

  const filtered = useMemo(() => {
    return data.renewals.filter((r) => {
      if (statusFilter && r.renewalStatus !== statusFilter) return false;
      if (tierFilter === 'unassigned' && r.assignedTier) return false;
      if (tierFilter && tierFilter !== 'unassigned' && r.assignedTier !== tierFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!`${r.resident} ${r.unitBed} ${r.email}`.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [data.renewals, statusFilter, tierFilter, search]);

  function updateRow(id: string, patch: Partial<RenewalFollowUp>) {
    saveRenewals(data.renewals.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    if (!confirm('Delete this resident record?')) return;
    saveRenewals(data.renewals.filter((r) => r.id !== id));
  }
  function addRow() {
    if (!draft.resident.trim()) {
      alert('Resident name is required.');
      return;
    }
    saveRenewals([...data.renewals, draft]);
    setAddOpen(false);
    setDraft(emptyRenewal());
  }

  return (
    <div>
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <StatCard label="Current Residents" value={snapshot.currentResidents} />
        <StatCard label="Renewal Signed" value={snapshot.renewalSigned} tone="success" />
        <StatCard label="Interested" value={snapshot.interested} tone="accent" />
        <StatCard label="Due Today" value={snapshot.dueToday} />
        <StatCard label="Overdue" value={snapshot.overdue} tone="danger" />
        <StatCard label="Tier Not Assigned" value={snapshot.tierNotAssigned} tone="warning" />
        <StatCard label="Avg Current Rent" value={formatCurrency(snapshot.avgCurrentRent)} />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Search"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, unit, email..." /></Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Tier">
            <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="">All</option>
              <option value="unassigned">Unassigned</option>
              {['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <div className="ml-auto">
            <Button variant="primary" onClick={() => setAddOpen(true)}>+ Add Resident</Button>
          </div>
        </div>
      </Card>

      <Card title={`Resident Renewal Follow-Up (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState>No residents yet. Add one manually or import your workbook.</EmptyState>
        ) : (
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Resident</Th>
                  <Th>Unit / Bed</Th>
                  <Th>Rate Type</Th>
                  <Th align="right">Current Rent</Th>
                  <Th>Tier Offers</Th>
                  <Th>Assigned Tier</Th>
                  <Th align="right">Assigned Rate</Th>
                  <Th align="right">$ Change</Th>
                  <Th>Status</Th>
                  <Th>Follow-Up</Th>
                  <Th>Assigned To</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const offers = computeRenewalTierOffers(data.rateTiers.renewal, r.renewalRateType, r.currentMonthlyCharges);
                  const assignedRate = computeAssignedRenewalRate(r, data.rateTiers.renewal);
                  const change = assignedRate !== null ? assignedRate - r.currentMonthlyCharges : null;
                  return (
                    <tr key={r.id} className="hover:bg-surface-50 align-top">
                      <Td>
                        <div className="font-semibold">{r.resident}</div>
                        <div className="text-xs text-surface-400">{r.email}</div>
                      </Td>
                      <Td>{r.unitBed}</Td>
                      <Td>{r.renewalRateType}</Td>
                      <Td align="right">{formatCurrency(r.currentMonthlyCharges)}</Td>
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          {offers.map((o) => (
                            <span key={o.tier} className="text-xs whitespace-nowrap">
                              {o.tier}: {o.rate !== null ? formatCurrency(o.rate) : '—'}{' '}
                              {o.delta !== null && (
                                <span className={o.delta >= 0 ? 'text-danger' : 'text-success'}>
                                  ({o.delta >= 0 ? '+' : ''}{o.delta.toFixed(0)})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <Select value={r.assignedTier} onChange={(e) => updateRow(r.id, { assignedTier: e.target.value as any })}>
                          {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t || '— None —'}</option>)}
                        </Select>
                      </Td>
                      <Td align="right">{assignedRate !== null ? formatCurrency(assignedRate) : '—'}</Td>
                      <Td align="right">
                        {change !== null ? <span className={change >= 0 ? 'text-danger' : 'text-success'}>{change >= 0 ? '+' : ''}{formatCurrency(change)}</span> : '—'}
                      </Td>
                      <Td>
                        <Select value={r.renewalStatus} onChange={(e) => updateRow(r.id, { renewalStatus: e.target.value })}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      </Td>
                      <Td>
                        <Input type="date" value={r.followUpDate} onChange={(e) => updateRow(r.id, { followUpDate: e.target.value })} className="w-36" />
                      </Td>
                      <Td>
                        <Input value={r.assignedTo} onChange={(e) => updateRow(r.id, { assignedTo: e.target.value })} className="w-28" />
                      </Td>
                      <Td align="center">
                        <div className="flex gap-1.5 justify-center">
                          <Button size="sm" onClick={() => setNotesModal(r)}>Notes</Button>
                          <Button size="sm" variant="danger" onClick={() => removeRow(r.id)}>Delete</Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Modal open={!!notesModal} onClose={() => setNotesModal(null)} title={notesModal ? `Follow-Up — ${notesModal.resident}` : ''} footer={<Button variant="primary" onClick={() => setNotesModal(null)}>Done</Button>}>
        {notesModal && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Follow-Up Type"><Input value={notesModal.followUpType} onChange={(e) => { updateRow(notesModal.id, { followUpType: e.target.value }); setNotesModal({ ...notesModal, followUpType: e.target.value }); }} /></Field>
            <Field label="Follow-Up Time"><Input value={notesModal.followUpTime} onChange={(e) => { updateRow(notesModal.id, { followUpTime: e.target.value }); setNotesModal({ ...notesModal, followUpTime: e.target.value }); }} /></Field>
            <Field label="Last Contact"><Input type="date" value={notesModal.lastContact} onChange={(e) => { updateRow(notesModal.id, { lastContact: e.target.value }); setNotesModal({ ...notesModal, lastContact: e.target.value }); }} /></Field>
            <Field label="Attempts"><Input type="number" value={notesModal.attempts} onChange={(e) => { const v = parseFloat(e.target.value) || 0; updateRow(notesModal.id, { attempts: v }); setNotesModal({ ...notesModal, attempts: v }); }} /></Field>
            <div className="col-span-2">
              <Field label="Outcome / Response"><Input value={notesModal.outcome} onChange={(e) => { updateRow(notesModal.id, { outcome: e.target.value }); setNotesModal({ ...notesModal, outcome: e.target.value }); }} /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes">
                <textarea
                  className="px-3 py-2 rounded-lg border border-surface-200 text-sm min-h-[100px]"
                  value={notesModal.notes}
                  onChange={(e) => { updateRow(notesModal.id, { notes: e.target.value }); setNotesModal({ ...notesModal, notes: e.target.value }); }}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Resident" wide footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={addRow}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Resident Name"><Input value={draft.resident} onChange={(e) => setDraft({ ...draft, resident: e.target.value })} /></Field>
          <Field label="Unit / Bed"><Input value={draft.unitBed} onChange={(e) => setDraft({ ...draft, unitBed: e.target.value })} /></Field>
          <Field label="Rate Type (Unit Type)"><Input value={draft.renewalRateType} onChange={(e) => setDraft({ ...draft, renewalRateType: e.target.value })} /></Field>
          <Field label="Email"><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          <Field label="Primary Phone"><Input value={draft.primaryPhone} onChange={(e) => setDraft({ ...draft, primaryPhone: e.target.value })} /></Field>
          <Field label="Current Lease End"><Input type="date" value={draft.currentLeaseEnd} onChange={(e) => setDraft({ ...draft, currentLeaseEnd: e.target.value })} /></Field>
          <Field label="Market Rent"><Input type="number" step="0.01" value={draft.marketRent} onChange={(e) => setDraft({ ...draft, marketRent: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Current Lease Rent"><Input type="number" step="0.01" value={draft.currentLeaseRent} onChange={(e) => setDraft({ ...draft, currentLeaseRent: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Current Monthly Charges"><Input type="number" step="0.01" value={draft.currentMonthlyCharges} onChange={(e) => setDraft({ ...draft, currentMonthlyCharges: parseFloat(e.target.value) || 0 })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
