import React from 'react';
import type { TabKey } from '../types';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leases', label: 'Lease Registry' },
  { key: 'tiers', label: 'Rate & Tier Tracker' },
  { key: 'renewals', label: 'Renewal Follow-Up' },
  { key: 'goals', label: 'Goals & Actuals' },
  { key: 'relets', label: 'Resident Relets' },
  { key: 'import', label: 'Import Data' },
  { key: 'settings', label: 'Settings' },
];

export function TabNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="bg-white border-b border-surface-200 sticky top-[64px] z-30">
      <div className="max-w-[1600px] mx-auto px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active === t.key ? 'text-brand-primary border-brand-primary' : 'text-surface-500 border-transparent hover:text-surface-900 hover:bg-surface-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
