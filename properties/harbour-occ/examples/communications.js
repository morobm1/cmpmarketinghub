/**
 * The Harbour at OCC — Communication Library (approved starter examples).
 * Shape: { id, title, category, channel: 'email'|'sms'|'social', purpose, audience,
 *          subject?, body, graphicCopy?, caption?, cta?, hashtags?, verify? }
 * `[[...]]` = staff must fill in / verify before sending.
 */
(function (global) {
  const P = 'harbour-occ';
  const data = global.CS_PROPERTY_DATA[P] = global.CS_PROPERTY_DATA[P] || {};
  const PORTAL = 'https://theharbourocc.residentportal.com/auth';
  // Plain-text summary (used for search, previews and text copies). The HTML comes from cs-email.js.
  const plain = e => [e.greeting, ...(e.paragraphs || []), e.callout ? [e.callout.title, e.callout.text].filter(Boolean).join('\n') : '', ...(e.steps || []).map((s, i) => `${i + 1}. ${s.title} ${s.text || ''}`), e.closing].filter(Boolean).join('\n\n').replace(/\*\*/g, '');
  const email = (id, title, category, audience, purpose, e) =>
    ({ id: 'email-' + id, title, category, channel: 'email', audience, purpose, subject: e.subject, verify: !!e.verify, email: e, body: plain(e) });
  const sms = (id, title, body) => ({ id: 'sms-' + id, title, category: 'text-messages', channel: 'sms', audience: 'Residents', purpose: title, body });
  const social = (id, title, graphicCopy, caption, cta, hashtags) => ({ id: 'social-' + id, title, category: 'social-media', channel: 'social', audience: 'Residents & followers', purpose: title, graphicCopy, caption, cta, hashtags });

  data.communications = [
    // ───────── Emails (structured for the Entrata template; rendered by creative-studio/cs-email.js) ─────────
    email('welcome', 'Welcome to The Harbour', 'move-in', 'New residents', 'Welcome residents and introduce key resources.', {
      subject: 'Welcome home to The Harbour!',
      preheader: 'Everything you need to settle in — your RA, the resident portal, events and campus resources.',
      eyebrow: 'Welcome Home', headline: 'Welcome to The Harbour!',
      intro: 'We’re so glad you’re part of our community at Orange Coast College.',
      greeting: 'Hello [[First Name]],',
      paragraphs: ['Welcome to **The Harbour at Orange Coast College**! Our team is here to help you settle in, meet your neighbors and make the most of your year.'],
      stepsTitle: 'Getting started',
      steps: [
        { title: 'Meet your RA.', text: 'Your Resident Assistant is your go-to for community questions and getting connected.' },
        { title: 'Use the resident portal.', text: 'Submit maintenance requests and stay up to date on account information.' },
        { title: 'Come to a ResLife event.', text: 'Events are the best way to meet your neighbors — watch your email and the lobby for what’s coming up.' },
        { title: 'Explore OCC resources.', text: 'Campus support is just steps away, from Financial Aid to Student Life.' },
      ],
      button: { label: 'Open Resident Portal', url: PORTAL },
      closing: 'If you need anything, stop by the office or reply to this email. Welcome home!',
    }),
    email('event', 'Upcoming Community Event', 'events', 'Current residents', 'Promote a ResLife event.', {
      subject: 'You’re invited: [[Event Name]] on [[Day]]',
      preheader: '[[Event Name]] · [[Date]] at [[Time]] · [[Location]]',
      eyebrow: 'Community Event', headline: '[[Event Name]]',
      intro: 'Join your neighbors and the ResLife team for [[short description]].',
      greeting: 'Hello Harbour residents,',
      paragraphs: ['[[One or two sentences about the event — food, games, prizes]]. Bring a friend and come meet your neighbors!'],
      callout: { label: 'Event Details', title: '[[Date]] • [[Time]]', text: '**Location:** [[Location]]\nOpen to all Harbour residents.' },
      closing: 'We hope to see you there! Questions? Reach out to your RA or the office.',
    }),
    email('maintenance-entry', 'Maintenance Entry Notice', 'maintenance', 'Affected residents', 'Notify residents about planned unit access.', {
      subject: 'Notice of planned maintenance entry — [[Date]]',
      preheader: 'Our maintenance team will enter units in [[Building / Units]] on [[Date]].',
      eyebrow: 'Maintenance Notice', headline: 'Planned entry to your unit.',
      intro: 'Our maintenance team will be completing [[type of work]] in [[Building / Units]].',
      greeting: 'Hello,',
      paragraphs: ['This is a notice that our maintenance team will enter your unit to complete scheduled work. You do not need to be home.'],
      callout: { label: 'Entry Window', title: '[[Date]] • [[Time window]]', text: 'Please secure pets and put away valuables before the entry window.' },
      button: { label: 'Open Resident Portal', url: PORTAL },
      closing: 'If you have questions or a scheduling concern, please contact our team. Thank you for your cooperation.',
    }),
    email('community-reminder', 'Community Reminder', 'community-standards', 'Current residents', 'Friendly policy or community standards reminder.', {
      subject: 'A friendly reminder from your ResLife team',
      preheader: 'A quick community standards reminder to keep The Harbour a great place to live.',
      eyebrow: 'Community Reminder', headline: 'Good neighbors make great communities.',
      intro: 'Thanks for helping make The Harbour a great place to live.',
      greeting: 'Hello Harbour residents,',
      paragraphs: ['These community standards are part of your **License Agreement** and help everyone enjoy their home.'],
      stepsTitle: 'Quick reminders',
      steps: [
        { title: '[[Reminder 1]].', text: '[[e.g., Quiet hours are ___]]' },
        { title: '[[Reminder 2]].', text: '[[e.g., Register your guests]]' },
        { title: 'Keep shared spaces clean.', text: 'Please pick up after yourself in community areas.' },
      ],
      closing: 'Questions? Reach out to your RA anytime.',
    }),
    email('package', 'Package Reminder', 'resident-communications', 'Residents', 'Remind residents to pick up packages.', {
      subject: 'You have a package waiting',
      preheader: 'Your package is ready for pickup — bring your ID.',
      eyebrow: 'Package Notice', headline: 'You have a package waiting.',
      intro: 'Your delivery is ready for pickup.',
      greeting: 'Hello [[First Name]],',
      paragraphs: ['You have a package ready for pickup. Please bring your ID.'],
      callout: { label: 'Pickup', title: '[[Pickup location]]', text: '**Hours:** [[Hours]]\nPackages not picked up within [[X]] days may be [[policy]].' },
      closing: 'Questions about a delivery? Contact our team.',
    }),
    email('move-in', 'Move-In Reminder', 'move-in', 'Incoming residents', 'Prepare incoming residents for move-in day.', {
      subject: 'Move-in is almost here! Here’s what to know',
      preheader: 'Your move-in date, check-in location and what to bring.',
      eyebrow: 'Move-In', headline: 'Move-in is almost here.',
      intro: 'We can’t wait to welcome you to The Harbour.',
      greeting: 'Hello [[First Name]],',
      paragraphs: ['Please make sure your **License Agreement** and any required documents are complete before you arrive.'],
      callout: { label: 'Check-In', title: '[[Move-in date]]', text: '**Location:** [[Check-in location]]\n**Hours:** [[Check-in hours]]' },
      stepsTitle: 'What to bring',
      steps: [
        { title: 'Your IDs.', text: 'Student ID and a photo ID.' },
        { title: 'Bedding and towels.', text: 'Bring linens for your bed and bathroom.' },
        { title: 'Cookware and dishes.', text: 'Apartments are furnished; cookware is not included.' },
      ],
      button: { label: 'Open Resident Portal', url: PORTAL },
      closing: 'Questions before move-in? Contact our team — we’re happy to help.',
    }),
    email('move-out', 'Move-Out Reminder', 'move-out', 'Departing residents', 'Explain move-out steps.', {
      subject: 'Move-out checklist and important dates',
      preheader: 'Everything you need to complete your move-out.',
      eyebrow: 'Move-Out', headline: 'Thank you for calling The Harbour home.',
      intro: 'Here’s what to do as your move-out date approaches.',
      greeting: 'Hello [[First Name]],',
      paragraphs: [],
      callout: { label: 'Move-Out Date', title: '[[Date]]', text: 'Return all keys and fobs to [[Location]].' },
      stepsTitle: 'What to do',
      steps: [
        { title: 'Remove all personal belongings.', text: '' },
        { title: 'Clean your space.', text: 'Bedroom, bathroom and kitchen.' },
        { title: 'Return keys and fobs.', text: 'Bring them to [[Location]].' },
        { title: 'Update your forwarding address.', text: '' },
      ],
      closing: 'Questions about move-out? Please contact our team.',
    }),
    email('academic', 'Academic Support Resources', 'academic-support', 'Residents', 'Share academic support resources.', {
      subject: 'Finish the semester strong',
      preheader: 'Tutoring, study spaces and academic support — right near home.',
      eyebrow: 'Academic Success', headline: 'Finish the semester strong.',
      intro: 'Midterms and finals can be stressful — you don’t have to do it alone.',
      greeting: 'Hello Harbour residents,',
      paragraphs: [],
      stepsTitle: 'Resources for you',
      steps: [
        { title: 'OCC tutoring & academic support.', text: '[[Link / location]]' },
        { title: 'Study spaces at The Harbour.', text: '[[Spaces / hours]]' },
        { title: 'Counseling and academic planning.', text: 'Available through Orange Coast College.' },
      ],
      closing: 'Your ResLife team is cheering you on!',
    }),
    email('campus-spotlight', 'Campus Resource Spotlight', 'campus-resources', 'Residents', 'Highlight an OCC campus resource.', {
      subject: 'Campus Resource Spotlight: [[Resource Name]]',
      preheader: 'This month we’re spotlighting [[Resource Name]] at Orange Coast College.',
      eyebrow: 'Campus Resource Spotlight', headline: '[[Resource Name]]',
      intro: 'Support made for you — just steps from home.',
      greeting: 'Hello Harbour residents,',
      paragraphs: ['This month we’re spotlighting **[[Resource Name]]** at Orange Coast College.'],
      callout: { label: 'About', title: '[[What they do]]', text: '**Where:** [[Location]]\n**Contact:** [[Contact]]' },
      closing: 'Take advantage of the resources made for you.',
    }),
    email('survey', 'Resident Survey', 'resident-communications', 'Residents', 'Request resident feedback.', {
      subject: 'We want to hear from you (2 minutes)',
      preheader: 'Your feedback helps us plan better events and improve your community.',
      eyebrow: 'Resident Survey', headline: 'We want to hear from you.',
      intro: 'It takes about [[X]] minutes.',
      greeting: 'Hello Harbour residents,',
      paragraphs: ['Your feedback helps us plan better events and improve your community. Please take our quick survey.'],
      button: { label: 'Take the Survey', url: '[[Survey link]]' },
      closing: 'Thank you for helping make The Harbour even better!',
    }),
    email('closure', 'Office Closure', 'resident-communications', 'Residents', 'Notify residents of an office closure.', {
      subject: 'Office closure: [[Date]]',
      preheader: 'The Harbour office will be closed on [[Date]].',
      eyebrow: 'Office Update', headline: 'Our office will be closed.',
      intro: 'The Harbour office will be closed on [[Date]] for [[Reason]].',
      greeting: 'Hello Harbour residents,',
      paragraphs: ['We will reopen on [[Reopen date/time]].'],
      callout: { label: 'While We’re Closed', title: 'Emergencies: call 911', text: 'For urgent after-hours maintenance, call [[On-call number]].' },
      closing: 'Thank you for your patience.',
    }),
    email('emergency', 'Emergency Information', 'resident-communications', 'Residents', 'Share emergency instructions.', {
      subject: '[[EMERGENCY]] Important safety information',
      preheader: 'Important safety information for Harbour residents.',
      eyebrow: 'Important Safety Information', headline: '[[Clear, factual headline]]',
      intro: '[[One-sentence summary of the situation]]',
      greeting: 'Residents,',
      paragraphs: ['[[Clear, factual description of the situation]].'],
      callout: { label: 'If You Are in Immediate Danger', title: 'Call 911', text: '' },
      stepsTitle: 'What to do',
      steps: [{ title: '[[Instruction 1]]', text: '' }, { title: '[[Instruction 2]]', text: '' }],
      closing: 'We will share updates at [[Update channel/time]].',
      verify: true,
    }),

    // ───────── SMS ─────────
    sms('event', 'Event reminder', 'Harbour: [[Event]] is TONIGHT at [[Time]] in the [[Location]]! Snacks + friends. See you there 🌊'),
    sms('package', 'Package pickup', 'Harbour: You have a package at [[Location]]. Pickup [[Hours]] — bring your ID.'),
    sms('meeting', 'Community meeting', 'Harbour: Resident meeting [[Day]] at [[Time]], [[Location]]. Bring questions & ideas!'),
    sms('maintenance', 'Maintenance reminder', 'Harbour: Maintenance will enter units in [[Building]] on [[Date]], [[Time window]]. Please secure pets.'),
    sms('application', 'Application follow-up', 'The Harbour: Thanks for applying! Verification takes ~24–48 hrs. Watch your email & portal for next steps.'),
    sms('move-in', 'Move-in reminder', 'The Harbour: Move-in is [[Date]]! Check in at [[Location]], [[Hours]]. Bring your student ID.'),
    sms('survey', 'Resident survey', 'Harbour: Got 2 min? Tell us how we’re doing: [[Link]] Thank you!'),
    sms('closure', 'Office closure', 'Harbour: Office closed [[Date]]. Emergencies call 911. Urgent maintenance: [[On-call #]].'),
    sms('deadline', 'Deadline reminder', 'The Harbour: Reminder — [[Item]] is due [[Date]]. Questions? Reply or visit the office.'),

    // ───────── Social ─────────
    social('feed', 'Instagram Feed', 'Home, but make it coastal.', 'Steps from class and minutes from the coast. This is student living at Orange Coast College. 🌊', 'Tour today — link in bio', '#TheHarbourOCC #OCCPirates #StudentLiving'),
    social('story', 'Instagram Story', 'Tonight 7 PM 🌅', 'Rooftop hangout tonight! Swipe up for details.', 'Tap for details', '#TheHarbourOCC'),
    social('event', 'Event Promotion', '[[EVENT NAME]]\n[[Day]] • [[Time]]', 'You’re invited! Join ResLife for [[event]] on [[day]] at [[time]] in the [[location]]. Bring a friend! 🎉', 'See you there', '#TheHarbourOCC #ResLife'),
    social('resident-spotlight', 'Resident Spotlight', 'Meet [[Name]]', 'Say hi to [[Name]], [[major]] at OCC! Favorite Harbour spot: [[spot]]. 💛 (Get written permission before posting.)', 'Want to be featured? DM us', '#HarbourSpotlight #TheHarbourOCC'),
    social('amenity', 'Amenity Spotlight', 'Your new favorite study break', 'Sun, shade and good company. Our rooftop terrace is calling. ☀️', 'Come see it', '#TheHarbourOCC #CostaMesa'),
    social('campus-resource', 'Campus Resource', 'Help is steps away', 'Did you know OCC Financial Aid can help with housing resources? Email occfinaid@occ.cccd.edu.', 'Learn more', '#OrangeCoastCollege #TheHarbourOCC'),
    social('academic', 'Academic Reminder', 'Finals mode: ON', 'Study night in the community room this week — snacks + quiet space. You’ve got this! 📚', 'Details in stories', '#FinalsWeek #TheHarbourOCC'),
    social('recap', 'Community Event Recap', 'That’s a wrap!', 'Thanks to everyone who came out to [[event]]! See you at the next one. 🌊', 'Follow for upcoming events', '#TheHarbourOCC #ResLife'),
    social('countdown', 'Move-In Countdown', '[[X]] days to go', 'The countdown is ON! [[X]] days until move-in at The Harbour. What are you most excited for? 👇', 'Comment below', '#MoveIn #TheHarbourOCC'),
    social('deadline', 'Important Deadline', 'Don’t miss it: [[Deadline]]', 'Reminder: [[item]] is due [[date]]. Questions? DM us or stop by the office.', 'Don’t wait', '#TheHarbourOCC'),
    social('housing', 'Housing Information', 'Furnished. Steps from class.', 'Apartments at The Harbour come furnished — just bring your personal items. Apply at theharbourocc.com.', 'Apply now', '#StudentHousing #TheHarbourOCC'),
  ];
})(window);
