import { matchAmenityIcon as _matchIcon } from '@/blocks/amenityIcons';
import type {
  EmailBlock,
  EmailGlobalStyles,
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
} from '@/types';

/**
 * Generates email-safe HTML from the block structure.
 * Uses table-based layout for maximum email client compatibility.
 *
 * KEY DESIGN DECISION: Every text-bearing element (<td>, <div>, <p>, <h1>–<h3>,
 * <a>, <span>, <strong>) gets explicit inline font-family. This is required
 * because Entrata Message Center strips <body> and <style> blocks when pasting,
 * so inheritance-based font-family does not survive. The user's working Entrata
 * email confirmed this pattern — Arial, Helvetica, sans-serif is on every element.
 */

// ---- Module-level font string, set per-render via setFont() ----
let _fontStack = 'Arial, Helvetica, sans-serif';

function setFont(globalStyles: EmailGlobalStyles): void {
  _fontStack = `${globalStyles.fontFamily}, ${globalStyles.fontFallback}`;
}

/** Shorthand: returns the font-family CSS declaration */
function ff(): string {
  return `font-family: ${_fontStack};`;
}

function px(n: number | undefined): string {
  return n !== undefined ? `${n}px` : '0';
}

function paddingStyle(data: { style: { paddingTop?: number; paddingBottom?: number; paddingLeft?: number; paddingRight?: number } }): string {
  const { paddingTop = 16, paddingBottom = 16, paddingLeft = 24, paddingRight = 24 } = data.style;
  return `padding: ${px(paddingTop)} ${px(paddingRight)} ${px(paddingBottom)} ${px(paddingLeft)};`;
}

function bgStyle(data: { style: { backgroundColor?: string } }): string {
  return data.style.backgroundColor ? `background-color: ${data.style.backgroundColor};` : '';
}

function textAlignStyle(data: { style: { textAlign?: string } }): string {
  return data.style.textAlign ? `text-align: ${data.style.textAlign};` : '';
}

/** Wraps content in the standard email row table structure */
function wrapRow(content: string, data: { style: { backgroundColor?: string; paddingTop?: number; paddingBottom?: number; paddingLeft?: number; paddingRight?: number } }): string {
  return `<tr>
  <td align="center" style="${ff()} ${bgStyle(data)} ${paddingStyle(data)}">
    ${content}
  </td>
</tr>`;
}

// ---- Block Renderers ----

function renderHeader(data: HeaderBlockData): string {
  const bg = data.backgroundColor || data.style.backgroundColor || '#ffffff';
  let content = '';
  if (data.logoUrl) {
    content = `<img src="${data.logoUrl}" alt="${data.logoAlt || 'Logo'}" width="${data.logoWidth || 180}" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border: 0;" />`;
  }
  return wrapRow(content, { style: { ...data.style, backgroundColor: bg } });
}

function renderLogo(data: LogoBlockData): string {
  const align = data.alignment || 'center';
  const content = `<img src="${data.imageUrl}" alt="${data.altText}" width="${data.width}" style="display: block; max-width: 100%; height: auto; border: 0;${data.linkUrl ? '' : ` margin: 0 ${align === 'center' ? 'auto' : align === 'right' ? '0 0 auto' : 'auto 0'};`}" />`;
  const wrapped = data.linkUrl ? `<a href="${data.linkUrl}" target="_blank" style="text-decoration: none;">${content}</a>` : content;
  return wrapRow(`<div style="${ff()} text-align: ${align};">${wrapped}</div>`, data);
}

function renderHeroImage(data: HeroImageBlockData): string {
  const img = `<img src="${data.imageUrl}" alt="${data.altText}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />`;
  const wrapped = data.linkUrl ? `<a href="${data.linkUrl}" target="_blank" style="text-decoration: none;">${img}</a>` : img;
  return `<tr><td align="center" style="${ff()} ${bgStyle(data)} padding: 0; line-height: 0; font-size: 0;">${wrapped}</td></tr>`;
}

function renderText(data: TextBlockData): string {
  const color = data.style.textColor || '#333333';
  const content = `<p style="margin: 0; ${ff()} font-size: ${data.fontSize}px; font-weight: ${data.fontWeight}; line-height: ${data.lineHeight}; color: ${color}; ${textAlignStyle(data)}">${data.content}</p>`;
  return wrapRow(content, data);
}

function renderButton(data: ButtonBlockData): string {
  const btnStyle = [
    `display: inline-block;`,
    `${ff()}`,
    `background-color: ${data.backgroundColor};`,
    `color: ${data.textColor};`,
    `font-size: ${data.fontSize}px;`,
    `line-height: ${data.fontSize}px;`,
    `font-weight: ${data.fontWeight};`,
    `padding: ${data.paddingY}px ${data.paddingX}px;`,
    `border-radius: ${data.borderRadius}px;`,
    `text-decoration: none;`,
    `text-align: center;`,
    `mso-padding-alt: 0;`,
    data.fullWidth ? `width: 100%; box-sizing: border-box;` : '',
  ].join(' ');

  // VML fallback for Outlook border-radius
  const content = `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${data.url}" style="height:${data.paddingY * 2 + data.fontSize + 4}px;v-text-anchor:middle;width:${data.fullWidth ? 552 : data.paddingX * 2 + 120}px;" arcsize="${Math.round((data.borderRadius / 40) * 100)}%" strokecolor="${data.backgroundColor}" fillcolor="${data.backgroundColor}">
<w:anchorlock/>
<center style="${ff()} color:${data.textColor};font-size:${data.fontSize}px;font-weight:${data.fontWeight};">${data.label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${data.url}" target="_blank" style="${btnStyle}">${data.label}</a>
<!--<![endif]-->`;

  return wrapRow(`<div style="${ff()} text-align: ${data.alignment};">${content}</div>`, data);
}

function renderSpacer(data: SpacerBlockData): string {
  return `<tr><td style="height: ${data.height}px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>`;
}

function renderDivider(data: DividerBlockData): string {
  const content = `<hr style="border: 0; border-top: ${data.thickness}px ${data.lineStyle} ${data.color}; width: ${data.widthPercent}%; margin: 0 auto;" />`;
  return wrapRow(content, data);
}

function renderImageText(data: ImageTextBlockData): string {
  const imgPercent = data.imageWidth;
  const textPercent = 100 - imgPercent;
  const imgCell = `<td width="${imgPercent}%" valign="top" style="${ff()} padding: 8px;">
    <img src="${data.imageUrl}" alt="${data.imageAlt}" width="100%" style="display: block; max-width: 100%; height: auto; border: 0;" />
  </td>`;
  const textContent = [
    data.heading ? `<h2 style="margin: 0 0 8px; ${ff()} font-size: 20px; font-weight: 700; color: ${data.style.textColor || '#333333'};">${data.heading}</h2>` : '',
    `<p style="margin: 0 0 12px; ${ff()} font-size: 15px; line-height: 1.5; color: ${data.style.textColor || '#555555'};">${data.body}</p>`,
    data.buttonLabel ? `<a href="${data.buttonUrl || '#'}" target="_blank" style="display: inline-block; ${ff()} background-color: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 4px; text-decoration: none; font-size: 14px; line-height: 14px; font-weight: 600;">${data.buttonLabel}</a>` : '',
  ].join('\n');
  const textCell = `<td width="${textPercent}%" valign="top" style="${ff()} padding: 8px;">${textContent}</td>`;
  const cells = data.imagePosition === 'left' ? imgCell + textCell : textCell + imgCell;
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
  return wrapRow(content, data);
}

function renderTwoColumn(data: TwoColumnBlockData): string {
  const ratios = data.columnRatio.split('-').map(Number);
  const leftW = ratios[0] || 50;
  const rightW = ratios[1] || 50;
  const leftImgHtml = data.leftImageUrl ? `<img src="${data.leftImageUrl}" alt="${data.leftImageAlt || ''}" width="100%" style="display: block; max-width: 100%; height: auto; margin-bottom: 8px; border: 0;" />` : '';
  const rightImgHtml = data.rightImageUrl ? `<img src="${data.rightImageUrl}" alt="${data.rightImageAlt || ''}" width="100%" style="display: block; max-width: 100%; height: auto; margin-bottom: 8px; border: 0;" />` : '';
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
  <td width="${leftW}%" valign="top" style="${ff()} padding: 8px;">${leftImgHtml}<p style="margin: 0; ${ff()} font-size: 15px; line-height: 1.5;">${data.leftContent}</p></td>
  <td width="${rightW}%" valign="top" style="${ff()} padding: 8px;">${rightImgHtml}<p style="margin: 0; ${ff()} font-size: 15px; line-height: 1.5;">${data.rightContent}</p></td>
</tr>
</table>`;
  return wrapRow(content, data);
}

function renderAmenities(data: AmenitiesBlockData): string {
  const colWidth = Math.floor(100 / data.columns);
  const textColor = data.style.textColor || '#333333';
  const rows: string[] = [];
  for (let i = 0; i < data.items.length; i += data.columns) {
    const slice = data.items.slice(i, i + data.columns);
    // Pad last row with empty cells for consistent layout
    while (slice.length < data.columns) {
      slice.push({ label: '', description: '' });
    }
    const cells = slice.map(
      (item) => {
        if (!item.label) return `<td width="${colWidth}%" style="padding: 8px;">&nbsp;</td>`;
        // Auto-match icon from amenity library if not explicitly set
        const iconSrc = item.icon || _autoMatchIcon(item.label);
        return `<td width="${colWidth}%" valign="top" style="${ff()} padding: 10px 8px; text-align: center;">
        ${iconSrc ? `<img src="${iconSrc}" alt="${item.label}" width="28" height="28" style="display: block; margin: 0 auto 6px; width: 28px; height: 28px; border: 0;" />` : ''}
        <strong style="${ff()} font-size: 13px; line-height: 1.3; color: ${textColor};">${item.label}</strong>
        ${item.description ? `<br/><span style="${ff()} font-size: 12px; line-height: 1.4; color: #666666;">${item.description}</span>` : ''}
      </td>`;
      },
    ).join('');
    rows.push(`<tr>${cells}</tr>`);
  }
  const content = `<h2 style="margin: 0 0 16px; ${ff()} text-align: center; font-size: 20px; font-weight: 700; color: ${textColor};">${data.heading}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`;
  return wrapRow(content, data);
}

/** Try to auto-match an amenity icon by label from the icon library */
function _autoMatchIcon(label: string): string | undefined {
  const match = _matchIcon(label);
  return match?.svg;
}

function renderFloorplanSpotlight(data: FloorplanSpotlightBlockData): string {
  const content = `<h2 style="margin: 0 0 16px; ${ff()} text-align: center; font-size: 22px; color: ${data.style.textColor || '#333'};">${data.heading}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
  <td width="50%" valign="top" style="${ff()} padding: 8px;">
    <img src="${data.floorplanImageUrl}" alt="${data.floorplanImageAlt}" width="100%" style="display: block; max-width: 100%; height: auto; border: 0;" />
  </td>
  <td width="50%" valign="top" style="${ff()} padding: 16px;">
    <h3 style="margin: 0 0 8px; ${ff()} font-size: 18px;">${data.unitName}</h3>
    <p style="margin: 0 0 4px; ${ff()} font-size: 14px; color: #666;">${data.bedsBaths}</p>
    <p style="margin: 0 0 4px; ${ff()} font-size: 14px; color: #666;">${data.sqft} sq ft</p>
    <p style="margin: 0 0 16px; ${ff()} font-size: 18px; font-weight: 700; color: #333;">${data.price}</p>
    <a href="${data.buttonUrl}" target="_blank" style="display: inline-block; ${ff()} background-color: #2563eb; color: #fff; padding: 10px 24px; border-radius: 4px; text-decoration: none; font-size: 14px; line-height: 14px; font-weight: 600;">${data.buttonLabel}</a>
  </td>
</tr>
</table>`;
  return wrapRow(content, data);
}

function renderPromoBanner(data: PromoBannerBlockData): string {
  const bgImg = data.backgroundImageUrl ? `background-image: url('${data.backgroundImageUrl}'); background-size: cover; background-position: center;` : '';
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.backgroundColor}; ${bgImg}">
<tr><td style="${ff()} padding: 32px 24px; text-align: center;">
  <h2 style="margin: 0 0 8px; ${ff()} font-size: 26px; font-weight: 700; color: ${data.textColor};">${data.heading}</h2>
  ${data.subheading ? `<p style="margin: 0 0 16px; ${ff()} font-size: 16px; color: ${data.textColor}; opacity: 0.9;">${data.subheading}</p>` : ''}
  ${data.buttonLabel ? `<a href="${data.buttonUrl || '#'}" target="_blank" style="display: inline-block; ${ff()} background-color: #ffffff; color: ${data.backgroundColor}; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 16px; line-height: 16px; font-weight: 700;">${data.buttonLabel}</a>` : ''}
</td></tr>
</table>`;
  return `<tr><td>${content}</td></tr>`;
}

function renderCalloutBox(data: CalloutBoxBlockData): string {
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.backgroundColor}; border-left: 4px solid ${data.borderColor}; border-radius: 4px;">
<tr><td style="${ff()} padding: 20px 24px;">
  <h3 style="margin: 0 0 8px; ${ff()} font-size: 18px; font-weight: 700; color: #333;">${data.heading}</h3>
  <p style="margin: 0; ${ff()} font-size: 15px; line-height: 1.5; color: #555;">${data.body}</p>
</td></tr>
</table>`;
  return wrapRow(content, data);
}

function renderTestimonial(data: TestimonialBlockData): string {
  const stars = data.rating ? '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating) : '';
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="${ff()} padding: 24px; text-align: center;">
  ${stars ? `<p style="margin: 0 0 12px; ${ff()} font-size: 20px; color: #f59e0b;">${stars}</p>` : ''}
  <p style="margin: 0 0 16px; ${ff()} font-size: 16px; font-style: italic; line-height: 1.6; color: #555;">${data.quote}</p>
  ${data.avatarUrl ? `<img src="${data.avatarUrl}" alt="${data.authorName}" width="48" height="48" style="border-radius: 24px; display: inline-block; margin-bottom: 8px; border: 0;" />` : ''}
  <p style="margin: 0; ${ff()} font-size: 14px; font-weight: 700; color: #333;">${data.authorName}</p>
  ${data.authorTitle ? `<p style="margin: 2px 0 0; ${ff()} font-size: 13px; color: #888;">${data.authorTitle}</p>` : ''}
</td></tr>
</table>`;
  return wrapRow(content, data);
}

function renderFooter(data: FooterBlockData): string {
  const bg = data.style.backgroundColor || '#1e293b';
  const color = data.style.textColor || '#94a3b8';
  const socialHtml = data.socialLinks.length > 0
    ? `<p style="margin: 0 0 12px; ${ff()}">${data.socialLinks.map((s) => `<a href="${s.url}" style="${ff()} color: ${color}; text-decoration: underline; margin: 0 8px; font-size: 13px;">${s.platform}</a>`).join(' ')}</p>`
    : '';
  const content = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bg};">
<tr><td style="${ff()} padding: 32px 24px; text-align: center; color: ${color}; font-size: 13px; line-height: 1.6;">
  <p style="margin: 0 0 4px; ${ff()} font-weight: 700; font-size: 15px; color: #e2e8f0;">${data.companyName}</p>
  <p style="margin: 0 0 4px; ${ff()} color: ${color};">${data.address}</p>
  ${data.phone ? `<p style="margin: 0 0 4px; ${ff()} color: ${color};">${data.phone}</p>` : ''}
  ${data.email ? `<p style="margin: 0 0 4px; ${ff()}"><a href="mailto:${data.email}" style="${ff()} color: ${color}; text-decoration: none;">${data.email}</a></p>` : ''}
  ${data.website ? `<p style="margin: 0 0 12px; ${ff()}"><a href="https://${data.website}" style="${ff()} color: ${color}; text-decoration: none;">${data.website}</a></p>` : ''}
  ${socialHtml}
  ${data.legalText ? `<p style="margin: 12px 0 0; ${ff()} font-size: 11px; color: #64748b;">${data.legalText}</p>` : ''}
  ${data.unsubscribeUrl ? `<p style="margin: 8px 0 0; ${ff()}"><a href="${data.unsubscribeUrl}" style="${ff()} color: #64748b; font-size: 11px; text-decoration: underline;">Unsubscribe</a></p>` : ''}
</td></tr>
</table>`;
  return `<tr><td>${content}</td></tr>`;
}

function renderSocialLinks(data: SocialLinksBlockData): string {
  const links = data.links.map((link) => {
    const label = link.platform.charAt(0).toUpperCase() + link.platform.slice(1);
    return `<a href="${link.url}" style="display: inline-block; ${ff()} margin: 0 ${data.spacing / 2}px; text-decoration: none; color: #64748b; font-size: ${data.iconSize * 0.45}px;">${label}</a>`;
  }).join('');
  return wrapRow(`<div style="${ff()} text-align: ${data.alignment};">${links}</div>`, data);
}

function renderColorBar(data: ColorBarBlockData): string {
  return `<tr><td style="background-color: ${data.color}; height: ${data.height}px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>`;
}

function renderBrandedHeader(data: BrandedHeaderBlockData): string {
  const bgImg = data.backgroundImageUrl ? `background-image: url('${data.backgroundImageUrl}'); background-size: cover; background-position: ${data.objectPosition || 'center center'};` : '';
  const overlayRgba = hexToRgba(data.overlayColor, data.overlayOpacity);
  const content = `<!--[if gte mso 9]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:${data.height}px;">
<v:fill type="frame" src="${data.backgroundImageUrl}" color="${data.overlayColor}" />
<v:textbox inset="0,0,0,0"><center>
<![endif]-->
<div style="max-width: 600px; ${bgImg} height: ${data.height}px; position: relative;">
<div style="background-color: ${overlayRgba}; position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="position: relative; z-index: 1; height: ${data.height}px;">
<tr><td align="center" valign="middle" style="${ff()} padding: 20px; color: ${data.textColor}; text-align: center;">
${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.logoAlt}" width="${data.logoWidth}" style="display: block; margin: 0 auto 12px; max-width: 100%; height: auto; border: 0;" />` : ''}
${data.headingText ? `<h1 style="margin: 0; ${ff()} font-size: 24px; font-weight: 700; color: ${data.textColor};">${data.headingText}</h1>` : ''}
${data.subheadingText ? `<p style="margin: 4px 0 0; ${ff()} font-size: 14px; color: ${data.textColor}; opacity: 0.9;">${data.subheadingText}</p>` : ''}
</td></tr>
</table>
</div>
<!--[if gte mso 9]></center></v:textbox></v:rect><![endif]-->`;
  return `<tr><td>${content}</td></tr>`;
}

/** Convert hex + opacity to rgba string */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function renderVirtualTour(data: VirtualTourBlockData): string {
  const img = data.thumbnailUrl
    ? `<a href="${data.tourUrl}" target="_blank" style="text-decoration: none;"><img src="${data.thumbnailUrl}" alt="${data.thumbnailAlt}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" /></a>`
    : `<div style="${ff()} background-color: #f0f9ff; height: ${data.thumbnailHeight || 200}px; text-align: center; line-height: ${data.thumbnailHeight || 200}px; font-size: 48px;">&#127968;</div>`;
  const content = `<h2 style="margin: 0 0 8px; ${ff()} text-align: center; font-size: 20px; color: #333;">${data.heading}</h2>` +
    `<p style="margin: 0 0 16px; ${ff()} text-align: center; font-size: 14px; color: #666;">${data.description}</p>` +
    img +
    `<div style="${ff()} text-align: center; padding: 16px 0;"><a href="${data.tourUrl}" target="_blank" style="display: inline-block; ${ff()} background-color: ${data.buttonColor}; color: ${data.buttonTextColor}; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; line-height: 14px; font-weight: 700;">${data.buttonLabel}</a></div>`;
  return wrapRow(content, data);
}

// ---- Main block renderer ----

function renderBlock(block: EmailBlock): string {
  if (!block.data.visible) return '';

  switch (block.type) {
    case 'header': return renderHeader(block.data as HeaderBlockData);
    case 'logo': return renderLogo(block.data as LogoBlockData);
    case 'hero-image': return renderHeroImage(block.data as HeroImageBlockData);
    case 'text': return renderText(block.data as TextBlockData);
    case 'button': return renderButton(block.data as ButtonBlockData);
    case 'spacer': return renderSpacer(block.data as SpacerBlockData);
    case 'divider': return renderDivider(block.data as DividerBlockData);
    case 'image-text': return renderImageText(block.data as ImageTextBlockData);
    case 'two-column': return renderTwoColumn(block.data as TwoColumnBlockData);
    case 'amenities': return renderAmenities(block.data as AmenitiesBlockData);
    case 'floorplan-spotlight': return renderFloorplanSpotlight(block.data as FloorplanSpotlightBlockData);
    case 'promo-banner': return renderPromoBanner(block.data as PromoBannerBlockData);
    case 'callout-box': return renderCalloutBox(block.data as CalloutBoxBlockData);
    case 'testimonial': return renderTestimonial(block.data as TestimonialBlockData);
    case 'footer': return renderFooter(block.data as FooterBlockData);
    case 'social-links': return renderSocialLinks(block.data as SocialLinksBlockData);
    case 'color-bar': return renderColorBar(block.data as ColorBarBlockData);
    case 'branded-header': return renderBrandedHeader(block.data as BrandedHeaderBlockData);
    case 'virtual-tour': return renderVirtualTour(block.data as VirtualTourBlockData);
    default: return '';
  }
}

// ---- Main export function ----

export function generateEmailHtml(blocks: EmailBlock[], globalStyles: EmailGlobalStyles): string {
  const {
    bodyBackgroundColor,
    contentBackgroundColor,
    contentWidth,
    fontFamily,
    fontFallback,
    defaultTextColor,
  } = globalStyles;

  // Set the module-level font stack used by ff() in every renderer
  setFont(globalStyles);

  const blockHtml = blocks.map(renderBlock).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<title></title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style type="text/css">
body, table, td, p, a, span {font-family: ${fontFamily}, sans-serif !important;}
</style>
<![endif]-->
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bodyBackgroundColor}; ${ff()} color: ${defaultTextColor};">
<center style="width: 100%; background-color: ${bodyBackgroundColor};">
<!--[if mso | IE]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${contentWidth}" align="center" style="width:${contentWidth}px;">
<tr>
<td>
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${contentWidth}" style="max-width: ${contentWidth}px; width: 100%; margin: 0 auto; background-color: ${contentBackgroundColor};">
${blockHtml}
</table>
<!--[if mso | IE]>
</td>
</tr>
</table>
<![endif]-->
</center>
</body>
</html>`;
}

/**
 * Generate just the inner HTML (without DOCTYPE/head) for Entrata paste-in.
 * Includes MSO font conditional at the top so Outlook still renders correctly.
 * All font-family is inlined on every element, so no <style> block dependency.
 */
export function generateEmailBodyHtml(blocks: EmailBlock[], globalStyles: EmailGlobalStyles): string {
  // Set the module-level font stack used by ff() in every renderer
  setFont(globalStyles);

  const blockHtml = blocks.map(renderBlock).filter(Boolean).join('\n');
  return `<!--[if mso]>
<style type="text/css">
body, table, td, p, a, span {font-family: ${globalStyles.fontFamily}, sans-serif !important;}
</style>
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${globalStyles.contentWidth}" style="max-width: ${globalStyles.contentWidth}px; width: 100%; margin: 0 auto; background-color: ${globalStyles.contentBackgroundColor}; ${ff()} color: ${globalStyles.defaultTextColor};">
${blockHtml}
</table>`;
}
