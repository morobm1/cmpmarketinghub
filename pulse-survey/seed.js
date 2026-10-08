/**
 * Seed content: Fall 2026 Resident Experience Pulse Survey (Ivory University House).
 * Inserted once as a DRAFT (never auto-published) and as a reusable template.
 * Stable question IDs + comparisonKeys let later Pulse Surveys be compared to this one.
 */
import { QUALITY_CHOICES, AGREEMENT_CHOICES } from './engine.js';

const ch = (pairs) => pairs.map(([id, label, extra]) => ({ id, label, ...(extra || {}) }));
const Q = (o) => ({
  description: '', required: false, enabled: true, choices: [], rows: [], scale: null,
  naOption: { enabled: false, label: 'N/A' }, allowOther: false, otherLabel: 'Other',
  minSelect: null, maxSelect: null, comparisonKey: '', reportRole: '', logic: null, ...o,
});
const rating = (minLabel, maxLabel, na) => ({
  scale: { min: 1, max: 5, minLabel, maxLabel },
  naOption: na ? { enabled: true, label: na } : { enabled: false, label: 'N/A' },
});

export const SEED_KEY = 'iuh-fall-2026-pulse';

export const FALL_2026_INTRO = `Your home, your community, your voice!

As we settle into the academic year, we want to hear about your experience at Ivory University House. Your feedback will help us improve resident services, plan future events, and create an even better community.

This survey takes approximately 4–5 minutes to complete.

We'll also ask about your preliminary housing plans for 2027–2028. Your response is for planning purposes only and does not represent a renewal commitment.`;
// NOTE: the anonymity sentence is rendered automatically by the public page
// when the survey's "anonymous" setting is on (which this implementation honors),
// so it is not hard-coded into the introduction text.

export const FALL_2026_THANKS = `Thank you for helping shape the Ivory University House experience!

Your feedback will help our team prioritize improvements, strengthen resident programming, and plan for the upcoming leasing year.

We appreciate your time and look forward to making this a great year at Ivory University House.`;

export function fall2026Definition() {
  const sections = [
    { id: 'sA', title: 'Your Living Experience', description: '' },
    { id: 'sB', title: 'Resident Events & Community Engagement', description: '' },
    { id: 'sB2', title: 'Finding Your Way Special Guest Series', description: 'Optional group — turn these questions on in the builder when the series is active.' },
    { id: 'sC', title: 'Looking Ahead to 2027–2028', description: 'Your answers are for planning purposes only and do not represent a renewal commitment.' },
  ];
  const NA = { id: 'na', label: 'N/A', na: true };
  const questions = [
    Q({ id: 'q1', sectionId: 'sA', type: 'single', required: true, comparisonKey: 'overall_satisfaction', reportRole: 'overall_satisfaction',
      text: 'Overall, how satisfied are you with your experience at Ivory University House so far this academic year?',
      choices: ch([['vd', 'Very dissatisfied', { score: 1 }], ['d', 'Dissatisfied', { score: 2 }], ['n', 'Neutral', { score: 3 }], ['s', 'Satisfied', { score: 4 }], ['vs', 'Very satisfied', { score: 5 }]]) }),
    Q({ id: 'q2', sectionId: 'sA', type: 'grid', required: true, comparisonKey: 'experience', reportRole: 'experience_grid',
      text: 'How would you rate the following aspects of your living experience?',
      choices: [...QUALITY_CHOICES(), NA],
      rows: [
        { id: 'clean', label: 'Cleanliness of shared/common areas', comparisonKey: 'exp_cleanliness' },
        { id: 'study', label: 'Availability and condition of study spaces', comparisonKey: 'exp_study_spaces' },
        { id: 'amen', label: 'Community amenities and recreation spaces', comparisonKey: 'exp_amenities' },
        { id: 'wifi', label: 'Internet/Wi-Fi experience', comparisonKey: 'exp_wifi' },
        { id: 'maint', label: 'Maintenance request service', comparisonKey: 'exp_maintenance' },
        { id: 'team', label: 'Helpfulness and responsiveness of the IUH team', comparisonKey: 'exp_team' },
        { id: 'comm', label: 'Clarity of property communications', comparisonKey: 'exp_communication' },
      ] }),
    Q({ id: 'q3', sectionId: 'sA', type: 'grid', required: true, comparisonKey: 'community', reportRole: 'community_agreement',
      text: 'How much do you agree with the following statements?',
      choices: [...AGREEMENT_CHOICES(), { id: 'na', label: 'Not sure/N/A', na: true }],
      rows: [
        { id: 'safe', label: 'I feel safe and comfortable in IUH common areas.', comparisonKey: 'agree_safe' },
        { id: 'welcome', label: 'I feel welcomed and connected to the IUH community.', comparisonKey: 'agree_community' },
      ] }),
    Q({ id: 'q4', sectionId: 'sA', type: 'checkbox', required: true, maxSelect: 2, allowOther: true, comparisonKey: 'improvement_priorities', reportRole: 'priorities',
      text: 'Which TWO areas would you most like to see improved this term?', description: 'Select up to two.',
      choices: ch([['clean', 'Common area cleanliness'], ['study', 'Study spaces'], ['wifi', 'Internet/Wi-Fi'], ['maint', 'Maintenance service'],
        ['comm', 'Communication from the IUH team'], ['events', 'Resident events and activities'], ['fitness', 'Fitness and community amenities'],
        ['safety', 'Safety and security in common areas'], ['none', "Nothing significant, I'm satisfied", { exclusive: true }]]) }),

    Q({ id: 'q5', sectionId: 'sB', type: 'single', required: true, comparisonKey: 'event_attendance', reportRole: 'event_attendance',
      text: 'How many IUH resident events have you attended so far this academic year?',
      choices: ch([['none', 'None'], ['one', '1 event'], ['few', '2–3 events'], ['many', '4 or more events']]) }),
    Q({ id: 'q6', sectionId: 'sB', type: 'rating', required: true, comparisonKey: 'event_satisfaction', reportRole: 'event_rating', ...rating('Poor', 'Excellent'),
      text: 'Overall, how would you rate the resident events you have attended?',
      logic: { match: 'all', conditions: [{ questionId: 'q5', operator: 'noneOf', values: ['none'] }] } }),
    Q({ id: 'q7', sectionId: 'sB', type: 'rating', comparisonKey: 'event_refreshments', reportRole: 'refreshments', ...rating('Poor', 'Excellent', 'N/A'),
      text: 'How would you rate the refreshments offered at the events you attended?',
      logic: { match: 'all', conditions: [{ questionId: 'q5', operator: 'noneOf', values: ['none'] }] } }),
    Q({ id: 'q8', sectionId: 'sB', type: 'rating', required: true, comparisonKey: 'event_communication', reportRole: 'event_communication', ...rating('Poor', 'Excellent', "Not sure/Haven't seen announcements"),
      text: "How would you rate IUH's communication about upcoming events, including event dates, times, locations, and activities?" }),
    Q({ id: 'q9', sectionId: 'sB', type: 'rating', comparisonKey: 'event_variety', reportRole: 'event_variety', ...rating('Poor', 'Excellent', 'Not familiar enough to rate'),
      text: 'How would you rate the overall balance and variety of resident events offered so far?',
      logic: { match: 'all', conditions: [{ questionId: 'q5', operator: 'noneOf', values: ['none'] }] } }),
    Q({ id: 'q10', sectionId: 'sB', type: 'checkbox', required: true, maxSelect: 3, allowOther: true, comparisonKey: 'event_interests', reportRole: 'event_interests',
      text: 'Which THREE types of resident events would you be most interested in attending?', description: 'Select up to three.',
      choices: ch([['social', 'Social events'], ['food', 'Food-focused events'], ['fitness', 'Fitness and physical wellness'], ['mental', 'Mental wellness and self-care'],
        ['career', 'Academic and career development'], ['culture', 'Cultural and spiritual activities'], ['speakers', 'Guest speakers and workshops'],
        ['volunteer', 'Volunteering'], ['outings', 'Off-campus outings']]) }),
    Q({ id: 'q11', sectionId: 'sB', type: 'checkbox', maxSelect: 2, allowOther: true, comparisonKey: 'event_barriers', reportRole: 'event_barriers',
      text: 'What are the biggest barriers preventing you from attending more resident events?', description: 'Select up to two.',
      choices: ch([['schedule', 'Class or work schedule conflicts'], ['aware', 'Not aware of events'], ['topics', "Event topics don't interest me"],
        ['people', "Don't know people attending"], ['smaller', 'Prefer smaller gatherings'], ['other_act', 'Prefer other activities'],
        ['times', 'Inconvenient event times'], ['already', 'Already attend events that interest me', { exclusive: true }]]) }),
    Q({ id: 'q12', sectionId: 'sB', type: 'checkbox', required: true, maxSelect: 2, allowOther: true, comparisonKey: 'comm_channels', reportRole: 'comm_channels',
      text: 'How would you prefer to receive information about IUH events and community updates?', description: 'Select up to two.',
      choices: ch([['email', 'Email'], ['sms', 'Text/SMS'], ['social', 'Instagram/social media'], ['portal', 'Resident portal/app'],
        ['signage', 'Digital signage/posters'], ['staff', 'Direct staff communication']]) }),

    Q({ id: 'q13a', sectionId: 'sB2', type: 'rating', enabled: false, comparisonKey: 'fyw_rating', reportRole: 'series_rating', ...rating('Poor', 'Excellent', 'Have not attended'),
      text: 'How would you rate the Finding Your Way Special Guest Series?' }),
    Q({ id: 'q13b', sectionId: 'sB2', type: 'long', enabled: false, comparisonKey: 'fyw_topics',
      text: 'What topics or guest speakers would you like to see in the Finding Your Way series?' }),

    Q({ id: 'q14', sectionId: 'sC', type: 'single', required: true, comparisonKey: 'renewal_likelihood', reportRole: 'renewal_likelihood',
      text: 'How likely are you to renew your housing at Ivory University House for the 2027–2028 leasing term?',
      choices: ch([['def', 'Definitely planning to renew', { sentiment: 'positive' }], ['likely', 'Likely to renew', { sentiment: 'positive' }],
        ['undecided', 'Undecided / Exploring my options', { sentiment: 'undecided' }], ['unlikely', 'Unlikely to renew', { sentiment: 'negative' }],
        ['notreturn', 'Not planning to return', { sentiment: 'negative' }]]) }),
    Q({ id: 'q15', sectionId: 'sC', type: 'single', comparisonKey: 'renewal_arrangement', reportRole: 'renewal_arrangement',
      text: 'If you decide to return, what would be your preferred housing arrangement?',
      choices: ch([['keep', 'Keep my current room/bedspace'], ['transfer', 'Transfer to another IUH room or floorplan'], ['either', 'Open to either'], ['notsure', 'Not sure']]),
      logic: { match: 'all', conditions: [{ questionId: 'q14', operator: 'anyOf', values: ['def', 'likely', 'undecided'] }] } }),
    Q({ id: 'q16', sectionId: 'sC', type: 'checkbox', maxSelect: 3, allowOther: true, comparisonKey: 'renewal_factors', reportRole: 'renewal_factors',
      text: 'What factors will have the greatest influence on your housing decision for 2027–2028?', description: 'Select up to three.',
      choices: ch([['rates', 'Rental rates and affordability'], ['keep', 'Keeping current room'], ['floorplan', 'Preferred floorplan availability'],
        ['roommate', 'Roommate preferences'], ['campus', 'Proximity to campus'], ['clean', 'Cleanliness and maintenance'],
        ['amenities', 'Amenities and study spaces'], ['community', 'Sense of community'], ['flex', 'Housing agreement flexibility'],
        ['academic', 'Graduation or academic changes']]) }),
    Q({ id: 'q17', sectionId: 'sC', type: 'single', comparisonKey: 'renewal_timing', reportRole: 'renewal_timing',
      text: 'When do you expect to make your housing decision for 2027–2028?',
      choices: ch([['30d', 'Within the next 30 days'], ['dec', 'By December 2026'], ['janfeb', 'January–February 2027'], ['mar', 'March 2027 or later'],
        ['notsure', 'Not sure'], ['notapplicable', 'Not applicable', { na: true }]]) }),
    Q({ id: 'q18', sectionId: 'sC', type: 'single', allowOther: true, comparisonKey: 'renewal_leave_reason', reportRole: 'renewal_leave_reason',
      text: "If you're unlikely to renew or don't plan to return, what is the primary reason?",
      choices: ch([['grad', 'Graduating or academic changes'], ['moving', 'Moving away'], ['cost', 'Housing costs'], ['floorplan', 'Different floorplan or arrangement'],
        ['roommate', 'Roommate considerations'], ['dissat', 'Dissatisfaction with living experience'], ['other_prop', 'Planning to live at another property'],
        ['pnts', 'Prefer not to say']]),
      logic: { match: 'all', conditions: [{ questionId: 'q14', operator: 'anyOf', values: ['unlikely', 'notreturn'] }] } }),
    Q({ id: 'q19', sectionId: 'sC', type: 'long', comparisonKey: 'one_change', reportRole: 'open_feedback',
      text: 'If IUH could make ONE change to improve your living experience this term, what would it be?',
      description: 'Optional. Please avoid including names or other identifying details.' }),
  ];
  return { sections, questions };
}

export function fall2026Settings() {
  return {
    title: 'Fall 2026 Resident Experience Pulse Survey',
    description: 'First Resident Experience Pulse of the 2026–2027 academic year. Estimated duration 4–5 minutes.',
    category: 'Resident Experience Pulse', academicYear: '2026–2027', term: 'Fall 2026', audience: 'All current IUH residents',
    openAt: null, closeAt: null, intro: FALL_2026_INTRO, thankYou: FALL_2026_THANKS,
    anonymous: true, eligibleCount: null, estimatedMinutes: '4–5',
    followUp: { enabled: false, label: 'Interested in discussing your renewal options? Request information.' },
  };
}
