import type { EmailTemplate, EmailBlock, EmailGlobalStyles } from '@/types';
import { demoProperties, svgFallback, getPropertyForTemplate } from '@/data/demoProperties';
import type { DemoProperty } from '@/data/demoProperties';

const now = new Date().toISOString();

// ---- Helpers ----

// Quick access to demo properties by index
const P = (i: number) => demoProperties[i % demoProperties.length]!;

// Shorthand property references for readability
const AVERY = P(0);      // The Avery District
const LUMA = P(1);       // Luma on Grand
const NORTHBEND = P(2);  // Northbend Collective
const SOLIS = P(3);      // Solis at Main
const VERTEX = P(4);     // Vertex House
const MARQUEE = P(5);    // Marquee Commons
const ATLAS = P(6);      // Atlas Social

const baseGlobal: EmailGlobalStyles = {
  bodyBackgroundColor: '#f1f5f9',
  contentBackgroundColor: '#ffffff',
  contentWidth: 600,
  fontFamily: 'Arial',
  fontFallback: 'Helvetica, sans-serif',
  defaultTextColor: '#333333',
  defaultLinkColor: '#2563eb',
  defaultFontSize: 16,
};

let blockId = 0;
function bid() { return 'tpl-block-' + (++blockId); }

// ============================================================
// TEMPLATE 1: Student Housing Welcome — The Avery District
// Deep navy branding, serif headings, campus-focused
// ============================================================
const studentWelcomeBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: AVERY.primaryColor, paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: AVERY.logoUrl, logoAlt: AVERY.propertyName, logoWidth: 200, preheaderText: '', backgroundColor: AVERY.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'NOW LEASING FOR FALL', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: AVERY.heroImageUrl, altText: AVERY.propertyName + ' exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: AVERY.textDark, paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: AVERY.headline, fontSize: 15, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: AVERY.primaryColor, textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: AVERY.amenityImageUrl, imageAlt: 'Community amenities', imagePosition: 'left', imageWidth: 45, heading: 'Standout Amenity Spaces', body: 'Resort-style pool, state-of-the-art fitness center, 24/7 study lounges, and outdoor social areas. Everything designed with your student lifestyle in mind.' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: AVERY.accentColor, textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: AVERY.interiorImageUrl, imageAlt: 'Modern interiors', imagePosition: 'right', imageWidth: 45, heading: 'Your Suite Awaits', body: 'Fully furnished suites with modern finishes, high-speed WiFi, and private bedrooms. A home away from home that actually feels premium.' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY NOW', url: '#', backgroundColor: AVERY.secondaryColor, textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 80, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: AVERY.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 2: Property Marketing — Northbend Collective
// Earthy teal tones, elegant, photo-forward
// ============================================================
const luxuryMarketingBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: NORTHBEND.primaryColor, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: NORTHBEND.logoUrl, logoAlt: NORTHBEND.propertyName, logoWidth: 200, preheaderText: '', backgroundColor: NORTHBEND.primaryColor } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: NORTHBEND.heroImageUrl, altText: NORTHBEND.propertyName + ' exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: NORTHBEND.primaryColor, paddingTop: 28, paddingBottom: 4, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: NORTHBEND.headline.toUpperCase(), fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#666666', paddingTop: 8, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: NORTHBEND.subheadline, fontSize: 16, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: NORTHBEND.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: NORTHBEND.interiorImageUrl, imageAlt: 'Modern interiors', imagePosition: 'left', imageWidth: 45, heading: 'Premium Interiors', body: 'Every detail has been considered, from quartz countertops to smart home features. This is what thoughtful design looks like.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: NORTHBEND.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: NORTHBEND.amenityImageUrl, imageAlt: 'Wellness amenities', imagePosition: 'right', imageWidth: 45, heading: 'Wellness-Focused Living', body: 'From zen courtyards to yoga studios, every space supports a more balanced and intentional daily routine.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: NORTHBEND.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: NORTHBEND.floorplanImageUrl, imageAlt: 'Floor plans', imagePosition: 'left', imageWidth: 45, heading: 'Smart Floor Plans', body: 'Spacious layouts designed to support how students actually live, study, and recharge.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: NORTHBEND.primaryColor, thickness: 2, widthPercent: 40, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: NORTHBEND.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 3: Rate Drop / Special Offer — Vertex House
// Bold promo style with dark slate + orange accents
// ============================================================
const rateDropBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: VERTEX.primaryColor, paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: VERTEX.logoUrl, logoAlt: VERTEX.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: VERTEX.primaryColor } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'RATES JUST DROPPED!', subheading: 'Limited time pricing on select floor plans. Lock in your rate today.', backgroundColor: VERTEX.secondaryColor, textColor: '#ffffff', buttonLabel: 'View Specials', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: VERTEX.heroImageUrl, altText: VERTEX.propertyName + ' exterior at dusk' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: VERTEX.primaryColor, paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'New Lower Rates Available Now', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'We have reduced rates on select floor plans at ' + VERTEX.propertyName + '. This is a limited-time offer. Schedule a tour today to see your new home and lock in this rate before it is gone.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: VERTEX.accentColor, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Featured Floor Plan', floorplanImageUrl: VERTEX.floorplanImageUrl, floorplanImageAlt: 'Studio floor plan', unitName: 'The Studio', bedsBaths: 'Studio / 1 BA', sqft: '450', price: 'NOW $999/mo (was $1,149)', buttonLabel: 'Check Availability', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'VIEW ALL SPECIALS', url: '#', backgroundColor: VERTEX.secondaryColor, textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: VERTEX.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 4: Community Event — Solis at Main
// Warm earth tones, inviting
// ============================================================
const communityEventBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SOLIS.logoUrl, logoAlt: SOLIS.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: SOLIS.secondaryColor, textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'YOU ARE INVITED!', fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SOLIS.amenityImageUrl, altText: 'Community event at ' + SOLIS.shortName } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: SOLIS.primaryColor, paddingTop: 28, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Rooftop Social Night', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#78716c', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Saturday, March 15 | 6:00 PM - 9:00 PM | Sky Lounge', fontSize: 14, fontWeight: 600, lineHeight: 1.5 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 12, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Join your neighbors for an evening on the rooftop. Live music, curated snacks, craft drinks, and skyline views. Bring a friend and make new ones. All residents and their guests are welcome.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'What to Expect', body: 'Live acoustic music on the terrace\nCurated snacks and craft cocktails\nSkyline photo booth\nPrizes and giveaways', backgroundColor: SOLIS.accentColor, borderColor: SOLIS.secondaryColor } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RSVP NOW', url: '#', backgroundColor: SOLIS.secondaryColor, textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 40, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: SOLIS.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 5: Renewal Reminder — Marquee Commons
// Steel blue + teal, professional, urgent
// ============================================================
const renewalReminderBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: MARQUEE.primaryColor, paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: MARQUEE.logoUrl, logoAlt: MARQUEE.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: MARQUEE.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: MARQUEE.primaryColor, paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Your Lease Renewal is Ready', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'We would love for you to continue being part of the ' + MARQUEE.propertyName + ' community. Your current lease is approaching its renewal date, and we have prepared renewal options for you.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Renewal Deadline', body: 'Your renewal offer expires on [DATE]. Please log into your resident portal to review and sign your renewal documents before the deadline to secure your current rate.', backgroundColor: '#fef2f2', borderColor: '#dc2626' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'REVIEW RENEWAL OPTIONS', url: '#', backgroundColor: MARQUEE.primaryColor, textColor: '#ffffff', borderRadius: 6, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: MARQUEE.accentColor, textColor: MARQUEE.textDark, paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Why Renew With Us?\n\n- No moving costs or hassle\n- Lock in competitive rates\n- Continue enjoying wellness amenities and upgraded spaces\n- Preferred resident pricing\n- Guaranteed unit availability', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 12, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Questions? Contact our leasing office and we will be happy to help.', fontSize: 14, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: MARQUEE.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 6: Ditch the Dorms — Luma on Grand
// Bold crimson + gold, student marketing
// ============================================================
const ditchDormsBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: LUMA.primaryColor, paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: LUMA.logoUrl, logoAlt: LUMA.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: LUMA.primaryColor } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'DITCH THE DORMS', subheading: 'Upgrade your college experience. Live where you want, how you want.', backgroundColor: LUMA.primaryColor, textColor: '#ffffff', buttonLabel: 'Explore Options', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: LUMA.heroImageUrl, altText: LUMA.propertyName + ' modern apartments' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: LUMA.primaryColor, paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Why Settle for a Dorm?', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Get more space, more privacy, and more freedom at ' + LUMA.propertyName + '. Full kitchens, private bedrooms, in-unit laundry, and a community built for students who want more from off-campus living.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: LUMA.accentColor, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'What You Get', items: [{ label: 'Private Bedrooms', description: 'Your own space' }, { label: 'Full Kitchen', description: 'Cook your own meals' }, { label: 'In-Unit Laundry', description: 'No more laundromat' }, { label: 'Co-Working Space', description: 'Professional study areas' }, { label: 'Heated Pool', description: 'Year-round relaxation' }, { label: 'Game Room', description: 'Unwind and connect' }], columns: 3 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: LUMA.secondaryColor, textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: LUMA.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 7: Maintenance Notice — Atlas Social
// Deep purple + gold, clean operational
// ============================================================
const maintenanceBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: ATLAS.logoUrl, logoAlt: ATLAS.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#fbbf24', textColor: '#78350f', paddingTop: 12, paddingBottom: 12, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'MAINTENANCE NOTICE', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: ATLAS.textDark, paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Dear ' + ATLAS.propertyName + ' Residents,', fontSize: 15, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'We want to inform you about upcoming scheduled maintenance. Please review the details below for timing and any actions you may need to take.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Maintenance Details', body: 'Date: [DATE]\nTime: [TIME]\nArea Affected: [AREA]\nDuration: Approximately [DURATION]\n\nPlease ensure [any specific instructions].', backgroundColor: '#fefce8', borderColor: '#fbbf24' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'We appreciate your patience and understanding. If you have any questions or concerns, please contact our office.', fontSize: 14, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CONTACT OFFICE', url: '#', backgroundColor: ATLAS.primaryColor, textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: ATLAS.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 8: Move-In Welcome — Northbend Collective
// Teal, warm, informational
// ============================================================
const moveInBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: NORTHBEND.primaryColor, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: NORTHBEND.logoUrl, logoAlt: NORTHBEND.propertyName, logoWidth: 200, preheaderText: '', backgroundColor: NORTHBEND.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: NORTHBEND.primaryColor, textColor: '#a7f3d0', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Welcome Home!', fontSize: 30, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: NORTHBEND.heroImageUrl, altText: 'Welcome to ' + NORTHBEND.propertyName } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: NORTHBEND.textDark, paddingTop: 24, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Congratulations on your new home at ' + NORTHBEND.propertyName + '! We are thrilled to welcome you to our community. Here is everything you need for a smooth move-in experience.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Move-In Checklist', body: '1. Complete all move-in paperwork\n2. Schedule your move-in time slot\n3. Set up utilities and renter\'s insurance\n4. Pick up your keys from the leasing office\n5. Review the community handbook\n6. Download our resident app', backgroundColor: NORTHBEND.accentColor, borderColor: NORTHBEND.primaryColor } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: NORTHBEND.accentColor, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Explore Your New Community', items: [{ label: 'Zen Courtyard', description: 'Relax and recharge' }, { label: 'Saltwater Pool', description: 'Open year-round' }, { label: 'Fitness Studio', description: 'Open 24/7' }, { label: 'Package Concierge', description: 'Secure delivery' }], columns: 2 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'ACCESS RESIDENT PORTAL', url: '#', backgroundColor: NORTHBEND.primaryColor, textColor: '#ffffff', borderRadius: 8, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: NORTHBEND.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 9: Navy Modern — Marquee Commons
// Steel blue + teal, student lifestyle
// ============================================================
const navyModernBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: MARQUEE.primaryColor, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: MARQUEE.logoUrl, logoAlt: MARQUEE.propertyName, logoWidth: 200, preheaderText: '', backgroundColor: MARQUEE.primaryColor } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: MARQUEE.heroImageUrl, altText: MARQUEE.propertyName + ' community' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: MARQUEE.primaryColor, paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: MARQUEE.headline, fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: MARQUEE.subheadline, fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'two-column', data: { style: { backgroundColor: MARQUEE.accentColor, textColor: MARQUEE.textDark, paddingTop: 20, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, leftContent: 'Spa-Style Bathrooms\nOpen Layouts\nQuartz Countertops\nHigh-Speed WiFi', rightContent: 'Meditation Room\nLap Pool\nYoga Lawn\nJuice Bar', columnRatio: '50-50' } },
  { id: bid(), type: 'testimonial', data: { style: { backgroundColor: '#ffffff', textColor: MARQUEE.textDark, paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, quote: 'The wellness focus here is real. Between the sauna, pool, and yoga classes, I actually look forward to coming home after classes.', authorName: 'Current Resident', authorTitle: 'Junior, Pre-Med', rating: 5 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY TODAY', url: '#', backgroundColor: MARQUEE.primaryColor, textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: MARQUEE.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 10: Apartment Listing — Vertex House
// Clean listing style with dark slate + orange
// ============================================================
const apartmentListingBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: VERTEX.logoUrl, logoAlt: VERTEX.propertyName, logoWidth: 170, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: VERTEX.primaryColor, textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'NOW LEASING FOR FALL', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: VERTEX.heroImageUrl, altText: VERTEX.propertyName + ' exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f0fdf4', textColor: '#166534', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Starting at $1,200/month', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: VERTEX.propertyName + ' offers modern apartments with premium finishes steps from campus. Available floor plans include studio, 1-bedroom, and 2-bedroom layouts. Each home features stainless steel appliances, hardwood-style flooring, and smart home technology.\n\nPremium interiors. Elevated amenity spaces. A better everyday experience.', fontSize: 14, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: VERTEX.accentColor, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Available Floor Plans', floorplanImageUrl: VERTEX.floorplanImageUrl, floorplanImageAlt: '2 Bedroom layout', unitName: '2 Bedroom', bedsBaths: '2 BD / 2 BA', sqft: '1,050', price: 'From $1,450/mo', buttonLabel: 'View Floor Plans', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: VERTEX.primaryColor, textColor: '#ffffff', borderRadius: 4, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: VERTEX.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 11: Newsletter / Monthly Update — Atlas Social
// Deep purple + gold newsletter
// ============================================================
const newsletterBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: ATLAS.primaryColor, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: ATLAS.logoUrl, logoAlt: ATLAS.propertyName, logoWidth: 200, preheaderText: '', backgroundColor: ATLAS.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: ATLAS.primaryColor, textColor: '#e9d5ff', paddingTop: 4, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'COMMUNITY NEWSLETTER | MARCH 2025', fontSize: 14, fontWeight: 600, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: ATLAS.textDark, paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Hello ' + ATLAS.propertyName + ' Residents!', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Spring is here and we have an exciting month ahead! Here is what is happening in our community.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 100, lineStyle: 'solid' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: ATLAS.textDark, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: ATLAS.amenityImageUrl, imageAlt: 'Upcoming event', imagePosition: 'left', imageWidth: 40, heading: 'Upcoming Events', body: 'March 15 - Rooftop Social Night\nMarch 22 - Resident Yoga Flow\nMarch 28 - Movie on the Lawn' } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 100, lineStyle: 'solid' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: ATLAS.textDark, paddingTop: 16, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Community Reminders', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: '- Rooftop pool hours extended to 10 PM starting March 1\n- Guest parking passes available at the front desk\n- Maintenance requests can be submitted through the resident portal\n- Package locker codes reset monthly', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RESIDENT PORTAL', url: '#', backgroundColor: ATLAS.primaryColor, textColor: '#ffffff', borderRadius: 8, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: ATLAS.secondaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 12: Waitlist Update — Solis at Main
// Earth tone, clean, hopeful
// ============================================================
const waitlistBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SOLIS.logoUrl, logoAlt: SOLIS.propertyName, logoWidth: 180, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#059669', textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'GREAT NEWS!', fontSize: 20, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: SOLIS.textDark, paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'A Spot Has Opened Up at ' + SOLIS.propertyName, fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 8, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'We are excited to let you know that a unit matching your preferences is now available. As a valued waitlist member, you have priority access for a limited time.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Available Unit Details', body: 'Floor Plan: [FLOOR PLAN]\nBedrooms: [BEDS] / Bathrooms: [BATHS]\nSquare Feet: [SQFT]\nMonthly Rate: [RATE]\nAvailable: [DATE]', backgroundColor: '#ecfdf5', borderColor: '#059669' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 20, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CLAIM YOUR SPOT', url: '#', backgroundColor: SOLIS.secondaryColor, textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#dc2626', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'This offer expires in 48 hours. Act now to secure your unit.', fontSize: 13, fontWeight: 600, lineHeight: 1.5 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: SOLIS.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 13: Leasing Operations Letter — Luma on Grand
// Formal letter format, crimson branding
// ============================================================
const leasingOpsLetterBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: LUMA.primaryColor, paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: LUMA.logoUrl, logoAlt: LUMA.propertyName, logoWidth: 350, preheaderText: '', backgroundColor: LUMA.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 0, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Date: *CURRENT_DATE*', fontSize: 13, fontWeight: 700, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'We are reaching out regarding your Fall 2026 housing interest at ' + LUMA.propertyName + '.\n\nAt this time, our 3BR/3BA floorplan is fully sold out for Fall 2026 and is no longer available to secure.\n\nIf you would still like to be considered for a 3BR/3BA space, you are welcome to join our waitlist in the event that availability opens later.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 22, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, label: 'Join the 3BR/3BA Waitlist', url: '#', backgroundColor: LUMA.primaryColor, textColor: '#ffffff', borderRadius: 4, fontSize: 13, fontWeight: 700, paddingX: 22, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you are still looking to move forward with housing, we also encourage you to inquire about our currently available studio floorplans.\n\nPlease note that submission of the waitlist form does not guarantee placement, but it will allow our team to keep your information on file and contact you if a space becomes available.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you have any questions, please reach out to us at info@lumaongrand.com.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: LUMA.textDark, paddingTop: 16, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe ' + LUMA.propertyName + ' Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: LUMA.primaryColor, height: 8 } },
];

// ============================================================
// TEMPLATE 14: Relet Process Letter — The Avery District
// Multi-section formal process letter with numbered steps
// ============================================================
const reletProcessBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: AVERY.primaryColor, paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: AVERY.logoUrl, logoAlt: AVERY.propertyName, logoWidth: 350, preheaderText: '', backgroundColor: AVERY.primaryColor } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 0, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Thank you for reaching out regarding the relet process for your apartment at ' + AVERY.propertyName + '. We want to make sure you have a clear understanding of the steps, timelines, and responsibilities involved before moving forward.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 1
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '1. FIRST, CONFIRM WHICH LEASE YOU ARE RELETTING', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your current lease is in place for {LEASE TERM DATE}. If you also have a renewal lease for the next term, we need to know whether you are looking to relet your current lease, renewal lease, or both leases.\n\nIf you are only reletting your current lease but still wish to return for the Fall term, please note that you would not be able to move back into your unit at any time of your choosing. You would need to sign a revised agreement with a move-in date of {MOVE-IN DATE FOR NEW LEASES}.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 2
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '2. FINDING A RELET', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'It is ultimately the current resident\'s responsibility to find a qualified relet tenant. Our office may assist as a courtesy, but we are not obligated to do so.\n\nAt times, we may have a waitlist for a floorplan. However, roommate matching, lease dates, floorplan needs, and other qualification factors may affect whether a waitlisted student is a fit for your specific relet.\n\nHelpful places to post your relet:\n- University-related Facebook groups\n- Find My Place (findmyplace.co)', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 3
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '3. RELET QUALIFICATION REQUIREMENTS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your relet must be a university student and must provide proof of student status.\n\n- University students must provide a valid student ID number and university email\n- Students attending another university must provide official enrollment documentation\n\nPlease also note that your relet applicant must meet our financial qualification requirements, including a qualified guarantor if needed.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 4
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '4. APPLICATION AND APPROVAL PROCESS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If either you or our office identifies a potential relet applicant, that individual must complete the same qualification process required of all incoming residents.\n\n- Submit an application\n- Complete their interview\n- Sign a lease agreement\n\nOnce these steps are complete, our team will generate the appropriate relet documents for both parties to sign.\n\nA $300 relet fee will then be posted to the current resident\'s account and must be paid prior to move-out.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 5
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '5. LEASE RESPONSIBILITY AND DEAL TERMS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Please note that you remain fully responsible for your lease and all rent charges until the relet has been fully approved, all required documents have been completed, and the relet process has been officially finalized by our office.\n\nYour relet\'s lease agreement will match your existing lease terms, including your unit assignment, monthly installment, and any other recurring monthly fees tied to the space.\n\nIf you choose to offer your relet a private incentive or deal, please understand that any such arrangement is strictly between you and the relet resident. The office will not adjust lease documents, account charges, or contract terms to reflect any private agreement made between residents.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 6
  { id: bid(), type: 'text', data: { style: { backgroundColor: AVERY.primaryColor, textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '6. MOVE-OUT AND MOVE-IN SCHEDULING', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Because we will be cleaning and preparing your unit for the new resident, the following scheduling requirements are important:\n\n- Your move-out date must be on a weekday if you would like a manager to walk the unit with you at check-out\n- If you move out on a weekend, the office will provide a move-out envelope and staff will assess move-out charges at the earliest available opportunity\n- Your relet must move in on a business day, Monday through Friday\n- We will avoid move-ins on federal holidays\n- Ideally, we prefer 5 business days between your move-out and your relet\'s move-in date so our team has enough time to prepare the unit', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Callout
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, heading: 'Next Steps', body: 'If you would like to move forward, please reply to this email and let us know whether you are reletting your current lease, renewal lease, or both. Once we have that information, our team can help guide you through the next steps.', backgroundColor: AVERY.accentColor, borderColor: AVERY.primaryColor } },
  // Sign-off
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 16, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you have any questions, please reach out to us at info@averydistrict.com.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: AVERY.textDark, paddingTop: 8, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe ' + AVERY.propertyName + ' Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: AVERY.secondaryColor, height: 8 } },
];

// ============================================================
// EXPORT ALL TEMPLATES
// ============================================================

export const templateLibrary: EmailTemplate[] = [
  {
    id: 'tmpl-student-welcome',
    name: 'Student Housing Welcome',
    description: 'Welcome email for incoming students with hero image, alternating image+text sections, and tour CTA. Branded: ' + AVERY.propertyName,
    category: 'onboarding',
    blocks: studentWelcomeBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-luxury-marketing',
    name: 'Luxury Property Marketing',
    description: 'Elegant marketing email with alternating image+text sections and colored footer. Branded: ' + NORTHBEND.propertyName,
    category: 'marketing',
    blocks: luxuryMarketingBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-rate-drop',
    name: 'Rate Drop Special',
    description: 'Bold promotional email for price reductions with promo banner, floorplan spotlight, and strong CTA. Branded: ' + VERTEX.propertyName,
    category: 'marketing',
    blocks: rateDropBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-community-event',
    name: 'Community Event Invite',
    description: 'Warm event announcement with callout box and RSVP button. Branded: ' + SOLIS.propertyName,
    category: 'events',
    blocks: communityEventBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-renewal-reminder',
    name: 'Lease Renewal Reminder',
    description: 'Professional renewal email with deadline callout and benefits list. Branded: ' + MARQUEE.propertyName,
    category: 'retention',
    blocks: renewalReminderBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-ditch-dorms',
    name: 'Ditch the Dorms',
    description: 'Bold student marketing email comparing apartment vs dorm living with amenities grid. Branded: ' + LUMA.propertyName,
    category: 'marketing',
    blocks: ditchDormsBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-maintenance',
    name: 'Maintenance Notice',
    description: 'Clean operational notice with alert banner, details callout, and contact button. Branded: ' + ATLAS.propertyName,
    category: 'operations',
    blocks: maintenanceBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-move-in',
    name: 'Move-In Welcome',
    description: 'Welcome email with move-in checklist, amenities grid, and resident portal CTA. Branded: ' + NORTHBEND.propertyName,
    category: 'onboarding',
    blocks: moveInBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-navy-modern',
    name: 'Navy Modern Student',
    description: 'Student housing email with two-column features, testimonial, and apply CTA. Branded: ' + MARQUEE.propertyName,
    category: 'marketing',
    blocks: navyModernBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-apartment-listing',
    name: 'Apartment Listing',
    description: 'Clean listing email with pricing highlight, floorplan details, and tour CTA. Branded: ' + VERTEX.propertyName,
    category: 'marketing',
    blocks: apartmentListingBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-newsletter',
    name: 'Monthly Newsletter',
    description: 'Community newsletter with events, reminders, and resident portal link. Branded: ' + ATLAS.propertyName,
    category: 'newsletter',
    blocks: newsletterBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-waitlist',
    name: 'Waitlist Update',
    description: 'Waitlist notification with unit details callout and time-limited CTA. Branded: ' + SOLIS.propertyName,
    category: 'leasing',
    blocks: waitlistBlocks,
    globalStyles: { ...baseGlobal },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-leasing-ops-letter',
    name: 'Leasing Operations Letter',
    description: 'Formal leasing letter with Entrata merge tags, waitlist CTA, and professional sign-off. Branded: ' + LUMA.propertyName,
    category: 'leasing',
    blocks: leasingOpsLetterBlocks,
    globalStyles: { ...baseGlobal, bodyBackgroundColor: '#f4f4f4' },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
  {
    id: 'tmpl-relet-process',
    name: 'Relet Process Letter',
    description: 'Detailed relet process email with 6 numbered sections, qualification requirements, fees, and scheduling. Branded: ' + AVERY.propertyName,
    category: 'leasing',
    blocks: reletProcessBlocks,
    globalStyles: { ...baseGlobal, bodyBackgroundColor: '#f4f4f4' },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
];
