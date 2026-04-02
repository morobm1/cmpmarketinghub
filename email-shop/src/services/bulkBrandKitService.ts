/**
 * Bulk Brand Kit Import/Export Service
 *
 * Generates an Excel template for admins to fill in brand kit data,
 * and parses uploaded Excel files into BrandKit objects for import.
 *
 * The import is ADDITIVE — it never deletes or overwrites existing kits.
 * If a property already has a kit, the imported one becomes a second kit
 * for that property, distinguished by its kitName.
 */
import * as XLSX from 'xlsx';
import type { BrandKit, BrandColor, BrandFont, ButtonStyle, ContentSnippet } from '@/types';

// ---- Sheet column definitions ----

const BRAND_KIT_COLS = [
  'kitName',
  'propertyId',
  'propertyName',
  'phone',
  'email',
  'address',
  'website',
  'footerHtml',
];

const COLOR_COLS = ['kitName', 'colorName', 'hex'];

const FONT_COLS = ['kitName', 'fontName', 'family', 'weight', 'fallback'];

const BUTTON_COLS = [
  'kitName',
  'styleName',
  'backgroundColor',
  'textColor',
  'borderRadius',
  'paddingX',
  'paddingY',
  'fontSize',
  'fontWeight',
];

const SNIPPET_COLS = ['kitName', 'snippetName', 'content', 'category'];

// ---- Template Generation ----

/** Generate and download an Excel template for bulk brand kit import */
export function downloadBrandKitTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Brand Kits sheet — one row per property kit
  const bkData = [
    BRAND_KIT_COLS,
    [
      'Parkview Tower - Primary',
      'parkview-tower',
      'Parkview Tower',
      '(555) 123-4567',
      'leasing@parkviewtower.com',
      '100 Main St, City, ST 12345',
      'https://parkviewtower.com',
      '',
    ],
    [
      'Sunrise Lofts - Primary',
      'sunrise-lofts',
      'Sunrise Lofts',
      '(555) 987-6543',
      'info@sunriselofts.com',
      '200 Oak Ave, Town, ST 67890',
      'https://sunriselofts.com',
      '',
    ],
  ];
  const bkSheet = XLSX.utils.aoa_to_sheet(bkData);
  bkSheet['!cols'] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
    { wch: 35 },
    { wch: 30 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, bkSheet, 'Brand Kits');

  // Colors sheet
  const colorData = [
    COLOR_COLS,
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

  // Fonts sheet
  const fontData = [
    FONT_COLS,
    ['Parkview Tower - Primary', 'Heading', 'Montserrat', '700', 'Arial, Helvetica, sans-serif'],
    ['Parkview Tower - Primary', 'Body', 'Open Sans', '400', 'Arial, Helvetica, sans-serif'],
    ['Sunrise Lofts - Primary', 'Heading', 'Playfair Display', '700', 'Georgia, Times, serif'],
    ['Sunrise Lofts - Primary', 'Body', 'Roboto', '400', 'Arial, Helvetica, sans-serif'],
  ];
  const fontSheet = XLSX.utils.aoa_to_sheet(fontData);
  fontSheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 8 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, fontSheet, 'Fonts');

  // Button Styles sheet
  const buttonData = [
    BUTTON_COLS,
    ['Parkview Tower - Primary', 'Primary CTA', '#1e40af', '#ffffff', '6', '24', '12', '16', '700'],
    ['Parkview Tower - Primary', 'Secondary CTA', '#f59e0b', '#1e293b', '6', '24', '12', '14', '600'],
    ['Sunrise Lofts - Primary', 'Primary CTA', '#059669', '#ffffff', '8', '28', '14', '16', '700'],
  ];
  const buttonSheet = XLSX.utils.aoa_to_sheet(buttonData);
  buttonSheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, buttonSheet, 'Button Styles');

  // Snippets sheet
  const snippetData = [
    SNIPPET_COLS,
    [
      'Parkview Tower - Primary',
      'Legal Footer',
      '© 2026 Parkview Tower. All rights reserved. Equal Housing Opportunity.',
      'legal',
    ],
    [
      'Parkview Tower - Primary',
      'Contact Block',
      'Questions? Call us at (555) 123-4567 or email leasing@parkviewtower.com',
      'contact',
    ],
    [
      'Sunrise Lofts - Primary',
      'Legal Footer',
      '© 2026 Sunrise Lofts. All rights reserved. Equal Housing Opportunity.',
      'legal',
    ],
  ];
  const snippetSheet = XLSX.utils.aoa_to_sheet(snippetData);
  snippetSheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 60 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, snippetSheet, 'Snippets');

  // Instructions sheet
  const instrData = [
    ['Brand Kit Bulk Import Template — Instructions'],
    [''],
    ['HOW TO USE:'],
    ['1. Fill out each sheet with your property brand kit data.'],
    ['2. The "kitName" column ties data across sheets — it MUST match exactly.'],
    ['3. Give each kit a unique, descriptive name (e.g., "Parkview Tower - Primary").'],
    ['4. Delete the example rows before uploading.'],
    ['5. Upload the completed file via the Brand Kit Manager in Creative Studio.'],
    [''],
    ['IMPORTANT NOTES:'],
    ['• Importing is ADDITIVE — it will NOT delete or overwrite your existing brand kits.'],
    ['• If you import a kit for a property that already has one, both kits will exist.'],
    ['• You can run multiple imports — each one adds new kits without affecting old ones.'],
    ['• Images/logos/floorplans cannot be imported via Excel — add them in the editor after import.'],
    [''],
    ['SHEET DESCRIPTIONS:'],
    ['• Brand Kits — One row per property kit with basic info and contact details.'],
    ['• Colors — Brand colors. Add as many rows per kit as needed.'],
    ['• Fonts — Font definitions. Typically 1-3 per kit (heading, body, accent).'],
    ['• Button Styles — CTA button presets with color, size, and border radius.'],
    ['• Snippets — Reusable content blocks (footer, contact, legal, promo, custom).'],
    [''],
    ['CATEGORY OPTIONS FOR SNIPPETS:'],
    ['footer, contact, legal, promo, custom'],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instrData);
  instrSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

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
    if (!cells || cells.every((c) => !c)) continue; // skip empty rows
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = String(cells[idx] ?? '').trim();
    });
    if (row.kitName) rows.push(row);
  }
  return rows;
}

/** Parse an uploaded Excel file into BrandKit objects ready for saving */
export function parseExcelToBrandKits(file: File): Promise<BrandKit[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Parse each sheet
        const kitRows = sheetToRows(wb, 'Brand Kits');
        const colorRows = sheetToRows(wb, 'Colors');
        const fontRows = sheetToRows(wb, 'Fonts');
        const buttonRows = sheetToRows(wb, 'Button Styles');
        const snippetRows = sheetToRows(wb, 'Snippets');

        if (kitRows.length === 0) {
          reject(new Error('No brand kit rows found in the "Brand Kits" sheet. Make sure the sheet exists and has data.'));
          return;
        }

        // Build kits keyed by kitName
        const kits: BrandKit[] = kitRows.map((row) => {
          const kitName = row.kitName;
          const now = new Date().toISOString();
          const uid = () => 'imp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

          // Colors for this kit
          const colors: BrandColor[] = colorRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.colorName || 'Color',
              hex: r.hex?.startsWith('#') ? r.hex : '#' + (r.hex || '000000'),
            }));

          // Fonts for this kit
          const fonts: BrandFont[] = fontRows
            .filter((r) => r.kitName === kitName)
            .map((r) => ({
              id: uid(),
              name: r.fontName || 'Font',
              family: r.family || 'Arial',
              weight: r.weight ? parseInt(r.weight, 10) : undefined,
              fallback: r.fallback || 'Arial, Helvetica, sans-serif',
            }));

          // Button Styles for this kit
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

          // Snippets for this kit
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

          // If no fonts provided, add a default
          if (fonts.length === 0) {
            fonts.push({
              id: uid(),
              name: 'Primary',
              family: 'Arial',
              fallback: 'Helvetica, sans-serif',
            });
          }

          const kit: BrandKit = {
            id: 'bk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            propertyId: row.propertyId || 'prop-' + Date.now(),
            propertyName: row.propertyName || kitName || 'Unknown Property',
            logos: [],
            images: [],
            floorplans: [],
            colors,
            fonts,
            buttonStyles,
            snippets,
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

          return kit;
        });

        resolve(kits);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + (err instanceof Error ? err.message : String(err))));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
