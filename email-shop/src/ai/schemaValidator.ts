import type { AIGeneratedBlock, AIGenerationResponse } from '@/types/ai';
import type { EmailBlock, EmailBlockType } from '@/types';
import { blockDefaults } from '@/blocks/defaults';
import { blockRegistry } from '@/blocks/registry';

const validBlockTypes = new Set<string>(blockRegistry.map((b) => b.type));

/**
 * Validates an AI-generated block and merges with defaults to ensure completeness.
 * Returns a fully-formed EmailBlock or null if invalid.
 */
export function validateAndParseBlock(generated: AIGeneratedBlock, index: number): EmailBlock | null {
  if (!generated.type || !validBlockTypes.has(generated.type)) {
    console.warn('[AI Schema] Invalid block type at index ' + index + ': ' + generated.type);
    return null;
  }

  const blockType = generated.type as EmailBlockType;
  const defaults = blockDefaults[blockType];

  if (!defaults) {
    console.warn('[AI Schema] No defaults for block type: ' + blockType);
    return null;
  }

  // Deep merge generated data with defaults to fill missing fields
  const mergedData = deepMerge(JSON.parse(JSON.stringify(defaults)), generated.data || {});

  // Ensure style object exists
  if (!mergedData.style) {
    mergedData.style = { ...defaults.style };
  }

  // Ensure visible is set
  if (typeof mergedData.visible !== 'boolean') {
    mergedData.visible = true;
  }

  const id = 'ai-block-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + index;

  return {
    id,
    type: blockType,
    data: mergedData as any,
  };
}

/**
 * Validates the full AI response and converts blocks to EmailBlock[].
 */
export function validateAIResponse(response: AIGenerationResponse): {
  blocks: EmailBlock[];
  warnings: string[];
} {
  const warnings: string[] = [...(response.warnings || [])];
  const blocks: EmailBlock[] = [];

  if (!response.blocks || !Array.isArray(response.blocks)) {
    warnings.push('AI response contained no blocks array.');
    return { blocks, warnings };
  }

  for (let i = 0; i < response.blocks.length; i++) {
    const raw = response.blocks[i];
    if (!raw) continue;
    const parsed = validateAndParseBlock(raw, i);
    if (parsed) {
      blocks.push(parsed);
    } else {
      warnings.push('Block at index ' + i + ' was invalid and was skipped.');
    }
  }

  // Validation checks
  if (!response.subjectLines || response.subjectLines.length === 0) {
    warnings.push('No subject lines were generated.');
  }
  if (!response.previewTexts || response.previewTexts.length === 0) {
    warnings.push('No preview texts were generated.');
  }
  if (blocks.length === 0) {
    warnings.push('No valid blocks were generated. Try regenerating.');
  }

  // Check for missing image URLs
  blocks.forEach((block, idx) => {
    const data = block.data as unknown as Record<string, unknown>;
    if (block.type === 'hero-image' && !data.imageUrl) {
      warnings.push('Hero image block (position ' + (idx + 1) + ') has no image URL.');
    }
    if (block.type === 'logo' && !data.imageUrl) {
      warnings.push('Logo block (position ' + (idx + 1) + ') has no image URL.');
    }
    if (block.type === 'header' && !data.logoUrl) {
      warnings.push('Header block has no logo URL.');
    }
    if (block.type === 'button' && (!data.url || data.url === '#')) {
      warnings.push('Button "' + (data.label || 'Untitled') + '" has a placeholder URL.');
    }
  });

  return { blocks, warnings };
}

/** Simple deep merge: target gets overwritten by source values */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val !== null && val !== undefined) {
      if (typeof val === 'object' && !Array.isArray(val) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
