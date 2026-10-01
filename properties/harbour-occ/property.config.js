/**
 * The Harbour at OCC — Creative Studio property configuration.
 *
 * Single source of truth for brand tokens, logos, graphics, photos, terminology,
 * the property information library, resources and communication defaults.
 *
 * RULES
 * - Only approved, verified facts belong in `info`. Unknown values are `null` with an
 *   `ask` prompt so the studio asks staff instead of inventing policy, prices or dates.
 * - Logos are the official files downloaded from theharbourocc.com. Never regenerate them.
 * - Photos are real images from theharbourocc.com. `kind` marks property vs. campus vs. lifestyle/stock.
 */
(function (global) {
  const BASE = '/properties/harbour-occ/';
  global.CS_PROPERTY_DATA = global.CS_PROPERTY_DATA || {};
  const data = global.CS_PROPERTY_DATA['harbour-occ'] = global.CS_PROPERTY_DATA['harbour-occ'] || {};

  data.config = {
    id: 'harbour-occ',
    name: 'The Harbour at OCC',
    shortName: 'The Harbour',
    institution: 'Orange Coast College',
    institutionShort: 'OCC',
    city: 'Costa Mesa',
    state: 'California',
    website: 'theharbourocc.com',
    websiteUrl: 'https://theharbourocc.com',
    tagline: 'Student housing at Orange Coast College',
    personality: ['Coastal', 'Southern California', 'Modern', 'Student-oriented', 'Energetic', 'Friendly', 'Community-focused', 'Professional', 'Bright', 'Approachable'],

    // ── Brand tokens (navy + orange taken from the official logo / existing Hub theme) ──
    colors: {
      orange:     { hex: '#F99239', name: 'Harbour Orange', use: 'Primary accent, CTAs, waves, highlights' },
      navy:       { hex: '#002D6A', name: 'Harbour Navy', use: 'Headlines, text on light, dark panels' },
      blue:       { hex: '#1F5FA8', name: 'Coastal Blue', use: 'Supporting accents, links, secondary waves' },
      lightBlue:  { hex: '#DCEBF7', name: 'Light Blue', use: 'Soft panels and backgrounds' },
      sand:       { hex: '#FBF3E8', name: 'Sand', use: 'Warm background tint' },
      white:      { hex: '#FFFFFF', name: 'White', use: 'Primary background; keep generous white space' },
      darkText:   { hex: '#14213D', name: 'Dark Text', use: 'Body copy' },
    },
    fonts: {
      heading: { family: 'Montserrat', weights: [700, 800], css: "'Montserrat', system-ui, sans-serif" },
      body:    { family: 'Montserrat', weights: [400, 500, 600], css: "'Montserrat', system-ui, sans-serif" },
      googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    },

    logos: [
      { id: 'primary',    label: 'Primary Logo (Color)', src: BASE + 'logos/harbour-logo-color.png', background: 'light', note: 'Use on white or light backgrounds.' },
      { id: 'white',      label: 'White Logo',           src: BASE + 'logos/harbour-logo-white.svg', background: 'dark',  note: 'Use on navy, orange or dark photo areas.' },
      { id: 'icon',       label: 'Icon / Favicon Mark',  src: BASE + 'logos/harbour-icon.jpg',       background: 'light', note: 'Small-space use only (avatars, favicons).' },
      { id: 'dark',       label: 'Dark Logo',            src: null, background: 'light', note: 'Not yet provided — upload the approved one-color navy file.' },
      { id: 'horizontal', label: 'Horizontal Logo',      src: null, background: 'light', note: 'Not yet provided — upload the approved horizontal lockup.' },
    ],
    logoRules: [
      'Never stretch, recolor, rotate, add effects to, or redraw the logo.',
      'Keep clear space around the logo equal to the height of the wave mark.',
      'Use the white logo on navy, orange or dark photo areas; the color logo on white.',
      'Minimum width: 1.25 in print / 140 px digital.',
    ],

    graphics: [
      { id: 'orange-wave',     label: 'Orange Wave',     src: BASE + 'brand-kit/graphics/orange-wave.svg' },
      { id: 'blue-wave',       label: 'Blue Wave',       src: BASE + 'brand-kit/graphics/blue-wave.svg' },
      { id: 'coastal-divider', label: 'Coastal Divider', src: BASE + 'brand-kit/graphics/coastal-divider.svg' },
      { id: 'orange-corner',   label: 'Orange Corner',   src: BASE + 'brand-kit/graphics/orange-corner.svg' },
      { id: 'wave-footer',     label: 'Wave Footer',     src: BASE + 'brand-kit/graphics/wave-footer.svg' },
    ],

    photoCategories: ['Exterior', 'Lobby', 'Community spaces', 'Study areas', 'Bedrooms', 'Kitchens', 'Floorplans', 'Amenities', 'Courtyard', 'Students/community', 'OCC campus', 'Dining/resources'],
    photos: [
      { id: 'rooftop-terrace', src: BASE + 'photos/rooftop-terrace-0235.webp', category: 'Community spaces', alt: 'Shaded rooftop terrace lounge', kind: 'property' },
      { id: 'kitchen',         src: BASE + 'photos/kitchen-0182.webp',         category: 'Kitchens',         alt: 'Apartment kitchen with granite counters', kind: 'property' },
      { id: 'living-room',     src: BASE + 'photos/living-room-0104.webp',     category: 'Amenities',        alt: 'Furnished living room with floor-to-ceiling windows', kind: 'property' },
      { id: 'occ-walking',     src: BASE + 'photos/occ-campus-students-walking.webp', category: 'OCC campus', alt: 'Students walking on the OCC campus', kind: 'campus' },
      { id: 'occ-study',       src: BASE + 'photos/occ-study-students.webp',   category: 'Study areas',      alt: 'OCC students studying together', kind: 'campus' },
      { id: 'occ-studying',    src: BASE + 'photos/occ-campus-student-studying.webp', category: 'OCC campus', alt: 'Student studying outdoors on campus', kind: 'campus' },
      { id: 'lifestyle-walk',  src: BASE + 'photos/lifestyle-friends-walking.webp', category: 'Students/community', alt: 'Friends walking (website lifestyle image)', kind: 'lifestyle' },
      { id: 'stock-phone',     src: BASE + 'photos/stock-student-phone.webp',  category: 'Students/community', alt: 'Student holding phone (stock)', kind: 'stock' },
    ],

    terminology: {
      prefer: ['Resident', 'Student', 'Applicant', 'Guarantor', 'License Agreement', 'The Harbour', 'Orange Coast College', 'OCC'],
      replace: [
        { avoid: /\blease agreement\b/gi, use: 'License Agreement' },
        { avoid: /\blease\b/gi, use: 'License Agreement' },
        { avoid: /\btenants?\b/gi, use: 'Resident' },
        { avoid: /\bthe harbor\b/gi, use: 'The Harbour' },
        { avoid: /\bcosigner\b/gi, use: 'Guarantor' },
      ],
      notes: 'The agreement is a License Agreement. Only use "lease" when a communication intentionally requires it.',
    },

    voice: {
      default: 'Warm, upbeat, student-friendly and clear. Short sentences. Coastal energy without being cheesy.',
      parent: 'Reassuring, informative and respectful. Emphasize academic success, support, safety, community and financial clarity.',
      emergency: 'Calm, direct and factual. No exclamation points. Staff must verify all details before sending.',
    },

    // ── Property information library. null = unknown; staff will be prompted. ──
    info: {
      PROPERTY: [
        { fact: 'The Harbour is student housing associated with Orange Coast College (OCC) in Costa Mesa, California.' },
        { fact: 'Website: theharbourocc.com' },
        { fact: 'Units are furnished.' },
      ],
      APPLICATION: [
        { fact: 'A student ID is used during the application process.' },
        { fact: 'Enrollment verification can take approximately 24 to 48 hours.' },
        { fact: 'Applicants should monitor the Harbour application portal and their email for updates.' },
        { fact: null, ask: 'Application fee / deadlines (verify current values before publishing).' },
      ],
      ELIGIBILITY: [
        { fact: null, ask: 'Current eligibility requirements (enrollment status, units, age) — verify with leasing.' },
      ],
      GUARANTOR: [
        { fact: 'Guarantor qualification is based on the current approved property standard.' },
        { fact: 'Applicants under 17 may require special guarantor handling.' },
        { fact: null, ask: 'Specific guarantor income/credit standard — do not publish without the current approved figure.' },
      ],
      'FINANCIAL ASSISTANCE': [
        { fact: 'Housing financial assistance resources are available through Orange Coast College.' },
        { fact: 'If housing depends on financial assistance, residents should understand the implications of signing a binding License Agreement before assistance is confirmed.' },
        { fact: 'OCC Financial Aid: occfinaid@occ.cccd.edu' },
      ],
      'MOVE-IN': [
        { fact: null, ask: 'Move-in dates, check-in location and required documents.' },
      ],
      'MOVE-OUT': [
        { fact: null, ask: 'Move-out date, checkout steps and key return process.' },
      ],
      UTILITIES: [
        { fact: null, ask: 'Which utilities are included and any caps — verify before publishing.' },
      ],
      FURNISHINGS: [
        { fact: 'Units are furnished.' },
        { fact: 'Residents generally provide their own personal items such as linens and cookware.' },
      ],
      ROOMMATES: [
        { fact: null, ask: 'Roommate matching process and roommate agreement details.' },
      ],
      SECURITY: [
        { fact: null, ask: 'Building access/security features — verify before publishing.' },
      ],
      RESLIFE: [
        { fact: 'The Harbour provides student-centered community programming and ResLife support.' },
        { fact: 'ResLife@OCC student club: reslifeclubocc@gmail.com' },
      ],
      'CAMPUS RESOURCES': [
        { fact: 'Housing accommodations are coordinated through OCC\'s appropriate accessibility process.' },
        { fact: 'OCC Housing (Residential): occhousing@cccd.edu' },
        { fact: 'ASOCC / Student Life: studentlife@occ.cccd.edu' },
        { fact: 'Global Engagement Center: occinternational@cccd.edu' },
        { fact: 'Umoja: umoja@cccd.edu' },
      ],
      DINING: [
        { fact: 'OCC Food Services & Campus Dining: orangecoastcollege.edu/life-at-occ/food-services' },
        { fact: 'OCC Basic Needs Center (food support): orangecoastcollege.edu/services-support/basic-needs' },
        { fact: null, ask: 'Current meal plan details and hours.' },
      ],
      'ACADEMIC RESOURCES': [
        { fact: 'OCC Tutoring Services: orangecoastcollege.edu/services-support/tutoring-services' },
        { fact: 'OCC Library and Counseling Services are available to students.' },
        { fact: null, ask: 'Harbour study space details and hours.' },
      ],
      EMPLOYMENT: [
        { fact: 'On-campus jobs: OCC Career Center Student Employment page and OCC Handshake (occ.joinhandshake.com).' },
        { fact: null, ask: 'Current hiring events.' },
      ],
      TRANSPORTATION: [
        { fact: 'OCC Parking & Public Safety: orangecoastcollege.edu/about/parking-and-public-safety' },
        { fact: null, ask: 'Harbour parking, transit and bike details.' },
      ],
      AMENITIES: [
        { fact: 'Shared community spaces include a shaded rooftop terrace lounge (see photo library).' },
        { fact: null, ask: 'Full amenity list — verify before publishing.' },
      ],
      FAQ: [
        { q: 'What is the agreement called?', a: 'A License Agreement.' },
        { q: 'How long does enrollment verification take?', a: 'Approximately 24 to 48 hours.' },
        { q: 'Is the apartment furnished?', a: 'Yes. Residents bring personal items like linens and cookware.' },
      ],
      CONTACTS: [
        { fact: 'Address: 1369 Adams Avenue, Costa Mesa, CA' },
        { fact: 'Phone: 714-643-5100 · Text: 833-622-3602' },
        { fact: 'Email: live@theharbourocc.com' },
        { fact: 'Resident portal: theharbourocc.residentportal.com' },
        { fact: null, ask: 'Office hours.' },
      ],
    },

    // All links verified live (Oct 2026) on theharbourocc.com and orangecoastcollege.edu.
    // Web pages only — no mailto: links, which open whatever mail app the computer defaults to.
    resources: [
      { category: 'Harbour Website',              title: 'The Harbour at OCC',                url: 'https://theharbourocc.com/' },
      { category: 'Harbour Website',              title: 'Floor Plans',                       url: 'https://theharbourocc.com/floor-plans/' },
      { category: 'Harbour Website',              title: 'Features & Amenities',              url: 'https://theharbourocc.com/features/' },
      { category: 'Harbour Website',              title: 'Harbour Resources page',            url: 'https://theharbourocc.com/resources/' },
      { category: 'Harbour Website',              title: 'Contact The Harbour',               url: 'https://theharbourocc.com/contact-us/', note: '714-643-5100 · Text 833-622-3602 · live@theharbourocc.com' },
      { category: 'Application Resources',        title: 'Apply — Harbour application portal', url: 'https://theharbourocc.prospectportal.com/Apartments/module/application_authentication', note: 'Student ID needed; enrollment verification ~24–48 hrs.' },
      { category: 'Application Resources',        title: 'Resident Portal',                   url: 'https://theharbourocc.residentportal.com/auth', note: 'Payments, maintenance requests, account info.' },
      { category: 'Application Resources',        title: 'OCC Student Housing',               url: 'https://orangecoastcollege.edu/services-support/housing/index.html' },
      { category: 'OCC Resources',                title: 'Orange Coast College',              url: 'https://orangecoastcollege.edu/' },
      { category: 'OCC Resources',                title: 'MyCoast (student portal)',          url: 'https://mycoast.cccd.edu' },
      { category: 'OCC Resources',                title: 'Canvas',                            url: 'https://canvas.cccd.edu' },
      { category: 'OCC Resources',                title: 'Academic Calendar',                 url: 'https://orangecoastcollege.edu/calendars/academic-calendar.html' },
      { category: 'OCC Resources',                title: 'Campus Map & Directions',           url: 'https://orangecoastcollege.edu/about/map/index.html' },
      { category: 'Campus Resources',             title: 'Student Life — Clubs & Organizations', url: 'https://orangecoastcollege.edu/life-at-occ/student-life-leadership/clubs/index.html' },
      { category: 'Campus Resources',             title: 'ASOCC — Student Government',        url: 'https://orangecoastcollege.edu/life-at-occ/asocc/index.html' },
      { category: 'Campus Resources',             title: 'Dean of Students',                  url: 'https://orangecoastcollege.edu/life-at-occ/dean-of-students/index.html' },
      { category: 'Campus Resources',             title: 'Global Engagement Center',          url: 'https://orangecoastcollege.edu/services-support/gec/index.html' },
      { category: 'Campus Resources',             title: 'Umoja',                             url: 'https://orangecoastcollege.edu/services-support/umoja/index.html' },
      { category: 'Campus Resources',             title: 'The Hub (Student Resource Center)', url: 'https://orangecoastcollege.edu/services-support/support/the-hub/index.html' },
      { category: 'Campus Resources',             title: 'Student Health Center',             url: 'https://orangecoastcollege.edu/services-support/student-health/index.html' },
      { category: 'Campus Resources',             title: 'Mental Health Care',                url: 'https://orangecoastcollege.edu/services-support/student-health/mental-health-care/index.html' },
      { category: 'Dining',                       title: 'OCC Food Services & Campus Dining', url: 'https://orangecoastcollege.edu/life-at-occ/food-services/index.html' },
      { category: 'Dining',                       title: 'OCC Basic Needs Center (food pantry)', url: 'https://orangecoastcollege.edu/services-support/basic-needs/index.html' },
      { category: 'Housing Financial Assistance', title: 'OCC Financial Aid',                 url: 'https://orangecoastcollege.edu/admissions-aid/financial-aid/index.html' },
      { category: 'Housing Financial Assistance', title: 'Types of Aid Available',            url: 'https://orangecoastcollege.edu/admissions-aid/financial-aid/financial-aid-programs.html' },
      { category: 'Housing Financial Assistance', title: 'Scholarship Office',                url: 'https://orangecoastcollege.edu/services-support/scholarship/index.html' },
      { category: 'Housing Financial Assistance', title: 'EOPS / CARE',                       url: 'https://orangecoastcollege.edu/services-support/eops/index.html' },
      { category: 'Accessibility',                title: 'Accessibility Resource Center (ARC)', url: 'https://orangecoastcollege.edu/services-support/arc/index.html', note: 'Housing accommodations are coordinated through OCC’s accessibility process.' },
      { category: 'Student Employment',           title: 'On-Campus Student Employment',      url: 'https://orangecoastcollege.edu/academics/career-center/job-internship/student-employment.html' },
      { category: 'Student Employment',           title: 'Find a Job or Internship',          url: 'https://orangecoastcollege.edu/academics/career-center/job-internship/index.html' },
      { category: 'Student Employment',           title: 'OCC Handshake (job board)',         url: 'https://occ.joinhandshake.com' },
      { category: 'Academic Support',             title: 'Tutoring Services',                 url: 'https://orangecoastcollege.edu/services-support/tutoring-services/index.html' },
      { category: 'Academic Support',             title: 'OCC Library',                       url: 'https://orangecoastcollege.edu/academics/library/index.html' },
      { category: 'Academic Support',             title: 'Counseling Services',               url: 'https://orangecoastcollege.edu/services-support/counseling/index.html' },
      { category: 'ResLife',                      title: 'Reslife Hub (staff)',               url: 'reslife_hub.html' },
      { category: 'ResLife',                      title: 'Student Clubs (incl. ResLife@OCC)', url: 'https://orangecoastcollege.edu/life-at-occ/student-life-leadership/clubs/index.html' },
      { category: 'Emergency Information',        title: 'Emergency: call 911',               url: 'tel:911' },
      { category: 'Emergency Information',        title: 'OCC Parking & Public Safety',       url: 'https://orangecoastcollege.edu/about/parking-and-public-safety/index.html' },
      { category: 'Emergency Information',        title: 'Title IX',                          url: 'https://orangecoastcollege.edu/services-support/title-ix/index.html' },
    ],
    // ── Entrata email shell (matches the live Harbour Entrata template exactly) ──
    email: {
      colors: { accent: '#f58220', navy: '#103b78', page: '#eef2f6', text: '#42566b', heroText: '#e5edf7', border: '#dfe6ed', calloutBg: '#fff8f2', footerText: '#dce6f2' },
      font: 'arial,helvetica,sans-serif',
      logo: 'https://medialibrarycf.entrata.com/2342/MLv3/2025/09/17/085551/68cacbf730bb8875.jpg',
      logoAlt: 'The Harbour at Orange Coast College',
      siteUrl: 'https://theharbourocc.com/',
      portalUrl: 'https://theharbourocc.residentportal.com/auth',
      orgName: 'The Harbour at Orange Coast College',
      signature: { name: 'The Harbour Team', line: 'On-Campus Student Housing at Orange Coast College' },
      footer: { name: 'The Harbour at Orange Coast College', address: '1369 Adams Avenue • Costa Mesa, CA', phone: '714-643-5100', phoneHref: '+17146435100', text: '833-622-3602', textHref: '+18336223602', email: 'live@theharbourocc.com', site: 'theharbourocc.com' },
    },

    defaults: {
      ctaUrl: 'https://theharbourocc.com',
      contact: '714-643-5100 • live@theharbourocc.com',
      footer: 'The Harbour at OCC  •  theharbourocc.com',
      hashtags: ['#TheHarbourOCC', '#OCCPirates', '#OrangeCoastCollege', '#CostaMesa', '#StudentLiving'],
      emailSignoff: 'The Harbour ResLife Team',
    },

    // Folder structure mirrored in the UI (My Projects + library organization)
    projectFolders: ['Events', 'Resident Communications', 'Resources', 'Social Media', 'Housing Information', 'Parent Resources'],
  };
})(window);
