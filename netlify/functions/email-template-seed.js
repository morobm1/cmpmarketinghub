/**
 * Default email template library for seeding the database.
 * This is a JS version of the TypeScript templateLibrary.ts.
 * These templates are seeded on first access to the templates API.
 */

const now = new Date().toISOString();

const baseGlobal = {
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

// Template 1: Student Housing Welcome
const studentWelcomeBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#522e8c', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#522e8c' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#522e8c', textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'WELCOME TO YOUR NEW HOME!', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Campus living community' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Welcome to your new home! We are excited to have you join our community. Below you will find everything you need to know about your upcoming move-in and the amenities waiting for you.', fontSize: 15, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#522e8c', textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: '', imageAlt: 'Community amenities', imagePosition: 'left', imageWidth: 45, heading: 'Community Amenities', body: 'Enjoy resort-style amenities including a fitness center, study lounges, community spaces, and more.' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '#f8f4ff', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: '', imageAlt: 'Room features', imagePosition: 'right', imageWidth: 45, heading: 'Your Suite Awaits', body: 'Fully furnished suites with modern amenities, high-speed WiFi, and comfortable common areas.' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY NOW', url: '#', backgroundColor: '#522e8c', textColor: '#ffffff', borderRadius: 15, fontSize: 14, fontWeight: 700, paddingX: 35, paddingY: 15, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 80, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#522e8c', height: 8 } },
];

// Template 2: Luxury Property Marketing
const luxuryMarketingBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#3d5c3a', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 200, preheaderText: '', backgroundColor: '#3d5c3a' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Luxury property exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#3d5c3a', paddingTop: 28, paddingBottom: 4, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'COMFORTABLE CITY LIVING', fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#666666', paddingTop: 8, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Enriching the Quality of Life of Our Residents', fontSize: 16, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: '', imageAlt: 'Living space', imagePosition: 'left', imageWidth: 45, heading: 'Our Goal', body: 'We aim to provide tenants with the most convenient, cost-effective, and comfortable living experience.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: '', imageAlt: 'Lifestyle quality', imagePosition: 'right', imageWidth: 45, heading: 'Lifestyle Quality', body: 'One of the factors that makes our residents stay longer is by knowing their needs.', buttonLabel: 'View More', buttonUrl: '#' } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, color: '#3d5c3a', thickness: 2, widthPercent: 40, lineStyle: 'solid' } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8b2d2d', height: 8 } },
];

// Template 3: Rate Drop
const rateDropBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1a1a2e', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#1a1a2e' } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'RATES JUST DROPPED!', subheading: 'Limited time pricing on select floor plans.', backgroundColor: '#e63946', textColor: '#ffffff', buttonLabel: 'View Specials', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Property exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1a1a2e', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'New Lower Rates Available Now', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'We have just reduced rates on select floor plans. Schedule a tour today!', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Featured Floor Plan', floorplanImageUrl: '', floorplanImageAlt: 'Studio floor plan', unitName: 'The Studio', bedsBaths: 'Studio / 1 BA', sqft: '450', price: 'NOW $999/mo', buttonLabel: 'Check Availability', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'VIEW ALL SPECIALS', url: '#', backgroundColor: '#e63946', textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1a1a2e', height: 8 } },
];

// Template 4: Community Event
const communityEventBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f59e0b', textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'YOU ARE INVITED!', fontSize: 28, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Community event' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#92400e', paddingTop: 28, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Community Game Night', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#78716c', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Saturday, March 15 | 6:00 PM - 9:00 PM | Clubhouse', fontSize: 14, fontWeight: 600, lineHeight: 1.5 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 12, paddingBottom: 16, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'Join your neighbors for an evening of fun!', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'What to Expect', body: 'Board games and card games\nSnacks and beverages\nPrizes for winners\nGreat vibes', backgroundColor: '#fef3c7', borderColor: '#f59e0b' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RSVP NOW', url: '#', backgroundColor: '#f59e0b', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 40, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#292524', height: 8 } },
];

// Template 5: Renewal Reminder
const renewalReminderBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1e3a5f', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#1e3a5f' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1e3a5f', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Your Lease Renewal is Ready', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 20, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, content: 'We would love for you to continue being part of our community.', fontSize: 15, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Renewal Deadline', body: 'Your renewal offer expires on [DATE]. Please review and sign your renewal documents.', backgroundColor: '#fef2f2', borderColor: '#dc2626' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'REVIEW RENEWAL OPTIONS', url: '#', backgroundColor: '#1e3a5f', textColor: '#ffffff', borderRadius: 6, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f0f9ff', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Why Renew?\n\n- No moving costs\n- Lock in competitive rates\n- Continue enjoying amenities\n- Preferred resident pricing', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1e3a5f', height: 8 } },
];

// Template 6: Ditch the Dorms
const ditchDormsBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#16213e', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#16213e' } },
  { id: bid(), type: 'promo-banner', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, heading: 'DITCH THE DORMS', subheading: 'Upgrade your college experience.', backgroundColor: '#0f3460', textColor: '#ffffff', buttonLabel: 'Explore Options', buttonUrl: '#' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Modern student apartments' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#16213e', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Why Settle for a Dorm?', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'What You Get', items: [{ label: 'Private Bedrooms' }, { label: 'Full Kitchen' }, { label: 'In-Unit Laundry' }, { label: 'Study Rooms' }, { label: 'Fitness Center' }, { label: 'Pool & Hot Tub' }], columns: 3 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#e94560', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#16213e', height: 8 } },
];

// Template 7: Maintenance Notice
const maintenanceBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#fbbf24', textColor: '#78350f', paddingTop: 12, paddingBottom: 12, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'MAINTENANCE NOTICE', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Dear Residents,', fontSize: 15, fontWeight: 400, lineHeight: 1.6 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Maintenance Details', body: 'Date: [DATE]\nTime: [TIME]\nArea: [AREA]\nDuration: [DURATION]', backgroundColor: '#fefce8', borderColor: '#fbbf24' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CONTACT OFFICE', url: '#', backgroundColor: '#78350f', textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1c1917', height: 8 } },
];

// Template 8: Move-In Welcome
const moveInBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#065f46', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#065f46' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#065f46', textColor: '#a7f3d0', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Welcome Home!', fontSize: 30, fontWeight: 700, lineHeight: 1.2 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Welcome to your new home' } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Move-In Checklist', body: '1. Complete paperwork\n2. Schedule move-in time\n3. Set up utilities\n4. Pick up keys\n5. Review community handbook', backgroundColor: '#ecfdf5', borderColor: '#065f46' } },
  { id: bid(), type: 'amenities', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Explore Your Community', items: [{ label: 'Clubhouse' }, { label: 'Pool' }, { label: 'Fitness Center' }, { label: 'Package Lockers' }], columns: 2 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'ACCESS RESIDENT PORTAL', url: '#', backgroundColor: '#065f46', textColor: '#ffffff', borderRadius: 8, fontSize: 15, fontWeight: 700, paddingX: 32, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#065f46', height: 8 } },
];

// Template 9: Navy Modern
const navyModernBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#1e3456', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 200, preheaderText: '', backgroundColor: '#1e3456' } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Property showcase' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#1e3456', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Live Your Best College Life', fontSize: 26, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'two-column', data: { style: { backgroundColor: '#f0f5fa', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, leftContent: 'Fully Furnished\nPrivate Bedrooms\nIn-Unit Laundry\nHigh-Speed WiFi', rightContent: 'Study Lounges\nFitness Center\nCommunity Events\nOn-Site Management', columnRatio: '50-50' } },
  { id: bid(), type: 'testimonial', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, quote: 'Best decision I made was moving here!', authorName: 'Current Resident', authorTitle: 'Junior', rating: 5 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'APPLY TODAY', url: '#', backgroundColor: '#1e3456', textColor: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1e3456', height: 8 } },
];

// Template 10: Apartment Listing
const apartmentListingBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 150, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#1a365d', textColor: '#ffffff', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'APARTMENTS FOR RENT', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'hero-image', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, imageUrl: '', altText: 'Apartment exterior' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#f0fdf4', textColor: '#166534', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'Starting at $1,200/month', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'floorplan-spotlight', data: { style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, heading: 'Available Floor Plans', floorplanImageUrl: '', floorplanImageAlt: '2 Bedroom layout', unitName: '2 Bedroom', bedsBaths: '2 BD / 2 BA', sqft: '1,050', price: 'From $1,450/mo', buttonLabel: 'View Floor Plans', buttonUrl: '#' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 16, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'SCHEDULE A TOUR', url: '#', backgroundColor: '#1a365d', textColor: '#ffffff', borderRadius: 4, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 14, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1a365d', height: 8 } },
];

// Template 11: Newsletter
const newsletterBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#7c3aed', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 180, preheaderText: '', backgroundColor: '#7c3aed' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#7c3aed', textColor: '#e9d5ff', paddingTop: 4, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'COMMUNITY NEWSLETTER', fontSize: 14, fontWeight: 600, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Hello Residents!', fontSize: 22, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'divider', data: { style: { backgroundColor: '', paddingTop: 4, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, color: '#e2e8f0', thickness: 1, widthPercent: 100, lineStyle: 'solid' } },
  { id: bid(), type: 'image-text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'left' }, visible: true, imageUrl: '', imageAlt: 'Event', imagePosition: 'left', imageWidth: 40, heading: 'Upcoming Events', body: 'Community BBQ\nFitness Class\nMovie Night' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 16, paddingBottom: 4, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: 'Community Reminders', fontSize: 18, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#555555', paddingTop: 4, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, content: '- Pool hours extended\n- Guest parking passes available\n- Submit maintenance requests via portal', fontSize: 14, fontWeight: 400, lineHeight: 1.8 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'RESIDENT PORTAL', url: '#', backgroundColor: '#7c3aed', textColor: '#ffffff', borderRadius: 8, fontSize: 14, fontWeight: 700, paddingX: 28, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#2e1065', height: 8 } },
];

// Template 12: Waitlist Update
const waitlistBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 160, preheaderText: '', backgroundColor: '#ffffff' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#059669', textColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'GREAT NEWS!', fontSize: 20, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '', textColor: '#333333', paddingTop: 24, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, content: 'A Spot Has Opened Up', fontSize: 24, fontWeight: 700, lineHeight: 1.3 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' }, visible: true, heading: 'Available Unit Details', body: 'Floor Plan: [FLOOR PLAN]\nBedrooms: [BEDS] / Bathrooms: [BATHS]\nRate: [RATE]\nAvailable: [DATE]', backgroundColor: '#ecfdf5', borderColor: '#059669' } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '', paddingTop: 20, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' }, visible: true, label: 'CLAIM YOUR SPOT', url: '#', backgroundColor: '#059669', textColor: '#ffffff', borderRadius: 8, fontSize: 16, fontWeight: 700, paddingX: 36, paddingY: 16, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#1c1917', height: 8 } },
];

// Template 13: Leasing Operations Letter
const leasingOpsLetterBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#8F1D2C', paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 350, preheaderText: '', backgroundColor: '#8F1D2C' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'We are reaching out regarding your housing interest at [Property Name].', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'button', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 22, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, label: 'Join the Waitlist', url: '#', backgroundColor: '#8F1D2C', textColor: '#ffffff', borderRadius: 4, fontSize: 13, fontWeight: 700, paddingX: 22, paddingY: 12, alignment: 'center', fullWidth: false } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe [Property Name] Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8F1D2C', height: 8 } },
];

// Template 14: Relet Process Letter
const reletProcessBlocks = [
  { id: bid(), type: 'header', data: { style: { backgroundColor: '#8F1D2C', paddingTop: 28, paddingBottom: 28, paddingLeft: 40, paddingRight: 40, textAlign: 'center' }, visible: true, logoUrl: '', logoAlt: 'Property Logo', logoWidth: 350, preheaderText: '', backgroundColor: '#8F1D2C' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 40, paddingBottom: 10, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Dear *NAME_FIRST*,', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 0, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Thank you for reaching out regarding the relet process for your apartment.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '1. CONFIRM WHICH LEASE', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your current lease is in place for {LEASE TERM DATE}. Let us know whether you are reletting current, renewal, or both.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '2. FINDING A RELET', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'It is the current resident\'s responsibility to find a qualified relet tenant.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#8F1D2C', textColor: '#ffffff', paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, textAlign: 'left' }, visible: true, content: '3. QUALIFICATION REQUIREMENTS', fontSize: 13, fontWeight: 700, lineHeight: 1.4 } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 16, paddingBottom: 18, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Your relet must be a university student and must provide proof of student status.', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'callout-box', data: { style: { backgroundColor: '#ffffff', paddingTop: 8, paddingBottom: 8, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, heading: 'Next Steps', body: 'Reply to this email to let us know which lease you are reletting.', backgroundColor: '#f8f1f2', borderColor: '#8F1D2C' } },
  { id: bid(), type: 'text', data: { style: { backgroundColor: '#ffffff', textColor: '#333333', paddingTop: 8, paddingBottom: 40, paddingLeft: 40, paddingRight: 40, textAlign: 'left' }, visible: true, content: 'Sincerely,\n\nThe [Property Name] Team', fontSize: 13, fontWeight: 400, lineHeight: 1.7 } },
  { id: bid(), type: 'color-bar', data: { style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }, visible: true, color: '#8F1D2C', height: 8 } },
];

export const templateLibrary = [
  { id: 'tmpl-student-welcome', name: 'Student Housing Welcome', description: 'Purple-branded welcome email for incoming students', category: 'onboarding', blocks: studentWelcomeBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-luxury-marketing', name: 'Luxury Property Marketing', description: 'Elegant earth-tone marketing email', category: 'marketing', blocks: luxuryMarketingBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-rate-drop', name: 'Rate Drop Special', description: 'Bold promotional email for price reductions', category: 'marketing', blocks: rateDropBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-community-event', name: 'Community Event Invite', description: 'Warm event announcement with RSVP', category: 'events', blocks: communityEventBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-renewal-reminder', name: 'Lease Renewal Reminder', description: 'Professional renewal email with deadline callout', category: 'retention', blocks: renewalReminderBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-ditch-dorms', name: 'Ditch the Dorms', description: 'Bold student-targeted marketing vs dorms', category: 'marketing', blocks: ditchDormsBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-maintenance', name: 'Maintenance Notice', description: 'Clean operational notice with details callout', category: 'operations', blocks: maintenanceBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-move-in', name: 'Move-In Welcome', description: 'Green-themed welcome with move-in checklist', category: 'onboarding', blocks: moveInBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-navy-modern', name: 'Navy Modern Student', description: 'Navy-branded student housing email', category: 'marketing', blocks: navyModernBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-apartment-listing', name: 'Apartment Listing', description: 'Clean apartment listing with pricing', category: 'marketing', blocks: apartmentListingBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-newsletter', name: 'Monthly Newsletter', description: 'Purple-branded community newsletter', category: 'newsletter', blocks: newsletterBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-waitlist', name: 'Waitlist Update', description: 'Green-accented waitlist notification', category: 'leasing', blocks: waitlistBlocks, globalStyles: { ...baseGlobal }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-leasing-ops-letter', name: 'Leasing Operations Letter', description: 'Formal leasing letter with crimson branding', category: 'leasing', blocks: leasingOpsLetterBlocks, globalStyles: { ...baseGlobal, bodyBackgroundColor: '#f4f4f4' }, createdAt: now, updatedAt: now, isDefault: true },
  { id: 'tmpl-relet-process', name: 'Relet Process Letter', description: 'Detailed relet process email with numbered sections', category: 'leasing', blocks: reletProcessBlocks, globalStyles: { ...baseGlobal, bodyBackgroundColor: '#f4f4f4' }, createdAt: now, updatedAt: now, isDefault: true },
];
