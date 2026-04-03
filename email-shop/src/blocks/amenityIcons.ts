/**
 * Student Housing Amenity Icon Library
 * Uses inline SVG data URIs for email compatibility.
 * Grouped into Live / Work / Play / Convenience categories.
 */

export type AmenityCategory = 'Live' | 'Work' | 'Play' | 'Convenience';

export interface AmenityIcon {
  id: string;
  name: string;
  category: AmenityCategory;
  svg: string;
}

function icon(paths: string, vb = '0 0 24 24'): string {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="' + vb + '" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
  );
}

export function recolorIcon(svgDataUri: string, newColor: string): string {
  const decoded = decodeURIComponent(svgDataUri.replace('data:image/svg+xml,', ''));
  const recolored = decoded.replace(/stroke="[^"]*"/g, 'stroke="' + newColor + '"');
  return 'data:image/svg+xml,' + encodeURIComponent(recolored);
}

// ── LIVE ──
const bed = icon('<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>');
const bath = icon('<path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>');
const furnished = icon('<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><rect x="2" y="9" width="20" height="7" rx="2"/><path d="M4 16v4"/><path d="M20 16v4"/><line x1="2" y1="20" x2="22" y2="20"/>');
const roommate = icon('<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M13 21v-2a4 4 0 0 0-8 0v2"/><path d="M21 21v-1.5a2.5 2.5 0 0 0-5 0V21"/>');
const washer = icon('<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/><line x1="7" y1="6" x2="7" y2="6.01"/><line x1="10" y1="6" x2="10" y2="6.01"/>');
const appliances = icon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/>');
const countertop = icon('<rect x="2" y="10" width="20" height="3" rx="1"/><path d="M4 13v6"/><path d="M20 13v6"/><path d="M8 10V6h8v4"/><circle cx="12" cy="8" r="1"/>');
const closet = icon('<rect x="3" y="2" width="18" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M7 10h2"/><path d="M15 10h2"/>');
const flooring = icon('<rect x="2" y="2" width="20" height="20" rx="1"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="8" y1="2" x2="8" y2="8"/><line x1="16" y1="8" x2="16" y2="14"/><line x1="8" y1="14" x2="8" y2="20"/>');
const wifi = icon('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>');
const cable = icon('<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>');
const lease = icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>');
const utilities = icon('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>');
const pet = icon('<circle cx="11" cy="4" r="2"/><path d="M4 9h.01"/><path d="M18 9h.01"/><path d="M6 15h.01"/><path d="M16 15h.01"/><path d="M8 18c1 2 2.5 3 4 3s3-1 4-3"/>');
const balcony = icon('<rect x="3" y="3" width="18" height="10" rx="1"/><path d="M3 13h18v2H3z"/><line x1="6" y1="15" x2="6" y2="21"/><line x1="18" y1="15" x2="18" y2="21"/><line x1="10" y1="15" x2="10" y2="21"/><line x1="14" y1="15" x2="14" y2="21"/>');

// ── WORK ──
const studyRoom = icon('<rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M8 21h8"/><path d="M12 17v4"/>');
const studyPod = icon('<path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="3"/><path d="M12 21v-5"/>');
const computerLab = icon('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 9h2"/><path d="M11 9h6"/>');
const printer = icon('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>');
const academicLounge = icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h6"/>');
const conference = icon('<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="12" cy="4" r="2"/>');
const coworking = icon('<rect x="2" y="7" width="8" height="10" rx="1"/><rect x="14" y="7" width="8" height="10" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>');
const businessCenter = icon('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/>');

// ── PLAY ──
const pool = icon('<path d="M2 12h2a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h2"/><path d="M2 16h2a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h2"/><line x1="9" y1="6" x2="9" y2="12"/><line x1="15" y1="4" x2="15" y2="12"/>');
const hotTub = icon('<path d="M9 6c0-1.5 1.5-3 3-3s3 1.5 3 3"/><path d="M6 9c-1.5 0-3 1.5-3 3s1.5 3 3 3"/><path d="M18 9c1.5 0 3 1.5 3 3s-1.5 3-3 3"/><ellipse cx="12" cy="16" rx="8" ry="4"/>');
const fitness = icon('<circle cx="6.5" cy="6.5" r="2.5"/><path d="M6.5 9v6"/><path d="M2 18h9"/><path d="M18 6l-4 4 2 2 4-4"/><circle cx="20" cy="4" r="2"/>');
const yoga = icon('<circle cx="12" cy="4" r="2"/><path d="M12 6v4"/><path d="M8 14l4-4 4 4"/><path d="M6 18h12"/>');
const sauna = icon('<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 2v4"/><path d="M12 2v4"/><path d="M16 2v4"/><path d="M8 14h0"/><path d="M12 14h0"/><path d="M16 14h0"/>');
const clubhouse = icon('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><rect x="9" y="13" width="6" height="8"/><line x1="12" y1="9" x2="12" y2="9.01"/>');
const gameRoom = icon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><line x1="11" y1="10" x2="13" y2="14"/>');
const golf = icon('<circle cx="12" cy="18" r="2"/><path d="M12 2v14"/><path d="M12 6l6-2"/>');
const theater = icon('<path d="M4 11V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M2 11h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9z"/><path d="M8 15h0"/><path d="M12 15h0"/><path d="M16 15h0"/>');
const rooftop = icon('<path d="M2 20h20"/><path d="M4 20V8l8-5 8 5v12"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><circle cx="12" cy="6" r="1"/>');
const courtyard = icon('<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="12" cy="12" r="4"/><path d="M12 8v-2"/><path d="M12 16v2"/><path d="M8 12H6"/><path d="M18 12h-2"/>');
const firePit = icon('<path d="M12 12c-2 0-3-1-3-3 0-1.5 1-3 3-5 2 2 3 3.5 3 5 0 2-1 3-3 3z"/><ellipse cx="12" cy="18" rx="7" ry="3"/>');
const grill = icon('<rect x="4" y="10" width="16" height="8" rx="2"/><path d="M8 10V6"/><path d="M12 10V4"/><path d="M16 10V6"/><line x1="4" y1="18" x2="4" y2="21"/><line x1="20" y1="18" x2="20" y2="21"/>');
const basketball = icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 12h20"/>');
const volleyball = icon('<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10"/><path d="M2 12h20"/>');
const pickleball = icon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M4.93 4.93l14.14 14.14"/>');
const tanning = icon('<path d="M12 2v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M2 12h4"/><path d="M19.07 4.93l-2.83 2.83"/><path d="M22 12h-4"/><circle cx="12" cy="14" r="5"/>');
const events = icon('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>');

// ── CONVENIENCE ──
const parking = icon('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>');
const garage = icon('<path d="M3 21h18"/><path d="M4 21V9l8-6 8 6v12"/><rect x="7" y="14" width="10" height="7"/><line x1="7" y1="17" x2="17" y2="17"/>');
const covered = icon('<path d="M3 21V8l9-6 9 6v13"/><rect x="6" y="14" width="12" height="7"/><path d="M9 14v7"/><path d="M15 14v7"/>');
const bike = icon('<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/>');
const packageIcon = icon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="7.5" cy="7.5" r="1"/><circle cx="16.5" cy="7.5" r="1"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/>');
const security = icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>');
const gate = icon('<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18"/><line x1="8" y1="3" x2="8" y2="12"/><line x1="16" y1="3" x2="16" y2="12"/><line x1="8" y1="12" x2="8" y2="21"/><line x1="16" y1="12" x2="16" y2="21"/>');
const maintenance = icon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>');
const management = icon('<circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>');
const patrol = icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>');
const shuttle = icon('<rect x="1" y="8" width="22" height="10" rx="3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><line x1="1" y1="12" x2="23" y2="12"/>');
const nearCampus = icon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>');
const onlinePayments = icon('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>');
const smartHome = icon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="14" r="3"/><path d="M12 11v-2"/>');
const keyless = icon('<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>');
const evCharging = icon('<path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2"/><path d="M14 9h4l-2 4h3l-5 7v-5h-3l3-6z"/>');
const elevator = icon('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 6v4"/><path d="M9 8l3-3 3 3"/><line x1="4" y1="14" x2="20" y2="14"/><path d="M10 18h4"/>');
const trashValet = icon('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>');

export const amenityIcons: AmenityIcon[] = [
  // ── LIVE ──
  { id: 'furnished', name: 'Furnished Apartments', category: 'Live', svg: furnished },
  { id: 'bed', name: 'Private Bedrooms', category: 'Live', svg: bed },
  { id: 'bath', name: 'Private Bathrooms', category: 'Live', svg: bath },
  { id: 'roommate', name: 'Roommate Matching', category: 'Live', svg: roommate },
  { id: 'washer', name: 'In-Unit Washer & Dryer', category: 'Live', svg: washer },
  { id: 'appliances', name: 'Stainless Steel Appliances', category: 'Live', svg: appliances },
  { id: 'countertop', name: 'Quartz Countertops', category: 'Live', svg: countertop },
  { id: 'closet', name: 'Walk-In Closets', category: 'Live', svg: closet },
  { id: 'flooring', name: 'Hardwood-Style Flooring', category: 'Live', svg: flooring },
  { id: 'wifi', name: 'High-Speed Internet', category: 'Live', svg: wifi },
  { id: 'cable', name: 'Cable Included', category: 'Live', svg: cable },
  { id: 'lease', name: 'Individual Leases', category: 'Live', svg: lease },
  { id: 'utilities', name: 'Utilities Included', category: 'Live', svg: utilities },
  { id: 'pet', name: 'Pet Friendly', category: 'Live', svg: pet },
  { id: 'balcony', name: 'Balcony or Patio', category: 'Live', svg: balcony },

  // ── WORK ──
  { id: 'study', name: 'Study Rooms', category: 'Work', svg: studyRoom },
  { id: 'study-pod', name: 'Private Study Pods', category: 'Work', svg: studyPod },
  { id: 'computer-lab', name: 'Computer Lab', category: 'Work', svg: computerLab },
  { id: 'printer', name: 'Printing Station', category: 'Work', svg: printer },
  { id: 'academic-lounge', name: 'Academic Lounge', category: 'Work', svg: academicLounge },
  { id: 'conference', name: 'Conference Rooms', category: 'Work', svg: conference },
  { id: 'coworking', name: 'Co-Working Lounge', category: 'Work', svg: coworking },
  { id: 'wifi-community', name: 'Community-Wide Wi-Fi', category: 'Work', svg: wifi },
  { id: 'business-center', name: 'Business Center', category: 'Work', svg: businessCenter },

  // ── PLAY ──
  { id: 'pool', name: 'Resort-Style Pool', category: 'Play', svg: pool },
  { id: 'hot-tub', name: 'Hot Tub', category: 'Play', svg: hotTub },
  { id: 'fitness', name: 'Fitness Center', category: 'Play', svg: fitness },
  { id: 'yoga', name: 'Yoga Studio', category: 'Play', svg: yoga },
  { id: 'sauna', name: 'Sauna', category: 'Play', svg: sauna },
  { id: 'clubhouse', name: 'Clubhouse', category: 'Play', svg: clubhouse },
  { id: 'game-room', name: 'Game Room', category: 'Play', svg: gameRoom },
  { id: 'golf-sim', name: 'Golf Simulator', category: 'Play', svg: golf },
  { id: 'theater', name: 'Movie Theater', category: 'Play', svg: theater },
  { id: 'rooftop', name: 'Rooftop Lounge', category: 'Play', svg: rooftop },
  { id: 'courtyard', name: 'Outdoor Courtyard', category: 'Play', svg: courtyard },
  { id: 'fire-pit', name: 'Fire Pit', category: 'Play', svg: firePit },
  { id: 'grill', name: 'Grilling Stations', category: 'Play', svg: grill },
  { id: 'basketball', name: 'Basketball Court', category: 'Play', svg: basketball },
  { id: 'volleyball', name: 'Volleyball Court', category: 'Play', svg: volleyball },
  { id: 'pickleball', name: 'Pickleball Court', category: 'Play', svg: pickleball },
  { id: 'tanning', name: 'Tanning Beds', category: 'Play', svg: tanning },
  { id: 'events', name: 'Social Events', category: 'Play', svg: events },

  // ── CONVENIENCE ──
  { id: 'parking', name: 'On-Site Parking', category: 'Convenience', svg: parking },
  { id: 'garage', name: 'Garage Parking', category: 'Convenience', svg: garage },
  { id: 'covered-parking', name: 'Covered Parking', category: 'Convenience', svg: covered },
  { id: 'bike', name: 'Bike Storage', category: 'Convenience', svg: bike },
  { id: 'package', name: 'Package Lockers', category: 'Convenience', svg: packageIcon },
  { id: 'security', name: 'Controlled Access', category: 'Convenience', svg: security },
  { id: 'gate', name: 'Gated Community', category: 'Convenience', svg: gate },
  { id: 'maintenance', name: '24-Hour Emergency Maintenance', category: 'Convenience', svg: maintenance },
  { id: 'management', name: 'On-Site Management', category: 'Convenience', svg: management },
  { id: 'patrol', name: 'Courtesy Patrol', category: 'Convenience', svg: patrol },
  { id: 'shuttle', name: 'Shuttle to Campus', category: 'Convenience', svg: shuttle },
  { id: 'near-campus', name: 'Near Campus', category: 'Convenience', svg: nearCampus },
  { id: 'online-payments', name: 'Online Payments', category: 'Convenience', svg: onlinePayments },
  { id: 'smart-home', name: 'Smart Home Features', category: 'Convenience', svg: smartHome },
  { id: 'keyless', name: 'Keyless Entry', category: 'Convenience', svg: keyless },
  { id: 'ev-charging', name: 'EV Charging', category: 'Convenience', svg: evCharging },
  { id: 'elevator', name: 'Elevator Access', category: 'Convenience', svg: elevator },
  { id: 'trash-valet', name: 'Trash Valet', category: 'Convenience', svg: trashValet },
];

export function getIconsByCategory(): Record<AmenityCategory, AmenityIcon[]> {
  const groups: Record<AmenityCategory, AmenityIcon[]> = { Live: [], Work: [], Play: [], Convenience: [] };
  for (const ic of amenityIcons) {
    groups[ic.category].push(ic);
  }
  return groups;
}

export function getIconById(id: string): AmenityIcon | undefined {
  return amenityIcons.find((ic) => ic.id === id);
}

export function matchAmenityIcon(label: string): AmenityIcon | undefined {
  const norm = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return amenityIcons.find((ic) => {
    const iconNorm = ic.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return iconNorm === norm || iconNorm.includes(norm) || norm.includes(iconNorm);
  });
}
