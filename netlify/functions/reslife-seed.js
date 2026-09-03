import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';
import { json } from './_reslife.js';

/**
 * One-time (idempotent) seed of real starter content for The Harbour at Occ,
 * reconstructed from the property's own reference documents (committee
 * structure, Collateral SOP, campus contact list, curriculum tracker).
 *
 * Site admin only. Safe to call more than once — every insert is guarded by
 * a lookup for an existing record with the same title/name so nothing is
 * duplicated on repeat runs.
 *
 * POST /api/reslife-seed  (no body needed)
 */
const PROPERTY = 'The Harbour at Occ';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  if (user.role !== 'admin') return { statusCode: 403, body: 'Site admin only' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const db = await getDb();
  const now = new Date().toISOString();
  const summary = { committees: [], sops: [], contacts: [], curriculum: [] };

  // ---- Committees ----
  const committees = [
    {
      name: 'Programming',
      advisors: 'Chris, Martin',
      lead: '',
      members: ['Naya', 'Daniel'],
      cadence: 'Every other week, 1 hour (cannot overlap weekly office shifts unless approved by REC)',
    },
    {
      name: 'Recruitment & Selection',
      advisors: 'Jamie, Brannon',
      lead: 'Atalay',
      members: ['Amelia', 'Atalay', 'Brannon', 'Emily', 'Jamie', 'Joanna', 'Jonathan'],
      cadence: 'Weekly, 60 minutes',
    },
    {
      name: 'Fun & Recognition',
      advisors: '',
      lead: '',
      members: ['Jacob', 'Ngozi', 'Nathan', 'Monet', 'Moe'],
      cadence: '',
    },
  ];
  const commCol = db.collection('reslife_committees');
  for (const c of committees) {
    const existing = await commCol.findOne({ property: PROPERTY, name: c.name });
    if (existing) { summary.committees.push(`skipped (exists): ${c.name}`); continue; }
    await commCol.insertOne({ property: PROPERTY, ...c, createdBy: user.sub, createdAt: now, updatedAt: now });
    summary.committees.push(`created: ${c.name}`);
  }

  // ---- SOP Library ----
  const sops = [
    {
      title: 'Programming Collateral Group — Expectations & Requirements',
      category: 'Programming',
      content: [
        'Meeting Frequency: Every other week for 1 hour. All members must attend. Meetings cannot overlap with weekly office shifts unless approved by your REC.',
        '',
        'Committee Lead: Serves as the main point of contact for weekly team meeting updates and provides the weekly collateral update. May break ties in decision making. Collaborates closely with advisors.',
        '',
        'Active Programming Requirement: 1 program per month, February through May. Budget: $200 per program (additional funding sources available upon request).',
        '',
        'Passive Programming Requirement: Try a different format every month (e.g., tabling, goodie bags, poster/bulletin board questions).',
        '',
        'Campus Collaboration Ideas: "Resume Roast" / headshots with the Career Center; "Research 101" with a librarian or faculty; "Donuts with the Dean"; "Coffee with a Cop" safety walk/Q&A with Campus Safety; Financial Aid "Budgeting for Next Semester" workshop.',
        '',
        'Passive Program Ideas: Interactive bulletin boards (collaborative playlist QR code, "take what you need" affirmation envelopes, poll of the week, bucket list wall); Information & giveaways ("Adulting" flyer series, exam survival kits, front-desk tabling).',
        '',
        'Active Program Ideas: Food-related (Waffle Wednesday, Taco Tuesday/Nacho Bar, "Chopped" vending-machine challenge); Creative & DIY (Paint & Sip, Succulent Planting, Vision Boards).',
      ].join('\n'),
      linkUrl: '',
    },
  ];
  const sopCol = db.collection('reslife_sops');
  for (const s of sops) {
    const existing = await sopCol.findOne({ property: PROPERTY, title: s.title });
    if (existing) { summary.sops.push(`skipped (exists): ${s.title}`); continue; }
    await sopCol.insertOne({ property: PROPERTY, ...s, createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now });
    summary.sops.push(`created: ${s.title}`);
  }

  // ---- Campus Contacts (the property's own "Chosen Departments" shortlist) ----
  const contacts = [
    { department: 'Global Engagement Center', email: 'occinternational@cccd.edu', category: 'Student Organizations' },
    { department: 'Umoja', email: 'umoja@cccd.edu', category: 'Student Organizations' },
    { department: 'Housing Residential', email: 'occhousing@cccd.edu', category: 'Other' },
    { department: 'ResLife@OCC', email: 'reslifeclubocc@gmail.com', category: 'Student Organizations' },
    { department: 'ASOCC', email: 'studentlife@occ.cccd.edu', category: 'Student Organizations' },
    { department: 'Financial Aid', email: 'occfinaid@occ.cccd.edu', category: 'Financial' },
  ];
  const contactCol = db.collection('reslife_contacts');
  for (const c of contacts) {
    const existing = await contactCol.findOne({ property: PROPERTY, department: c.department });
    if (existing) { summary.contacts.push(`skipped (exists): ${c.department}`); continue; }
    await contactCol.insertOne({ property: PROPERTY, contactName: '', phone: '', notes: '', ...c, createdBy: user.sub, createdAt: now, updatedAt: now });
    summary.contacts.push(`created: ${c.department}`);
  }

  // ---- Curriculum Trackers ----
  const curCol = db.collection('reslife_curriculum');
  const trackers = [
    {
      semester: 'Fall 2026',
      roster: ['PT', 'Matthew', 'Isabel', 'Miles', 'Naia', 'Emily', 'Tonya', 'Betty', 'Moe', 'Kino', 'Jonathan', 'Keira', 'Ngozi', 'Jonah', 'Jacob', 'Sarah', 'Farrah', 'Munaka', 'Inchan'],
      requirements: [
        { name: 'Floor Meeting', dueDate: '2026-09-15' },
        { name: 'Roommate Agreement', dueDate: '2026-09-30' },
        { name: 'Community Wide Program #1', dueDate: '2026-10-15' },
        { name: 'Community Wide Program #2', dueDate: '2026-11-15' },
        { name: 'Community Connections', dueDate: '2026-11-30' },
      ],
      note: 'Reconstructed from a merged-cell spreadsheet — double check due dates.',
    },
    {
      semester: 'Spring 2026',
      roster: ['Benjamin Ngo', 'Courtney Scheingart', 'Ellie Manzke', 'Julia Rios Valois', 'Kyla Tatum', 'Lola Schroeder', 'Storm Moore', 'Ty Guenther', 'Yahanie Aguayo'],
      requirements: [
        { name: 'Door Tag Refresh S26', dueDate: '2026-01-19' },
        { name: 'Pit Stop #5 S26', dueDate: '2026-01-31' },
        { name: 'Community Wide #4 SO+ S26', dueDate: '2026-02-07' },
        { name: 'Pit Stop #6 S26', dueDate: '2026-03-01' },
        { name: 'Passive Education #4 S26', dueDate: '2026-03-01' },
        { name: 'Social #3 SO+ S26', dueDate: '2026-03-07' },
        { name: 'Pit Stop #7 S26', dueDate: '2026-03-14' },
        { name: 'Building Chat #3 SO+ S26', dueDate: '2026-03-14' },
        { name: 'Community Wide #5 SO+ S26', dueDate: '2026-03-21' },
        { name: 'Passive Education #5 S26', dueDate: '2026-03-01' },
        { name: 'Passive Education #6 S26', dueDate: '2026-04-12' },
        { name: 'Pit Stop #8 S26', dueDate: '2026-05-02' },
        { name: 'Community Wide #6 SO+ S26', dueDate: '2026-05-02' },
        { name: 'Social #4 SO+ S26', dueDate: '2026-05-02' },
        { name: 'Building Chat #4 SO+ S26', dueDate: '2026-05-03' },
      ],
    },
  ];
  for (const t of trackers) {
    const existing = await curCol.findOne({ property: PROPERTY, semester: t.semester });
    if (existing) { summary.curriculum.push(`skipped (exists): ${t.semester}`); continue; }
    const requirements = t.requirements.map((r, i) => ({ id: 'req-' + Date.now() + '-' + i, name: r.name, dueDate: r.dueDate }));
    await curCol.insertOne({
      property: PROPERTY, semester: t.semester, requirements, roster: t.roster, completions: {},
      createdBy: user.sub, createdAt: now, updatedAt: now,
    });
    summary.curriculum.push(`created: ${t.semester}${t.note ? ' (' + t.note + ')' : ''}`);
  }

  return json(200, { property: PROPERTY, summary });
}
