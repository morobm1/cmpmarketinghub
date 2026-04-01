import type { BrandKit, Asset, EmailTemplate, EmailProject, EmailGlobalStyles } from '@/types';

// ============================================================
// Default data for fresh project state.
// All sample data has been removed for clean transfer.
// When connected to the production API, these will be
// populated from the backend.
// ============================================================

export const defaultGlobalStyles: EmailGlobalStyles = {
  bodyBackgroundColor: '#f1f5f9',
  contentBackgroundColor: '#ffffff',
  contentWidth: 600,
  fontFamily: 'Arial',
  fontFallback: 'Helvetica, sans-serif',
  defaultTextColor: '#333333',
  defaultLinkColor: '#2563eb',
  defaultFontSize: 16,
};

// Import template library
import { templateLibrary } from '@/templates/templateLibrary';

// Empty collections - to be populated via API or user creation
export const mockAssets: Asset[] = [];
export const mockBrandKits: BrandKit[] = [];
export const mockTemplates: EmailTemplate[] = [...templateLibrary];
export const mockProjects: EmailProject[] = [];
