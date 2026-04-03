import type { EmailTemplate, EmailBlock, EmailGlobalStyles } from '@/types';

const now = new Date().toISOString();

// Sample placeholder images that simulate real student housing marketing assets.
// These use placehold.co with realistic dimensions and labels.
// They can be swapped for real Entrata-hosted images via Brand Kit rebrand.
const SAMPLE = {
  exterior: 'https://placehold.co/600x300/1e293b/f8fafc?text=Property+Exterior&font=raleway',
  pool: 'https://placehold.co/600x300/0ea5e9/ffffff?text=Resort-Style+Pool&font=raleway',
  lobby: 'https://placehold.co/600x300/6366f1/ffffff?text=Modern+Lobby&font=raleway',
  fitness: 'https://placehold.co/280x200/334155/f8fafc?text=Fitness+Center&font=raleway',
  kitchen: 'https://placehold.co/280x200/78716c/ffffff?text=Gourmet+Kitchen&font=raleway',
  bedroom: 'https://placehold.co/280x200/6b7280/ffffff?text=Private+Bedroom&font=raleway',
  studyLounge: 'https://placehold.co/280x200/4f46e5/ffffff?text=Study+Lounge&font=raleway',
  amenities: 'https://placehold.co/280x200/059669/ffffff?text=Community+Amenities&font=raleway',
  gameRoom: 'https://placehold.co/280x200/7c3aed/ffffff?text=Game+Room&font=raleway',
  clubhouse: 'https://placehold.co/280x200/f59e0b/1e293b?text=Clubhouse&font=raleway',
  floorplan: 'https://placehold.co/280x280/f1f5f9/64748b?text=Floor+Plan+Layout&font=raleway',
  event: 'https://placehold.co/280x200/f59e0b/ffffff?text=Community+Event&font=raleway',
  logo: 'https://placehold.co/180x60/ffffff/333333?text=PROPERTY+LOGO&font=raleway',
  logoDark: 'https://placehold.co/180x60/1e293b/ffffff?text=PROPERTY+LOGO&font=raleway',
  logoWhite: 'https://placehold.co/350x80/8F1D2C/ffffff?text=PROPERTY+NAME&font=raleway',
  heroStudent: 'https://placehold.co/600x300/16213e/ffffff?text=Student+Living+Redefined&font=raleway',
  heroLuxury: 'https://placehold.co/600x300/3d5c3a/ffffff?text=Comfortable+City+Living&font=raleway',
  heroMoveIn: 'https://placehold.co/600x300/065f46/a7f3d0?text=Welcome+Home&font=raleway',
};

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
// TEMPLATE 1: Student Housing Welcome (ResVillage/UWB style)
// Purple branding, serif headings, campus-focused
// ============================================================
const studentWelcomeBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#522e8c', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#522e8c' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#522e8c', textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'WELCOME TO YOUR NEW HOME!', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.exterior, altText: 'Campus living community' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Welcome to your new home! We are excited to have you join our community. Below you will find everything you need to know about your upcoming move-in and the amenities waiting for you.', fontSize: 15, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#522e8c', textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.amenities, imageAlt: 'Community amenities', imagePosition: 'left', imageWidth: 45, heading: 'Community Amenities', body: 'Enjoy resort-style amenities including a fitness center, study lounges, community spaces, and more. Everything designed with your student lifestyle in mind.' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '#f8f4ff', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.bedroom, imageAlt: 'Room features', imagePosition: 'right', imageWidth: 45, heading: 'Your Suite Awaits', body: 'Fully furnished suites with modern amenities, high-speed WiFi, and comfortable common areas. Your home away from home starts here.' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY NOW', url: '#', backgroundColor: '#522e8c', textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 80, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#522e8c', height: 8 } },
];

// ============================================================
// TEMPLATE 2: Property Marketing - Luxury (Chorro/Earth tone style)
// Earth tones, elegant, photo-forward
// ============================================================
const luxuryMarketingBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#3d5c3a', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 200, preheaderText: '', backgroundColor: '#3d5c3a' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.heroLuxury, altText: 'Luxury property exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#3d5c3a', paddingTop: 28, paddingBottom: 4, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'COMFORTABLE CITY LIVING', fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#666666', paddingTop: 8, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Enriching the Quality of Life of Our Residents', fontSize: 16, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.kitchen, imageAlt: 'Living space', imagePosition: 'left', imageWidth: 45, heading: 'Our Goal', body: 'We aim to provide tenants with the most convenient, cost-effective, and comfortable living experience.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.bedroom, imageAlt: 'Lifestyle quality', imagePosition: 'right', imageWidth: 45, heading: 'Lifestyle Quality', body: 'One of the factors that makes our residents stay longer is by knowing their needs and considering their lifestyle.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.amenities, imageAlt: 'Green spaces', imagePosition: 'left', imageWidth: 45, heading: 'Green and Open Spaces', body: 'We have designed green and open spaces for our residents to have a little greenery in the city.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: '#3d5c3a', thickness: 2, widthPercent: 40, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8b2d2d', height: 8 } },
];

// ============================================================
// TEMPLATE 3: Rate Drop / Special Offer (Bold promo style)
// ============================================================
const rateDropBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1a1a2e', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#1a1a2e' } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'RATES JUST DROPPED!', subheading: 'Limited time pricing on select floor plans. Lock in your rate today.', backgroundColor: '#e63946', textColor: '#ffffff', buttonLabel: 'View Specials', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.exterior, altText: 'Property exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1a1a2e', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'New Lower Rates Available Now', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'We have just reduced rates on select floor plans. This is a limited-time offer so do not wait. Schedule a tour today to see your new home and lock in this incredible rate before it is gone.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Featured Floor Plan', floorplanImageUrl: SAMPLE.floorplan, floorplanImageAlt: 'Studio floor plan', unitName: 'The Studio', bedsBaths: 'Studio / 1 BA', sqft: '450', price: 'NOW $999/mo (was $1,149)', buttonLabel: 'Check Availability', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'VIEW ALL SPECIALS', url: '#', backgroundColor: '#e63946', textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1a1a2e', height: 8 } },
];

// ============================================================
// TEMPLATE 4: Community Event (Warm, inviting)
// ============================================================
const communityEventBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f59e0b', textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'YOU ARE INVITED!', fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.clubhouse, altText: 'Community event' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#92400e', paddingTop: 28, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Community Game Night', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#78716c', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Saturday, March 15 | 6:00 PM - 9:00 PM | Clubhouse', fontSize: 14, fontWeight: 600, lineHeight: 1.5 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 12, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Join your neighbors for an evening of fun! We will have board games, snacks, drinks, and great company. Bring a friend and make new ones. All residents and their guests are welcome.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'What to Expect', body: 'Board games and card games provided\nComplimentary snacks and beverages\nPrizes for game winners\nGreat community vibes', backgroundColor: '#fef3c7', borderColor: '#f59e0b' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RSVP NOW', url: '#', backgroundColor: '#f59e0b', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 40, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#292524', height: 8 } },
];

// ============================================================
// TEMPLATE 5: Renewal Reminder (Professional, urgent)
// ============================================================
const renewalReminderBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1e3a5f', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#1e3a5f' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1e3a5f', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Your Lease Renewal is Ready', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'We would love for you to continue being part of our community. Your current lease is approaching its renewal date, and we have prepared renewal options for you.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Renewal Deadline', body: 'Your renewal offer expires on [DATE]. Please log into your resident portal to review and sign your renewal documents before the deadline to secure your current rate.', backgroundColor: '#fef2f2', borderColor: '#dc2626' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'REVIEW RENEWAL OPTIONS', url: '#', backgroundColor: '#1e3a5f', textColor: '#ffffff', borderRadius: 6, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f0f9ff', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Why Renew With Us?\n\n- No moving costs or hassle\n- Lock in competitive rates\n- Continue enjoying our community amenities\n- Preferred resident pricing\n- Guaranteed unit availability', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 12, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Questions? Contact our leasing office and we will be happy to help.', fontSize: 14, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1e3a5f', height: 8 } },
];

// ============================================================
// TEMPLATE 6: Ditch the Dorms (Student marketing, bold)
// ============================================================
const ditchDormsBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#16213e', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#16213e' } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'DITCH THE DORMS', subheading: 'Upgrade your college experience. Live where you want, how you want.', backgroundColor: '#0f3460', textColor: '#ffffff', buttonLabel: 'Explore Options', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.heroStudent, altText: 'Modern student apartments' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#16213e', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Why Settle for a Dorm?', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Get more space, more privacy, and more freedom. Our apartments offer everything the dorms cannot — full kitchens, private bedrooms, in-unit laundry, and a community built for students.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'What You Get', items: [{ label: 'Private Bedrooms', description: 'Your own space' }, { label: 'Full Kitchen', description: 'Cook your own meals' }, { label: 'In-Unit Laundry', description: 'No more laundromat' }, { label: 'Study Rooms', description: '24/7 quiet study' }, { label: 'Fitness Center', description: 'State-of-the-art gym' }, { label: 'Pool & Hot Tub', description: 'Resort-style living' }], columns: 3 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#e94560', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#16213e', height: 8 } },
];

// ============================================================
// TEMPLATE 7: Maintenance Notice (Clean, operational)
// ============================================================
const maintenanceBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#fbbf24', textColor: '#78350f', paddingTop: 12, paddingBottom: 12, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'MAINTENANCE NOTICE', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Dear Residents,', fontSize: 15, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'We want to inform you about upcoming scheduled maintenance. Please review the details below for timing and any actions you may need to take.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Maintenance Details', body: 'Date: [DATE]\nTime: [TIME]\nArea Affected: [AREA]\nDuration: Approximately [DURATION]\n\nPlease ensure [any specific instructions].', backgroundColor: '#fefce8', borderColor: '#fbbf24' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'We appreciate your patience and understanding. If you have any questions or concerns, please contact our office.', fontSize: 14, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CONTACT OFFICE', url: '#', backgroundColor: '#78350f', textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1c1917', height: 8 } },
];

// ============================================================
// TEMPLATE 8: Move-In Welcome (Warm, informational)
// ============================================================
const moveInBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#065f46', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#065f46' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#065f46', textColor: '#a7f3d0', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Welcome Home!', fontSize: 30, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.heroMoveIn, altText: 'Welcome to your new home' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Congratulations on your new home! We are thrilled to welcome you to our community. Here is everything you need for a smooth move-in experience.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Move-In Checklist', body: '1. Complete all move-in paperwork\n2. Schedule your move-in time slot\n3. Set up utilities and renter\'s insurance\n4. Pick up your keys from the leasing office\n5. Review the community handbook\n6. Download our resident app', backgroundColor: '#ecfdf5', borderColor: '#065f46' } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Explore Your New Community', items: [{ label: 'Clubhouse', description: 'Social events weekly' }, { label: 'Pool', description: 'Open 8AM-10PM' }, { label: 'Fitness Center', description: 'Open 24/7' }, { label: 'Package Lockers', description: 'Secure delivery' }], columns: 2 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'ACCESS RESIDENT PORTAL', url: '#', backgroundColor: '#065f46', textColor: '#ffffff', borderRadius: 8, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#065f46', height: 8 } },
];

// ============================================================
// TEMPLATE 9: Navy Modern (M@College style)
// ============================================================
const navyModernBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1e3456', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 200, preheaderText: '', backgroundColor: '#1e3456' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.pool, altText: 'Property showcase' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1e3456', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Live Your Best College Life', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Purpose-built student housing designed with you in mind. Study, relax, and connect in a community that supports your success.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'two-column', data: { style: { backgroundColor: '#f0f5fa', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, leftContent: 'Fully Furnished\nPrivate Bedrooms\nIn-Unit Laundry\nHigh-Speed WiFi', rightContent: 'Study Lounges\nFitness Center\nCommunity Events\nOn-Site Management', columnRatio: '50-50' } },
  { id: bid(), type: 'testimonial', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, quote: 'Best decision I made was moving here. The community is amazing and I actually enjoy studying in the lounges!', authorName: 'Current Resident', authorTitle: 'Junior, Business Major', rating: 5 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY TODAY', url: '#', backgroundColor: '#1e3456', textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1e3456', height: 8 } },
];

// ============================================================
// TEMPLATE 10: Apartment Listing / For Rent (Clean listing style)
// ============================================================
const apartmentListingBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 150, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#1a365d', textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'APARTMENTS FOR RENT', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: SAMPLE.exterior, altText: 'Apartment exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f0fdf4', textColor: '#166534', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Starting at $1,200/month', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Located in the heart of the city, our community offers modern apartments with premium finishes. Close to shops, dining, and transit.\n\nAvailable floor plans include studio, 1-bedroom, and 2-bedroom layouts. Each home features stainless steel appliances, quartz countertops, and wood-style flooring.', fontSize: 14, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Available Floor Plans', floorplanImageUrl: SAMPLE.floorplan, floorplanImageAlt: '2 Bedroom layout', unitName: '2 Bedroom', bedsBaths: '2 BD / 2 BA', sqft: '1,050', price: 'From $1,450/mo', buttonLabel: 'View Floor Plans', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#1a365d', textColor: '#ffffff', borderRadius: 4, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1a365d', height: 8 } },
];

// ============================================================
// TEMPLATE 11: Newsletter / Monthly Update
// ============================================================
const newsletterBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#7c3aed', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#7c3aed' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#7c3aed', textColor: '#e9d5ff', paddingTop: 4, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'COMMUNITY NEWSLETTER | MARCH 2025', fontSize: 14, fontWeight: 600, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Hello Residents!', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Spring is here and we have an exciting month ahead! Here is what is happening in our community.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 100, lineStyle: 'solid' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: SAMPLE.event, imageAlt: 'Upcoming event', imagePosition: 'left', imageWidth: 40, heading: 'Upcoming Events', body: 'March 15 - Community BBQ\nMarch 22 - Fitness Class\nMarch 28 - Movie Night' } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 100, lineStyle: 'solid' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Community Reminders', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: '- Pool hours extended to 10 PM starting March 1\n- Guest parking passes available at the front desk\n- Maintenance requests can be submitted through the resident portal\n- Package locker codes reset monthly - check your email for your new code', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RESIDENT PORTAL', url: '#', backgroundColor: '#7c3aed', textColor: '#ffffff', borderRadius: 8, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#2e1065', height: 8 } },
];

// ============================================================
// TEMPLATE 12: Waitlist Update (Clean, hopeful)
// ============================================================
const waitlistBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoDark, logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#059669', textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'GREAT NEWS!', fontSize: 20, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'A Spot Has Opened Up', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 8, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'We are excited to let you know that a unit matching your preferences is now available. As a valued waitlist member, you have priority access for a limited time.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Available Unit Details', body: 'Floor Plan: [FLOOR PLAN]\nBedrooms: [BEDS] / Bathrooms: [BATHS]\nSquare Feet: [SQFT]\nMonthly Rate: [RATE]\nAvailable: [DATE]', backgroundColor: '#ecfdf5', borderColor: '#059669' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 20, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CLAIM YOUR SPOT', url: '#', backgroundColor: '#059669', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#dc2626', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'This offer expires in 48 hours. Act now to secure your unit.', fontSize: 13, fontWeight: 600, lineHeight: 1.5 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1c1917', height: 8 } },
];

// ============================================================
// TEMPLATE 13: Leasing Operations Letter (Ivory University House style)
// Formal letter format, crimson branding, Entrata merge tags
// ============================================================
const leasingOpsLetterBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#8F1D2C', paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoWhite, logoAlt: 'Property Logo', logoWidth: 350, preheaderText: '', backgroundColor: '#8F1D2C' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 0, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Date: *CURRENT_DATE*', fontSize: 13, fontWeight: 700, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'We are reaching out regarding your Fall 2026 housing interest at [Property Name].\n\nAt this time, our 3BR/3BA floorplan is fully sold out for Fall 2026 and is no longer available to secure.\n\nIf you would still like to be considered for a 3BR/3BA space, you are welcome to join our waitlist in the event that availability opens later.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 22, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, label: 'Join the 3BR/3BA Waitlist', url: '#', backgroundColor: '#8F1D2C', textColor: '#ffffff', borderRadius: 4, fontSize: 13, fontWeight: 700, paddingX: 22, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you are still looking to move forward with housing, we also encourage you to inquire about our currently available studio floorplans.\n\nPlease note that submission of the waitlist form does not guarantee placement, but it will allow our team to keep your information on file and contact you if a space becomes available.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you have any questions, please reach out to us at info@property.com.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe [Property Name] Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8F1D2C', height: 8 } },
];

// ============================================================
// TEMPLATE 14: Relet Process Letter (Detailed operations)
// Multi-section formal process letter with numbered steps
// ============================================================
const reletProcessBlocks: EmailBlock[] = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#8F1D2C', paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: SAMPLE.logoWhite, logoAlt: 'Property Logo', logoWidth: 350, preheaderText: '', backgroundColor: '#8F1D2C' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 0, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Thank you for reaching out regarding the relet process for your apartment. We want to make sure you have a clear understanding of the steps, timelines, and responsibilities involved before moving forward.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 1
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '1. FIRST, CONFIRM WHICH LEASE YOU ARE RELETTING', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your current lease is in place for {LEASE TERM DATE}. If you also have a renewal lease for the next term, we need to know whether you are looking to relet your current lease, renewal lease, or both leases.\n\nIf you are only reletting your current lease but still wish to return for the Fall term, please note that you would not be able to move back into your unit at any time of your choosing. You would need to sign a revised agreement with a move-in date of {MOVE-IN DATE FOR NEW LEASES}.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 2
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '2. FINDING A RELET', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'It is ultimately the current resident\'s responsibility to find a qualified relet tenant. Our office may assist as a courtesy, but we are not obligated to do so.\n\nAt times, we may have a waitlist for a floorplan. However, roommate matching, lease dates, floorplan needs, and other qualification factors may affect whether a waitlisted student is a fit for your specific relet.\n\nHelpful places to post your relet:\n- University-related Facebook groups\n- Find My Place (findmyplace.co)', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 3
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '3. RELET QUALIFICATION REQUIREMENTS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your relet must be a university student and must provide proof of student status.\n\n- University students must provide a valid student ID number and university email\n- Students attending another university must provide official enrollment documentation\n\nPlease also note that your relet applicant must meet our financial qualification requirements, including a qualified guarantor if needed.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 4
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '4. APPLICATION AND APPROVAL PROCESS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If either you or our office identifies a potential relet applicant, that individual must complete the same qualification process required of all incoming residents.\n\n- Submit an application\n- Complete their interview\n- Sign a lease agreement\n\nOnce these steps are complete, our team will generate the appropriate relet documents for both parties to sign.\n\nA $300 relet fee will then be posted to the current resident\'s account and must be paid prior to move-out.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 5
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '5. LEASE RESPONSIBILITY AND DEAL TERMS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Please note that you remain fully responsible for your lease and all rent charges until the relet has been fully approved, all required documents have been completed, and the relet process has been officially finalized by our office.\n\nYour relet\'s lease agreement will match your existing lease terms, including your unit assignment, monthly installment, and any other recurring monthly fees tied to the space.\n\nIf you choose to offer your relet a private incentive or deal, please understand that any such arrangement is strictly between you and the relet resident. The office will not adjust lease documents, account charges, or contract terms to reflect any private agreement made between residents.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Section 6
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '6. MOVE-OUT AND MOVE-IN SCHEDULING', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Because we will be cleaning and preparing your unit for the new resident, the following scheduling requirements are important:\n\n- Your move-out date must be on a weekday if you would like a manager to walk the unit with you at check-out\n- If you move out on a weekend, the office will provide a move-out envelope and staff will assess move-out charges at the earliest available opportunity\n- Your relet must move in on a business day, Monday through Friday\n- We will avoid move-ins on federal holidays\n- Ideally, we prefer 5 business days between your move-out and your relet\'s move-in date so our team has enough time to prepare the unit', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  // Callout
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, heading: 'Next Steps', body: 'If you would like to move forward, please reply to this email and let us know whether you are reletting your current lease, renewal lease, or both. Once we have that information, our team can help guide you through the next steps.', backgroundColor: '#f8f1f2', borderColor: '#8F1D2C' } },
  // Sign-off
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'If you have any questions, please reach out to us at info@property.com.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe [Property Name] Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8F1D2C', height: 8 } },
];

// ============================================================
// EXPORT ALL TEMPLATES
// ============================================================

export const templateLibrary: EmailTemplate[] = [
  {
    id: 'tmpl-student-welcome',
    name: 'Student Housing Welcome',
    description: 'Purple-branded welcome email for incoming students with hero image, alternating image+text sections, and tour CTA',
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
    description: 'Elegant earth-tone marketing email with alternating image+text sections, team spotlight area, and colored footer',
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
    description: 'Bold promotional email for price reductions with promo banner, floorplan spotlight, and strong CTA',
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
    description: 'Warm, inviting event announcement with callout box for details, amber/gold accent colors, and RSVP button',
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
    description: 'Professional renewal email with deadline callout, benefits list, and navy branding',
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
    description: 'Bold student-targeted marketing email comparing apartment living vs dorms, with amenities grid and strong CTA',
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
    description: 'Clean operational notice with yellow alert banner, maintenance details callout, and contact button',
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
    description: 'Green-themed welcome email with move-in checklist, community amenities grid, and resident portal CTA',
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
    description: 'Navy-branded student housing email with two-column features, testimonial, and apply CTA',
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
    description: 'Clean apartment listing email with pricing highlight, floorplan details, and tour scheduling CTA',
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
    description: 'Purple-branded community newsletter with events, reminders, and resident portal link',
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
    description: 'Green-accented waitlist notification with unit details callout and time-limited CTA',
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
    description: 'Formal leasing letter with crimson branding, Entrata merge tags (*NAME_FIRST*, *CURRENT_DATE*), waitlist CTA, and professional sign-off',
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
    description: 'Detailed relet process email with 6 numbered sections (crimson headers), qualification requirements, fees, scheduling, and next-steps callout',
    category: 'leasing',
    blocks: reletProcessBlocks,
    globalStyles: { ...baseGlobal, bodyBackgroundColor: '#f4f4f4' },
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  },
];
