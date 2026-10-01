/**
 * The Harbour at OCC — Template library.
 *
 * Every template uses the same metadata shape:
 * { id, propertyId, name, category, group, audience, format, orientation, layout,
 *   brandKit, editable, locked, approved, tags, content: { headline, subheadline, body,
 *   date, time, location, cta, qr, contact, photo, footer } }
 *
 * `layout` selects a renderer in reslife_creative_studio.js (event, guide, checklist,
 * notice, spotlight, parent, social, story, sign). Body lines starting with "- " become
 * bullets/steps; "Title: text" lines become feature cards in the parent/spotlight layouts.
 * `[[...]]` marks information staff must fill in or verify — the studio flags it.
 */
(function (global) {
  const P = 'harbour-occ';
  const data = global.CS_PROPERTY_DATA[P] = global.CS_PROPERTY_DATA[P] || {};
  const URL = 'https://theharbourocc.com';

  const GROUPS = {
    events: 'ResLife Events',
    resident: 'Resident Information',
    occ: 'OCC Resources',
    housing: 'Housing',
    parent: 'Parent & Guardian',
    social: 'Social Media',
    signage: 'Signage',
  };

  const FORMATS = {
    letter:  { label: '8.5 × 11 Flyer', w: 816,  h: 1056, print: { w: 8.5, h: 11 } },
    notice:  { label: 'Door Notice',    w: 816,  h: 1056, print: { w: 8.5, h: 11 } },
    post:    { label: 'Instagram Post', w: 1080, h: 1080 },
    story:   { label: 'Instagram Story', w: 1080, h: 1920 },
    sign:    { label: 'Digital Sign',   w: 1920, h: 1080 },
    email:   { label: 'Email' },
    sms:     { label: 'SMS' },
  };

  function t(id, name, group, layout, content, extra) {
    const fmt = (extra && extra.format) || (layout === 'notice' ? 'notice' : layout === 'social' ? 'post' : layout === 'story' ? 'story' : layout === 'sign' ? 'sign' : 'letter');
    return Object.assign({
      id: 'harbour-' + id,
      propertyId: P,
      name,
      category: group,
      group: GROUPS[group],
      audience: group === 'parent' ? 'parents' : group === 'housing' ? 'applicants' : 'residents',
      format: fmt,
      orientation: fmt === 'sign' ? 'landscape' : fmt === 'post' ? 'square' : 'portrait',
      layout,
      brandKit: P,
      editable: true,
      locked: false,
      approved: false,
      tags: [],
      content: Object.assign({ headline: name, subheadline: '', body: '', date: '', time: '', location: '', cta: '', qr: '', contact: '', photo: '', footer: '' }, content),
    }, extra || {});
  }

  const PH = {
    terrace: 'rooftop-terrace', kitchen: 'kitchen', living: 'living-room',
    campus: 'occ-walking', study: 'occ-study', studying: 'occ-studying', friends: 'lifestyle-walk',
  };

  const templates = [
    // ───────── 20 preloaded, fully written examples (approved: true) ─────────
    t('dining', 'What Are My Meal Options?', 'occ', 'guide', {
      headline: 'What Are My Meal Options?', subheadline: 'Eating well near campus',
      body: '- Cook at home: every Harbour apartment has a full kitchen\n- Grab a bite on the OCC campus between classes\n- [[Add current meal plan / dining partner details]]\n- Bring your own cookware — kitchens are furnished, cookware is not',
      cta: 'See dining info', qr: URL, photo: PH.kitchen,
    }, { approved: true, tags: ['dining', 'food', 'meal plan'] }),

    t('apply-how', 'How to Complete Your Harbour Application', 'housing', 'guide', {
      headline: 'How to Complete Your Application', subheadline: 'Your step-by-step guide to living at The Harbour',
      body: '- Start your application at theharbourocc.com\n- Have your OCC student ID ready\n- Submit your application and guarantor information\n- Enrollment verification takes about 24–48 hours\n- Watch your email and the application portal for next steps',
      cta: 'Apply today', qr: URL, photo: PH.campus,
    }, { approved: true, tags: ['application', 'apply', 'leasing', 'student id'] }),

    t('sign-license', 'How to Sign Your License Agreement', 'housing', 'guide', {
      headline: 'How to Sign Your License Agreement', subheadline: 'Almost home — here’s how to finish',
      body: '- Watch your email for your License Agreement link\n- Review every page carefully before signing\n- Your guarantor may also need to sign\n- Using financial assistance? Understand that the License Agreement is binding before your aid is confirmed\n- Questions? Ask the Harbour team before you sign',
      cta: 'Questions? Contact us', qr: URL, photo: PH.living,
    }, { approved: true, tags: ['license agreement', 'sign', 'guarantor'] }),

    t('parent-guide', 'Parent & Guardian Guide', 'parent', 'parent', {
      headline: 'A Parent & Guardian Guide to The Harbour', subheadline: 'Supporting your student’s success at Orange Coast College',
      body: 'Steps From Class: Live next to OCC so more time goes to learning.\nFurnished Living: Apartments arrive furnished — students bring linens and cookware.\nStudent Support: ResLife programming builds community and belonging.\nFinancial Clarity: The License Agreement is a binding commitment — review it together.',
      cta: 'Learn more', qr: URL, photo: PH.study,
    }, { approved: true, tags: ['parent', 'guardian', 'family'] }),

    t('academic', 'Academic Success Resources', 'occ', 'guide', {
      headline: 'Academic Success Starts Here', subheadline: 'Resources to help you finish the semester strong',
      body: '- Study with friends in Harbour community spaces\n- Use OCC tutoring and academic support\n- Meet with your counselor to plan your classes\n- [[Add tutoring center hours / location]]',
      cta: 'Find support', qr: '', photo: PH.study,
    }, { approved: true, tags: ['academic', 'tutoring', 'study'] }),

    t('community-event', 'Community Event', 'events', 'event', {
      headline: 'Rooftop Community Night', subheadline: 'Music, snacks and new friends',
      body: 'Come hang out with your neighbors and the ResLife team. Snacks provided!',
      date: 'Thursday, Sept 18', time: '7:00 PM', location: 'Rooftop Terrace', cta: 'All residents welcome', photo: PH.terrace,
    }, { approved: true, tags: ['event', 'community', 'social'] }),

    t('resident-meeting', 'Resident Meeting', 'events', 'event', {
      headline: 'Resident Meeting', subheadline: 'Your community, your voice',
      body: 'Get updates, share ideas and meet your ResLife team. Bring your questions!',
      date: '[[Date]]', time: '[[Time]]', location: '[[Location]]', cta: 'See you there', photo: PH.living,
    }, { approved: true, tags: ['meeting', 'community'] }),

    t('move-in-checklist', 'Move-In Checklist', 'resident', 'checklist', {
      headline: 'Move-In Checklist', subheadline: 'Everything you need for a smooth first day',
      body: '- Bedding and linens\n- Towels and toiletries\n- Cookware, dishes and utensils\n- Laptop, chargers and power strip\n- Student ID and a photo ID\n- Your signed License Agreement confirmation\n- [[Add check-in location and time]]',
      cta: 'Welcome home!', photo: PH.living,
    }, { approved: true, tags: ['move in', 'checklist', 'what to bring'] }),

    t('move-out-checklist', 'Move-Out Checklist', 'resident', 'checklist', {
      headline: 'Move-Out Checklist', subheadline: 'Leave on a high note',
      body: '- Remove all personal belongings\n- Clean the kitchen, bathroom and floors\n- Empty the fridge and take out trash\n- Report any damage to the office\n- Return all keys and fobs\n- [[Add move-out date and checkout steps]]',
      cta: 'Thanks for calling The Harbour home', photo: PH.kitchen,
    }, { approved: true, tags: ['move out', 'checklist'] }),

    t('maintenance-notice', 'Maintenance Notice', 'resident', 'notice', {
      headline: 'Maintenance Entry Notice', subheadline: 'Planned work in your unit',
      body: 'Our team will enter your unit to complete scheduled maintenance. No action is needed — please secure pets and valuables.',
      date: '[[Date]]', time: '[[Time window]]', location: '[[Units / building]]', contact: '[[Office contact]]',
    }, { approved: true, tags: ['maintenance', 'entry', 'notice'] }),

    t('campus-resources', 'Campus Resources', 'occ', 'guide', {
      headline: 'Your OCC Campus Resources', subheadline: 'Help is closer than you think',
      body: '- Financial Aid: occfinaid@occ.cccd.edu\n- Student Life / ASOCC: studentlife@occ.cccd.edu\n- Global Engagement Center: occinternational@cccd.edu\n- Umoja: umoja@cccd.edu\n- OCC Housing: occhousing@cccd.edu',
      cta: 'Get connected', photo: PH.campus,
    }, { approved: true, tags: ['campus', 'resources', 'occ'] }),

    t('student-jobs', 'OCC Student Jobs', 'occ', 'spotlight', {
      headline: 'Find a Job on Campus', subheadline: 'Earn money steps from home',
      body: 'Flexible Hours: Campus jobs are built around your class schedule.\nBuild Experience: Grow your résumé while you study.\nStay Close: Work minutes from The Harbour.',
      cta: 'Explore OCC jobs', qr: '', photo: PH.studying,
    }, { approved: true, tags: ['jobs', 'employment', 'work study'] }),

    t('community-standards', 'Community Standards Reminder', 'resident', 'guide', {
      headline: 'Good Neighbors Make Great Communities', subheadline: 'A friendly community standards reminder',
      body: '- Keep noise down during quiet hours\n- Register your guests\n- Keep shared spaces clean\n- Report concerns to your RA or the office\n- [[Add quiet hours]]',
      cta: 'Thanks for being a great neighbor', photo: PH.terrace,
    }, { approved: true, tags: ['community standards', 'policy', 'quiet hours', 'guests'] }),

    t('safety', 'Safety & Security Information', 'resident', 'guide', {
      headline: 'Safety & Security', subheadline: 'Look out for yourself and your neighbors',
      body: '- Never prop open building doors\n- Don’t let people you don’t know follow you in\n- Lock your door and keep your key/fob with you\n- Emergency? Call 911 first\n- [[Add after-hours / on-call number]]',
      cta: 'Stay safe, Harbour', photo: PH.living,
    }, { approved: true, tags: ['safety', 'security', 'emergency'] }),

    t('roommate-tips', 'Roommate Tips', 'resident', 'spotlight', {
      headline: 'Roommate Tips', subheadline: 'Start strong with the people you live with',
      body: 'Talk Early: Set expectations for guests, noise and cleaning.\nShare Fairly: Make a plan for groceries and shared supplies.\nAsk for Help: Your RA can help mediate if needed.',
      cta: 'Roommate agreements available', photo: PH.friends,
    }, { approved: true, tags: ['roommates', 'tips'] }),

    t('whats-included', 'What Comes With My Apartment?', 'housing', 'spotlight', {
      headline: 'What Comes With My Apartment?', subheadline: 'Move in ready — just bring your personal items',
      body: 'Furnished: Your apartment comes furnished.\nFull Kitchen: Cook at home in your apartment kitchen.\nYou Bring: Linens, cookware and personal items.\nUtilities: [[Verify what is included]]',
      cta: 'Tour The Harbour', qr: URL, photo: PH.kitchen,
    }, { approved: true, tags: ['furnished', 'apartment', 'what to bring', 'amenities'] }),

    t('financial-assistance', 'Housing Financial Assistance', 'housing', 'guide', {
      headline: 'Housing Financial Assistance', subheadline: 'Resources through Orange Coast College',
      body: '- Housing financial assistance resources are available through OCC\n- Contact OCC Financial Aid: occfinaid@occ.cccd.edu\n- If your housing depends on aid, understand that your License Agreement is binding before aid is confirmed\n- Ask questions before you sign',
      cta: 'Talk to Financial Aid', photo: PH.study,
    }, { approved: true, tags: ['financial aid', 'assistance', 'license agreement'] }),

    t('open-house', 'Open Housing / Open House', 'housing', 'event', {
      headline: 'Open House', subheadline: 'See your future home at The Harbour',
      body: 'Tour a furnished apartment, see community spaces and get your questions answered.',
      date: '[[Date]]', time: '[[Time]]', location: 'The Harbour at OCC', cta: 'Tours available', qr: URL, photo: PH.living,
    }, { approved: true, tags: ['open house', 'tour', 'leasing'] }),

    t('get-to-know', 'Get to Know The Harbour', 'housing', 'spotlight', {
      headline: 'Get to Know The Harbour', subheadline: 'Student living at Orange Coast College',
      body: 'Steps From Class: Live right next to OCC.\nFurnished Apartments: Move in ready.\nCommunity: Student-centered ResLife programming all year.',
      cta: 'Visit theharbourocc.com', qr: URL, photo: PH.terrace,
    }, { approved: true, tags: ['about', 'marketing', 'overview'] }),

    t('welcome-home', 'Welcome Home', 'resident', 'event', {
      headline: 'Welcome Home!', subheadline: 'We’re so glad you’re here',
      body: 'Your ResLife team is here to help you settle in, meet your neighbors and make the most of your year at The Harbour.',
      cta: 'Say hi to your RA', photo: PH.terrace,
    }, { approved: true, tags: ['welcome', 'move in'] }),

    // ───────── ResLife events ─────────
    t('game-night', 'Game Night', 'events', 'event', { headline: 'Game Night', subheadline: 'Board games, card games & friendly competition', body: 'Bring a friend or make a new one. Snacks provided!', date: '[[Date]]', time: '7:00 PM', location: 'Community Room', photo: PH.terrace, cta: 'All residents welcome' }, { tags: ['game night', 'event'] }),
    t('movie-night', 'Movie Night', 'events', 'event', { headline: 'Movie Night', subheadline: 'Popcorn’s on us', body: 'Grab a seat and enjoy a movie with your neighbors.', date: '[[Date]]', time: '8:00 PM', location: '[[Location]]', photo: PH.living, cta: 'Free for residents' }, { tags: ['movie night', 'event'] }),
    t('craft-night', 'Craft Night', 'events', 'event', { headline: 'Craft Night', subheadline: 'Get creative with your community', body: 'All supplies provided. No experience needed!', date: '[[Date]]', time: '6:00 PM', location: '[[Location]]', photo: PH.terrace }, { tags: ['craft', 'event'] }),
    t('study-night', 'Study Night', 'events', 'event', { headline: 'Study Night', subheadline: 'Focus together. Finish strong.', body: 'Quiet study space, snacks and coffee to power you through finals.', date: '[[Date]]', time: '6:00 – 10:00 PM', location: '[[Location]]', photo: PH.study }, { tags: ['study', 'finals', 'event'] }),
    t('food-event', 'Food Event', 'events', 'event', { headline: 'Free Food Friday', subheadline: 'Come hungry', body: 'Stop by for food and good company — while supplies last.', date: '[[Date]]', time: '[[Time]]', location: '[[Location]]', photo: PH.terrace }, { tags: ['food', 'event'] }),
    t('wellness', 'Wellness Event', 'events', 'event', { headline: 'Wellness Week', subheadline: 'Recharge your mind and body', body: 'Join ResLife for activities focused on stress relief and self-care.', date: '[[Date]]', time: '[[Time]]', location: '[[Location]]', photo: PH.studying }, { tags: ['wellness', 'mental health', 'event'] }),
    t('mixer', 'Social Mixer', 'events', 'event', { headline: 'Social Mixer', subheadline: 'Meet your neighbors', body: 'Music, snacks and icebreakers on the terrace.', date: '[[Date]]', time: '[[Time]]', location: 'Rooftop Terrace', photo: PH.terrace }, { tags: ['social', 'mixer', 'event'] }),
    t('partnership', 'Campus Partnership Event', 'events', 'event', { headline: 'ResLife × OCC', subheadline: 'A campus partnership event', body: 'Connect with an OCC campus partner and learn about resources made for you.', date: '[[Date]]', time: '[[Time]]', location: '[[Location]]', photo: PH.campus }, { tags: ['campus partner', 'event'] }),

    // ───────── Resident information ─────────
    t('move-in-guide', 'Move-In Guide', 'resident', 'guide', { headline: 'Your Move-In Guide', subheadline: 'Welcome to The Harbour', body: '- [[Check-in location and hours]]\n- Bring your student ID and photo ID\n- Pick up your keys and fob\n- Complete your move-in inspection\n- Meet your RA', photo: PH.living }, { tags: ['move in', 'guide'] }),
    t('move-out-guide', 'Move-Out Guide', 'resident', 'guide', { headline: 'Your Move-Out Guide', subheadline: 'Step-by-step checkout', body: '- [[Move-out date]]\n- Clean your space\n- Remove all belongings\n- Return keys and fobs\n- Provide a forwarding address', photo: PH.kitchen }, { tags: ['move out', 'guide'] }),
    t('maintenance-info', 'Maintenance Information', 'resident', 'guide', { headline: 'How to Request Maintenance', subheadline: 'Something not working? Let us know.', body: '- Submit a work order through the resident portal\n- Emergencies (flood, no power, fire): call 911 / on-call immediately\n- [[Add on-call maintenance number]]', photo: PH.kitchen }, { tags: ['maintenance', 'work order'] }),
    t('packages', 'Package Information', 'resident', 'guide', { headline: 'Package Pickup', subheadline: 'Your deliveries, made easy', body: '- [[Package pickup location and hours]]\n- Bring your ID to pick up\n- Use your full name and unit number on orders', photo: PH.living }, { tags: ['packages', 'mail'] }),
    t('office-hours', 'Office Hours', 'resident', 'notice', { headline: 'Office Hours', subheadline: 'We’re here to help', body: '[[Monday – Friday hours]]\n[[Weekend hours]]', contact: '[[Office phone / email]]' }, { tags: ['office hours'] }),
    t('resident-resources', 'Resident Resources', 'resident', 'guide', { headline: 'Resident Resources', subheadline: 'Everything in one place', body: '- Resident portal: rent, work orders and updates\n- Your RA: community questions\n- OCC campus resources\n- [[Add office contact]]', photo: PH.campus }, { tags: ['resources'] }),
    t('emergency', 'Emergency Information', 'resident', 'notice', { headline: 'Emergency Information', subheadline: 'STAFF: verify all details before posting', body: 'In an emergency, call 911 first.\n[[After-hours / on-call number]]\n[[Evacuation meeting point]]', contact: '[[Office contact]]' }, { tags: ['emergency', 'safety'] }),

    // ───────── OCC resources ─────────
    t('student-services', 'Student Services', 'occ', 'guide', { headline: 'OCC Student Services', subheadline: 'Support for every step', body: '- Counseling and academic planning\n- Financial Aid: occfinaid@occ.cccd.edu\n- Student Life: studentlife@occ.cccd.edu\n- [[Add more services]]', photo: PH.campus }, { tags: ['student services', 'occ'] }),
    t('transportation', 'Transportation', 'occ', 'guide', { headline: 'Getting Around', subheadline: 'Campus, Costa Mesa and beyond', body: '- [[Parking information]]\n- [[Transit options]]\n- [[Bike storage]]', photo: PH.campus }, { tags: ['transportation', 'parking'] }),
    t('student-activities', 'Student Activities', 'occ', 'spotlight', { headline: 'Get Involved at OCC', subheadline: 'Clubs, events and leadership', body: 'ASOCC: Student government and campus events.\nClubs: Including ResLife@OCC.\nCommunity: Find your people.', photo: PH.campus }, { tags: ['clubs', 'activities'] }),
    t('financial-resources', 'Financial Resources', 'occ', 'guide', { headline: 'Financial Resources', subheadline: 'Plan ahead with confidence', body: '- OCC Financial Aid: occfinaid@occ.cccd.edu\n- Budgeting workshops through campus partners\n- [[Add scholarship / basic needs resources]]', photo: PH.study }, { tags: ['financial', 'budget'] }),
    t('accessibility', 'Accessibility Resources', 'occ', 'guide', { headline: 'Accessibility Resources', subheadline: 'Support that fits your needs', body: '- Housing accommodations are coordinated through OCC’s accessibility process\n- [[Add OCC accessibility office contact]]', photo: PH.campus }, { tags: ['accessibility', 'accommodations'] }),

    // ───────── Housing ─────────
    t('application-guide', 'Application Guide', 'housing', 'guide', { headline: 'Harbour Application Guide', subheadline: 'What to expect', body: '- Apply online\n- Student ID required\n- Verification ~24–48 hours\n- Watch your email and portal', qr: URL, photo: PH.campus }, { tags: ['application'] }),
    t('guarantor', 'Guarantor Information', 'housing', 'guide', { headline: 'Guarantor Information', subheadline: 'What your guarantor needs to know', body: '- Guarantor qualification follows the current approved property standard\n- Applicants under 17 may require special guarantor handling\n- [[Add current guarantor requirements]]', photo: PH.study }, { tags: ['guarantor'] }),
    t('roommate-info', 'Roommate Information', 'housing', 'spotlight', { headline: 'Roommate Information', subheadline: 'Living together, made simple', body: 'Matching: [[Roommate matching process]]\nShared Spaces: Agree on expectations early.\nFinances: Understand each person’s responsibility.', photo: PH.friends }, { tags: ['roommates'] }),
    t('utilities', 'Utilities', 'housing', 'guide', { headline: 'Utilities at The Harbour', subheadline: 'Know what’s included', body: '- [[Verify included utilities before publishing]]', photo: PH.kitchen }, { tags: ['utilities'] }),
    t('what-to-bring', 'What to Bring', 'housing', 'checklist', { headline: 'What to Bring', subheadline: 'Your apartment is furnished — add your personal touch', body: '- Bedding and linens\n- Towels\n- Cookware and dishes\n- Toiletries\n- Laptop and chargers', photo: PH.living }, { tags: ['what to bring', 'move in'] }),

    // ───────── Parent & guardian ─────────
    t('parent-why', 'Why Live at The Harbour?', 'parent', 'parent', { headline: 'Why Live at The Harbour?', subheadline: 'For parents and guardians', body: 'Steps From Class: Next to Orange Coast College.\nCommunity: ResLife programming that builds belonging.\nFurnished: Move-in ready apartments.\nSupport: Staff dedicated to student success.', photo: PH.terrace }, { tags: ['parent'] }),
    t('parent-academic', 'Academic Success', 'parent', 'parent', { headline: 'Supporting Academic Success', subheadline: 'For parents and guardians', body: 'Proximity: Less commuting, more studying.\nStudy Spaces: Community spaces for focused work.\nCampus Support: OCC tutoring and counseling.', photo: PH.study }, { tags: ['parent', 'academic'] }),
    t('parent-safety', 'Safety & Security', 'parent', 'parent', { headline: 'Safety & Security', subheadline: 'For parents and guardians', body: 'On-Site Team: ResLife staff support residents.\nAccess: [[Verify building access features]]\nEmergency Plans: [[Verify]]', photo: PH.living }, { tags: ['parent', 'safety'] }),
    t('parent-support', 'Student Support', 'parent', 'parent', { headline: 'Student Support', subheadline: 'For parents and guardians', body: 'ResLife: Programming and community all year.\nCampus Partners: OCC resources close by.\nBelonging: A community that helps students thrive.', photo: PH.campus }, { tags: ['parent', 'support'] }),
    t('parent-cost', 'Cost of Living', 'parent', 'parent', { headline: 'Understanding Cost of Living', subheadline: 'For parents and guardians', body: 'Furnished: No furniture to buy.\nUtilities: [[Verify what is included]]\nFinancial Aid: OCC resources available.', photo: PH.kitchen }, { tags: ['parent', 'cost'] }),
    t('parent-license', 'Understanding the License Agreement', 'parent', 'parent', { headline: 'Understanding the License Agreement', subheadline: 'For parents and guardians', body: 'Binding: The License Agreement is a binding commitment.\nGuarantors: May be required per the current property standard.\nFinancial Aid: Understand implications before aid is confirmed.', photo: PH.study }, { tags: ['parent', 'license agreement'] }),
    t('parent-roommates', 'Roommates & Financial Responsibility', 'parent', 'parent', { headline: 'Roommates & Financial Responsibility', subheadline: 'For parents and guardians', body: 'Individual Responsibility: [[Verify how charges are assigned]]\nShared Spaces: Roommate agreements help set expectations.', photo: PH.friends }, { tags: ['parent', 'roommates'] }),
    t('parent-jobs', 'Campus Employment', 'parent', 'parent', { headline: 'Campus Employment', subheadline: 'For parents and guardians', body: 'Flexible: Campus jobs fit class schedules.\nClose: Minutes from The Harbour.\nExperience: Build skills while studying.', photo: PH.studying }, { tags: ['parent', 'jobs'] }),
    t('parent-steps', 'Steps From Class', 'parent', 'parent', { headline: 'Steps From Class', subheadline: 'For parents and guardians', body: 'Less Commuting: More time for classes and study.\nCampus Life: Easy access to OCC activities.', photo: PH.campus }, { tags: ['parent', 'location'] }),
    t('parent-belonging', 'Community & Belonging', 'parent', 'parent', { headline: 'Community & Belonging', subheadline: 'For parents and guardians', body: 'Programming: ResLife events all year.\nNeighbors: A student community.\nSupport: Staff who know residents by name.', photo: PH.terrace }, { tags: ['parent', 'community'] }),
    t('parent-faq', 'Parent FAQ', 'parent', 'guide', { headline: 'Parent & Guardian FAQ', subheadline: 'Answers to common questions', body: '- What is the agreement called? A License Agreement.\n- Are apartments furnished? Yes — bring linens and cookware.\n- How long is verification? About 24–48 hours.\n- [[Add more verified FAQs]]', photo: PH.study, audience: 'parents' }, { tags: ['parent', 'faq'] }),

    // ───────── Social & signage formats ─────────
    t('ig-event', 'Event Promotion Post', 'social', 'social', { headline: 'Game Night', subheadline: 'Thursday • 7 PM • Community Room', photo: PH.terrace }, { tags: ['instagram', 'event'] }),
    t('ig-amenity', 'Amenity Spotlight Post', 'social', 'social', { headline: 'Rooftop Vibes', subheadline: 'Your new favorite study break', photo: PH.terrace }, { tags: ['instagram', 'amenity'] }),
    t('ig-countdown', 'Move-In Countdown Story', 'social', 'story', { headline: '7 Days', subheadline: 'until Move-In at The Harbour', photo: PH.living }, { tags: ['story', 'move in'] }),
    t('ig-deadline', 'Important Deadline Story', 'social', 'story', { headline: 'Don’t Miss It', subheadline: '[[Deadline]] — [[What’s due]]', photo: PH.campus }, { tags: ['story', 'deadline'] }),
    t('sign-lobby', 'Lobby Digital Sign', 'signage', 'sign', { headline: 'Welcome Home, Harbour', subheadline: 'Check the ResLife calendar for this week’s events', photo: PH.terrace }, { tags: ['digital sign', 'lobby'] }),
    t('door-sign', 'Door Sign', 'signage', 'notice', { headline: 'Please Knock', subheadline: 'ResLife office', body: '[[Message]]' }, { tags: ['door sign'] }),
    t('directional', 'Directional Sign', 'signage', 'notice', { headline: 'Event This Way →', subheadline: '[[Event name]]', body: '' }, { tags: ['directional', 'sign'] }),
  ];

  data.templates = templates;
  data.templateGroups = GROUPS;
  data.formats = FORMATS;
})(window);
