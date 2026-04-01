import type {
  IAIEmailProvider,
  AIGenerationRequest,
  AIGenerationResult,
  AIEnrichedRequest,
} from '@/types/ai';
import type { BrandKit, Asset } from '@/types';
import { MockAIEmailProvider } from './mockProvider';
import { enrichRequest } from './promptEnricher';
import { validateAIResponse } from './schemaValidator';

/**
 * AI Email Generation Service
 *
 * Orchestrates the full AI email generation pipeline:
 * 1. Enrich user request with brand context
 * 2. Send to AI provider
 * 3. Validate and parse response
 * 4. Return structured result for the builder
 *
 * Provider is swappable via setProvider().
 */
class AIEmailGenerationService {
  private provider: IAIEmailProvider;

  constructor() {
    // Default to mock provider for development
    this.provider = new MockAIEmailProvider();
  }

  /** Swap the AI provider (e.g., for production API) */
  setProvider(provider: IAIEmailProvider): void {
    this.provider = provider;
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Generate an email draft from a user request.
   */
  async generate(
    request: AIGenerationRequest,
    brandKit: BrandKit | null,
    assets: Asset[],
  ): Promise<AIGenerationResult> {
    try {
      // Step 1: Enrich request with brand context
      const enriched: AIEnrichedRequest = enrichRequest(request, brandKit, assets);

      // Step 2: Send to AI provider
      const response = await this.provider.generate(enriched);

      // Step 3: Validate and parse response
      const { blocks, warnings } = validateAIResponse(response);

      return {
        success: blocks.length > 0,
        response,
        parsedBlocks: blocks,
        validationWarnings: warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during AI generation';
      return {
        success: false,
        error: message,
        validationWarnings: ['Generation failed: ' + message],
      };
    }
  }
}

// Singleton instance
export const aiEmailGenerationService = new AIEmailGenerationService();
