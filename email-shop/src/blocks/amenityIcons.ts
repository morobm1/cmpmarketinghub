/**
 * Amenity icon library for housing/apartment email marketing.
 * Uses inline SVG data URIs for email compatibility.
 * These are simple line icons that render well in email clients.
 */

export interface AmenityIcon {
  id: string;
  name: string;
  category: string;
  svg: string; // inline SVG data URI
}

// Simple SVG icon generator helper
function icon(paths: string, vb = '0 0 24 24'): string {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="' + vb + '" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
  );
}

/** Re-color an amenity icon SVG data URI to a new stroke color */
export function recolorIcon(svgDataUri: string, newColor: string): string {
  const decoded = decodeURIComponent(svgDataUri.replace('data:image/svg+xml,', ''));
  const recolored = decoded.replace(/stroke="[^"]*"/g, 'stroke="' + newColor + '"');
  return 'data:image/svg+xml,' + encodeURIComponent(recolored);
}

export const amenityIcons: AmenityIcon[] = [
  // Fitness & Recreation
  { id: 'pool', name: 'Swimming Pool', category: 'Recreation', svg: icon('<path d="M2 12h2a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h2"/><path d="M2 16h2a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h2"/><line x1="9" y1="6" x2="9" y2="12"/><line x1="15" y1="4" x2="15" y2="12"/>') },
  { id: 'fitness', name: 'Fitness Center', category: 'Recreation', svg: icon('<circle cx="6.5" cy="6.5" r="2.5"/><path d="M6.5 9v6"/><path d="M2 18h9"/><path d="M18 6l-4 4 2 2 4-4"/><circle cx="20" cy="4" r="2"/>') },
  { id: 'yoga', name: 'Yoga Studio', category: 'Recreation', svg: icon('<circle cx="12" cy="4" r="2"/><path d="M12 6v4"/><path d="M8 14l4-4 4 4"/><path d="M6 18h12"/>') },
  { id: 'basketball', name: 'Basketball Court', category: 'Recreation', svg: icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 12h20"/>') },
  { id: 'game-room', name: 'Game Room', category: 'Recreation', svg: icon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><line x1="11" y1="10" x2="13" y2="14"/>') },
  { id: 'spa', name: 'Spa / Hot Tub', category: 'Recreation', svg: icon('<path d="M9 6c0-1.5 1.5-3 3-3s3 1.5 3 3"/><path d="M6 9c-1.5 0-3 1.5-3 3s1.5 3 3 3"/><path d="M18 9c1.5 0 3 1.5 3 3s-1.5 3-3 3"/><ellipse cx="12" cy="16" rx="8" ry="4"/><path d="M8 6v0"/><path d="M12 3v0"/><path d="M16 6v0"/>') },

  // Common Areas
  { id: 'clubhouse', name: 'Clubhouse', category: 'Common Areas', svg: icon('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><rect x="9" y="13" width="6" height="8"/><line x1="12" y1="9" x2="12" y2="9.01"/>') },
  { id: 'lounge', name: 'Resident Lounge', category: 'Common Areas', svg: icon('<path d="M20 10V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><rect x="2" y="10" width="20" height="6" rx="2"/><path d="M4 16v4"/><path d="M20 16v4"/>') },
  { id: 'study', name: 'Study Lounge', category: 'Common Areas', svg: icon('<rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M8 21h8"/><path d="M12 17v4"/>') },
  { id: 'coworking', name: 'Co-Working Space', category: 'Common Areas', svg: icon('<rect x="2" y="7" width="8" height="10" rx="1"/><rect x="14" y="7" width="8" height="10" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>') },
  { id: 'rooftop', name: 'Rooftop Deck', category: 'Common Areas', svg: icon('<path d="M2 20h20"/><path d="M4 20V8l8-5 8 5v12"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><circle cx="12" cy="6" r="1"/>') },
  { id: 'bbq', name: 'BBQ / Grill Area', category: 'Common Areas', svg: icon('<rect x="4" y="10" width="16" height="8" rx="2"/><path d="M8 10V6"/><path d="M12 10V4"/><path d="M16 10V6"/><line x1="4" y1="18" x2="4" y2="21"/><line x1="20" y1="18" x2="20" y2="21"/>') },

  // In-Unit Features
  { id: 'washer', name: 'In-Unit Laundry', category: 'In-Unit', svg: icon('<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/><line x1="7" y1="6" x2="7" y2="6.01"/><line x1="10" y1="6" x2="10" y2="6.01"/>') },
  { id: 'kitchen', name: 'Full Kitchen', category: 'In-Unit', svg: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/>') },
  { id: 'furnished', name: 'Furnished', category: 'In-Unit', svg: icon('<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><rect x="2" y="9" width="20" height="7" rx="2"/><path d="M4 16v4"/><path d="M20 16v4"/><line x1="2" y1="20" x2="22" y2="20"/>') },
  { id: 'balcony', name: 'Private Balcony', category: 'In-Unit', svg: icon('<rect x="3" y="3" width="18" height="10" rx="1"/><path d="M3 13h18v2H3z"/><line x1="6" y1="15" x2="6" y2="21"/><line x1="18" y1="15" x2="18" y2="21"/><line x1="10" y1="15" x2="10" y2="21"/><line x1="14" y1="15" x2="14" y2="21"/>') },
  { id: 'ac', name: 'Air Conditioning', category: 'In-Unit', svg: icon('<rect x="2" y="4" width="20" height="8" rx="2"/><path d="M6 12v2"/><path d="M10 12v4"/><path d="M14 12v4"/><path d="M18 12v2"/><line x1="2" y1="8" x2="22" y2="8"/>') },

  // Technology & Services
  { id: 'wifi', name: 'High-Speed WiFi', category: 'Technology', svg: icon('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>') },
  { id: 'parking', name: 'Parking', category: 'Technology', svg: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>') },
  { id: 'package', name: 'Package Lockers', category: 'Technology', svg: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="7.5" cy="7.5" r="1"/><circle cx="16.5" cy="7.5" r="1"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/>') },
  { id: 'ev-charging', name: 'EV Charging', category: 'Technology', svg: icon('<path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2"/><path d="M14 9h4l-2 4h3l-5 7v-5h-3l3-6z"/>') },
  { id: 'security', name: '24/7 Security', category: 'Technology', svg: icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>') },
  { id: 'concierge', name: 'Concierge', category: 'Technology', svg: icon('<circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><line x1="12" y1="1" x2="12" y2="4"/>') },

  // Outdoor
  { id: 'dog-park', name: 'Dog Park', category: 'Outdoor', svg: icon('<circle cx="9" cy="8" r="3"/><path d="M9 11v4"/><path d="M6 15h6"/><path d="M9 15v4"/><path d="M18 6l2 2-2 2"/><path d="M20 8h-5"/>') },
  { id: 'garden', name: 'Community Garden', category: 'Outdoor', svg: icon('<path d="M12 10V2"/><path d="M8 6c0 2 2 4 4 4s4-2 4-4"/><path d="M4 22h16"/><path d="M4 22V12h16v10"/><path d="M8 16h0"/><path d="M12 16h0"/><path d="M16 16h0"/>') },
  { id: 'trail', name: 'Walking Trails', category: 'Outdoor', svg: icon('<circle cx="12" cy="5" r="2"/><path d="M7 21l3-6 2 2 3-4 2 6"/><path d="M3 21h18"/>') },
  { id: 'playground', name: 'Playground', category: 'Outdoor', svg: icon('<path d="M6 21V8l6-6 6 6v13"/><path d="M9 12h6"/><path d="M12 9v7"/><circle cx="12" cy="18" r="2"/>') },

  // Convenience
  { id: 'laundry-facility', name: 'Laundry Facility', category: 'Convenience', svg: icon('<rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/><circle cx="6.5" cy="13" r="3"/><circle cx="17.5" cy="13" r="3"/><line x1="5" y1="8" x2="5" y2="8.01"/><line x1="16" y1="8" x2="16" y2="8.01"/>') },
  { id: 'trash-valet', name: 'Trash Valet', category: 'Convenience', svg: icon('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>') },
  { id: 'maintenance', name: 'On-Site Maintenance', category: 'Convenience', svg: icon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>') },
  { id: 'shuttle', name: 'Shuttle Service', category: 'Convenience', svg: icon('<rect x="1" y="8" width="22" height="10" rx="3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><line x1="1" y1="12" x2="23" y2="12"/>') },
];

/** Get icons grouped by category */
export function getIconsByCategory(): Record<string, AmenityIcon[]> {
  const groups: Record<string, AmenityIcon[]> = {};
  for (const icon of amenityIcons) {
    if (!groups[icon.category]) groups[icon.category] = [];
    groups[icon.category]!.push(icon);
  }
  return groups;
}
