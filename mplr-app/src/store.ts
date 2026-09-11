import { create } from 'zustand';
import type { CurrentUser, GoalWeek, Lease, MPLRData, RateTiers, Relet, RenewalFollowUp, TabKey } from './types';
import { emptyMPLRData } from './types';
import {
  deleteMPLRData,
  fetchCurrentUser,
  fetchProperties,
  getAccessibleProperties,
  loadMPLRData,
  saveMPLRData,
} from './lib/api';

interface MPLRStore {
  // auth / property selection
  user: CurrentUser | null;
  allProperties: string[];
  accessibleProperties: string[];
  currentProperty: string;
  isAdmin: boolean;

  // data
  data: MPLRData;
  loading: boolean;
  saving: boolean;
  error: string | null;
  activeTab: TabKey;

  init: () => Promise<void>;
  setActiveTab: (tab: TabKey) => void;
  setProperty: (property: string) => Promise<void>;
  refresh: () => Promise<void>;

  saveTotalBeds: (totalBeds: number) => Promise<void>;
  saveLeases: (leases: Lease[]) => Promise<void>;
  saveRateTiers: (rateTiers: RateTiers) => Promise<void>;
  saveRenewals: (renewals: RenewalFollowUp[]) => Promise<void>;
  saveGoals: (goals: GoalWeek[]) => Promise<void>;
  saveRelets: (relets: Relet[]) => Promise<void>;
  saveAll: (partial: Partial<MPLRData>) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useMPLRStore = create<MPLRStore>((set, get) => ({
  user: null,
  allProperties: [],
  accessibleProperties: [],
  currentProperty: '',
  isAdmin: false,
  data: emptyMPLRData(''),
  loading: true,
  saving: false,
  error: null,
  activeTab: 'dashboard',

  init: async () => {
    set({ loading: true, error: null });
    try {
      const user = await fetchCurrentUser();
      const all = await fetchProperties();
      const accessible = getAccessibleProperties(user, all);
      const stored = localStorage.getItem('mplr_current_property');
      const currentProperty = (stored && accessible.includes(stored) ? stored : accessible[0]) || '';
      set({ user, allProperties: all, accessibleProperties: accessible, isAdmin: user.role === 'admin', currentProperty });
      if (currentProperty) {
        const data = await loadMPLRData(currentProperty);
        set({ data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to initialize', loading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setProperty: async (property) => {
    localStorage.setItem('mplr_current_property', property);
    set({ currentProperty: property, loading: true });
    try {
      const data = await loadMPLRData(property);
      set({ data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to load property data', loading: false });
    }
  },

  refresh: async () => {
    const { currentProperty } = get();
    if (!currentProperty) return;
    set({ loading: true });
    const data = await loadMPLRData(currentProperty);
    set({ data, loading: false });
  },

  saveAll: async (partial) => {
    const { currentProperty, data } = get();
    if (!currentProperty) return;
    const nextData = { ...data, ...partial };
    set({ data: nextData, saving: true });
    try {
      await saveMPLRData(currentProperty, partial);
    } finally {
      set({ saving: false });
    }
  },

  saveTotalBeds: async (totalBeds) => get().saveAll({ totalBeds }),
  saveLeases: async (leases) => get().saveAll({ leases }),
  saveRateTiers: async (rateTiers) => get().saveAll({ rateTiers }),
  saveRenewals: async (renewals) => get().saveAll({ renewals }),
  saveGoals: async (goals) => get().saveAll({ goals }),
  saveRelets: async (relets) => get().saveAll({ relets }),

  clearAllData: async () => {
    const { currentProperty } = get();
    if (!currentProperty) return;
    await deleteMPLRData(currentProperty);
    set({ data: emptyMPLRData(currentProperty) });
  },
}));
