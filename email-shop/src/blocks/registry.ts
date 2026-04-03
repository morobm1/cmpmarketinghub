import type { BlockDefinition, EmailBlockType } from '@/types';
import { blockDefaults } from './defaults';

/**
 * Block registry: defines all available email block types,
 * their labels, categories, icons, and default data.
 */
export const blockRegistry: BlockDefinition[] = [
  // Structure blocks
  {
    type: 'header',
    label: 'Header',
    icon: 'LayoutTemplate',
    category: 'structure',
    description: 'Email header with optional logo and preheader text',
    defaultData: blockDefaults['header'],
  },
  {
    type: 'footer',
    label: 'Footer',
    icon: 'PanelBottom',
    category: 'structure',
    description: 'Email footer with contact info, social links, and legal text',
    defaultData: blockDefaults['footer'],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: 'MoveVertical',
    category: 'structure',
    description: 'Vertical spacing between blocks',
    defaultData: blockDefaults['spacer'],
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'structure',
    description: 'Horizontal line divider',
    defaultData: blockDefaults['divider'],
  },

  // Content blocks
  {
    type: 'text',
    label: 'Text',
    icon: 'Type',
    category: 'content',
    description: 'Rich text content block',
    defaultData: blockDefaults['text'],
  },
  {
    type: 'button',
    label: 'Button',
    icon: 'RectangleHorizontal',
    category: 'content',
    description: 'Call-to-action button',
    defaultData: blockDefaults['button'],
  },
  {
    type: 'callout-box',
    label: 'Callout Box',
    icon: 'MessageSquare',
    category: 'content',
    description: 'Highlighted information box',
    defaultData: blockDefaults['callout-box'],
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: 'Quote',
    category: 'content',
    description: 'Resident testimonial or review',
    defaultData: blockDefaults['testimonial'],
  },

  // Media blocks
  {
    type: 'logo',
    label: 'Logo',
    icon: 'Image',
    category: 'media',
    description: 'Logo image block',
    defaultData: blockDefaults['logo'],
  },
  {
    type: 'hero-image',
    label: 'Hero Image',
    icon: 'ImagePlus',
    category: 'media',
    description: 'Full-width hero/banner image',
    defaultData: blockDefaults['hero-image'],
  },
  {
    type: 'social-links',
    label: 'Social Links',
    icon: 'Share2',
    category: 'media',
    description: 'Social media icon links',
    defaultData: blockDefaults['social-links'],
  },

  // Layout blocks
  {
    type: 'image-text',
    label: 'Image + Text',
    icon: 'LayoutList',
    category: 'layout',
    description: 'Side-by-side image and text section',
    defaultData: blockDefaults['image-text'],
  },
  {
    type: 'two-column',
    label: 'Two Columns',
    icon: 'Columns2',
    category: 'layout',
    description: 'Two-column content layout',
    defaultData: blockDefaults['two-column'],
  },

  // Property-specific blocks
  {
    type: 'amenities',
    label: 'Amenities',
    icon: 'Sparkles',
    category: 'property',
    description: 'Community amenities grid',
    defaultData: blockDefaults['amenities'],
  },
  {
    type: 'floorplan-spotlight',
    label: 'Floor Plan',
    icon: 'Grid2x2',
    category: 'property',
    description: 'Featured floor plan with details and pricing',
    defaultData: blockDefaults['floorplan-spotlight'],
  },
  {
    type: 'promo-banner',
    label: 'Promo Banner',
    icon: 'Megaphone',
    category: 'property',
    description: 'Promotional offer banner',
    defaultData: blockDefaults['promo-banner'],
  },

  // Visual / End blocks
  {
    type: 'color-bar',
    label: 'Color Bar',
    icon: 'RectangleHorizontal',
    category: 'structure',
    description: 'Simple colored bar to end an email section',
    defaultData: blockDefaults['color-bar'],
  },
  {
    type: 'branded-header',
    label: 'Branded Header ⚠️',
    icon: 'ImagePlus',
    category: 'media',
    description: 'Property image with color overlay and logo',
    defaultData: blockDefaults['branded-header'],
    entrataWarning: 'Uses background-image CSS which may not render in Outlook/Entrata. Consider using a Hero Image block instead.',
  },
  {
    type: 'virtual-tour',
    label: 'Virtual Tour ⚠️',
    icon: 'Grid2x2',
    category: 'property',
    description: 'Virtual tour link — NOT compatible with Entrata Message Center',
    defaultData: blockDefaults['virtual-tour'],
    entrataWarning: 'Embedded virtual tour previews do not work in Entrata Message Center or most email clients. The tour link will work, but the preview iframe will not render. Consider using a Hero Image block with a tour screenshot and a Button linking to the tour instead.',
  },

  // New content blocks — all Entrata-safe
  {
    type: 'image-gallery',
    label: 'Image Gallery',
    icon: 'LayoutGrid',
    category: 'media',
    description: 'Row of 2-3 images — great for property photos',
    defaultData: blockDefaults['image-gallery'],
  },
  {
    type: 'event-details',
    label: 'Event Details',
    icon: 'CalendarDays',
    category: 'content',
    description: 'Structured event card with date, time, location, and RSVP',
    defaultData: blockDefaults['event-details'],
  },
  {
    type: 'numbered-steps',
    label: 'Numbered Steps',
    icon: 'ListOrdered',
    category: 'content',
    description: 'Numbered step-by-step process (move-in, apply, etc.)',
    defaultData: blockDefaults['numbered-steps'],
  },
];

/** Get a block definition by type */
export function getBlockDefinition(type: EmailBlockType): BlockDefinition | undefined {
  return blockRegistry.find((b) => b.type === type);
}

/** Get blocks grouped by category */
export function getBlocksByCategory() {
  const groups: Record<string, BlockDefinition[]> = {};
  for (const block of blockRegistry) {
    if (!groups[block.category]) {
      groups[block.category] = [];
    }
    groups[block.category]!.push(block);
  }
  return groups;
}

export const categoryLabels: Record<string, string> = {
  structure: 'Structure',
  content: 'Content',
  media: 'Media',
  layout: 'Layout',
  property: 'Property Marketing',
};
