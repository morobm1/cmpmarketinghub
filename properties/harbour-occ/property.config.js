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
        { fact: null, ask: 'Current meal plan / dining options and hours.' },
      ],
      'ACADEMIC RESOURCES': [
        { fact: null, ask: 'Tutoring / study spaces / OCC academic support details to highlight.' },
      ],
      EMPLOYMENT: [
        { fact: null, ask: 'Current campus job resources or hiring events.' },
      ],
      TRANSPORTATION: [
        { fact: null, ask: 'Parking, transit and bike details.' },
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
        { fact: null, ask: 'Harbour office phone, email and office hours.' },
      ],
    },

    resources: [
      { category: 'Harbour Website',            title: 'The Harbour at OCC',            url: 'https://theharbourocc.com' },
      { category: 'Application Resources',      title: 'Apply / Application Portal',    url: 'https://theharbourocc.com', note: 'Applicants monitor the portal and email; verification ~24–48 hrs.' },
      { category: 'OCC Resources',              title: 'Orange Coast College',          url: 'https://orangecoastcollege.edu' },
      { category: 'Housing Financial Assistance', title: 'OCC Financial Aid',           url: 'mailto:occfinaid@occ.cccd.edu' },
      { category: 'Campus Resources',           title: 'ASOCC / Student Life',          url: 'mailto:studentlife@occ.cccd.edu' },
      { category: 'Campus Resources',           title: 'OCC Housing (Residential)',     url: 'mailto:occhousing@cccd.edu' },
      { category: 'Campus Resources',           title: 'Global Engagement Center',      url: 'mailto:occinternational@cccd.edu' },
      { category: 'Campus Resources',           title: 'Umoja',                         url: 'mailto:umoja@cccd.edu' },
      { category: 'ResLife',                    title: 'ResLife@OCC Club',              url: 'mailto:reslifeclubocc@gmail.com' },
      { category: 'ResLife',                    title: 'Reslife Hub (staff)',           url: 'reslife_hub.html' },
      { category: 'Dining',                     title: 'Dining options',                url: null, note: 'Add the current dining / meal plan link.' },
      { category: 'Accessibility',              title: 'OCC accessibility process',     url: null, note: 'Add the current OCC accessibility office link.' },
      { category: 'Student Employment',         title: 'OCC student jobs',              url: null, note: 'Add the current OCC job board link.' },
      { category: 'Academic Support',           title: 'OCC tutoring & academic support', url: null, note: 'Add the current link.' },
      { category: 'Emergency Information',      title: 'Emergency: call 911',           url: 'tel:911', note: 'Add Harbour after-hours / on-call number.' },
    ],

    defaults: {
      ctaUrl: 'https://theharbourocc.com',
      contact: '',          // e.g. office email/phone — intentionally blank until verified
      footer: 'The Harbour at OCC  •  theharbourocc.com',
      hashtags: ['#TheHarbourOCC', '#OCCPirates', '#OrangeCoastCollege', '#CostaMesa', '#StudentLiving'],
      emailSignoff: 'The Harbour ResLife Team',
    },

    // Folder structure mirrored in the UI (My Projects + library organization)
    projectFolders: ['Events', 'Resident Communications', 'Resources', 'Social Media', 'Housing Information', 'Parent Resources'],
  };
})(window);
