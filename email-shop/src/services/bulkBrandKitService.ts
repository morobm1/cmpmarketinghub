/**
 * Bulk Brand Kit Import/Export Service
 *
 * Generates an Excel template for admins to fill in brand kit data
 * (including image URLs from Entrata), and parses uploaded Excel files
 * into BrandKit objects for import.
 *
 * Import is ADDITIVE — never deletes or overwrites existing kits.
 * Property matching is done by name (fuzzy) with admin confirmation.
 */
import * as XLSX from 'xlsx';
import type { BrandKit, BrandColor, BrandFont, ButtonStyle, ContentSnippet, BrandLink, BrandLinkCategory, Asset } from '@/types';

// ---- Excel Template Generation ----

export function downloadBrandKitTemplate(): void {
  const wb = XLSX.utils.book_new();

  // ── Instructions sheet (first so it's visible on open) ──
  const instrData = [
    ['Brand Kit Bulk Import Template — Instructions'],
    [''],
    ['HOW TO USE:'],
    ['1. Fill out each sheet with your property brand kit data.'],
    ['2. The "kitName" column ties data across ALL sheets — it MUST match exactly.'],
    ['3. Give each kit a unique, descriptive name (e.g., "Parkview Tower - Primary").'],
    ['4. Use "propertyName" (not ID) — the system will match to existing properties on import.'],
    ['5. Delete the example rows before uploading.'],
    ['6. Upload the completed file via Brand Kit Manager → Bulk Import.'],
    [''],
    ['IMPORTANT:'],
    ['• Importing is ADDITIVE — it will NOT delete or overwrite existing brand kits.'],
    ['• If you import a kit for a property that already has one, both kits will exist.'],
    ['• You can run multiple imports — each one adds new kits.'],
    ['• For images, paste the full Entrata image URL in the "url" column.'],
    ['• Add tags to images for auto-association with templates (e.g., Exterior, Pool, Lobby).'],
    [''],
    ['SHEET DESCRIPTIONS:'],
    ['• Brand Kits — One row per property with contact info.'],
    ['• Logos — Logo image URLs with tags (e.g., Primary, White, Dark).'],
    ['• Photos — Property photos with tags (e.g., Exterior, Pool, Gym, Kitchen).'],
    ['• Floorplans — Floorplan images with tags (e.g., Studio, 1BR, 2BR).'],
    ['• Colors — Brand colors (hex values).'],
    ['• Fonts — Font definitions (heading, body, accent).'],
    ['• Button Styles — CTA button presets.'],
    ['• Snippets — Reusable content blocks.'],
    [''],
    ['IMAGE TAG SUGGESTIONS:'],
    ['Logos: Primary, Secondary, White, Dark, Icon, Full, Horizontal, Stacked'],
    ['Photos: Exterior, Interior, Lobby, Pool, Gym, Kitchen, Bedroom, Bathroom, Living Room, Rooftop, Pet Area, Study Lounge, Bike Storage, Events, Community, Parking, Laundry, Amenity'],
    ['Floorplans: Studio, 1BR, 2BR, 3BR, 4BR, Penthouse, Townhome, Loft'],
    [''],
    ['SNIPPET CATEGORY OPTIONS:'],
    ['footer, contact, legal, promo, custom'],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instrData);
  instrSheet['!cols'] = [{ wch: 95 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  // ── Brand Kits sheet ──
  const bkData = [
    ['kitName', 'propertyName', 'phone', 'email', 'address', 'website', 'footerHtml'],
    ['Parkview Tower - Primary', 'Parkview Tower', '(555) 123-4567', 'leasing@parkviewtower.com', '100 Main St, City, ST 12345', 'https://parkviewtower.com', ''],
    ['Sunrise Lofts - Primary', 'Sunrise Lofts', '(555) 987-6543', 'info@sunriselofts.com', '200 Oak Ave, Town, ST 67890', 'https://sunriselofts.com', ''],
  ];
  const bkSheet = XLSX.utils.aoa_to_sheet(bkData);
  bkSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 35 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, bkSheet, 'Brand Kits');

  // ── Logos sheet ──
  const logoData = [
    ['kitName', 'name', 'url', 'tags', 'altText'],
    ['Parkview Tower - Primary', 'Primary Logo', 'https://images.entrata.com/...logo.png', 'Primary, Full', 'Parkview Tower logo'],
    ['Parkview Tower - Primary', 'White Logo', 'https://images.entrata.com/...logo-white.png', 'White, Horizontal', 'Parkview Tower white logo'],
    ['Sunrise Lofts - Primary', 'Main Logo', 'https://images.entrata.com/...sl-logo.png', 'Primary', 'Sunrise Lofts logo'],
  ];
  const logoSheet = XLSX.utils.aoa_to_sheet(logoData);
  logoSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 55 }, { wch: 28 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, logoSheet, 'Logos');

  // ── Photos sheet ──
  const photoData = [
    ['kitName', 'name', 'url', 'tags', 'altText'],
    ['Parkview Tower - Primary', 'Building Exterior', 'https://images.entrata.com/...exterior.jpg', 'Exterior, Building', 'Parkview Tower exterior view'],
    ['Parkview Tower - Primary', 'Pool Area', 'https://images.entrata.com/...pool.jpg', 'Pool, Amenity', 'Resort-style pool'],
    ['Parkview Tower - Primary', 'Fitness Center', 'https://images.entrata.com/...gym.jpg', 'Gym, Amenity, Interior', 'State-of-the-art fitness center'],
    ['Parkview Tower - Primary', 'Kitchen', 'https://images.entrata.com/...kitchen.jpg', 'Kitchen, Interior', 'Modern kitchen with granite countertops'],
    ['Sunrise Lofts - Primary', 'Building Front', 'https://images.entrata.com/...front.jpg', 'Exterior, Building', 'Sunrise Lofts building front'],
    ['Sunrise Lofts - Primary', 'Lobby', 'https://images.entrata.com/...lobby.jpg', 'Lobby, Interior', 'Welcome lobby'],
  ];
  const photoSheet = XLSX.utils.aoa_to_sheet(photoData);
  photoSheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 55 }, { wch: 30 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, photoSheet, 'Photos');

  // ── Floorplans sheet ──
  const fpData = [
    ['kitName', 'name', 'url', 'tags', 'altText'],
    ['Parkview Tower - Primary', 'Studio A', 'https://images.entrata.com/...studio-a.png', 'Studio', 'Studio A floorplan'],
    ['Parkview Tower - Primary', '1BR B', 'https://images.entrata.com/...1br-b.png', '1BR', '1 Bedroom B floorplan'],
    ['Parkview Tower - Primary', '2BR C', 'https://images.entrata.com/...2br-c.png', '2BR', '2 Bedroom C floorplan'],
    ['Sunrise Lofts - Primary', '1BR Loft', 'https://images.entrata.com/...1br-loft.png', '1BR, Loft', '1BR Loft floorplan'],
  ];
  const fpSheet = XLSX.utils.aoa_to_sheet(fpData);
  fpSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 55 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, fpSheet, 'Floorplans');

  // ── Colors sheet ──
  const colorData = [
    ['kitName', 'colorName', 'hex'],
    ['Parkview Tower - Primary', 'Primary Blue', '#1e40af'],
    ['Parkview Tower - Primary', 'Accent Gold', '#f59e0b'],
    ['Parkview Tower - Primary', 'Dark Text', '#1e293b'],
    ['Parkview Tower - Primary', 'Light Background', '#f8fafc'],
    ['Sunrise Lofts - Primary', 'Primary Green', '#059669'],
    ['Sunrise Lofts - Primary', 'Accent Coral', '#fb7185'],
  ];
  const colorSheet = XLSX.utils.aoa_to_sheet(colorData);
  colorSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, colorSheet, 'Colors');

  // ── Fonts sheet ──
  const fontData = [
    ['kitName', 'fontName', 'family', 'weight', 'fallback'],
    ['Parkview Tower - Primary', 'Heading', 'Montserrat', '700', 'Arial, Helvetica, sans-serif'],
    ['Parkview Tower - Primary', 'Body', 'Open Sans', '400', 'Arial, Helvetica, sans-serif'],
    ['Sunrise Lofts - Primary', 'Heading', 'Playfair Display', '700', 'Georgia, Times, serif'],
    ['Sunrise Lofts - Primary', 'Body', 'Roboto', '400', 'Arial, Helvetica, sans-serif'],
  ];
  const fontSheet = XLSX.utils.aoa_to_sheet(fontData);
  fontSheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 8 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, fontSheet, 'Fonts');

  // ── Button Styles sheet ──
  const buttonData = [
    ['kitName', 'styleName', 'backgroundColor', 'textColor', 'borderRadius', 'paddingX', 'paddingY', 'fontSize', 'fontWeight'],
    ['Parkview Tower - Primary', 'Primary CTA', '#1e40af', '#ffffff', '6', '24', '12', '16', '700'],
    ['Parkview Tower - Primary', 'Secondary CTA', '#f59e0b', '#1e293b', '6', '24', '12', '14', '600'],
    ['Sunrise Lofts - Primary', 'Primary CTA', '#059669', '#ffffff', '8', '28', '14', '16', '700'],
  ];
  const buttonSheet = XLSX.utils.aoa_to_sheet(buttonData);
  buttonSheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, buttonSheet, 'Button Styles');

  // ── Snippets sheet ──
  const snippetData = [
    ['kitName', 'snippetName', 'content', 'category'],
    ['Parkview Tower - Primary', 'Legal Footer', '© 2026 Parkview Tower. All rights reserved. Equal Housing Opportunity.', 'legal'],
    ['Parkview Tower - Primary', 'Contact Block', 'Questions? Call us at (555) 123-4567 or email leasing@parkviewtower.com', 'contact'],
    ['Sunrise Lofts - Primary', 'Legal Footer', '© 2026 Sunrise Lofts. All rights reserved. Equal Housing Opportunity.', 'legal'],
  ];
  const snippetSheet = XLSX.utils.aoa_to_sheet(snippetData);
  snippetSheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 60 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, snippetSheet, 'Snippets');

  // ── Links sheet ──
  const linkData = [
    ['kitName', 'label', 'url', 'category'],
    ['Parkview Tower - Primary', 'Main Website', 'https://parkviewtower.com', 'website'],
    ['Parkview Tower - Primary', 'Prospect Portal', 'https://parkviewtower.entrata.com/prospect', 'prospect-portal'],
    ['Parkview Tower - Primary', 'Resident Portal', 'https://parkviewtower.entrata.com/resident', 'resident-portal'],
    ['Parkview Tower - Primary', 'Apply Now', 'https://parkviewtower.entrata.com/apply', 'apply'],
    ['Parkview Tower - Primary', 'Schedule a Tour', 'https://parkviewtower.entrata.com/tour', 'tour'],
    ['Sunrise Lofts - Primary', 'Main Website', 'https://sunriselofts.com', 'website'],
    ['Sunrise Lofts - Primary', 'Resident Portal', 'https://sunriselofts.entrata.com/resident', 'resident-portal'],
  ];
  const linkSheet = XLSX.utils.aoa_to_sheet(linkData);
  linkSheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 55 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, linkSheet, 'Links');

  XLSX.writeFile(wb, 'BrandKit_Import_Template.xlsx');
}

// ---- Excel Parsing ----

interface ParsedRow {
  [key: string]: string | undefined;
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): ParsedRow[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  if (raw.length < 2) return [];

  const headers = (raw[0] as string[]).map((h) => String(h || '').trim());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i] as string[];
    if (!cells || cells.every((c) => !c)) continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = String(cells[idx] ?? '').trim();
    });
    if (row.kitName) rows.push(row);
  }
  return rows;
}

function parseTags(tagStr: string | undefined): string[] {
  if (!tagStr) return [];
  return tagStr.split(',').map((t) => t.trim()).filter(Boolean);
}

function makeAsset(
  row: ParsedRow,
  category: 'logo' | 'photo' | 'floorplan',
  propertyId: string,
): Asset {
  const uid = 'imp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const url = row.url || '';
  return {
    id: uid,
    name: row.name || 'Image',
    category,
    thumbnailUrl: url,
    sourceUrl: url,
    altText: row.altText || row.name || '',
    propertyId,
    tags: parseTags(row.tags),
    createdAt: new Date().toISOString(),
  };
}

// ---- Types for pre-import review ----

/** A parsed kit awaiting property confirmation before saving */
export interface PendingBrandKit {
  kitName: string;
  propertyNameFromExcel: string;
  matchedPropertyId: string;
  matchedPropertyName: string;
  matchConfidence: 'exact' | 'close' | 'none';
  brandKit: BrandKit;
}

export interface KnownProperty {
  id: string;
  name: string;
}

/** Fuzzy-match a name against known properties */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchProperty(
  inputName: string,
  properties: KnownProperty[],
): { id: string; name: string; confidence: 'exact' | 'close' | 'none' } {
  const norm = normalize(inputName);
  if (!norm) return { id: '', name: inputName, confidence: 'none' };

  // Exact match
  for (const p of properties) {
    if (normalize(p.name) === norm) {
      return { id: p.id, name: p.name, confidence: 'exact' };
    }
  }

  // Close match — check if input contains or is contained in a property name
  let bestMatch: KnownProperty | null = null;
  let bestScore = 0;
  for (const p of properties) {
    const pNorm = normalize(p.name);
    if (!pNorm) continue;

    // Check containment both ways
    if (pNorm.includes(norm) || norm.includes(pNorm)) {
      const score = Math.min(norm.length, pNorm.length) / Math.max(norm.length, pNorm.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    // Simple character overlap scoring
    const overlap = [...new Set(norm)].filter((c) => pNorm.includes(c)).length;
    const charScore = overlap / Math.max(new Set(norm).size, new Set(pNorm).size);
    if (charScore > 0.7 && charScore > bestScore) {
      bestScore = charScore;
      bestMatch = p;
    }
  }

  if (bestMatch && bestScore > 0.4) {
    return { id: bestMatch.id, name: bestMatch.name, confidence: 'close' };
  }

  return { id: '', name: inputName, confidence: 'none' };
}

/** Fetch all known properties from the API */
export async function fetchProperties(): Promise<KnownProperty[]> {
  try {
    const res = await fetch('/.netlify/functions/properties', { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Parse an uploaded Excel file into PendingBrandKit objects.
 * These include property matching info for admin confirmation.
 */
export function parseExcelToPendingKits(
  file: File,
  knownProperties: KnownProperty[],
): Promise<PendingBrandKit[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        const kitRows = sheetToRows(wb, 'Brand Kits');
        const logoRows = sheetToRows(wb, 'Logos');
        const photoRows = sheetToRows(wb, 'Photos');
        const floorplanRows = sheetToRows(wb, 'Floorplans');
        const colorRows = sheetToRows(wb, 'Colors');
        const fontRows = sheetToRows(wb, 'Fonts');
        const buttonRows = sheetToRows(wb, 'Button Styles');
        const snippetRows = sheetToRows(wb, 'Snippets');
        const linkRows = sheetToRows(wb, 'Links');

        if (kitRows.length === 0) {
          reject(new Error('No brand kit rows found in the "Brand Kits" sheet.'));
          return;
        }

        const pendingKits: PendingBrandKit[] = kitRows.map((row) => {
          const kitName = row.kitName || '';
          const propertyNameFromExcel = row.propertyName || kitName;
          const now = new Date().toISOString();
          const uid = () => 'imp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

          // Match property by name
          const match = matchProperty(propertyNameFromExcel, knownProperties);
          const propertyId = match.id || ('new-' + normalize(propertyNameFromExcel || 'unknown'));

          // Logos
          const logos: Asset[] = logoRows
            .filter((r) => r.kitName === kitName)
            .filter((r) => r.url)
            .map((r) => makeAsset(r, 'logo', propertyId));

          // Photos
          const images: Asset[] = photoRows
            .filter((r) => r.kitName === kitName)
            .filter((r) => r.url)
            .map((r) => makeAsset(r, 'photo', propertyId));

          // Floorplans
          const floorplans: Asset[] = floorplanRows
            .filter((r) => r.kitName === kitName)
            .filter((r) => r.url)
            .map((r) => makeAsset(r, 'floorplan', propertyId));

          // Colors
          const colors: BrandColor[] = colorRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.colorName || 'Color',
              hex: (r.hex || '').startsWith('#') ? r.hex! : '#' + (r.hex || '000000'),
            }));

          // Fonts
          const fonts: BrandFont[] = fontRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.fontName || 'Font',
              family: r.family || 'Arial',
              weight: r.weight ? parseInt(r.weight, 10) : undefined,
              fallback: r.fallback || 'Arial, Helvetica, sans-serif',
            }));

          if (fonts.length === 0) {
            fonts.push({ id: uid(), name: 'Primary', family: 'Arial', fallback: 'Helvetica, sans-serif' });
          }

          // Button Styles
          const buttonStyles: ButtonStyle[] = buttonRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.styleName || 'Button',
              backgroundColor: r.backgroundColor || '#000000',
              textColor: r.textColor || '#ffffff',
              borderRadius: parseInt(r.borderRadius || '6', 10) || 6,
              paddingX: parseInt(r.paddingX || '24', 10) || 24,
              paddingY: parseInt(r.paddingY || '12', 10) || 12,
              fontSize: parseInt(r.fontSize || '16', 10) || 16,
              fontWeight: parseInt(r.fontWeight || '700', 10) || 700,
            }));

          // Snippets
          const snippets: ContentSnippet[] = snippetRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.snippetName || 'Snippet',
              content: r.content || '',
              category: (['footer', 'contact', 'legal', 'promo', 'custom'].includes(r.category || '')
                ? r.category!
                : 'custom') as ContentSnippet['category'],
            }));

          // Links
          const validLinkCategories = ['website', 'prospect-portal', 'resident-portal', 'apply', 'tour', 'survey', 'google-form', 'social', 'other'];
          const links: BrandLink[] = linkRows
            .filter((r) => r.kitName === kitName)
            .filter((r) => r.url)
            .map((r) => ({
              id: uid(),
              label: r.label || 'Link',
              url: r.url || '',
              category: (validLinkCategories.includes(r.category || '') ? r.category! : 'other') as BrandLinkCategory,
            }));

          const brandKit: BrandKit = {
            id: 'bk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            propertyId,
            propertyName: match.confidence !== 'none' ? match.name : propertyNameFromExcel,
            logos,
            images,
            floorplans,
            colors,
            fonts,
            buttonStyles,
            snippets,
            links,
            contactInfo: {
              phone: row.phone || '',
              email: row.email || '',
              address: row.address || '',
              website: row.website || '',
            },
            footerHtml: row.footerHtml || '',
            createdAt: now,
            updatedAt: now,
          };

          return {
            kitName,
            propertyNameFromExcel,
            matchedPropertyId: match.id,
            matchedPropertyName: match.name,
            matchConfidence: match.confidence,
            brandKit,
          };
        });

        resolve(pendingKits);
      } catch (err) {
        reject(new Error('Failed to parse Excel: ' + (err instanceof Error ? err.message : String(err))));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Update a pending kit's property assignment (when admin overrides the match).
 */
export function reassignPendingKit(
  pending: PendingBrandKit,
  property: KnownProperty,
): PendingBrandKit {
  const updated = { ...pending };
  updated.matchedPropertyId = property.id;
  updated.matchedPropertyName = property.name;
  updated.matchConfidence = 'exact';
  updated.brandKit = {
    ...updated.brandKit,
    propertyId: property.id,
    propertyName: property.name,
    logos: updated.brandKit.logos.map((a) => ({ ...a, propertyId: property.id })),
    images: updated.brandKit.images.map((a) => ({ ...a, propertyId: property.id })),
    floorplans: updated.brandKit.floorplans.map((a) => ({ ...a, propertyId: property.id })),
  };
  return updated;
}
