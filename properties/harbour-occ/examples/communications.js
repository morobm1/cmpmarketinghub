/**
 * The Harbour at OCC — Communication Library (approved starter examples).
 * Shape: { id, title, category, channel: 'email'|'sms'|'social', purpose, audience,
 *          subject?, body, graphicCopy?, caption?, cta?, hashtags?, verify? }
 * `[[...]]` = staff must fill in / verify before sending.
 */
(function (global) {
  const P = 'harbour-occ';
  const data = global.CS_PROPERTY_DATA[P] = global.CS_PROPERTY_DATA[P] || {};
  const SIGN = '\n\nThe Harbour ResLife Team\ntheharbourocc.com';

  const email = (id, title, category, audience, purpose, subject, body, extra) =>
    Object.assign({ id: 'email-' + id, title, category, channel: 'email', audience, purpose, subject, body: body + SIGN }, extra || {});
  const sms = (id, title, body) => ({ id: 'sms-' + id, title, category: 'text-messages', channel: 'sms', audience: 'Residents', purpose: title, body });
  const social = (id, title, graphicCopy, caption, cta, hashtags) => ({ id: 'social-' + id, title, category: 'social-media', channel: 'social', audience: 'Residents & followers', purpose: title, graphicCopy, caption, cta, hashtags });

  data.communications = [
    // ───────── Emails ─────────
    email('welcome', 'Welcome to The Harbour', 'move-in', 'New residents', 'Welcome residents and introduce key resources.',
      'Welcome home to The Harbour! 🌊',
      'Hi [[First Name]],\n\nWelcome to The Harbour at OCC! We’re so excited you’re part of our community.\n\nA few things to help you settle in:\n• Your RA is your go-to for community questions and getting connected.\n• Submit maintenance requests through the resident portal.\n• Watch for ResLife events — they’re the best way to meet your neighbors.\n• OCC campus resources are just steps away.\n\nIf you need anything, stop by the office or reply to this email.\n\nWelcome home!'),
    email('event', 'Upcoming Community Event', 'events', 'Current residents', 'Promote a ResLife event.',
      'You’re invited: [[Event Name]] on [[Day]]',
      'Hi Harbour residents,\n\nJoin us for [[Event Name]]!\n\n📅 [[Date]]\n⏰ [[Time]]\n📍 [[Location]]\n\n[[One or two sentences about the event — food, games, prizes]].\n\nBring a friend and come meet your neighbors. See you there!'),
    email('maintenance-entry', 'Maintenance Entry Notice', 'maintenance', 'Affected residents', 'Notify residents about planned unit access.',
      'Notice of planned maintenance entry — [[Date]]',
      'Hello residents of [[Building / Units]],\n\nThis is a notice that our maintenance team will enter your unit to complete [[type of work]].\n\nDate: [[Date]]\nTime window: [[Time window]]\n\nYou do not need to be home. Please secure pets and put away valuables. If you have questions or a scheduling concern, contact the office at [[Office contact]].\n\nThank you for your cooperation.'),
    email('community-reminder', 'Community Reminder', 'community-standards', 'Current residents', 'Friendly policy or community standards reminder.',
      'A friendly reminder from your ResLife team',
      'Hi Harbour,\n\nThanks for helping make The Harbour a great place to live! A quick reminder:\n\n• [[Reminder 1 — e.g., quiet hours are ___]]\n• [[Reminder 2 — e.g., register guests]]\n• Keep shared spaces clean for everyone.\n\nThese standards are part of your License Agreement and community expectations. Questions? Reach out to your RA anytime.'),
    email('package', 'Package Reminder', 'resident-communications', 'Residents', 'Remind residents to pick up packages.',
      'You have a package waiting 📦',
      'Hi [[First Name]],\n\nYou have a package ready for pickup at [[Pickup location]].\n\nPickup hours: [[Hours]]\nPlease bring your ID.\n\nPackages not picked up within [[X]] days may be [[policy]].'),
    email('move-in', 'Move-In Reminder', 'move-in', 'Incoming residents', 'Prepare incoming residents for move-in day.',
      'Move-in is almost here! Here’s what to know',
      'Hi [[First Name]],\n\nWe can’t wait to welcome you to The Harbour!\n\nMove-in date: [[Date]]\nCheck-in location: [[Location]]\nCheck-in hours: [[Hours]]\n\nPlease bring:\n• Your student ID and a photo ID\n• Bedding, linens and towels\n• Cookware and dishes (apartments are furnished; cookware is not included)\n\nMake sure your License Agreement and any required documents are complete before you arrive.'),
    email('move-out', 'Move-Out Reminder', 'move-out', 'Departing residents', 'Explain move-out steps.',
      'Move-out checklist and important dates',
      'Hi [[First Name]],\n\nThank you for calling The Harbour home! As your move-out date approaches, here’s what to do:\n\nMove-out date: [[Date]]\n\n• Remove all personal belongings\n• Clean your bedroom, bathroom and kitchen\n• Return all keys and fobs to [[Location]]\n• Update your forwarding address\n\nQuestions? Contact the office at [[Office contact]].'),
    email('academic', 'Academic Support Resources', 'academic-support', 'Residents', 'Share academic support resources.',
      'Finish the semester strong 📚',
      'Hi Harbour,\n\nMidterms and finals can be stressful — you don’t have to do it alone.\n\n• OCC tutoring & academic support: [[Link / location]]\n• Study spaces at The Harbour: [[Spaces / hours]]\n• Counseling and academic planning through OCC\n\nYour ResLife team is cheering you on!'),
    email('campus-spotlight', 'Campus Resource Spotlight', 'campus-resources', 'Residents', 'Highlight an OCC campus resource.',
      'Campus Resource Spotlight: [[Resource Name]]',
      'Hi Harbour,\n\nThis month we’re spotlighting [[Resource Name]] at Orange Coast College.\n\nWhat they do: [[Description]]\nWhere: [[Location]]\nContact: [[Contact]]\n\nTake advantage of the resources made for you — they’re just steps away.'),
    email('survey', 'Resident Survey', 'resident-communications', 'Residents', 'Request resident feedback.',
      'We want to hear from you (2 minutes)',
      'Hi Harbour,\n\nYour feedback helps us plan better events and improve your community. Please take our quick survey:\n\n[[Survey link]]\n\nIt takes about [[X]] minutes. Thank you for helping make The Harbour even better!'),
    email('closure', 'Office Closure', 'resident-communications', 'Residents', 'Notify residents of an office closure.',
      'Office closure: [[Date]]',
      'Hi Harbour residents,\n\nThe Harbour office will be closed on [[Date]] for [[Reason]]. We will reopen on [[Reopen date/time]].\n\nFor emergencies, call 911. For urgent after-hours maintenance, call [[On-call number]].\n\nThank you!'),
    email('emergency', 'Emergency Information', 'resident-communications', 'Residents', 'Share emergency instructions.',
      '[[EMERGENCY]] Important safety information',
      'STAFF: VERIFY ALL LANGUAGE AND DETAILS WITH YOUR SUPERVISOR BEFORE SENDING.\n\nResidents,\n\n[[Clear, factual description of the situation]].\n\nWhat to do:\n• [[Instruction 1]]\n• [[Instruction 2]]\n\nIf you are in immediate danger, call 911.\n\nWe will share updates at [[Update channel/time]].',
      { verify: true }),

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
