import { useEditorStore } from '@/store/useEditorStore';
import { getBlockDefinition } from '@/blocks/registry';
import { X, ChevronDown, ImageIcon, Plus, Trash2, Link2, Sparkles, Search } from 'lucide-react';
import { useState } from 'react';
import type { EmailBlock, EmailBlockStyle, Asset, BrandLink } from '@/types';
import { ctaLibrary, getEmailButtonCTAs, getTop25, searchCTAs, type CTACategory } from '@/data/ctaLibrary';
import { amenityIcons, getIconsByCategory, recolorIcon } from '@/blocks/amenityIcons';
import { socialPlatforms, getSocialPlatform } from '@/blocks/socialIcons';

export function PropertiesPanel() {
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const blocks = useEditorStore((s) => s.blocks);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);

  const block = blocks.find((b: EmailBlock) => b.id === selectedBlockId);
  if (!block) return null;

  const definition = getBlockDefinition(block.type);
  const data = block.data as Record<string, any>;

  const update = (key: string, value: any) => {
    updateBlockData(block.id, { [key]: value } as any);
  };

  const updateStyle = (key: keyof EmailBlockStyle, value: any) => {
    updateBlockData(block.id, {
      style: { ...block.data.style, [key]: value },
    } as any);
  };

  return (
    <div className="w-80 bg-white border-l border-surface-200 flex flex-col shrink-0 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-surface-50">
        <div>
          <h3 className="text-sm font-semibold text-surface-800">{definition?.label || block.type}</h3>
          <p className="text-xs text-surface-400">Edit block properties</p>
        </div>
        <button
          onClick={() => selectBlock(null)}
          className="w-7 h-7 rounded-md hover:bg-surface-200 flex items-center justify-center text-surface-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Content properties based on block type */}
        <ContentProperties block={block} data={data} update={update} brandColors={activeBrandKit?.colors} brandLinks={activeBrandKit?.links || []} />

        {/* Style section */}
        <PropertySection title="Style">
          <ColorField label="Background" value={data.style?.backgroundColor || ''} onChange={(v) => updateStyle('backgroundColor', v)} brandColors={activeBrandKit?.colors} />
          <ColorField label="Text Color" value={data.style?.textColor || ''} onChange={(v) => updateStyle('textColor', v)} brandColors={activeBrandKit?.colors} />
          <SelectField label="Text Align" value={data.style?.textAlign || 'left'} onChange={(v) => updateStyle('textAlign', v)} options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]} />
        </PropertySection>

        {/* Padding section */}
        <PropertySection title="Padding">
          <NumberField label="Top" value={data.style?.paddingTop ?? 16} onChange={(v) => updateStyle('paddingTop', v)} min={0} max={100} />
          <NumberField label="Bottom" value={data.style?.paddingBottom ?? 16} onChange={(v) => updateStyle('paddingBottom', v)} min={0} max={100} />
          <NumberField label="Left" value={data.style?.paddingLeft ?? 24} onChange={(v) => updateStyle('paddingLeft', v)} min={0} max={100} />
          <NumberField label="Right" value={data.style?.paddingRight ?? 24} onChange={(v) => updateStyle('paddingRight', v)} min={0} max={100} />
        </PropertySection>
      </div>
    </div>
  );
}

/** Render content-specific properties based on block type */
function ContentProperties({ block, data, update, brandColors, brandLinks }: { block: EmailBlock; data: Record<string, any>; update: (key: string, value: any) => void; brandColors?: Array<{ id: string; name: string; hex: string }>; brandLinks: BrandLink[] }) {
  switch (block.type) {
    case 'text':
      return (
        <PropertySection title="Content">
          <TextAreaField label="Text" value={data.content || ''} onChange={(v) => update('content', v)} />
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1.5">Style Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Heading', size: 24, weight: 700, height: 1.3 },
                { label: 'Subheading', size: 18, weight: 600, height: 1.4 },
                { label: 'Body', size: 15, weight: 400, height: 1.7 },
                { label: 'Small/Label', size: 13, weight: 600, height: 1.5 },
                { label: 'Section Title', size: 13, weight: 700, height: 1.4 },
                { label: 'Large Title', size: 28, weight: 700, height: 1.2 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    update('fontSize', preset.size);
                    update('fontWeight', preset.weight);
                    update('lineHeight', preset.height);
                  }}
                  className="px-2 py-1.5 text-xs font-medium rounded border border-surface-200 text-surface-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <NumberField label="Font Size" value={data.fontSize || 16} onChange={(v) => update('fontSize', v)} min={10} max={72} />
          <NumberField label="Font Weight" value={data.fontWeight || 400} onChange={(v) => update('fontWeight', v)} min={100} max={900} step={100} />
          <NumberField label="Line Height" value={data.lineHeight || 1.6} onChange={(v) => update('lineHeight', v)} min={1} max={3} step={0.1} />
        </PropertySection>
      );

    case 'button':
      return (
        <PropertySection title="Button">
          <div className="flex items-end gap-2">
            <div className="flex-1"><TextField label="Label" value={data.label || ''} onChange={(v) => update('label', v)} /></div>
            <CTAPickerButton onSelect={(cta) => update('label', cta)} />
          </div>
          <UrlFieldWithLinks label="URL" value={data.url || ''} onChange={(v) => update('url', v)} brandLinks={brandLinks} />
          <ColorField label="Background" value={data.backgroundColor || ''} onChange={(v) => update('backgroundColor', v)} brandColors={brandColors} />
          <ColorField label="Text Color" value={data.textColor || ''} onChange={(v) => update('textColor', v)} brandColors={brandColors} />
          <NumberField label="Border Radius" value={data.borderRadius ?? 6} onChange={(v) => update('borderRadius', v)} min={0} max={50} />
          <NumberField label="Font Size" value={data.fontSize || 16} onChange={(v) => update('fontSize', v)} min={10} max={36} />
          <NumberField label="Padding X" value={data.paddingX || 32} onChange={(v) => update('paddingX', v)} min={0} max={80} />
          <NumberField label="Padding Y" value={data.paddingY || 14} onChange={(v) => update('paddingY', v)} min={0} max={40} />
          <SelectField label="Alignment" value={data.alignment || 'center'} onChange={(v) => update('alignment', v)} options={[
            { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
          ]} />
          <CheckboxField label="Full Width" value={data.fullWidth || false} onChange={(v) => update('fullWidth', v)} />
        </PropertySection>
      );

    case 'hero-image':
      return (
        <PropertySection title="Hero Image">
          <ImageUrlField label="Image / GIF URL" value={data.imageUrl || ''} onChange={(v) => update('imageUrl', v)} filterCategory="photo" />
          <TextField label="Alt Text" value={data.altText || ''} onChange={(v) => update('altText', v)} />
          <TextField label="Link URL" value={data.linkUrl || ''} onChange={(v) => update('linkUrl', v)} placeholder="https://" />
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Image Height: {data.imageHeight || 250}px</label>
            <input
              type="range"
              min={100}
              max={500}
              value={data.imageHeight || 250}
              onChange={(e) => update('imageHeight', Number(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-surface-400">
              <span>100px</span>
              <span>Best: 200-300px</span>
              <span>500px</span>
            </div>
          </div>
          <SelectField label="Image Position (Crop)" value={data.objectPosition || 'center center'} onChange={(v) => update('objectPosition', v)} options={[
            { value: 'center center', label: 'Center' },
            { value: 'center top', label: 'Top' },
            { value: 'center bottom', label: 'Bottom' },
            { value: 'left center', label: 'Left' },
            { value: 'right center', label: 'Right' },
            { value: '50% 25%', label: 'Upper Third' },
            { value: '50% 75%', label: 'Lower Third' },
            { value: '25% 50%', label: 'Left Third' },
            { value: '75% 50%', label: 'Right Third' },
          ]} />
          <p className="text-[10px] text-surface-400 mt-1">Supports images and GIFs. Paste an Entrata-hosted GIF URL for animated content.</p>
        </PropertySection>
      );

    case 'logo':
      return (
        <PropertySection title="Image">
          <ImageUrlField label="Image URL" value={data.imageUrl || ''} onChange={(v) => update('imageUrl', v)} filterCategory="photo" />
          <TextField label="Alt Text" value={data.altText || ''} onChange={(v) => update('altText', v)} />
          <NumberField label="Width" value={data.width || 200} onChange={(v) => update('width', v)} min={50} max={600} />
          <SelectField label="Alignment" value={data.alignment || 'center'} onChange={(v) => update('alignment', v)} options={[
            { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
          ]} />
          <TextField label="Link URL" value={data.linkUrl || ''} onChange={(v) => update('linkUrl', v)} placeholder="https://" />
        </PropertySection>
      );

    case 'header':
      return (
        <PropertySection title="Header">
          <ImageUrlField label="Logo URL" value={data.logoUrl || ''} onChange={(v) => update('logoUrl', v)} filterCategory="logo" />
          <TextField label="Logo Alt" value={data.logoAlt || ''} onChange={(v) => update('logoAlt', v)} />
          <NumberField label="Logo Width" value={data.logoWidth || 180} onChange={(v) => update('logoWidth', v)} min={50} max={400} />
          <TextField label="Preheader Text" value={data.preheaderText || ''} onChange={(v) => update('preheaderText', v)} />
          <ColorField label="Background" value={data.backgroundColor || ''} onChange={(v) => update('backgroundColor', v)} brandColors={brandColors} />
        </PropertySection>
      );

    case 'spacer':
      return (
        <PropertySection title="Spacer">
          <NumberField label="Height (px)" value={data.height || 32} onChange={(v) => update('height', v)} min={4} max={200} />
        </PropertySection>
      );

    case 'divider':
      return (
        <PropertySection title="Divider">
          <ColorField label="Color" value={data.color || '#e2e8f0'} onChange={(v) => update('color', v)} brandColors={brandColors} />
          <NumberField label="Thickness" value={data.thickness || 1} onChange={(v) => update('thickness', v)} min={1} max={10} />
          <NumberField label="Width %" value={data.widthPercent || 100} onChange={(v) => update('widthPercent', v)} min={10} max={100} />
          <SelectField label="Style" value={data.lineStyle || 'solid'} onChange={(v) => update('lineStyle', v)} options={[
            { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' },
          ]} />
        </PropertySection>
      );

    case 'image-text':
      return (
        <PropertySection title="Image + Text">
          <ImageUrlField label="Image URL" value={data.imageUrl || ''} onChange={(v) => update('imageUrl', v)} filterCategory="photo" />
          <TextField label="Image Alt" value={data.imageAlt || ''} onChange={(v) => update('imageAlt', v)} />
          <SelectField label="Image Position" value={data.imagePosition || 'left'} onChange={(v) => update('imagePosition', v)} options={[
            { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
          ]} />
          <NumberField label="Image Width %" value={data.imageWidth || 40} onChange={(v) => update('imageWidth', v)} min={20} max={80} />
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <TextAreaField label="Body" value={data.body || ''} onChange={(v) => update('body', v)} />
          <div className="flex items-end gap-2"><div className="flex-1"><TextField label="Button Label" value={data.buttonLabel || ''} onChange={(v) => update('buttonLabel', v)} /></div><CTAPickerButton onSelect={(cta) => update('buttonLabel', cta)} /></div>
          <UrlFieldWithLinks label="Button URL" value={data.buttonUrl || ''} onChange={(v) => update('buttonUrl', v)} brandLinks={brandLinks} />
          <ColorField label="Button BG" value={data.buttonStyle?.backgroundColor || '#2563eb'} onChange={(v) => update('buttonStyle', { ...data.buttonStyle, backgroundColor: v })} brandColors={brandColors} />
          <ColorField label="Button Text" value={data.buttonStyle?.textColor || '#ffffff'} onChange={(v) => update('buttonStyle', { ...data.buttonStyle, textColor: v })} brandColors={brandColors} />
        </PropertySection>
      );

    case 'promo-banner':
      return (
        <PropertySection title="Promo Banner">
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <TextField label="Subheading" value={data.subheading || ''} onChange={(v) => update('subheading', v)} />
          <ColorField label="Background" value={data.backgroundColor || ''} onChange={(v) => update('backgroundColor', v)} brandColors={brandColors} />
          <ColorField label="Text Color" value={data.textColor || ''} onChange={(v) => update('textColor', v)} brandColors={brandColors} />
          <TextField label="BG Image URL" value={data.backgroundImageUrl || ''} onChange={(v) => update('backgroundImageUrl', v)} />
          <div className="flex items-end gap-2"><div className="flex-1"><TextField label="Button Label" value={data.buttonLabel || ''} onChange={(v) => update('buttonLabel', v)} /></div><CTAPickerButton onSelect={(cta) => update('buttonLabel', cta)} /></div>
          <UrlFieldWithLinks label="Button URL" value={data.buttonUrl || ''} onChange={(v) => update('buttonUrl', v)} brandLinks={brandLinks} />
        </PropertySection>
      );

    case 'callout-box':
      return (
        <PropertySection title="Callout Box">
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <TextAreaField label="Body" value={data.body || ''} onChange={(v) => update('body', v)} />
          <ColorField label="Background" value={data.backgroundColor || ''} onChange={(v) => update('backgroundColor', v)} brandColors={brandColors} />
          <ColorField label="Border Color" value={data.borderColor || ''} onChange={(v) => update('borderColor', v)} brandColors={brandColors} />
        </PropertySection>
      );

    case 'testimonial':
      return (
        <PropertySection title="Testimonial">
          <TextAreaField label="Quote" value={data.quote || ''} onChange={(v) => update('quote', v)} />
          <TextField label="Author Name" value={data.authorName || ''} onChange={(v) => update('authorName', v)} />
          <TextField label="Author Title" value={data.authorTitle || ''} onChange={(v) => update('authorTitle', v)} />
          <TextField label="Avatar URL" value={data.avatarUrl || ''} onChange={(v) => update('avatarUrl', v)} />
          <NumberField label="Rating (0-5)" value={data.rating ?? 5} onChange={(v) => update('rating', v)} min={0} max={5} />
        </PropertySection>
      );

    case 'footer':
      return (
        <PropertySection title="Footer">
          <TextField label="Company Name" value={data.companyName || ''} onChange={(v) => update('companyName', v)} />
          <TextField label="Address" value={data.address || ''} onChange={(v) => update('address', v)} />
          <TextField label="Phone" value={data.phone || ''} onChange={(v) => update('phone', v)} />
          <TextField label="Email" value={data.email || ''} onChange={(v) => update('email', v)} />
          <TextField label="Website" value={data.website || ''} onChange={(v) => update('website', v)} />
          <TextAreaField label="Legal Text" value={data.legalText || ''} onChange={(v) => update('legalText', v)} />
          <TextField label="Unsubscribe URL" value={data.unsubscribeUrl || ''} onChange={(v) => update('unsubscribeUrl', v)} />
        </PropertySection>
      );

    case 'floorplan-spotlight':
      return (
        <PropertySection title="Floor Plan">
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <ImageUrlField label="Image URL" value={data.floorplanImageUrl || ''} onChange={(v) => update('floorplanImageUrl', v)} filterCategory="floorplan" />
          <TextField label="Image Alt" value={data.floorplanImageAlt || ''} onChange={(v) => update('floorplanImageAlt', v)} />
          <TextField label="Unit Name" value={data.unitName || ''} onChange={(v) => update('unitName', v)} />
          <TextField label="Beds/Baths" value={data.bedsBaths || ''} onChange={(v) => update('bedsBaths', v)} />
          <TextField label="Sq Ft" value={data.sqft || ''} onChange={(v) => update('sqft', v)} />
          <TextField label="Price" value={data.price || ''} onChange={(v) => update('price', v)} />
          <div className="flex items-end gap-2"><div className="flex-1"><TextField label="Button Label" value={data.buttonLabel || ''} onChange={(v) => update('buttonLabel', v)} /></div><CTAPickerButton onSelect={(cta) => update('buttonLabel', cta)} /></div>
          <UrlFieldWithLinks label="Button URL" value={data.buttonUrl || ''} onChange={(v) => update('buttonUrl', v)} brandLinks={brandLinks} />
          <ColorField label="Button BG" value={data.buttonStyle?.backgroundColor || '#2563eb'} onChange={(v) => update('buttonStyle', { ...data.buttonStyle, backgroundColor: v })} brandColors={brandColors} />
          <ColorField label="Button Text" value={data.buttonStyle?.textColor || '#ffffff'} onChange={(v) => update('buttonStyle', { ...data.buttonStyle, textColor: v })} brandColors={brandColors} />
        </PropertySection>
      );

    case 'amenities':
      return (
        <PropertySection title="Amenities">
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <SelectField label="Columns" value={String(data.columns || 2)} onChange={(v) => update('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
          ]} />
          <AmenityItemsEditor items={data.items || []} onChange={(items) => update('items', items)} />
        </PropertySection>
      );

    case 'two-column':
      return (
        <PropertySection title="Two Columns">
          <SelectField label="Column Ratio" value={data.columnRatio || '50-50'} onChange={(v) => update('columnRatio', v)} options={[
            { value: '50-50', label: '50 / 50' }, { value: '60-40', label: '60 / 40' }, { value: '40-60', label: '40 / 60' },
            { value: '70-30', label: '70 / 30' }, { value: '30-70', label: '30 / 70' },
          ]} />
          <TextAreaField label="Left Content" value={data.leftContent || ''} onChange={(v) => update('leftContent', v)} />
          <TextAreaField label="Right Content" value={data.rightContent || ''} onChange={(v) => update('rightContent', v)} />
          <TextField label="Left Image URL" value={data.leftImageUrl || ''} onChange={(v) => update('leftImageUrl', v)} />
          <TextField label="Right Image URL" value={data.rightImageUrl || ''} onChange={(v) => update('rightImageUrl', v)} />
        </PropertySection>
      );

    case 'social-links':
      return (
        <PropertySection title="Social Links">
          <SelectField label="Alignment" value={data.alignment || 'center'} onChange={(v) => update('alignment', v)} options={[
            { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
          ]} />
          <NumberField label="Icon Size" value={data.iconSize || 32} onChange={(v) => update('iconSize', v)} min={20} max={48} />
          <NumberField label="Spacing" value={data.spacing || 12} onChange={(v) => update('spacing', v)} min={4} max={32} />
          <SocialLinksEditor links={data.links || []} onChange={(links: any) => update('links', links)} />
        </PropertySection>
      );

    case 'virtual-tour':
      return (
        <PropertySection title="Virtual Tour">
          <TextField label="Tour URL (Matterport/3D)" value={data.tourUrl || ''} onChange={(v) => update('tourUrl', v)} placeholder="https://my.matterport.com/show/?m=..." />
          <ImageUrlField label="Thumbnail Image" value={data.thumbnailUrl || ''} onChange={(v) => update('thumbnailUrl', v)} />
          <TextField label="Thumbnail Alt" value={data.thumbnailAlt || ''} onChange={(v) => update('thumbnailAlt', v)} />
          <TextField label="Heading" value={data.heading || ''} onChange={(v) => update('heading', v)} />
          <TextAreaField label="Description" value={data.description || ''} onChange={(v) => update('description', v)} />
          <div className="flex items-end gap-2"><div className="flex-1"><TextField label="Button Label" value={data.buttonLabel || ''} onChange={(v) => update('buttonLabel', v)} /></div><CTAPickerButton onSelect={(cta) => update('buttonLabel', cta)} /></div>
          <ColorField label="Button Color" value={data.buttonColor || '#2563eb'} onChange={(v) => update('buttonColor', v)} brandColors={brandColors} />
          <NumberField label="Thumbnail Height" value={data.thumbnailHeight || 200} onChange={(v) => update('thumbnailHeight', v)} min={100} max={400} />
        </PropertySection>
      );

    case 'color-bar':
      return (
        <PropertySection title="Color Bar">
          <ColorField label="Color" value={data.color || '#1e40af'} onChange={(v) => update('color', v)} brandColors={brandColors} />
          <NumberField label="Height (px)" value={data.height || 8} onChange={(v) => update('height', v)} min={2} max={40} />
        </PropertySection>
      );

    case 'branded-header':
      return (
        <PropertySection title="Branded Header">
          <ImageUrlField label="Background Image URL" value={data.backgroundImageUrl || ''} onChange={(v) => update('backgroundImageUrl', v)} filterCategory="photo" />
          <TextField label="Image Alt Text" value={data.backgroundImageAlt || ''} onChange={(v) => update('backgroundImageAlt', v)} />
          <ColorField label="Overlay Color" value={data.overlayColor || '#1e40af'} onChange={(v) => update('overlayColor', v)} brandColors={brandColors} />
          <NumberField label="Overlay Opacity (0-100)" value={Math.round((data.overlayOpacity || 0.5) * 100)} onChange={(v) => update('overlayOpacity', v / 100)} min={0} max={100} />
          <ImageUrlField label="Logo URL" value={data.logoUrl || ''} onChange={(v) => update('logoUrl', v)} filterCategory="logo" />
          <TextField label="Logo Alt" value={data.logoAlt || ''} onChange={(v) => update('logoAlt', v)} />
          <NumberField label="Logo Width" value={data.logoWidth || 200} onChange={(v) => update('logoWidth', v)} min={50} max={400} />
          <TextField label="Heading" value={data.headingText || ''} onChange={(v) => update('headingText', v)} />
          <TextField label="Subheading" value={data.subheadingText || ''} onChange={(v) => update('subheadingText', v)} />
          <ColorField label="Text Color" value={data.textColor || '#ffffff'} onChange={(v) => update('textColor', v)} brandColors={brandColors} />
          <NumberField label="Height (px)" value={data.height || 200} onChange={(v) => update('height', v)} min={100} max={500} />
          <SelectField label="Image Position" value={data.objectPosition || 'center center'} onChange={(v) => update('objectPosition', v)} options={[
            { value: 'center center', label: 'Center' },
            { value: 'center top', label: 'Top' },
            { value: 'center bottom', label: 'Bottom' },
            { value: '50% 25%', label: 'Upper Third' },
            { value: '50% 75%', label: 'Lower Third' },
          ]} />
        </PropertySection>
      );

    default:
      return <p className="text-sm text-surface-400 p-2">No editable properties for this block type.</p>;
  }
}

// ---- Reusable field components ----

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-surface-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-50 hover:bg-surface-100 text-sm font-medium text-surface-700"
      >
        {title}
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}

function UrlFieldWithLinks({ label, value, onChange, brandLinks }: { label: string; value: string; onChange: (v: string) => void; brandLinks: BrandLink[] }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <div className="flex gap-1">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
        />
        {brandLinks.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-1.5 rounded-md border border-surface-200 text-surface-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
              title="Pick from stored links"
            >
              <Link2 size={14} />
            </button>
            {showPicker && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-surface-200 rounded-lg shadow-xl z-30 py-1 max-h-48 overflow-auto">
                {brandLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => { onChange(link.url); setShowPicker(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors"
                  >
                    <div className="font-medium text-surface-700 truncate">{link.label}</div>
                    <div className="text-xs text-surface-400 truncate font-mono">{link.url}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CTAPickerButton({ onSelect }: { onSelect: (cta: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const top25 = getTop25();
  const emailBtnCTAs = getEmailButtonCTAs();
  const searchResults = search.length >= 2 ? searchCTAs(search) : [];

  const activeCat = selectedCat ? ctaLibrary.categories.find((c) => c.id === selectedCat) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 bg-violet-50 rounded-md hover:bg-violet-100 transition-colors"
        title="Browse CTA suggestions"
      >
        <Sparkles size={12} />
        CTA Library
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-surface-200 rounded-xl shadow-2xl z-40 max-h-80 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-100">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedCat(null); }}
                placeholder="Search CTAs..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-surface-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {search.length >= 2 ? (
              <div className="p-2 space-y-0.5">
                {searchResults.length === 0 && <p className="text-xs text-surface-400 px-2 py-3 text-center">No CTAs match "{search}"</p>}
                {searchResults.slice(0, 20).map((r, i) => (
                  <button key={i} onClick={() => { onSelect(r.cta); setOpen(false); setSearch(''); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-violet-50 transition-colors">
                    <span className="text-surface-800">{r.cta}</span>
                    <span className="ml-1.5 text-[10px] text-surface-400">{r.category.name}</span>
                  </button>
                ))}
              </div>
            ) : selectedCat && activeCat ? (
              <div>
                <button onClick={() => setSelectedCat(null)} className="w-full text-left px-3 py-2 text-xs text-violet-600 hover:bg-violet-50 border-b border-surface-100 font-medium">← Back to categories</button>
                <p className="px-3 py-1.5 text-[10px] text-surface-400">{activeCat.reason}</p>
                <div className="p-2 space-y-0.5">
                  {activeCat.ctas.map((cta, i) => (
                    <button key={i} onClick={() => { onSelect(cta); setOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs text-surface-800 rounded-md hover:bg-violet-50 transition-colors">{cta}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="px-3 py-2 border-b border-surface-100">
                  <div className="text-[10px] font-semibold text-surface-400 uppercase mb-1.5">Top Email CTAs</div>
                  <div className="flex flex-wrap gap-1">
                    {emailBtnCTAs.slice(0, 8).map((cta, i) => (
                      <button key={i} onClick={() => { onSelect(cta); setOpen(false); }} className="px-2 py-1 text-[11px] bg-violet-50 text-violet-700 rounded-full hover:bg-violet-100 transition-colors">{cta}</button>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-[10px] font-semibold text-surface-400 uppercase px-1 mb-1">Browse by Category</div>
                  <div className="space-y-0.5">
                    {ctaLibrary.categories.map((cat) => (
                      <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className="w-full text-left px-2.5 py-1.5 text-xs text-surface-700 rounded-md hover:bg-surface-50 transition-colors flex items-center justify-between">
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-surface-400">{cat.ctas.length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange, brandColors }: { label: string; value: string; onChange: (v: string) => void; brandColors?: Array<{ id: string; name: string; hex: string }> }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-surface-200 cursor-pointer p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#hex"
          className="flex-1 px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
        />
      </div>
      {brandColors && brandColors.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {brandColors.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange(c.hex)}
              className="w-5 h-5 rounded-sm border border-surface-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="text-sm text-surface-600">{label}</span>
    </label>
  );
}

function ImageUrlField({ label, value, onChange, filterCategory }: { label: string; value: string; onChange: (v: string) => void; filterCategory?: 'logo' | 'photo' | 'floorplan' }) {
  const [showBrowser, setShowBrowser] = useState(false);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);
  const storeAssets = useEditorStore((s) => s.assets);

  // Prioritize brand kit assets filtered by category, then fall back to all store assets
  const getBrandKitAssets = (): Asset[] => {
    if (!activeBrandKit) return [];
    if (filterCategory === 'logo') return activeBrandKit.logos || [];
    if (filterCategory === 'floorplan') return activeBrandKit.floorplans || [];
    if (filterCategory === 'photo') return activeBrandKit.images || [];
    return [...(activeBrandKit.logos || []), ...(activeBrandKit.images || []), ...(activeBrandKit.floorplans || [])];
  };

  const brandKitAssets = getBrandKitAssets();
  const otherAssets = filterCategory
    ? storeAssets.filter((a) => a.category === filterCategory && !brandKitAssets.some((bk) => bk.id === a.id))
    : storeAssets.filter((a) => !brandKitAssets.some((bk) => bk.id === a.id));

  const categoryLabel = filterCategory === 'logo' ? 'Logos' : filterCategory === 'floorplan' ? 'Floor Plans' : filterCategory === 'photo' ? 'Photos' : 'Images';

  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://entrata-hosted-url..."
          className="flex-1 px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => setShowBrowser(!showBrowser)}
          className="px-2 py-1.5 text-xs font-medium bg-surface-100 border border-surface-200 rounded-md hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors shrink-0"
          title={`Browse ${categoryLabel.toLowerCase()}`}
        >
          <ImageIcon size={14} />
        </button>
      </div>
      {value && (
        <div className="mt-1.5 rounded overflow-hidden border border-surface-200">
          <img src={value} alt="Preview" className="w-full h-20 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      {showBrowser && (
        <div className="mt-2 max-h-48 overflow-y-auto border border-surface-200 rounded-lg bg-white shadow-sm">
          {brandKitAssets.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-surface-400 uppercase bg-surface-50 border-b border-surface-100 sticky top-0">
                Brand Kit {categoryLabel}
              </div>
              {brandKitAssets.map((asset: Asset) => (
                <button
                  key={asset.id}
                  onClick={() => { onChange(asset.sourceUrl); setShowBrowser(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-primary-50 text-left transition-colors"
                >
                  <img src={asset.thumbnailUrl || asset.sourceUrl} alt={asset.altText} className="w-8 h-8 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-surface-700 truncate">{asset.name}</div>
                    {asset.tags.length > 0 && <div className="text-[10px] text-surface-400 truncate">{asset.tags.join(', ')}</div>}
                  </div>
                </button>
              ))}
            </>
          )}
          {otherAssets.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-surface-400 uppercase bg-surface-50 border-b border-surface-100 sticky top-0">
                {brandKitAssets.length > 0 ? 'Other ' : ''}{categoryLabel}
              </div>
              {otherAssets.map((asset: Asset) => (
                <button
                  key={asset.id}
                  onClick={() => { onChange(asset.sourceUrl); setShowBrowser(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-primary-50 text-left transition-colors"
                >
                  <img src={asset.thumbnailUrl || asset.sourceUrl} alt={asset.altText} className="w-8 h-8 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-surface-700 truncate">{asset.name}</div>
                    <div className="text-[10px] text-surface-400">{asset.category}</div>
                  </div>
                </button>
              ))}
            </>
          )}
          {brandKitAssets.length === 0 && otherAssets.length === 0 && (
            <div className="p-3 text-center">
              <p className="text-xs text-surface-400">No {categoryLabel.toLowerCase()} available. Add images in the Brand Kit or Asset Library.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AmenityItem { icon?: string; label: string; description?: string; }

function AmenityItemsEditor({ items, onChange }: { items: AmenityItem[]; onChange: (items: AmenityItem[]) => void }) {
  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const iconGroups = getIconsByCategory();

  const updateItem = (index: number, field: keyof AmenityItem, value: string) => {
    const newItems = [...items];
    const item = newItems[index];
    if (item) {
      newItems[index] = { ...item, [field]: value };
      onChange(newItems);
    }
  };

  const addItem = () => {
    onChange([...items, { label: 'New Amenity', description: '' }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-2">Amenity Items</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border border-surface-200 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIconPicker(showIconPicker === i ? null : i)}
                className="w-9 h-9 rounded-lg border border-surface-200 flex items-center justify-center shrink-0 hover:bg-surface-50"
                title="Choose icon"
              >
                {item.icon ? <img src={item.icon} alt="" className="w-6 h-6" /> : <span className="text-surface-300 text-lg">+</span>}
              </button>
              <div className="flex-1 min-w-0">
                <input type="text" value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)} className="w-full px-2 py-1 text-sm border border-surface-200 rounded focus:ring-1 focus:ring-primary-500 focus:outline-none" placeholder="Amenity name" />
              </div>
              <button onClick={() => removeItem(i)} className="p-1 text-surface-400 hover:text-red-500 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={item.description || ''} onChange={(e) => updateItem(i, 'description', e.target.value)} className="flex-1 px-2 py-1 text-xs border border-surface-200 rounded focus:ring-1 focus:ring-primary-500 focus:outline-none" placeholder="Description (optional)" />
              {item.icon && (
                <div className="flex items-center gap-1 shrink-0" title="Icon color">
                  <input
                    type="color"
                    defaultValue="#333333"
                    onChange={(e) => {
                      if (item.icon) updateItem(i, 'icon', recolorIcon(item.icon, e.target.value));
                    }}
                    className="w-6 h-6 rounded border border-surface-200 p-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
            {showIconPicker === i && (
              <div className="border border-surface-200 rounded-lg bg-white p-2 max-h-40 overflow-y-auto">
                {Object.entries(iconGroups).map(([cat, icons]) => (
                  <div key={cat} className="mb-2">
                    <div className="text-[10px] font-semibold text-surface-400 uppercase mb-1">{cat}</div>
                    <div className="flex flex-wrap gap-1">
                      {icons.map((ic) => (
                        <button
                          key={ic.id}
                          onClick={() => { updateItem(i, 'icon', ic.svg); setShowIconPicker(null); }}
                          className="w-8 h-8 rounded border border-surface-200 flex items-center justify-center hover:bg-primary-50 hover:border-primary-300"
                          title={ic.name}
                        >
                          <img src={ic.svg} alt={ic.name} className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addItem} className="flex items-center gap-1 mt-2 px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg">
        <Plus size={12} /> Add Amenity
      </button>
    </div>
  );
}

interface SocialLink { platform: string; url: string; iconUrl?: string; }

function SocialLinksEditor({ links, onChange }: { links: SocialLink[]; onChange: (links: SocialLink[]) => void }) {
  const updateLink = (index: number, field: keyof SocialLink, value: string) => {
    const newLinks = [...links];
    const link = newLinks[index];
    if (link) {
      newLinks[index] = { ...link, [field]: value };
      // Auto-set iconUrl when platform changes
      if (field === 'platform') {
        const platform = getSocialPlatform(value);
        if (platform) newLinks[index]!.iconUrl = platform.svg;
      }
      onChange(newLinks);
    }
  };

  const addLink = () => {
    onChange([...links, { platform: 'instagram', url: '#', iconUrl: getSocialPlatform('instagram')?.svg }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-2">Social Platforms</label>
      <div className="space-y-2">
        {links.map((link, i) => {
          const platform = getSocialPlatform(link.platform);
          return (
            <div key={i} className="flex items-center gap-2 p-2 border border-surface-200 rounded-lg">
              {platform && <img src={platform.svg} alt={platform.name} className="w-6 h-6 shrink-0" />}
              <select
                value={link.platform}
                onChange={(e) => updateLink(i, 'platform', e.target.value)}
                className="px-2 py-1 text-xs border border-surface-200 rounded bg-white w-24 shrink-0"
              >
                {socialPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                placeholder="https://"
                className="flex-1 px-2 py-1 text-xs border border-surface-200 rounded min-w-0"
              />
              <button onClick={() => removeLink(i)} className="p-1 text-surface-400 hover:text-red-500 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={addLink} className="flex items-center gap-1 mt-2 px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg">
        <Plus size={12} /> Add Social Link
      </button>
      {/* Quick add buttons */}
      <div className="flex flex-wrap gap-1 mt-2">
        {socialPlatforms.filter((p) => !links.some((l) => l.platform === p.id)).slice(0, 5).map((p) => (
          <button
            key={p.id}
            onClick={() => onChange([...links, { platform: p.id, url: '#', iconUrl: p.svg }])}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-surface-200 hover:bg-surface-50"
          >
            <img src={p.svg} alt={p.name} className="w-3.5 h-3.5" />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
