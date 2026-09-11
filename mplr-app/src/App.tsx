import React, { useEffect } from 'react';
import { useMPLRStore } from './store';
import { TabNav } from './components/TabNav';
import { logout } from './lib/api';
import { DashboardTab } from './tabs/DashboardTab';
import { LeaseRegistryTab } from './tabs/LeaseRegistryTab';
import { TierTrackerTab } from './tabs/TierTrackerTab';
import { RenewalsTab } from './tabs/RenewalsTab';
import { GoalsTab } from './tabs/GoalsTab';
import { ReletsTab } from './tabs/ReletsTab';
import { ImportTab } from './tabs/ImportTab';
import { SettingsTab } from './tabs/SettingsTab';

export default function App() {
  const { init, loading, error, user, accessibleProperties, currentProperty, setProperty, activeTab, setActiveTab, saving } = useMPLRStore();

  useEffect(() => {
    init();
  }, []);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-400 text-base">Loading MPLR...</div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <header className="h-16 px-6 border-b border-surface-200 bg-white flex items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img src="/logo-main.svg" className="h-7 w-auto" alt="Capstone" />
          <span className="text-brand-accent font-bold text-2xl" style={{ fontFamily: 'zooja-pro, Arial, sans-serif' }}>
            MPLR
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {saving && <span className="text-xs text-surface-400">Saving…</span>}
          <select
            value={currentProperty}
            onChange={(e) => setProperty(e.target.value)}
            className="min-w-[220px] px-3 py-2 rounded-lg border border-surface-200 bg-white text-[13px]"
          >
            {accessibleProperties.length === 0 && <option value="">No properties</option>}
            {accessibleProperties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {user?.role === 'admin' && (
            <button
              onClick={() => (window.location.href = 'mmp_admin.html')}
              className="px-3.5 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold hover:bg-surface-50"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => logout().then(() => (window.location.href = 'index.html'))}
            className="px-3.5 py-2 rounded-lg border border-surface-200 bg-white text-[13px] font-semibold hover:bg-surface-50"
          >
            Logout
          </button>
        </div>
      </header>

      <TabNav active={activeTab} onChange={setActiveTab} />

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
        )}
        {!currentProperty ? (
          <div className="p-10 text-center text-surface-400">No accessible properties. Contact an admin.</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'leases' && <LeaseRegistryTab />}
            {activeTab === 'tiers' && <TierTrackerTab />}
            {activeTab === 'renewals' && <RenewalsTab />}
            {activeTab === 'goals' && <GoalsTab />}
            {activeTab === 'relets' && <ReletsTab />}
            {activeTab === 'import' && <ImportTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </main>
    </div>
  );
}
