import type {
  EmailBlock,
  HeaderBlockData,
  LogoBlockData,
  HeroImageBlockData,
  TextBlockData,
  ButtonBlockData,
  SpacerBlockData,
  DividerBlockData,
  ImageTextBlockData,
  TwoColumnBlockData,
  AmenitiesBlockData,
  FloorplanSpotlightBlockData,
  PromoBannerBlockData,
  CalloutBoxBlockData,
  TestimonialBlockData,
  FooterBlockData,
  SocialLinksBlockData,
  ColorBarBlockData,
  BrandedHeaderBlockData,
  VirtualTourBlockData,
  ImageGalleryBlockData,
  EventDetailsBlockData,
  NumberedStepsBlockData,
} from '@/types';
import { ImageIcon, Star, AlertTriangle } from 'lucide-react';
import { getSocialPlatform } from '@/blocks/socialIcons';

interface BlockRendererProps {
  block: EmailBlock;
  isPreview?: boolean;
}

/**
 * Visual preview renderer for each block type in the editor canvas.
 * This is the EDITOR representation - separate from exported HTML.
 */
export function BlockRenderer({ block, isPreview }: BlockRendererProps) {
  const data = block.data;
  const style: React.CSSProperties = {
    backgroundColor: data.style.backgroundColor || undefined,
    color: data.style.textColor || undefined,
    paddingTop: data.style.paddingTop ?? 16,
    paddingBottom: data.style.paddingBottom ?? 16,
    paddingLeft: data.style.paddingLeft ?? 24,
    paddingRight: data.style.paddingRight ?? 24,
    textAlign: (data.style.textAlign as React.CSSProperties['textAlign']) || undefined,
  };

  switch (block.type) {
    case 'header':
      return <HeaderPreview data={data as HeaderBlockData} style={style} />;
    case 'logo':
      return <LogoPreview data={data as LogoBlockData} style={style} />;
    case 'hero-image':
      return <HeroImagePreview data={data as HeroImageBlockData} style={style} />;
    case 'text':
      return <TextPreview data={data as TextBlockData} style={style} />;
    case 'button':
      return <ButtonPreview data={data as ButtonBlockData} style={style} />;
    case 'spacer':
      return <SpacerPreview data={data as SpacerBlockData} />;
    case 'divider':
      return <DividerPreview data={data as DividerBlockData} style={style} />;
    case 'image-text':
      return <ImageTextPreview data={data as ImageTextBlockData} style={style} />;
    case 'two-column':
      return <TwoColumnPreview data={data as TwoColumnBlockData} style={style} />;
    case 'amenities':
      return <AmenitiesPreview data={data as AmenitiesBlockData} style={style} />;
    case 'floorplan-spotlight':
      return <FloorplanPreview data={data as FloorplanSpotlightBlockData} style={style} />;
    case 'promo-banner':
      return <PromoBannerPreview data={data as PromoBannerBlockData} style={style} />;
    case 'callout-box':
      return <CalloutBoxPreview data={data as CalloutBoxBlockData} style={style} />;
    case 'testimonial':
      return <TestimonialPreview data={data as TestimonialBlockData} style={style} />;
    case 'footer':
      return <FooterPreview data={data as FooterBlockData} style={style} />;
    case 'social-links':
      return <SocialLinksPreview data={data as SocialLinksBlockData} style={style} />;
    case 'color-bar':
      return <ColorBarPreview data={data as ColorBarBlockData} />;
    case 'branded-header':
      return <BrandedHeaderPreview data={data as BrandedHeaderBlockData} />;
    case 'virtual-tour':
      return <VirtualTourPreview data={data as VirtualTourBlockData} style={style} />;
    case 'image-gallery':
      return <ImageGalleryPreview data={data as ImageGalleryBlockData} style={style} />;
    case 'event-details':
      return <EventDetailsPreview data={data as EventDetailsBlockData} style={style} />;
    case 'numbered-steps':
      return <NumberedStepsPreview data={data as NumberedStepsBlockData} style={style} />;
    default:
      return <div style={style} className="text-surface-400 text-sm">Unknown block type</div>;
  }
}

function ImagePlaceholder({ alt, className }: { alt: string; className?: string }) {
  return (
    <div className={`bg-surface-100 flex items-center justify-center ${className || 'h-40'}`}>
      <div className="text-center text-surface-400">
        <ImageIcon size={32} className="mx-auto mb-1" />
        <span className="text-xs">{alt || 'Add image URL'}</span>
      </div>
    </div>
  );
}

function HeaderPreview({ data, style }: { data: HeaderBlockData; style: React.CSSProperties }) {
  // Clamp logo width: min 60px, max 85% of container, default 180px
  const rawWidth = data.logoWidth || 180;
  const clampedWidth = Math.min(Math.max(rawWidth, 60), 500);
  return (
    <div style={{ ...style, backgroundColor: data.backgroundColor || style.backgroundColor, paddingTop: 12, paddingBottom: 12, minHeight: 48 }}>
      {data.preheaderText && (
        <div className="text-xs text-surface-400 mb-1 text-center">{data.preheaderText}</div>
      )}
      {data.logoUrl ? (
        <img
          src={data.logoUrl}
          alt={data.logoAlt || 'Logo'}
          style={{
            width: clampedWidth,
            maxWidth: '85%',
            maxHeight: 100,
            height: 'auto',
            margin: '0 auto',
            display: 'block',
            objectFit: 'contain',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="flex items-center justify-center h-10 text-surface-400 text-sm">
          <ImageIcon size={18} className="mr-2" /> Add logo URL
        </div>
      )}
    </div>
  );
}

function LogoPreview({ data, style }: { data: LogoBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ textAlign: data.alignment }}>
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.altText} style={{ maxWidth: data.width, display: 'inline-block' }} />
        ) : (
          <ImagePlaceholder alt={data.altText} className="h-20 w-48 mx-auto rounded" />
        )}
      </div>
    </div>
  );
}

function HeroImagePreview({ data, style }: { data: HeroImageBlockData; style: React.CSSProperties }) {
  const hasConstrainedHeight = data.imageHeight && data.imageHeight > 0;
  return (
    <div style={{ ...style, padding: 0 }}>
      {data.imageUrl ? (
        hasConstrainedHeight ? (
          <div style={{ height: data.imageHeight, overflow: 'hidden', position: 'relative' }}>
            <img
              src={data.imageUrl}
              alt={data.altText}
              className="w-full block"
              style={{ objectFit: 'cover', objectPosition: data.objectPosition || 'center center', width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <img src={data.imageUrl} alt={data.altText} className="w-full block" style={{ objectPosition: data.objectPosition || 'center center' }} />
        )
      ) : (
        <ImagePlaceholder alt="Hero image" className="h-48" />
      )}
    </div>
  );
}

function TextPreview({ data, style }: { data: TextBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <p style={{ fontSize: data.fontSize, fontWeight: data.fontWeight, lineHeight: data.lineHeight, margin: 0 }}>
        {data.content}
      </p>
    </div>
  );
}

function ButtonPreview({ data, style }: { data: ButtonBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ textAlign: data.alignment }}>
        <span
          style={{
            display: data.fullWidth ? 'block' : 'inline-block',
            backgroundColor: data.backgroundColor,
            color: data.textColor,
            padding: `${data.paddingY}px ${data.paddingX}px`,
            borderRadius: data.borderRadius,
            fontSize: data.fontSize,
            fontWeight: data.fontWeight,
            textDecoration: 'none',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          {data.label}
        </span>
      </div>
    </div>
  );
}

function SpacerPreview({ data }: { data: SpacerBlockData }) {
  return (
    <div
      className="relative bg-surface-50 border border-dashed border-surface-200 flex items-center justify-center"
      style={{ height: data.height }}
    >
      <span className="text-xs text-surface-300">{data.height}px</span>
    </div>
  );
}

function DividerPreview({ data, style }: { data: DividerBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <hr
        style={{
          border: 'none',
          borderTop: `${data.thickness}px ${data.lineStyle} ${data.color}`,
          width: `${data.widthPercent}%`,
          margin: '0 auto',
        }}
      />
    </div>
  );
}

function ImageTextPreview({ data, style }: { data: ImageTextBlockData; style: React.CSSProperties }) {
  const imgSection = data.imageUrl ? (
    <img src={data.imageUrl} alt={data.imageAlt} className="w-full rounded" />
  ) : (
    <ImagePlaceholder alt={data.imageAlt} className="h-32 rounded" />
  );

  const textSection = (
    <div>
      {data.heading && <h3 className="text-lg font-bold mb-1">{data.heading}</h3>}
      <p className="text-sm text-surface-600 leading-relaxed">{data.body}</p>
      {data.buttonLabel && (
        <span className="inline-block mt-3 px-4 py-2 bg-primary-600 text-white text-sm rounded font-medium">
          {data.buttonLabel}
        </span>
      )}
    </div>
  );

  return (
    <div style={style}>
      <div className="flex gap-4" style={{ flexDirection: data.imagePosition === 'right' ? 'row-reverse' : 'row' }}>
        <div style={{ width: `${data.imageWidth}%` }}>{imgSection}</div>
        <div style={{ width: `${100 - data.imageWidth}%` }}>{textSection}</div>
      </div>
    </div>
  );
}

function TwoColumnPreview({ data, style }: { data: TwoColumnBlockData; style: React.CSSProperties }) {
  const [left, right] = data.columnRatio.split('-').map(Number);
  return (
    <div style={style}>
      <div className="flex gap-4">
        <div style={{ width: `${left}%` }}>
          {data.leftImageUrl && <img src={data.leftImageUrl} alt={data.leftImageAlt || ''} className="w-full rounded mb-2" />}
          <p className="text-sm">{data.leftContent}</p>
        </div>
        <div style={{ width: `${right}%` }}>
          {data.rightImageUrl && <img src={data.rightImageUrl} alt={data.rightImageAlt || ''} className="w-full rounded mb-2" />}
          <p className="text-sm">{data.rightContent}</p>
        </div>
      </div>
    </div>
  );
}

function AmenitiesPreview({ data, style }: { data: AmenitiesBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <h3 className="text-xl font-bold text-center mb-4">{data.heading}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.columns}, 1fr)`, gap: 12 }}>
        {data.items.map((item, i) => (
          <div key={i} className="text-center p-3 bg-surface-50 rounded-lg">
            {item.icon && <img src={item.icon} alt={item.label} className="w-8 h-8 mx-auto mb-1.5" />}
            <div className="font-semibold text-sm">{item.label}</div>
            {item.description && <div className="text-xs text-surface-500 mt-0.5">{item.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FloorplanPreview({ data, style }: { data: FloorplanSpotlightBlockData; style: React.CSSProperties }) {
  const btnBg = data.buttonStyle?.backgroundColor || '#2563eb';
  const btnText = data.buttonStyle?.textColor || '#ffffff';
  return (
    <div style={style}>
      <h3 className="text-xl font-bold text-center mb-4">{data.heading}</h3>
      <div className="flex gap-4 items-center">
        <div className="w-5/12 shrink-0">
          {data.floorplanImageUrl ? (
            <img src={data.floorplanImageUrl} alt={data.floorplanImageAlt} className="w-full h-auto rounded object-contain" style={{ maxHeight: 220 }} />
          ) : (
            <ImagePlaceholder alt="Floor plan" className="h-40 rounded" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-lg">{data.unitName}</h4>
          <p className="text-sm text-surface-500">{data.bedsBaths}</p>
          <p className="text-sm text-surface-500">{data.sqft} sq ft</p>
          <p className="text-lg font-bold mt-2">{data.price}</p>
          <span
            className="inline-block mt-3 px-4 py-2 text-sm rounded font-medium"
            style={{ backgroundColor: btnBg, color: btnText }}
          >
            {data.buttonLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function PromoBannerPreview({ data, style }: { data: PromoBannerBlockData; style: React.CSSProperties }) {
  return (
    <div
      style={{
        ...style,
        backgroundColor: data.backgroundColor,
        color: data.textColor,
        backgroundImage: data.backgroundImageUrl ? `url(${data.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <h3 className="text-2xl font-bold mb-2">{data.heading}</h3>
      {data.subheading && <p className="mb-4 opacity-90">{data.subheading}</p>}
      {data.buttonLabel && (
        <span className="inline-block px-6 py-3 bg-white rounded font-bold text-sm" style={{ color: data.backgroundColor }}>
          {data.buttonLabel}
        </span>
      )}
    </div>
  );
}

function CalloutBoxPreview({ data, style }: { data: CalloutBoxBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div
        className="p-5 rounded"
        style={{ backgroundColor: data.backgroundColor, borderLeft: `4px solid ${data.borderColor}` }}
      >
        <h4 className="font-bold mb-1">{data.heading}</h4>
        <p className="text-sm text-surface-600">{data.body}</p>
      </div>
    </div>
  );
}

function TestimonialPreview({ data, style }: { data: TestimonialBlockData; style: React.CSSProperties }) {
  return (
    <div style={{ ...style, textAlign: 'center' }}>
      {data.rating && (
        <div className="flex items-center justify-center gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={18} className={i < data.rating! ? 'text-amber-400 fill-amber-400' : 'text-surface-200'} />
          ))}
        </div>
      )}
      <p className="text-base italic text-surface-600 leading-relaxed mb-4">{data.quote}</p>
      {data.avatarUrl && <img src={data.avatarUrl} alt={data.authorName} className="w-12 h-12 rounded-full mx-auto mb-2" />}
      <p className="font-bold text-sm">{data.authorName}</p>
      {data.authorTitle && <p className="text-xs text-surface-400">{data.authorTitle}</p>}
    </div>
  );
}

function FooterPreview({ data, style }: { data: FooterBlockData; style: React.CSSProperties }) {
  return (
    <div style={{ ...style, textAlign: 'center' }}>
      <p className="font-bold text-sm mb-1" style={{ color: '#e2e8f0' }}>{data.companyName}</p>
      <p className="text-xs opacity-80 mb-1">{data.address}</p>
      {data.phone && <p className="text-xs opacity-80">{data.phone}</p>}
      {data.email && <p className="text-xs opacity-80">{data.email}</p>}
      {data.website && <p className="text-xs opacity-80 mb-3">{data.website}</p>}
      {data.socialLinks.length > 0 && (
        <div className="flex items-center justify-center gap-3 mb-3">
          {data.socialLinks.map((link, i) => (
            <span key={i} className="text-xs underline opacity-80 cursor-pointer">{link.platform}</span>
          ))}
        </div>
      )}
      {data.legalText && <p className="text-xs opacity-50 mt-2">{data.legalText}</p>}
    </div>
  );
}

function SocialLinksPreview({ data, style }: { data: SocialLinksBlockData; style: React.CSSProperties }) {
  return (
    <div style={{ ...style, textAlign: data.alignment }}>
      <div className="flex items-center" style={{ gap: data.spacing, justifyContent: data.alignment === 'center' ? 'center' : data.alignment === 'right' ? 'flex-end' : 'flex-start' }}>
        {data.links.map((link, i) => {
          const platform = getSocialPlatform(link.platform);
          const iconSrc = link.iconUrl || platform?.svg;
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center"
              style={{ width: data.iconSize, height: data.iconSize }}
              title={platform?.name || link.platform}
            >
              {iconSrc ? (
                <img src={iconSrc} alt={link.platform} style={{ width: data.iconSize, height: data.iconSize }} />
              ) : (
                <span
                  className="inline-flex items-center justify-center rounded-full bg-surface-200 text-surface-600 text-xs font-medium"
                  style={{ width: data.iconSize, height: data.iconSize }}
                >
                  {link.platform.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ColorBarPreview({ data }: { data: ColorBarBlockData }) {
  return (
    <div style={{ backgroundColor: data.color, height: data.height, width: '100%' }} />
  );
}

function BrandedHeaderPreview({ data }: { data: BrandedHeaderBlockData }) {
  return (
    <div style={{ position: 'relative', height: data.height, overflow: 'hidden' }}>
      {/* Background image */}
      {data.backgroundImageUrl ? (
        <img
          src={data.backgroundImageUrl}
          alt={data.backgroundImageAlt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: data.objectPosition || 'center center', display: 'block' }}
        />
      ) : (
        <div className="w-full h-full bg-surface-200 flex items-center justify-center">
          <ImageIcon size={32} className="text-surface-300" />
        </div>
      )}
      {/* Color overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: data.overlayColor,
          opacity: data.overlayOpacity,
        }}
      />
      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: data.textColor }}>
        {data.logoUrl && (
          <img src={data.logoUrl} alt={data.logoAlt} style={{ maxWidth: data.logoWidth, height: 'auto', marginBottom: 12 }} />
        )}
        {data.headingText && (
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{data.headingText}</h2>
        )}
        {data.subheadingText && (
          <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.9, textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{data.subheadingText}</p>
        )}
      </div>
    </div>
  );
}

function VirtualTourPreview({ data, style }: { data: VirtualTourBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div className="flex items-center gap-1.5 px-3 py-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <AlertTriangle size={14} className="shrink-0" />
        <span>Not Entrata-compatible — preview/embed will not render in email clients</span>
      </div>
      <h3 className="text-lg font-bold text-center mb-2">{data.heading}</h3>
      <p className="text-sm text-surface-500 text-center mb-3">{data.description}</p>
      <div className="relative rounded-lg overflow-hidden" style={{ height: data.thumbnailHeight || 200 }}>
        {data.thumbnailUrl ? (
          <img src={data.thumbnailUrl} alt={data.thumbnailAlt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-100 flex items-center justify-center">
            <div className="text-center text-surface-400">
              <div className="text-3xl mb-1">🏠</div>
              <span className="text-xs">Virtual Tour Thumbnail</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-surface-700">360</span>
          </div>
        </div>
      </div>
      <div className="text-center mt-3">
        <span style={{ backgroundColor: data.buttonColor, color: data.buttonTextColor, padding: '10px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, display: 'inline-block' }}>
          {data.buttonLabel}
        </span>
      </div>
    </div>
  );
}

// ---- New Blocks ----

function ImageGalleryPreview({ data, style }: { data: ImageGalleryBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div className="flex gap-2">
        {data.images.map((img, i) => (
          <div key={i} className="flex-1" style={{ width: `${100 / data.columns}%` }}>
            {img.url ? (
              <img src={img.url} alt={img.alt} className="w-full rounded-md object-cover" style={{ aspectRatio: '4/3' }} />
            ) : (
              <ImagePlaceholder alt={img.alt || `Image ${i + 1}`} className="h-28 rounded-md" />
            )}
          </div>
        ))}
      </div>
      {data.caption && <p className="text-xs text-surface-400 text-center mt-2">{data.caption}</p>}
    </div>
  );
}

function EventDetailsPreview({ data, style }: { data: EventDetailsBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: data.accentColor }}>
        <div className="px-5 py-3 text-white text-center" style={{ backgroundColor: data.accentColor }}>
          <div className="text-lg font-bold">{data.eventName}</div>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-surface-500 w-16">Date</span>
            <span className="text-surface-700">{data.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-surface-500 w-16">Time</span>
            <span className="text-surface-700">{data.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-surface-500 w-16">Where</span>
            <span className="text-surface-700">{data.location}</span>
          </div>
          {data.description && <p className="text-sm text-surface-500 mt-2 pt-2 border-t border-surface-100">{data.description}</p>}
          {data.buttonLabel && (
            <div className="text-center pt-2">
              <span className="inline-block px-6 py-2 text-sm font-bold text-white rounded-md" style={{ backgroundColor: data.accentColor }}>{data.buttonLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberedStepsPreview({ data, style }: { data: NumberedStepsBlockData; style: React.CSSProperties }) {
  return (
    <div style={style}>
      <h3 className="text-lg font-bold text-center mb-4" style={{ color: data.accentColor }}>{data.heading}</h3>
      <div className="space-y-3">
        {data.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: data.accentColor }}>
              {i + 1}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm font-semibold text-surface-800">{step.title}</div>
              <div className="text-xs text-surface-500 mt-0.5">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
