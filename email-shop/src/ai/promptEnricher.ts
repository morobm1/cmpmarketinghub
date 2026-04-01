import type { AIGenerationRequest, AIEnrichedRequest } from '@/types/ai';
import type { BrandKit, Asset, EmailBlockType } from '@/types';
import { blockRegistry } from '@/blocks/registry';

/**
 * Enriches a user's AI generation request with brand context,
 * available assets, and system instructions before sending to the AI provider.
 */
export function enrichRequest(
  request: AIGenerationRequest,
  brandKit: BrandKit | null,
  assets: Asset[],
): AIEnrichedRequest {
  const blockTypesAvailable: EmailBlockType[] = blockRegistry.map((b) => b.type);

  const emailConstraints = [
    'Output must be structured as JSON blocks matching the email block schema.',
    'All images must use URL references, not embedded data.',
    'Generated HTML will use table-based layout for email client compatibility.',
    'Avoid JavaScript, iframes, or advanced CSS in content.',
    'Keep text concise and scannable for email reading.',
    'Use inline-friendly styles only.',
    'CTA buttons should have clear, actionable text.',
    'Alt text is required for all images.',
    'Content width is 600px maximum.',
    'Use email-safe fonts: Arial, Helvetica, Georgia, Times New Roman, Verdana.',
  ];

  const systemPrompt = buildSystemPrompt(request, brandKit, assets, blockTypesAvailable, emailConstraints);

  return {
    ...request,
    brandKit,
    availableAssets: assets,
    systemPrompt,
    blockTypesAvailable,
    emailConstraints,
  };
}

function buildSystemPrompt(
  request: AIGenerationRequest,
  brandKit: BrandKit | null,
  assets: Asset[],
  blockTypes: EmailBlockType[],
  constraints: string[],
): string {
  const parts: string[] = [];

  parts.push(`You are an expert email marketing copywriter for student housing and apartment communities.`);
  parts.push(`Generate a structured email draft as JSON using the provided block schema.`);
  parts.push('');

  // Email context
  parts.push(`## Email Details`);
  parts.push(`- Type: ${request.emailType}`);
  parts.push(`- Audience: ${request.audience}${request.customAudience ? ` (${request.customAudience})` : ''}`);
  parts.push(`- Tone: ${request.tone}`);
  parts.push(`- Urgency: ${request.urgencyLevel}`);
  if (request.ctaPreference) parts.push(`- CTA preference: ${request.ctaPreference}`);
  parts.push('');

  // Brand context
  if (brandKit) {
    parts.push(`## Brand Kit: ${brandKit.propertyName}`);
    parts.push(`- Primary colors: ${brandKit.colors.map((c) => `${c.name} (${c.hex})`).join(', ')}`);
    if (brandKit.fonts.length > 0) {
      parts.push(`- Fonts: ${brandKit.fonts.map((f) => f.family).join(', ')}`);
    }
    if (brandKit.contactInfo) {
      const ci = brandKit.contactInfo;
      if (ci.phone) parts.push(`- Phone: ${ci.phone}`);
      if (ci.email) parts.push(`- Email: ${ci.email}`);
      if (ci.address) parts.push(`- Address: ${ci.address}`);
      if (ci.website) parts.push(`- Website: ${ci.website}`);
    }
    if (brandKit.logos.length > 0) {
      parts.push(`- Logo available: ${brandKit.logos[0]?.sourceUrl}`);
    }
    if (brandKit.buttonStyles.length > 0) {
      const btn = brandKit.buttonStyles[0]!;
      parts.push(`- Primary button style: bg=${btn.backgroundColor}, text=${btn.textColor}, radius=${btn.borderRadius}px`);
    }
    parts.push('');
  }

  // Available assets
  if (assets.length > 0) {
    parts.push(`## Available Assets`);
    const grouped: Record<string, Asset[]> = {};
    for (const a of assets) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category]!.push(a);
    }
    for (const [cat, items] of Object.entries(grouped)) {
      parts.push(`- ${cat}: ${items.map((a) => `"${a.name}" (${a.sourceUrl})`).join(', ')}`);
    }
    parts.push('');
  }

  // Content toggles
  parts.push(`## Requested Sections`);
  const toggles = request.contentToggles;
  if (toggles.includeLogoHeader) parts.push('- Include logo header');
  if (toggles.includeHeroImage) parts.push('- Include hero image');
  if (toggles.includeCtaButton) parts.push('- Include CTA button');
  if (toggles.includeFloorplanSection) parts.push('- Include floorplan spotlight');
  if (toggles.includeAmenitiesSection) parts.push('- Include amenities section');
  if (toggles.includePromoBanner) parts.push('- Include promo banner');
  if (toggles.includeTestimonial) parts.push('- Include testimonial');
  if (toggles.includeContactBlock) parts.push('- Include contact block');
  if (toggles.includeSocialLinks) parts.push('- Include social links');
  if (toggles.includeFooter) parts.push('- Include footer');
  parts.push('');

  // Block types
  parts.push(`## Available Block Types`);
  parts.push(blockTypes.join(', '));
  parts.push('');

  // Constraints
  parts.push(`## Email Constraints`);
  constraints.forEach((c) => parts.push(`- ${c}`));
  parts.push('');

  // User prompt
  parts.push(`## User Request`);
  parts.push(request.prompt);
  if (request.additionalContext) {
    parts.push('');
    parts.push(`Additional context: ${request.additionalContext}`);
  }

  return parts.join('\n');
}
