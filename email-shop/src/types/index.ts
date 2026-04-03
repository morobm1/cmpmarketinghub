// ============================================================
// Core Domain Types for Entrata HTML Email Generator
// ============================================================

/** Unique identifier type */
export type ID = string;

/** Timestamp ISO string */
export type Timestamp = string;

// ---- Brand Kit Types ----

export interface BrandColor {
  id: ID;
  name: string;
  hex: string;
}

export interface BrandFont {
  id: ID;
  name: string;
  family: string;
  weight?: number;
  fallback: string;
}

export interface ButtonStyle {
  id: ID;
  name: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  fontWeight: number;
}

export interface ContentSnippet {
  id: ID;
  name: string;
  content: string;
  category: 'footer' | 'contact' | 'legal' | 'promo' | 'custom';
}

export type BrandLinkCategory = 'website' | 'prospect-portal' | 'resident-portal' | 'apply' | 'tour' | 'survey' | 'google-form' | 'social' | 'other';

export interface BrandLink {
  id: ID;
  label: string;
  url: string;
  category: BrandLinkCategory;
}

export interface BrandKit {
  id: ID;
  propertyId: ID;
  propertyName: string;
  logos: Asset[];
  images: Asset[];
  floorplans: Asset[];
  colors: BrandColor[];
  fonts: BrandFont[];
  buttonStyles: ButtonStyle[];
  snippets: ContentSnippet[];
  links: BrandLink[];
  footerHtml?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Asset Types ----

export type AssetCategory = 'logo' | 'photo' | 'floorplan' | 'icon' | 'banner' | 'other';

export interface Asset {
  id: ID;
  name: string;
  category: AssetCategory;
  thumbnailUrl: string;
  sourceUrl: string;
  altText: string;
  propertyId: ID;
  tags: string[];
  width?: number;
  height?: number;
  createdAt: Timestamp;
}

// ---- Email Block Types ----

export type EmailBlockType =
  | 'header'
  | 'logo'
  | 'hero-image'
  | 'text'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'image-text'
  | 'two-column'
  | 'amenities'
  | 'floorplan-spotlight'
  | 'promo-banner'
  | 'callout-box'
  | 'testimonial'
  | 'footer'
  | 'social-links'
  | 'color-bar'
  | 'branded-header'
  | 'virtual-tour'
  | 'image-gallery'
  | 'event-details'
  | 'numbered-steps'
  | 'promo-bar';

export interface EmailBlockStyle {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  textAlign?: 'left' | 'center' | 'right';
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
}

/** Base block data shared by all block types */
export interface BaseBlockData {
  style: EmailBlockStyle;
  visible: boolean;
}

export interface HeaderBlockData extends BaseBlockData {
  preheaderText?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  backgroundColor?: string;
}

export interface LogoBlockData extends BaseBlockData {
  imageUrl: string;
  altText: string;
  width: number;
  linkUrl?: string;
  alignment: 'left' | 'center' | 'right';
}

export interface HeroImageBlockData extends BaseBlockData {
  imageUrl: string;
  altText: string;
  linkUrl?: string;
  overlayText?: string;
  overlayColor?: string;
  objectPosition?: string; // e.g., 'center center', '50% 30%' for crop/reposition
  imageHeight?: number; // constrained height for cropping
}

export interface TextBlockData extends BaseBlockData {
  content: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
}

export interface ButtonBlockData extends BaseBlockData {
  label: string;
  url: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontWeight: number;
  paddingX: number;
  paddingY: number;
  alignment: 'left' | 'center' | 'right';
  fullWidth: boolean;
}

export interface SpacerBlockData extends BaseBlockData {
  height: number;
}

export interface DividerBlockData extends BaseBlockData {
  color: string;
  thickness: number;
  widthPercent: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface ImageTextBlockData extends BaseBlockData {
  imageUrl: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  imageWidth: number; // percentage
  heading: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  buttonStyle?: Partial<ButtonBlockData>;
}

export interface TwoColumnBlockData extends BaseBlockData {
  leftContent: string;
  rightContent: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  leftImageAlt?: string;
  rightImageAlt?: string;
  columnRatio: '50-50' | '60-40' | '40-60' | '30-70' | '70-30';
}

export interface AmenitiesBlockData extends BaseBlockData {
  heading: string;
  items: Array<{
    icon?: string;
    label: string;
    description?: string;
  }>;
  columns: 2 | 3 | 4;
}

export interface FloorplanSpotlightBlockData extends BaseBlockData {
  heading: string;
  floorplanImageUrl: string;
  floorplanImageAlt: string;
  unitName: string;
  bedsBaths: string;
  sqft: string;
  price: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonStyle?: Partial<ButtonBlockData>;
}

export interface PromoBannerBlockData extends BaseBlockData {
  heading: string;
  subheading?: string;
  backgroundImageUrl?: string;
  backgroundColor: string;
  textColor: string;
  buttonLabel?: string;
  buttonUrl?: string;
  buttonStyle?: Partial<ButtonBlockData>;
}

export interface CalloutBoxBlockData extends BaseBlockData {
  heading: string;
  body: string;
  backgroundColor: string;
  borderColor: string;
  iconUrl?: string;
}

export interface TestimonialBlockData extends BaseBlockData {
  quote: string;
  authorName: string;
  authorTitle?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface FooterBlockData extends BaseBlockData {
  companyName: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  unsubscribeUrl?: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    iconUrl?: string;
  }>;
  legalText?: string;
}

export interface SocialLinksBlockData extends BaseBlockData {
  alignment: 'left' | 'center' | 'right';
  links: Array<{
    platform: string;
    url: string;
    iconUrl?: string;
  }>;
  iconSize: number;
  spacing: number;
}

export interface ColorBarBlockData extends BaseBlockData {
  color: string;
  height: number;
}

export interface BrandedHeaderBlockData extends BaseBlockData {
  backgroundImageUrl: string;
  backgroundImageAlt: string;
  overlayColor: string;
  overlayOpacity: number; // 0 to 1
  logoUrl: string;
  logoAlt: string;
  logoWidth: number;
  headingText?: string;
  subheadingText?: string;
  textColor: string;
  height: number;
  objectPosition?: string; // for background image crop/reposition
}

export interface VirtualTourBlockData extends BaseBlockData {
  tourUrl: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  heading: string;
  description: string;
  buttonLabel: string;
  buttonColor: string;
  buttonTextColor: string;
  thumbnailHeight: number;
}

export interface ImageGalleryBlockData extends BaseBlockData {
  images: Array<{ url: string; alt: string; linkUrl?: string }>;
  columns: 2 | 3;
  gap: number;
  caption?: string;
}

export interface EventDetailsBlockData extends BaseBlockData {
  eventName: string;
  date: string;
  time: string;
  location: string;
  description: string;
  accentColor: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

export interface NumberedStepsBlockData extends BaseBlockData {
  heading: string;
  steps: Array<{ title: string; description: string }>;
  accentColor: string;
}

export interface PromoBarBlockData extends BaseBlockData {
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  linkUrl?: string;
  linkLabel?: string;
}

/** Map block type to its data type */
export interface BlockDataMap {
  'header': HeaderBlockData;
  'logo': LogoBlockData;
  'hero-image': HeroImageBlockData;
  'text': TextBlockData;
  'button': ButtonBlockData;
  'spacer': SpacerBlockData;
  'divider': DividerBlockData;
  'image-text': ImageTextBlockData;
  'two-column': TwoColumnBlockData;
  'amenities': AmenitiesBlockData;
  'floorplan-spotlight': FloorplanSpotlightBlockData;
  'promo-banner': PromoBannerBlockData;
  'callout-box': CalloutBoxBlockData;
  'testimonial': TestimonialBlockData;
  'footer': FooterBlockData;
  'social-links': SocialLinksBlockData;
  'color-bar': ColorBarBlockData;
  'branded-header': BrandedHeaderBlockData;
  'virtual-tour': VirtualTourBlockData;
  'image-gallery': ImageGalleryBlockData;
  'event-details': EventDetailsBlockData;
  'numbered-steps': NumberedStepsBlockData;
  'promo-bar': PromoBarBlockData;
}

/** An email block instance placed in the canvas */
export interface EmailBlock<T extends EmailBlockType = EmailBlockType> {
  id: ID;
  type: T;
  data: BlockDataMap[T];
  locked?: boolean;
}

// ---- Email Project Types ----

export type ProjectStatus = 'draft' | 'complete' | 'template' | 'published' | 'archived';

export interface EmailProject {
  id: ID;
  name: string;
  propertyId: ID;
  propertyName: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: ProjectStatus;
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
  htmlSnapshot?: string;
  templateId?: ID;
  tags: string[];
}

export interface EmailGlobalStyles {
  bodyBackgroundColor: string;
  contentBackgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  fontFallback: string;
  defaultTextColor: string;
  defaultLinkColor: string;
  defaultFontSize: number;
}

// ---- Template Types ----

export interface EmailTemplate {
  id: ID;
  name: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  propertyId?: ID; // null = global template
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDefault: boolean;
}

// ---- UI State Types ----

export type EditorView = 'builder' | 'brand-kit' | 'assets' | 'templates' | 'projects';
export type PreviewMode = 'desktop' | 'mobile';
export type SidebarTab = 'blocks' | 'assets' | 'brand' | 'layers';

export interface EditorState {
  currentView: EditorView;
  selectedBlockId: ID | null;
  previewMode: PreviewMode;
  sidebarTab: SidebarTab;
  isDragging: boolean;
  showHtmlPreview: boolean;
  showExportModal: boolean;
}

// ---- Block Registry ----

export interface BlockDefinition {
  type: EmailBlockType;
  label: string;
  icon: string;
  category: 'structure' | 'content' | 'media' | 'property' | 'layout';
  description: string;
  defaultData: BlockDataMap[EmailBlockType];
  entrataWarning?: string;
}
