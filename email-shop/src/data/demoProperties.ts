// ============================================================
// Demo Property Dataset for Creative Studio Template Previews
// ============================================================
// These are FAKE generic luxury student housing brands used to
// populate template previews with polished, realistic content.
// They are NOT real properties. All imagery is from Pexels (free).
// ============================================================

export interface DemoProperty {
  id: string;
  propertyName: string;
  shortName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textDark: string;
  logoUrl: string;
  heroImageUrl: string;
  interiorImageUrl: string;
  amenityImageUrl: string;
  floorplanImageUrl: string;
  headline: string;
  subheadline: string;
  buttonLabel?: string;
  featurePills?: string[];
  amenityBullets?: string[];
  neighborhood?: string;
}

// Fallback SVG generator (used when a remote image fails to load)
export function svgFallback(w: number, h: number, bg: string, fg: string, text: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="Arial,sans-serif" font-size="${Math.round(h * 0.08)}" font-weight="600">${text}</text>` +
    `</svg>`
  );
}

export const demoProperties: DemoProperty[] = [
  {
    id: 'avery-district',
    propertyName: 'The Avery District',
    shortName: 'Avery',
    tagline: 'Elevated off-campus living with a polished modern feel',
    primaryColor: '#1F2A44',
    secondaryColor: '#C8A96B',
    accentColor: '#F5F1E8',
    textDark: '#1C1C1C',
    logoUrl: 'https://dummyimage.com/600x240/1f2a44/ffffff.png&text=The+Avery+District',
    heroImageUrl: 'https://images.pexels.com/photos/27307400/pexels-photo-27307400.jpeg?cs=srgb&dl=pexels-volkerthimm-27307400.jpg&fm=jpg',
    interiorImageUrl: 'https://images.pexels.com/photos/31655147/pexels-photo-31655147.jpeg?cs=srgb&dl=pexels-thel0stkidd-2149128959-31655147.jpg&fm=jpg',
    amenityImageUrl: 'https://images.pexels.com/photos/29149073/pexels-photo-29149073.jpeg?cs=srgb&dl=pexels-aj-ahamad-767001191-29149073.jpg&fm=jpg',
    floorplanImageUrl: 'https://images.pexels.com/photos/7647390/pexels-photo-7647390.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Live steps from campus in a space that feels elevated',
    subheadline: 'Modern interiors, premium amenity spaces, and a lifestyle-first atmosphere built for students.',
    buttonLabel: 'Tour Today',
    featurePills: ['Private Bedrooms', 'Study Lounges', 'Rooftop Terrace', 'In-Unit Laundry'],
    amenityBullets: ['Resort-style pool and sundeck', 'State-of-the-art fitness center', '24/7 study lounges with private rooms', 'Outdoor grilling and dining areas'],
    neighborhood: 'University District',
  },
  {
    id: 'luma-on-grand',
    propertyName: 'Luma on Grand',
    shortName: 'Luma',
    tagline: 'Bold design and lifestyle-driven student living',
    primaryColor: '#6B2337',
    secondaryColor: '#E0B15C',
    accentColor: '#FAF5EE',
    textDark: '#231F20',
    logoUrl: 'https://dummyimage.com/600x240/6b2337/ffffff.png&text=Luma+on+Grand',
    heroImageUrl: 'https://images.pexels.com/photos/24805054/pexels-photo-24805054.jpeg?cs=srgb&dl=pexels-ahmetcotur-24805054.jpg&fm=jpg',
    interiorImageUrl: 'https://images.pexels.com/photos/7174389/pexels-photo-7174389.jpeg?cs=srgb&dl=pexels-artbovich-7174389.jpg&fm=jpg',
    amenityImageUrl: 'https://images.pexels.com/photos/26859066/pexels-photo-26859066.jpeg?cs=srgb&dl=pexels-ahmetcotur-26859066.jpg&fm=jpg',
    floorplanImageUrl: 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'A more social, more styled approach to off-campus living',
    subheadline: 'Bring together premium finishes, energetic shared spaces, and a strong sense of place.',
    buttonLabel: 'Explore Options',
    featurePills: ['Full Kitchen', 'Walk-In Closets', 'Game Room', 'Co-Working Space'],
    amenityBullets: ['Clubhouse with entertainment lounge', 'Heated pool with cabanas', 'On-site coffee bar', 'Pet-friendly with dog park'],
    neighborhood: 'Grand Avenue Corridor',
  },
  {
    id: 'northbend-collective',
    propertyName: 'Northbend Collective',
    shortName: 'Northbend',
    tagline: 'Refined apartment styling near the energy of campus',
    primaryColor: '#234E52',
    secondaryColor: '#D8B26E',
    accentColor: '#F4F7F8',
    textDark: '#202124',
    logoUrl: 'https://dummyimage.com/600x240/234e52/ffffff.png&text=Northbend+Collective',
    heroImageUrl: 'https://images.pexels.com/photos/31656170/pexels-photo-31656170.jpeg?cs=srgb&dl=pexels-shox-31656170.jpg&fm=jpg',
    interiorImageUrl: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200',
    amenityImageUrl: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1200',
    floorplanImageUrl: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Premium design with a calmer, more refined personality',
    subheadline: 'A polished living experience with smart spaces for study, recharge, and connection.',
    buttonLabel: 'Schedule a Tour',
    featurePills: ['Quartz Countertops', 'Smart Locks', 'Yoga Studio', 'Bike Storage'],
    amenityBullets: ['Zen-inspired courtyard', 'Professional study rooms', 'Package concierge service', 'Electric vehicle charging'],
    neighborhood: 'Northbend Quarter',
  },
  {
    id: 'solis-at-main',
    propertyName: 'Solis at Main',
    shortName: 'Solis',
    tagline: 'Upscale social spaces and standout curb appeal',
    primaryColor: '#5B3A29',
    secondaryColor: '#D9A35F',
    accentColor: '#FBF6EF',
    textDark: '#2A211C',
    logoUrl: 'https://dummyimage.com/600x240/5b3a29/ffffff.png&text=Solis+at+Main',
    heroImageUrl: 'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1200',
    interiorImageUrl: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200',
    amenityImageUrl: 'https://images.pexels.com/photos/7031408/pexels-photo-7031408.jpeg?auto=compress&cs=tinysrgb&w=1200',
    floorplanImageUrl: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Standout style with a hospitality-inspired atmosphere',
    subheadline: 'Curated amenity moments, modern apartment finishes, and a stronger first impression.',
    buttonLabel: 'View Amenities',
    featurePills: ['Concierge Lobby', 'Infinity Pool', 'Sky Lounge', 'Valet Parking'],
    amenityBullets: ['Grand lobby with concierge desk', 'Infinity-edge pool and hot tub', 'Rooftop sky lounge', 'Private dining and event space'],
    neighborhood: 'Main Street District',
  },
  {
    id: 'vertex-house',
    propertyName: 'Vertex House',
    shortName: 'Vertex',
    tagline: 'Sleek apartment living with a premium evening vibe',
    primaryColor: '#2D3142',
    secondaryColor: '#F2A65A',
    accentColor: '#F7F7F7',
    textDark: '#171717',
    logoUrl: 'https://dummyimage.com/600x240/2d3142/ffffff.png&text=Vertex+House',
    heroImageUrl: 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1200',
    interiorImageUrl: 'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200',
    amenityImageUrl: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=1200',
    floorplanImageUrl: 'https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Modern living made to feel sharp, social, and elevated',
    subheadline: 'Bring together strong visuals, premium shared spaces, and a more luxury-forward student housing feel.',
    buttonLabel: 'Apply Now',
    featurePills: ['Stainless Appliances', 'Hardwood Floors', 'Theater Room', 'Parcel Lockers'],
    amenityBullets: ['Private screening room', 'Outdoor fire pit lounge', 'Tech-enabled study pods', 'On-site maintenance team'],
    neighborhood: 'Vertex Row',
  },
  {
    id: 'marquee-commons',
    propertyName: 'Marquee Commons',
    shortName: 'Marquee',
    tagline: 'Wellness-forward living with modern amenity energy',
    primaryColor: '#3A506B',
    secondaryColor: '#5BC0BE',
    accentColor: '#F6FBFB',
    textDark: '#1B1B1B',
    logoUrl: 'https://dummyimage.com/600x240/3a506b/ffffff.png&text=Marquee+Commons',
    heroImageUrl: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200',
    interiorImageUrl: 'https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=1200',
    amenityImageUrl: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1200',
    floorplanImageUrl: 'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Designed for balance, connection, and an elevated routine',
    subheadline: 'From wellness amenities to upgraded interiors, this brand supports a more polished daily experience.',
    buttonLabel: 'Explore Floor Plans',
    featurePills: ['Spa Bathroom', 'Open Layout', 'Meditation Room', 'Juice Bar'],
    amenityBullets: ['Wellness center with sauna', 'Saltwater lap pool', 'Outdoor yoga lawn', 'Smoothie and juice bar'],
    neighborhood: 'Commons Park Area',
  },
  {
    id: 'atlas-social',
    propertyName: 'Atlas Social',
    shortName: 'Atlas',
    tagline: 'High-style amenities made for a social student lifestyle',
    primaryColor: '#4A1C40',
    secondaryColor: '#D4AF37',
    accentColor: '#F8F4F7',
    textDark: '#1E1A1D',
    logoUrl: 'https://dummyimage.com/600x240/4a1c40/ffffff.png&text=Atlas+Social',
    heroImageUrl: 'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1200',
    interiorImageUrl: 'https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg?auto=compress&cs=tinysrgb&w=1200',
    amenityImageUrl: 'https://images.pexels.com/photos/7031706/pexels-photo-7031706.jpeg?auto=compress&cs=tinysrgb&w=1200',
    floorplanImageUrl: 'https://images.pexels.com/photos/280229/pexels-photo-280229.jpeg?auto=compress&cs=tinysrgb&w=1200',
    headline: 'Bring energy and style together in every touchpoint',
    subheadline: 'A more lifestyle-driven template direction with social spaces, strong visuals, and premium branding.',
    buttonLabel: 'Tour Today',
    featurePills: ['DJ Booth', 'Rooftop Pool', 'Gaming Lounge', 'Pet Spa'],
    amenityBullets: ['Rooftop pool with city views', 'Social lounge with DJ setup', 'Esports and gaming center', 'Luxury pet grooming station'],
    neighborhood: 'Atlas Quarter',
  },
];

// ---- Helper: get a demo property by index (wraps around) ----
export function getDemoProperty(index: number): DemoProperty {
  return demoProperties[index % demoProperties.length]!;
}

// ---- Helper: get a demo property by ID ----
export function getDemoPropertyById(id: string): DemoProperty | undefined {
  return demoProperties.find((p) => p.id === id);
}

// ---- Template-to-property assignment map ----
// Maps each template ID to a demo property ID for consistent branding
export const templatePropertyMap: Record<string, string> = {
  'tmpl-student-welcome': 'avery-district',
  'tmpl-luxury-marketing': 'northbend-collective',
  'tmpl-rate-drop': 'vertex-house',
  'tmpl-community-event': 'solis-at-main',
  'tmpl-renewal-reminder': 'marquee-commons',
  'tmpl-ditch-dorms': 'luma-on-grand',
  'tmpl-maintenance': 'atlas-social',
  'tmpl-move-in': 'northbend-collective',
  'tmpl-navy-modern': 'marquee-commons',
  'tmpl-apartment-listing': 'vertex-house',
  'tmpl-newsletter': 'atlas-social',
  'tmpl-waitlist': 'solis-at-main',
  'tmpl-leasing-ops-letter': 'luma-on-grand',
  'tmpl-relet-process': 'avery-district',
};

// ---- Helper: get demo property for a template ----
export function getPropertyForTemplate(templateId: string): DemoProperty {
  const propId = templatePropertyMap[templateId];
  return getDemoPropertyById(propId ?? '') ?? demoProperties[0]!;
}
