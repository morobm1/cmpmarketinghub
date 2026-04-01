// ============================================================
// AI Email Generation Types
// ============================================================

import type { EmailBlock, EmailBlockType, EmailGlobalStyles, ID, BrandKit, Asset } from './index';

// ---- Email Generation Request Types ----

export type AIEmailType =
  | 'resident-communication'
  | 'marketing-leasing'
  | 'renewal-reminder'
  | 'renewal-urgency'
  | 'event-promotion'
  | 'rate-drop-special'
  | 'maintenance-notice'
  | 'move-in-communication'
  | 'waitlist-communication'
  | 'announcement'
  | 'custom';

export type AIAudience =
  | 'current-residents'
  | 'prospects'
  | 'guarantors'
  | 'waitlist-prospects'
  | 'renewals'
  | 'student-audience'
  | 'parents'
  | 'custom';

export type AITone =
  | 'polished-professional'
  | 'upbeat-marketing'
  | 'urgent-professional'
  | 'warm-resident-friendly'
  | 'luxury-elevated'
  | 'concise-operational';

export type AIUrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AIContentToggles {
  includeHeroImage: boolean;
  includeLogoHeader: boolean;
  includeCtaButton: boolean;
  includeFloorplanSection: boolean;
  includeAmenitiesSection: boolean;
  includeFooter: boolean;
  includeContactBlock: boolean;
  includeSocialLinks: boolean;
  includeTestimonial: boolean;
  includePromoBanner: boolean;
}

export interface AIGenerationRequest {
  propertyId: ID;
  emailType: AIEmailType;
  audience: AIAudience;
  prompt: string;
  tone: AITone;
  urgencyLevel: AIUrgencyLevel;
  ctaPreference?: string;
  contentToggles: AIContentToggles;
  customAudience?: string;
  additionalContext?: string;
}

// ---- Enriched Request (after brand kit context injection) ----

export interface AIEnrichedRequest extends AIGenerationRequest {
  brandKit: BrandKit | null;
  availableAssets: Asset[];
  systemPrompt: string;
  blockTypesAvailable: EmailBlockType[];
  emailConstraints: string[];
}

// ---- AI Generation Response Types ----

export interface AIGeneratedBlock {
  type: EmailBlockType;
  data: Record<string, unknown>;
}

export interface AIGenerationResponse {
  subjectLines: string[];
  previewTexts: string[];
  emailTitle: string;
  emailSummary: string;
  blocks: AIGeneratedBlock[];
  recommendedAssets: Array<{
    blockIndex: number;
    assetCategory: string;
    suggestion: string;
  }>;
  warnings: string[];
  generationMetadata: {
    provider: string;
    model?: string;
    tokensUsed?: number;
    generatedAt: string;
    promptHash?: string;
  };
}

// ---- Validated/Parsed Result ----

export interface AIGenerationResult {
  success: boolean;
  response?: AIGenerationResponse;
  parsedBlocks?: EmailBlock[];
  error?: string;
  validationWarnings: string[];
}

// ---- Regeneration Actions ----

export type AIRegenerateAction =
  | 'regenerate-full'
  | 'regenerate-section'
  | 'rewrite-copy'
  | 'make-urgent'
  | 'make-concise'
  | 'make-marketing'
  | 'make-resident-friendly';

export interface AIRegenerateRequest {
  action: AIRegenerateAction;
  originalRequest: AIGenerationRequest;
  targetBlockId?: ID;
  currentBlocks: EmailBlock[];
}

// ---- AI Provider Interface ----

export interface IAIEmailProvider {
  name: string;
  generate(request: AIEnrichedRequest): Promise<AIGenerationResponse>;
  regenerate?(request: AIRegenerateRequest & { brandKit: BrandKit | null }): Promise<AIGenerationResponse>;
  isAvailable(): Promise<boolean>;
}

// ---- Generation State for Store ----

export type AIGenerationStatus = 'idle' | 'configuring' | 'generating' | 'reviewing' | 'error';

export interface AIGenerationState {
  status: AIGenerationStatus;
  request: AIGenerationRequest | null;
  result: AIGenerationResult | null;
  selectedSubjectLine: string | null;
  selectedPreviewText: string | null;
  generationHistory: Array<{
    id: string;
    request: AIGenerationRequest;
    result: AIGenerationResult;
    timestamp: string;
  }>;
  showAIPanel: boolean;
}

// ---- UI Helpers ----

export interface AIEmailTypeOption {
  value: AIEmailType;
  label: string;
  description: string;
  icon: string;
}

export interface AIToneOption {
  value: AITone;
  label: string;
  description: string;
}

export interface AIAudienceOption {
  value: AIAudience;
  label: string;
}

export interface AIExamplePrompt {
  label: string;
  prompt: string;
  emailType: AIEmailType;
  audience: AIAudience;
  tone: AITone;
}
