import { create } from 'zustand';
import type {
  EmailBlock,
  EmailBlockType,
  EmailGlobalStyles,
  EditorView,
  PreviewMode,
  SidebarTab,
  ID,
  BrandKit,
  Asset,
  EmailProject,
  EmailTemplate,
  BlockDataMap,
} from '@/types';
import type {
  AIGenerationStatus,
  AIGenerationRequest,
  AIGenerationResult,
} from '@/types/ai';
import { blockDefaults } from '@/blocks/defaults';
import { defaultGlobalStyles } from '@/services/mockData';
import { templateService } from '@/services/templateService';
import { emailProjectService } from '@/services/emailProjectService';

// ---- History for undo/redo ----
interface HistoryEntry {
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
}

interface EditorStore {
  // ---- Project state ----
  projectId: ID | null;
  projectName: string;
  propertyId: ID;
  propertyName: string;
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
  isDirty: boolean;

  // ---- UI state ----
  currentView: EditorView;
  selectedBlockId: ID | null;
  previewMode: PreviewMode;
  sidebarTab: SidebarTab;
  isDragging: boolean;
  showHtmlPreview: boolean;
  showExportModal: boolean;
  showGuidedMode: boolean;

  // ---- Data caches ----
  brandKits: BrandKit[];
  activeBrandKit: BrandKit | null;
  assets: Asset[];
  templates: EmailTemplate[];
  projects: EmailProject[];

  // ---- History ----
  history: HistoryEntry[];
  historyIndex: number;

  // ---- Actions: Project ----
  setProject: (project: Partial<EmailProject>) => void;
  newProject: (propertyId: ID, propertyName: string) => void;

  // ---- Actions: Blocks ----
  addBlock: (type: EmailBlockType, index?: number) => void;
  removeBlock: (id: ID) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  updateBlockData: <T extends EmailBlockType>(id: ID, data: Partial<BlockDataMap[T]>) => void;
  duplicateBlock: (id: ID) => void;
  selectBlock: (id: ID | null) => void;
  reorderBlocks: (newBlocks: EmailBlock[]) => void;

  // ---- Actions: Global styles ----
  updateGlobalStyles: (styles: Partial<EmailGlobalStyles>) => void;

  // ---- Actions: UI ----
  setView: (view: EditorView) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setDragging: (dragging: boolean) => void;
  setShowHtmlPreview: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowGuidedMode: (show: boolean) => void;

  // ---- Actions: Data ----
  setBrandKits: (kits: BrandKit[]) => void;
  setActiveBrandKit: (kit: BrandKit | null) => void;
  addBrandKit: (kit: BrandKit) => void;
  updateBrandKit: (kit: BrandKit) => void;
  deleteBrandKit: (id: ID) => void;
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: ID) => void;
  setTemplates: (templates: EmailTemplate[]) => void;
  setProjects: (projects: EmailProject[]) => void;
  saveAsTemplate: (name: string, description: string, category: string) => void;
  rebrandDraft: () => void;

  // ---- Actions: History ----
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;

  // ---- AI Generation State ----
  aiStatus: AIGenerationStatus;
  aiRequest: AIGenerationRequest | null;
  aiResult: AIGenerationResult | null;
  aiSelectedSubjectLine: string | null;
  aiSelectedPreviewText: string | null;
  showAIPanel: boolean;

  // ---- Actions: AI ----
  setAIStatus: (status: AIGenerationStatus) => void;
  setAIRequest: (request: AIGenerationRequest | null) => void;
  setAIResult: (result: AIGenerationResult | null) => void;
  setAISelectedSubjectLine: (line: string | null) => void;
  setAISelectedPreviewText: (text: string | null) => void;
  setShowAIPanel: (show: boolean) => void;
  applyAIResult: () => void;
  resetAI: () => void;
}

const MAX_HISTORY = 50;

export const useEditorStore = create<EditorStore>((set, get) => ({
  // ---- Initial project state ----
  projectId: null,
  projectName: 'Untitled Email',
  propertyId: '',
  propertyName: '',
  blocks: [],
  globalStyles: { ...defaultGlobalStyles },
  isDirty: false,

  // ---- Initial UI state ----
  currentView: 'builder',
  selectedBlockId: null,
  previewMode: 'desktop',
  sidebarTab: 'blocks',
  isDragging: false,
  showHtmlPreview: false,
  showExportModal: false,
  showGuidedMode: false,

  // ---- Initial data caches ----
  brandKits: [],
  activeBrandKit: null,
  assets: [],
  templates: [],
  projects: [],

  // ---- History ----
  history: [],
  historyIndex: -1,

  // ---- Project actions ----
  setProject: (project) =>
    set((state) => ({
      ...state,
      projectId: project.id ?? state.projectId,
      projectName: project.name ?? state.projectName,
      propertyId: project.propertyId ?? state.propertyId,
      propertyName: project.propertyName ?? state.propertyName,
      blocks: project.blocks ?? state.blocks,
      globalStyles: project.globalStyles ?? state.globalStyles,
    })),

  newProject: (propertyId, propertyName) =>
    set({
      projectId: null,
      projectName: 'Untitled Email',
      propertyId,
      propertyName,
      blocks: [],
      globalStyles: { ...defaultGlobalStyles },
      isDirty: false,
      selectedBlockId: null,
      history: [],
      historyIndex: -1,
    }),

  // ---- Block actions ----
  addBlock: (type, index) => {
    const state = get();
    state.pushHistory();
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      data: JSON.parse(JSON.stringify(blockDefaults[type])),
    };
    const blocks = [...state.blocks];
    if (index !== undefined && index >= 0) {
      blocks.splice(index, 0, newBlock);
    } else {
      blocks.push(newBlock);
    }
    set({ blocks, isDirty: true, selectedBlockId: newBlock.id });
  },

  removeBlock: (id) => {
    const state = get();
    state.pushHistory();
    set({
      blocks: state.blocks.filter((b) => b.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
      isDirty: true,
    });
  },

  moveBlock: (fromIndex, toIndex) => {
    const state = get();
    state.pushHistory();
    const blocks = [...state.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    if (moved) {
      blocks.splice(toIndex, 0, moved);
      set({ blocks, isDirty: true });
    }
  },

  updateBlockData: (id, data) => {
    const state = get();
    set({
      blocks: state.blocks.map((b) =>
        b.id === id ? { ...b, data: { ...b.data, ...data } as typeof b.data } : b,
      ),
      isDirty: true,
    });
  },

  duplicateBlock: (id) => {
    const state = get();
    state.pushHistory();
    const idx = state.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const original = state.blocks[idx]!;
    const dup: EmailBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    const blocks = [...state.blocks];
    blocks.splice(idx + 1, 0, dup);
    set({ blocks, isDirty: true, selectedBlockId: dup.id });
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  reorderBlocks: (newBlocks) => {
    const state = get();
    state.pushHistory();
    set({ blocks: newBlocks, isDirty: true });
  },

  // ---- Global styles ----
  updateGlobalStyles: (styles) =>
    set((state) => ({
      globalStyles: { ...state.globalStyles, ...styles },
      isDirty: true,
    })),

  // ---- UI actions ----
  setView: (view) => set({ currentView: view, selectedBlockId: null }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  setShowHtmlPreview: (show) => set({ showHtmlPreview: show }),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setShowGuidedMode: (show) => set({ showGuidedMode: show }),

  // ---- Data actions ----
  setBrandKits: (kits) => set({ brandKits: kits }),
  setActiveBrandKit: (kit) => set({ activeBrandKit: kit }),
  addBrandKit: (kit) => set((state) => ({ brandKits: [...state.brandKits, kit] })),
  updateBrandKit: (kit) => set((state) => ({
    brandKits: state.brandKits.map((k) => k.id === kit.id ? kit : k),
    activeBrandKit: state.activeBrandKit?.id === kit.id ? kit : state.activeBrandKit,
  })),
  deleteBrandKit: (id) => set((state) => ({
    brandKits: state.brandKits.filter((k) => k.id !== id),
    activeBrandKit: state.activeBrandKit?.id === id ? null : state.activeBrandKit,
  })),
  setAssets: (assets) => set({ assets }),
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  updateAsset: (asset) => set((state) => ({
    assets: state.assets.map((a) => a.id === asset.id ? asset : a),
  })),
  deleteAsset: (id) => set((state) => ({
    assets: state.assets.filter((a) => a.id !== id),
  })),
  setTemplates: (templates) => set({ templates }),
  setProjects: (projects) => set({ projects }),

  saveAsTemplate: (name, description, category) => {
    const state = get();
    const now = new Date().toISOString();
    const template: EmailTemplate = {
      id: 'tmpl-user-' + Date.now(),
      name,
      description,
      category,
      propertyId: state.propertyId || undefined,
      blocks: JSON.parse(JSON.stringify(state.blocks)),
      globalStyles: { ...state.globalStyles },
      createdAt: now,
      updatedAt: now,
      isDefault: false,
    };
    // Optimistically add to store, then persist to API
    set((s) => ({ templates: [...s.templates, template] }));
    templateService.save(template).catch((err) => {
      console.error('Failed to save template to API:', err);
    });
  },

  rebrandDraft: () => {
    const state = get();
    const kit = state.activeBrandKit;
    if (!kit) return;

    state.pushHistory();

    const primary = kit.colors[0]?.hex;
    const secondary = kit.colors[1]?.hex;
    const accent = kit.colors[2]?.hex;
    const firstLogo = kit.logos[0];
    const firstBtnStyle = kit.buttonStyles[0];
    const heroImg = kit.images.find((img) =>
      img.tags.some((t) => ['building', 'exterior', 'hero'].includes(t.toLowerCase()))
    ) || kit.images[0];

    const blocks = JSON.parse(JSON.stringify(state.blocks)) as EmailBlock[];

    blocks.forEach((block) => {
      const d = block.data as Record<string, any>;

      switch (block.type) {
        case 'header':
          if (firstLogo) {
            d.logoUrl = firstLogo.sourceUrl;
            d.logoAlt = firstLogo.altText || firstLogo.name;
          }
          if (primary) {
            d.backgroundColor = primary;
            d.style.backgroundColor = primary;
          }
          break;

        case 'logo':
          if (firstLogo) {
            d.imageUrl = firstLogo.sourceUrl;
            d.altText = firstLogo.altText || firstLogo.name;
          }
          break;

        case 'hero-image':
          if (heroImg) {
            d.imageUrl = heroImg.sourceUrl;
            d.altText = heroImg.altText || heroImg.name;
          }
          break;

        case 'text':
          if (d.style.textColor && primary) {
            // Only rebrand colored headings (large/bold text), not body text
            if (d.fontSize >= 20 || d.fontWeight >= 700) {
              d.style.textColor = primary;
            }
          }
          break;

        case 'button':
          if (firstBtnStyle) {
            d.backgroundColor = firstBtnStyle.backgroundColor;
            d.textColor = firstBtnStyle.textColor;
            d.borderRadius = firstBtnStyle.borderRadius;
            d.fontSize = firstBtnStyle.fontSize;
            d.fontWeight = firstBtnStyle.fontWeight;
            d.paddingX = firstBtnStyle.paddingX;
            d.paddingY = firstBtnStyle.paddingY;
          } else if (primary) {
            d.backgroundColor = primary;
          }
          break;

        case 'promo-banner':
          if (primary) d.backgroundColor = primary;
          if (accent) d.textColor = accent;
          break;

        case 'color-bar':
          if (primary) d.color = primary;
          break;

        case 'branded-header':
          if (firstLogo) {
            d.logoUrl = firstLogo.sourceUrl;
            d.logoAlt = firstLogo.altText || firstLogo.name;
          }
          if (heroImg) d.backgroundImageUrl = heroImg.sourceUrl;
          break;

        case 'footer':
          if (kit.contactInfo) {
            if (kit.contactInfo.phone) d.phone = kit.contactInfo.phone;
            if (kit.contactInfo.email) d.email = kit.contactInfo.email;
            if (kit.contactInfo.address) d.address = kit.contactInfo.address;
            if (kit.contactInfo.website) d.website = kit.contactInfo.website;
          }
          d.companyName = kit.propertyName || d.companyName;
          if (primary) d.style.backgroundColor = primary;
          break;

        case 'amenities':
          if (secondary) d.style.backgroundColor = secondary;
          break;

        case 'image-text': {
          // Try to match image by heading keywords to tags
          const heading = (d.heading || '').toLowerCase();
          const match = kit.images.find((img) =>
            img.tags.some((t) => heading.includes(t.toLowerCase()))
          );
          if (match) {
            d.imageUrl = match.sourceUrl;
            d.imageAlt = match.altText || match.name;
          }
          break;
        }
      }
    });

    // Update global styles with brand fonts
    const globalStyles = { ...state.globalStyles };
    if (kit.fonts[0]) {
      globalStyles.fontFamily = kit.fonts[0].family;
      globalStyles.fontFallback = kit.fonts[0].fallback;
    }
    if (primary) globalStyles.defaultLinkColor = primary;

    set({ blocks, globalStyles, isDirty: true });
  },

  // ---- History actions ----
  pushHistory: () => {
    const state = get();
    const entry: HistoryEntry = {
      blocks: JSON.parse(JSON.stringify(state.blocks)),
      globalStyles: { ...state.globalStyles },
    };
    const history = state.history.slice(0, state.historyIndex + 1);
    history.push(entry);
    if (history.length > MAX_HISTORY) history.shift();
    set({ history, historyIndex: history.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return;
    const entry = state.history[state.historyIndex];
    if (!entry) return;
    set({
      blocks: JSON.parse(JSON.stringify(entry.blocks)),
      globalStyles: { ...entry.globalStyles },
      historyIndex: state.historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const entry = state.history[state.historyIndex + 2];
    if (!entry) {
      // Redo to the current state after the last undo
      const next = state.history[state.historyIndex + 1];
      if (next) {
        set({
          blocks: JSON.parse(JSON.stringify(next.blocks)),
          globalStyles: { ...next.globalStyles },
          historyIndex: state.historyIndex + 1,
          isDirty: true,
        });
      }
      return;
    }
    set({
      blocks: JSON.parse(JSON.stringify(entry.blocks)),
      globalStyles: { ...entry.globalStyles },
      historyIndex: state.historyIndex + 2,
      isDirty: true,
    });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ---- AI Generation state ----
  aiStatus: 'idle' as AIGenerationStatus,
  aiRequest: null,
  aiResult: null,
  aiSelectedSubjectLine: null,
  aiSelectedPreviewText: null,
  showAIPanel: false,

  // ---- AI actions ----
  setAIStatus: (status) => set({ aiStatus: status }),
  setAIRequest: (request) => set({ aiRequest: request }),
  setAIResult: (result) => set({ aiResult: result }),
  setAISelectedSubjectLine: (line) => set({ aiSelectedSubjectLine: line }),
  setAISelectedPreviewText: (text) => set({ aiSelectedPreviewText: text }),
  setShowAIPanel: (show) => set({ showAIPanel: show }),

  applyAIResult: () => {
    const state = get();
    if (!state.aiResult?.parsedBlocks) return;
    state.pushHistory();
    set({
      blocks: state.aiResult.parsedBlocks,
      isDirty: true,
      aiStatus: 'idle',
      showAIPanel: false,
      currentView: 'builder',
    });
  },

  resetAI: () => set({
    aiStatus: 'idle',
    aiRequest: null,
    aiResult: null,
    aiSelectedSubjectLine: null,
    aiSelectedPreviewText: null,
  }),
}));
