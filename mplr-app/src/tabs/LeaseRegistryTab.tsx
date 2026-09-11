import React, { useMemo, useState } from 'react';
import { useMPLRStore } from '../store';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, TableWrap, Td, Th } from '../components/ui';
import { formatCurrency, formatDate, totalMonthlyFees } from '../lib/calculations';
import { rid } from '../lib/normalize';
import type { Lease } from '../types';

const LEASE_TYPES = ['New Lease', 'Renewal', 'Renewal Transfer'];

function emptyLease(): Lease {
  return {
    id: rid(),
    approvedDate: '',
    unitType: '',
    leaseType: 'New Lease',
    aptBed: '',
    firstName: '',
    lastName: '',
    leaseStart: '',
    leaseEnd: '',
    leasingAgent: '',
    monthlyBaseRent: 0,
    additionalFees: [],
    liabilityInsurance: 0,
    securityDeposit: 0,
    approvalMethod: '',
    guaLeaseSigned: '',
    payStubsOrW2: '',
    commissionPayout: 0,
    leasingTM: '',
    datePaid: '',
  };
}

export function LeaseRegistryTab() {
  const { data, saveLeases } = useMPLRStore();
  const [search, setSearch] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [leaseTypeFilter, setLeaseTypeFilter] = useState('');
  const [editing, setEditing] = useState<Lease | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const unitTypes = useMemo(() => Array.from(new Set(data.leases.map((l) => l.unitType).filter(Boolean))).sort(), [data.leases]);

  const filtered = useMemo(() => {
    return data.leases.filter((l) => {
      if (unitTypeFilter && l.unitType !== unitTypeFilter) return false;
      if (leaseTypeFilter && l.leaseType !== leaseTypeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.firstName} ${l.lastName} ${l.aptBed} ${l.unitType}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [data.leases, unitTypeFilter, leaseTypeFilter, search]);

  function openAdd() {
    setEditing(emptyLease());
    setModalOpen(true);
  }
  function openEdit(l: Lease) {
    setEditing({ ...l });
    setModalOpen(true);
  }
  function remove(id: string) {
    if (!confirm('Delete this lease record?')) return;
    saveLeases(data.leases.filter((l) => l.id !== id));
  }
  function submit() {
    if (!editing) return;
    if (!editing.firstName || !editing.lastName) {
      alert('First and last name are required.');
      return;
    }
    const exists = data.leases.some((l) => l.id === editing.id);
    const next = exists ? data.leases.map((l) => (l.id === editing.id ? editing : l)) : [...data.leases, editing];
    saveLeases(next);
    setModalOpen(false);
    setEditing(null);
  }

  function exportCsv() {
    const headers = [
      'Approved Date', 'Unit Type', 'Lease Type', 'Apt/Bed', 'First Name', 'Last Name', 'Lease Start', 'Lease End',
      'Leasing Agent', 'Monthly Base Rent', 'Additional Fees', 'Liability Insurance', 'Total Monthly Fees', 'Security Deposit',
    ];
    const rows = filtered.map((l) => [
      l.approvedDate, l.unitType, l.leaseType, l.aptBed, l.firstName, l.lastName, l.leaseStart, l.leaseEnd,
      l.leasingAgent, l.monthlyBaseRent, l.additionalFees.map((f) => `${f.label}: ${f.amount}`).join('; '),
      l.liabilityInsurance, totalMonthlyFees(l), l.securityDeposit,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.property}_leases.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Search">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, unit, apt/bed..." />
          </Field>
          <Field label="Unit Type">
            <Select value={unitTypeFilter} onChange={(e) => setUnitTypeFilter(e.target.value)}>
              <option value="">All</option>
              {unitTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lease Type">
            <Select value={leaseTypeFilter} onChange={(e) => setLeaseTypeFilter(e.target.value)}>
              <option value="">All</option>
              {LEASE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <div className="ml-auto flex gap-2">
            <Button onClick={exportCsv}>Export CSV</Button>
            <Button variant="primary" onClick={openAdd}>+ Add Lease</Button>
          </div>
        </div>
      </Card>

      <Card title={`Lease Registry (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState>No leases yet. Add one manually or import your workbook.</EmptyState>
        ) : (
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Approved</Th>
                  <Th>Unit Type</Th>
                  <Th>Lease Type</Th>
                  <Th>Apt/Bed</Th>
                  <Th>Resident</Th>
                  <Th>Lease Start</Th>
                  <Th>Lease End</Th>
                  <Th align="right">Base Rent</Th>
                  <Th align="right">Total Fees</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-50">
                    <Td>{formatDate(l.approvedDate)}</Td>
                    <Td><strong>{l.unitType}</strong></Td>
                    <Td><Badge tone={l.leaseType === 'New Lease' ? 'info' : l.leaseType.includes('Transfer') ? 'warning' : 'success'}>{l.leaseType}</Badge></Td>
                    <Td>{l.aptBed}</Td>
                    <Td>{l.firstName} {l.lastName}</Td>
                    <Td>{formatDate(l.leaseStart)}</Td>
                    <Td>{formatDate(l.leaseEnd)}</Td>
                    <Td align="right">{formatCurrency(l.monthlyBaseRent)}</Td>
                    <Td align="right">{formatCurrency(totalMonthlyFees(l))}</Td>
                    <Td align="center">
                      <div className="flex gap-1.5 justify-center">
                        <Button size="sm" onClick={() => openEdit(l)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(l.id)}>Delete</Button>
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
        title={editing && data.leases.some((l) => l.id === editing.id) ? 'Edit Lease' : 'Add Lease'}
        wide
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Save Lease</Button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name"><Input value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} /></Field>
            <Field label="Last Name"><Input value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} /></Field>
            <Field label="Unit Type"><Input value={editing.unitType} onChange={(e) => setEditing({ ...editing, unitType: e.target.value })} /></Field>
            <Field label="Apt/Bed"><Input value={editing.aptBed} onChange={(e) => setEditing({ ...editing, aptBed: e.target.value })} /></Field>
            <Field label="Lease Type">
              <Select value={editing.leaseType} onChange={(e) => setEditing({ ...editing, leaseType: e.target.value })}>
                {LEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Leasing Agent"><Input value={editing.leasingAgent} onChange={(e) => setEditing({ ...editing, leasingAgent: e.target.value })} /></Field>
            <Field label="Approved Date"><Input type="date" value={editing.approvedDate} onChange={(e) => setEditing({ ...editing, approvedDate: e.target.value })} /></Field>
            <Field label="Lease Start"><Input type="date" value={editing.leaseStart} onChange={(e) => setEditing({ ...editing, leaseStart: e.target.value })} /></Field>
            <Field label="Lease End"><Input type="date" value={editing.leaseEnd} onChange={(e) => setEditing({ ...editing, leaseEnd: e.target.value })} /></Field>
            <Field label="Monthly Base Rent"><Input type="number" step="0.01" value={editing.monthlyBaseRent} onChange={(e) => setEditing({ ...editing, monthlyBaseRent: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Liability Insurance"><Input type="number" step="0.01" value={editing.liabilityInsurance} onChange={(e) => setEditing({ ...editing, liabilityInsurance: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Security Deposit"><Input type="number" step="0.01" value={editing.securityDeposit} onChange={(e) => setEditing({ ...editing, securityDeposit: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Approval Method"><Input value={editing.approvalMethod} onChange={(e) => setEditing({ ...editing, approvalMethod: e.target.value })} /></Field>
            <Field label="GUA Lease Signed"><Input value={editing.guaLeaseSigned} onChange={(e) => setEditing({ ...editing, guaLeaseSigned: e.target.value })} /></Field>
            <Field label="Pay Stubs or W2 in Entrata"><Input value={editing.payStubsOrW2} onChange={(e) => setEditing({ ...editing, payStubsOrW2: e.target.value })} /></Field>
            <Field label="Commission Payout"><Input type="number" step="0.01" value={editing.commissionPayout} onChange={(e) => setEditing({ ...editing, commissionPayout: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Leasing TM"><Input value={editing.leasingTM} onChange={(e) => setEditing({ ...editing, leasingTM: e.target.value })} /></Field>
            <Field label="Date Paid"><Input type="date" value={editing.datePaid} onChange={(e) => setEditing({ ...editing, datePaid: e.target.value })} /></Field>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wide">Additional Fees</span>
                <Button
                  size="sm"
                  onClick={() => setEditing({ ...editing, additionalFees: [...editing.additionalFees, { label: '', amount: 0 }] })}
                >
                  + Add Fee
                </Button>
              </div>
              {editing.additionalFees.map((fee, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Fee label (e.g. Valet Trash)"
                    value={fee.label}
                    onChange={(e) => {
                      const fees = [...editing.additionalFees];
                      fees[i] = { ...fees[i], label: e.target.value };
                      setEditing({ ...editing, additionalFees: fees });
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={fee.amount}
                    onChange={(e) => {
                      const fees = [...editing.additionalFees];
                      fees[i] = { ...fees[i], amount: parseFloat(e.target.value) || 0 };
                      setEditing({ ...editing, additionalFees: fees });
                    }}
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setEditing({ ...editing, additionalFees: editing.additionalFees.filter((_, fi) => fi !== i) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
