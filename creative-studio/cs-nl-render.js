/* Creative Studio — Monthly Newsletter: section schema, default template, email HTML renderer,
   plain-text renderer and Entrata validator. Brand values come from CS.cfg.email (Harbour Entrata shell).
   Sections are newsletter-style (masthead, contents, feature story, columns, calendar, tips, Q&A…).
   No emoji/icons are used in the editor or in default content. */
(function (CS) {
  const NL = CS.nl = CS.nl || {};
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  NL.MONTHS = MONTHS;
  const uid = () => 's' + Math.random().toString(36).slice(2, 10);

  // ── Field schema: drives the settings form for every section type ──
  // kinds: text · textarea · url · image · date · time · select · items (repeatable cards with sub-fields)
  const F = (key, label, kind, extra) => Object.assign({ key, label, kind: kind || 'text' }, extra || {});
  const IMG = F('image', 'Image (optional)', 'image');
  const LINK = [F('linkLabel', 'Link label (optional)'), F('linkUrl', 'Link URL', 'url')];
  // group: used to organise the Add Section library. legacy: kept only so older newsletters still render/edit.
  NL.TYPES = {
    masthead:   { name: 'Masthead', group: 'Structure', desc: 'Logo, newsletter name, issue and cover photo.', fields: [F('eyebrow', 'Top line'), F('title', 'Newsletter name'), F('issueLabel', 'Issue (month & year)'), F('issueNumber', 'Volume / issue number (optional)'), F('heroImage', 'Cover photo (optional)', 'image'), F('heroCaption', 'Cover caption (optional)')] },
    contents:   { name: 'In This Issue', group: 'Structure', desc: 'Auto-built table of contents from your section headings.', fields: [F('heading', 'Heading'), F('intro', 'Intro line (optional)')] },
    letter:     { name: 'Letter from the Team', group: 'Stories', desc: 'A short personal note with a sign-off.', fields: [F('heading', 'Heading'), F('body', 'Letter', 'textarea'), F('signName', 'Signed by'), F('signTitle', 'Title / team'), F('photo', 'Photo (optional)', 'image')] },
    feature:    { name: 'Feature Story', group: 'Stories', desc: 'Lead story with kicker, headline, photo and article text.', fields: [F('kicker', 'Kicker (small label)'), F('headline', 'Headline'), F('deck', 'Subheadline (optional)'), F('image', 'Photo (optional)', 'image'), F('body', 'Story', 'textarea'), ...LINK] },
    highlights: { name: 'Two-Column Highlights', group: 'Stories', desc: 'Short stories side by side (stacks on phones).', fields: [F('heading', 'Section heading'), F('items', 'Highlights', 'items', { itemLabel: 'Highlight', sub: [F('kicker', 'Kicker (optional)'), F('title', 'Title'), F('body', 'Text', 'textarea'), IMG, ...LINK] })] },
    news:       { name: 'News & Updates', group: 'Community News', desc: 'Property notices, changes and deadlines.', fields: [F('heading', 'Section heading'), F('items', 'Updates', 'items', { itemLabel: 'Update', sub: [F('date', 'Date / deadline (optional)'), F('title', 'Title'), F('body', 'Details', 'textarea'), ...LINK] })] },
    dates:      { name: 'Dates to Remember', group: 'Community News', desc: 'A compact list of key dates and deadlines.', fields: [F('heading', 'Section heading'), F('items', 'Dates', 'items', { itemLabel: 'Date', sub: [F('date', 'Date', 'date'), F('label', 'What’s happening'), F('note', 'Note (optional)')] })] },
    events:     { name: 'Events Calendar', group: 'Community News', desc: 'Upcoming programs with date, time, place and RSVP.', fields: [F('heading', 'Section heading'), F('items', 'Events', 'items', { itemLabel: 'Event', sub: [F('name', 'Event name'), F('date', 'Date', 'date'), F('start', 'Start time', 'time'), F('end', 'End time', 'time'), F('location', 'Location'), F('description', 'Description', 'textarea'), F('rsvpUrl', 'RSVP / info link', 'url'), F('cta', 'Button label'), IMG] })] },
    shoutouts:  { name: 'Community Shoutouts', group: 'Community News', desc: 'Recognize residents, staff and wins.', fields: [F('heading', 'Section heading'), F('items', 'Shoutouts', 'items', { itemLabel: 'Shoutout', sub: [F('name', 'Who'), F('note', 'Why they’re awesome', 'textarea')] })] },
    gallery:    { name: 'Photo Recap', group: 'Community News', desc: 'A photo grid from recent events.', fields: [F('heading', 'Section heading'), F('caption', 'Caption (optional)', 'textarea'), F('items', 'Photos', 'items', { itemLabel: 'Photo', sub: [IMG, F('caption', 'Caption (optional)')] })] },
    qa:         { name: 'Spotlight Q&A', group: 'People', desc: 'Get to know a resident or team member.', fields: [F('heading', 'Section heading'), F('name', 'Name'), F('role', 'Role / major'), F('photo', 'Photo', 'image'), F('intro', 'Intro (optional)', 'textarea'), F('items', 'Questions', 'items', { itemLabel: 'Question', sub: [F('q', 'Question'), F('a', 'Answer', 'textarea')] })] },
    tips:       { name: 'Resident Tips', group: 'Living Here', desc: 'Numbered tips, reminders or a how-to.', fields: [F('heading', 'Section heading'), F('intro', 'Intro (optional)', 'textarea'), F('items', 'Tips', 'items', { itemLabel: 'Tip', sub: [F('title', 'Title'), F('body', 'Details', 'textarea')] })] },
    maintenance:{ name: 'Service Requests', group: 'Living Here', desc: 'How to submit a work order + emergency instructions.', fields: [F('heading', 'Heading'), F('body', 'How to submit', 'textarea'), F('emergency', 'Emergency instructions', 'textarea'), F('cta', 'Button label'), F('portalUrl', 'Resident Portal link', 'url')] },
    stats:      { name: 'By the Numbers', group: 'Living Here', desc: 'Big numbers with short labels.', fields: [F('heading', 'Section heading'), F('items', 'Numbers', 'items', { itemLabel: 'Number', sub: [F('number', 'Number (e.g. 120+)'), F('label', 'Label')] })] },
    campus:     { name: 'Campus Corner', group: 'OCC & Resources', desc: 'Orange Coast College news, services and deadlines.', fields: [F('heading', 'Section heading'), F('intro', 'Intro (optional)', 'textarea'), F('items', 'Campus items', 'items', { itemLabel: 'Item', sub: [F('title', 'Title'), F('body', 'Description', 'textarea'), F('url', 'Link', 'url'), F('cta', 'Link label')] })] },
    resource:   { name: 'Resource of the Month', group: 'OCC & Resources', desc: 'One featured resource with contact details.', fields: [F('heading', 'Section heading'), F('title', 'Resource'), F('category', 'Category', 'select', { options: ['Academic', 'Mental Health', 'Financial', 'Food', 'Transportation', 'Career', 'Safety', 'Health', 'Student Life'] }), F('description', 'Description', 'textarea'), F('website', 'Website', 'url'), F('phone', 'Phone'), F('cta', 'Button label'), IMG] },
    quote:      { name: 'Pull Quote', group: 'Design', desc: 'A large quote to break up the page.', fields: [F('quote', 'Quote', 'textarea'), F('attribution', 'Attribution')] },
    ctaBanner:  { name: 'Call-to-Action Banner', group: 'Design', desc: 'A bold navy banner with one button.', fields: [F('heading', 'Heading'), F('body', 'Text', 'textarea'), F('buttonLabel', 'Button label'), F('buttonUrl', 'Button link', 'url')] },
    fullImage:  { name: 'Full-Width Photo', group: 'Design', desc: 'One large photo with an optional caption.', fields: [IMG, F('caption', 'Caption (optional)')] },
    custom:     { name: 'Text Block', group: 'Design', desc: 'Free text with an optional heading.', fields: [F('heading', 'Heading (optional)'), F('body', 'Text', 'textarea')] },
    divider:    { name: 'Divider', group: 'Design', desc: 'A thin line between sections.', fields: [] },
    quicklinks: { name: 'Quick Links', group: 'Footer', desc: 'Big tappable buttons to common destinations.', fields: [F('heading', 'Section heading'), F('items', 'Links', 'items', { itemLabel: 'Link', sub: [F('label', 'Label'), F('url', 'Link', 'url')] })] },
    social:     { name: 'Follow The Harbour', group: 'Footer', desc: 'Social channels and website.', fields: [F('heading', 'Heading'), F('body', 'Message', 'textarea'), F('instagram', 'Instagram URL', 'url'), F('facebook', 'Facebook URL', 'url'), F('tiktok', 'TikTok URL', 'url'), F('website', 'Website', 'url')] },
    footer:     { name: 'Contact & Footer', group: 'Footer', desc: 'Official contact info and office hours.', fields: [F('tagline', 'Tagline'), F('name', 'Property name'), F('address', 'Address'), F('phone', 'Phone'), F('email', 'Email'), F('website', 'Website', 'url'), F('hours', 'Office hours', 'textarea'), F('disclaimer', 'Footer note (optional)', 'textarea')] },
    // ── legacy types (from the first version) — still render and edit, not offered in the library ──
    header:        { legacy: true, name: 'Header', fields: [F('eyebrow', 'Top line'), F('title', 'Title'), F('monthLabel', 'Month label'), F('heroImage', 'Hero image (optional)', 'image')] },
    welcome:       { legacy: true, name: 'Welcome Message', fields: [F('heading', 'Heading'), F('body', 'Message', 'textarea')] },
    announcements: { legacy: true, name: 'Announcements', fields: [F('heading', 'Section heading'), F('items', 'Announcements', 'items', { itemLabel: 'Announcement', sub: [F('title', 'Title'), F('body', 'Details', 'textarea'), F('date', 'Date / deadline (optional)'), F('buttonLabel', 'Button label (optional)'), F('buttonUrl', 'Button link', 'url'), IMG] })] },
    reminders:     { legacy: true, name: 'Resident Reminders', fields: [F('heading', 'Section heading'), F('items', 'Reminders', 'items', { itemLabel: 'Reminder', sub: [F('title', 'Title'), F('body', 'Details', 'textarea')] })] },
    spotlight:     { legacy: true, name: 'ResLife Spotlight', fields: [F('heading', 'Section heading'), F('name', 'Name'), F('role', 'Role'), F('headline', 'Headline'), F('body', 'Short description', 'textarea'), F('photo', 'Photo', 'image')] },
    occ:           { legacy: true, name: 'OCC Campus Connection', fields: [F('heading', 'Section heading'), F('intro', 'Intro (optional)', 'textarea'), F('items', 'Campus items', 'items', { itemLabel: 'Campus item', sub: [F('heading', 'Heading'), F('description', 'Description', 'textarea'), F('url', 'Link', 'url'), F('cta', 'Button label')] })] },
    imageText:     { legacy: true, name: 'Image + Text', fields: [F('heading', 'Heading'), F('body', 'Text', 'textarea'), F('buttonLabel', 'Button label'), F('buttonUrl', 'Button link', 'url'), IMG] },
  };
  NL.GROUPS = ['Structure', 'Stories', 'Community News', 'People', 'Living Here', 'OCC & Resources', 'Design', 'Footer'];
  // Library = every non-legacy type, with starter content.
  NL.LIBRARY = Object.entries(NL.TYPES).filter(([, t]) => !t.legacy).map(([type, t]) => [t.name, type, null]);

  // ── Default Harbour newsletter ──
  NL.defaults = function (month, year) {
    const E = CS.cfg.email, f = E.footer, res = CS.cfg.resources || [];
    const link = t => (res.find(r => r.title === t) || {}).url || '';
    const hero = (CS.cfg.photos || []).find(p => p.kind === 'entrata') || (CS.cfg.photos || []).find(p => p.id === 'rooftop-terrace');
    const heroSrc = hero ? (/^https?:/.test(hero.src) ? hero.src : location.origin + hero.src) : '';
    const mk = (type, content, visible) => ({ id: uid(), type, visible: visible !== false, collapsed: false, content });
    const M = MONTHS[month - 1];
    return [
      mk('masthead', { eyebrow: 'THE HARBOUR AT OCC', title: 'The Harbour Herald', issueLabel: `${M} ${year}`, issueNumber: '', heroImage: heroSrc ? { src: heroSrc, alt: hero.alt || 'The Harbour at OCC', link: E.siteUrl } : null, heroCaption: '' }),
      mk('contents', { heading: 'In This Issue', intro: '' }),
      mk('letter', { heading: 'A Note from Your ResLife Team', body: `Welcome to ${M}! This month we’re focused on [[theme — e.g. finishing midterms strong and getting to know your neighbors]]. Inside you’ll find upcoming events, important dates and resources to help you thrive at The Harbour and at OCC.\n\nAs always, our door is open — stop by the office anytime.`, signName: 'The Harbour ResLife Team', signTitle: 'Residence Life', photo: null }),
      mk('feature', { kicker: 'Feature Story', headline: '[[This month’s big story]]', deck: '[[One sentence that makes residents want to read more]]', image: null, body: '[[Tell the story of a program, a community milestone, a new amenity or a resident success. Keep paragraphs short.]]', linkLabel: '', linkUrl: '' }),
      mk('news', { heading: 'News & Updates', items: [{ date: '', title: '[[Update title]]', body: '[[Office notice, change or reminder]]', linkLabel: '', linkUrl: '' }] }),
      mk('dates', { heading: 'Dates to Remember', items: [{ date: '', label: '[[Deadline or key date]]', note: '' }] }),
      mk('events', { heading: 'Events Calendar', items: [{ name: '[[Event name]]', date: '', start: '19:00', end: '21:00', location: '[[Location]]', description: '[[Short description]]', rsvpUrl: '', cta: 'RSVP / Learn More', image: null }] }),
      mk('tips', { heading: 'Resident Tips', intro: '', items: [{ title: 'Package pickup', body: '[[Package room hours and pickup instructions]]' }, { title: 'Be a great neighbor', body: 'Keep noise down during quiet hours and leave shared spaces better than you found them.' }, { title: 'Trash & recycling', body: '[[Trash procedures]]' }] }),
      mk('campus', { heading: 'Campus Corner', intro: 'Resources and happenings at Orange Coast College.', items: [{ title: 'Tutoring Services', body: 'Free tutoring for OCC students.', url: link('Tutoring Services'), cta: 'Get help' }, { title: 'Student Employment', body: 'On-campus jobs that fit your class schedule.', url: link('On-Campus Student Employment'), cta: 'View jobs' }, { title: 'Mental Health Care', body: 'Confidential support from the Student Health Center.', url: link('Mental Health Care'), cta: 'Learn more' }] }),
      mk('maintenance', { heading: 'Service Requests', body: 'Something not working? Submit a service request through the resident portal and our team will take care of it.', emergency: '[[Emergency maintenance instructions — e.g. call the office after hours]]', cta: 'Submit a Service Request', portalUrl: E.portalUrl }),
      mk('qa', { heading: 'Spotlight Q&A', name: '', role: '', photo: null, intro: '', items: [{ q: 'What’s your favorite spot at The Harbour?', a: '' }, { q: 'Best advice for new residents?', a: '' }] }, false),
      mk('gallery', { heading: 'Photo Recap', caption: '', items: [{ image: null, caption: '' }, { image: null, caption: '' }] }, false),
      mk('quicklinks', { heading: 'Quick Links', items: [{ label: 'Resident Portal', url: E.portalUrl }, { label: 'Submit a Service Request', url: E.portalUrl }, { label: 'The Harbour Website', url: E.siteUrl }, { label: 'OCC Website', url: 'https://orangecoastcollege.edu/' }, { label: 'Contact The Harbour', url: 'https://theharbourocc.com/contact-us/' }] }),
      mk('social', { heading: 'Follow The Harbour', body: 'Stay in the loop on events, giveaways and community news.', instagram: '', facebook: '', tiktok: '', website: E.siteUrl }),
      mk('footer', { tagline: 'Questions? Our team is here to help.', name: f.name, address: '1369 Adams Avenue, Costa Mesa, CA', phone: f.phone, email: f.email, website: E.siteUrl, hours: '[[Office hours]]', disclaimer: 'You are receiving this email because you are a resident of The Harbour at OCC.' }),
    ];
  };
  const STARTERS = {
    highlights: { heading: 'Around The Harbour', items: [{ kicker: '', title: 'Highlight one', body: '' }, { kicker: '', title: 'Highlight two', body: '' }] },
    shoutouts: { heading: 'Community Shoutouts', items: [{ name: '', note: '' }] },
    stats: { heading: 'By the Numbers', items: [{ number: '', label: '' }, { number: '', label: '' }, { number: '', label: '' }] },
    resource: { heading: 'Resource of the Month', title: '', category: '', description: '', website: '', phone: '', cta: 'Learn More', image: null },
    quote: { quote: '', attribution: '' },
    ctaBanner: { heading: 'Don’t miss it', body: '', buttonLabel: 'Learn More', buttonUrl: '' },
    fullImage: { image: null, caption: '' },
    custom: { heading: '', body: '' },
    divider: {},
  };
  NL.newSection = function (type, content) {
    const def = NL.defaults(new Date().getMonth() + 1, new Date().getFullYear()).find(s => s.type === type);
    return { id: uid(), type, visible: true, collapsed: false, content: JSON.parse(JSON.stringify(content || (def ? def.content : STARTERS[type] || {}))) };
  };
  NL.uid = uid;

  // ── Writing assistant ──
  // Tries the Creative Studio AI endpoint first; if no AI provider is configured it uses a built-in writer
  // that genuinely rewrites the text. Never invents facts — dates, numbers, links stay untouched.
  const CONTRACT = [['do not', 'don’t'], ['does not', 'doesn’t'], ['can not', 'can’t'], ['cannot', 'can’t'], ['will not', 'won’t'], ['we are', 'we’re'], ['you are', 'you’re'], ['it is', 'it’s'], ['we will', 'we’ll'], ['you will', 'you’ll'], ['that is', 'that’s'], ['let us', 'let’s'], ['is not', 'isn’t'], ['are not', 'aren’t']];
  const keepCase = (src, rep) => src[0] === src[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep;
  const sentences = t => String(t).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) || [];
  const cap = t => t.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const punct = t => /[.!?…”"]$/.test(t.trim()) ? t.trim() : t.trim() + '.';
  const tidy = t => cap(String(t).replace(/[ \t]+/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/([,.!?])(?=[A-Za-z])/g, '$1 ').trim());
  const title = t => t.split(' ').map((w, i) => (i && /^(a|an|the|and|or|of|to|in|on|at|for|with|by)$/i.test(w)) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const paras = t => String(t).split(/\n\s*\n/);
  function localRewrite(text, action) {
    let t = String(text);
    const perPara = fn => paras(t).map(fn).join('\n\n');
    switch (action) {
      case 'Improve Writing':
        return perPara(x => punct(tidy(x.replace(/\bin order to\b/gi, 'to').replace(/\butilize\b/gi, 'use').replace(/\ba lot of\b/gi, 'many').replace(/\bvery\s+/gi, '').replace(/\breally\s+/gi, '').replace(/\bat this point in time\b/gi, 'now').replace(/\bdue to the fact that\b/gi, 'because').replace(/\bplease be advised that\s*/gi, '').replace(/!{2,}/g, '!'))));
      case 'Shorten':
        return perPara(x => { const s = sentences(x.replace(/\b(just|actually|basically|really|very|literally|simply)\s+/gi, '')); if (s.length <= 1) return x.replace(/\b(just|actually|basically|really|very|literally|simply)\s+/gi, '').replace(/,\s*(which|that)[^,.]*(,)?/i, ''); const words = s.join(' ').split(' ').length; let out = [], n = 0; for (const z of s) { if (out.length && n + z.split(' ').length > words * 0.55) break; out.push(z.trim()); n += z.split(' ').length; } return out.join(' '); });
      case 'Make Friendlier': {
        let x = t; CONTRACT.forEach(([a, b]) => { x = x.replace(new RegExp('\\b' + a + '\\b', 'gi'), m => keepCase(m, b)); });
        x = x.replace(/\bresidents are (required|asked) to\b/gi, 'please').replace(/\bplease note that\b/gi, 'just a heads up:').replace(/\bmust\b/gi, 'need to');
        if (!/^(hi|hey|hello|welcome|good news|exciting)/i.test(x.trim())) x = 'Good news, Harbour! ' + x.trim();
        if (!/!\s*$/.test(x.trim()) && !/thanks for being/i.test(x)) x = x.trim().replace(/\.?$/, '.') + ' Thanks for being part of The Harbour!';
        return cap(x);
      }
      case 'Make More Professional': {
        let x = t.replace(/!+/g, '.').replace(/\b(hey|yo)\b,?\s*/gi, '').replace(/\bguys\b/gi, 'everyone').replace(/\bkinda\b/gi, 'somewhat').replace(/\bgonna\b/gi, 'going to').replace(/\bwanna\b/gi, 'want to').replace(/\bgood news, harbour\.?\s*/gi, '');
        CONTRACT.forEach(([a, b]) => { x = x.replace(new RegExp(b.replace('’', '[’\']'), 'gi'), m => keepCase(m, a)); });
        return paras(x).map(q => punct(tidy(q))).join('\n\n');
      }
      case 'Create Headline': {
        const first = (sentences(t)[0] || t).replace(/^(good news, harbour!|hi|hello|hey)[,!]?\s*/i, '').replace(/[.!?]+$/, '');
        const words = first.replace(/\b(we are|we’re|please|join us for|don’t forget|remember to|just a reminder that|this month)\b/gi, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 7);
        return title(words.join(' '));
      }
      case 'Create CTA': {
        const s = t.toLowerCase();
        if (/rsvp|event|join|party|night|program/.test(s)) return 'RSVP Now';
        if (/service request|work order|maintenance|repair/.test(s)) return 'Submit a Request';
        if (/portal|pay|rent|account/.test(s)) return 'Open Resident Portal';
        if (/survey|feedback|poll/.test(s)) return 'Take the Survey';
        if (/apply|application|job|hiring/.test(s)) return 'Apply Today';
        if (/contact|question|office/.test(s)) return 'Contact Us';
        return 'Learn More';
      }
      case 'Rewrite for Residents': {
        let x = t.replace(/\b(all )?residents are (required|asked|expected) to\b/gi, 'please').replace(/(^|[.!?]\s+)residents (should|must|need to|can|may)\b/gi, (m, a, b) => a + 'You ' + b).replace(/\btenants?\b/gi, m => keepCase(m, m.toLowerCase().endsWith('s') ? 'residents' : 'resident')).replace(/\bstudents\b/gi, m => keepCase(m, 'residents')).replace(/\bthe property\b/gi, 'The Harbour').replace(/\bthe community\b/gi, 'The Harbour community').replace(/\blease agreement\b/gi, 'License Agreement').replace(/\blease\b/gi, 'License Agreement').replace(/\ball residents (should|must)\b/gi, 'you’ll want to').replace(/\bresidents (should|must|can)\b/gi, 'you $1').replace(/\btheir\b/gi, 'your');
        return paras(x).map(q => punct(tidy(q))).join('\n\n');
      }
    }
    return t;
  }
  NL.aiAssist = async function (text, action, context) {
    const map = { 'Improve Writing': 'Fix Grammar', 'Shorten': 'Make Shorter', 'Make Friendlier': 'Make Friendlier', 'Make More Professional': 'Make More Professional', 'Rewrite for Residents': 'Make It More Harbour', 'Create Headline': 'Create Headline', 'Create CTA': 'Create CTA' };
    try {
      const r = await CS.api('/reslife-creative-ai', { method: 'POST', body: JSON.stringify({ propertyContext: { name: CS.cfg.name, institution: CS.cfg.institution, city: CS.cfg.city + ', ' + CS.cfg.state, voice: CS.cfg.voice.default, terminology: CS.cfg.terminology.prefer, facts: [] }, task: 'rewrite', action: map[action] + ' (newsletter copy; keep every date, number, price, link and policy unchanged)', format: 'newsletter', content: { body: text, heading: context } }) });
      const res = r && r.ok && r.result;
      if (res) {
        const out = action === 'Create Headline' ? res.headline : action === 'Create CTA' ? res.cta : (res.body || res.emailBody);
        if (out && String(out).trim()) return { text: String(out).trim(), source: 'ai' };
      }
    } catch (e) { /* no AI provider configured — fall through to the built-in writer */ }
    return { text: localRewrite(text, action), source: 'local' };
  };

  // ── Email HTML renderer (table layout, inline styles, email-safe fonts) ──
  const esc = s => String(s == null ? '' : s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const txt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');
  const abs = u => { u = String(u || '').trim(); if (!u) return ''; if (/^(https?:|mailto:|tel:)/i.test(u)) return u; if (u.startsWith('/')) return location.origin + u; if (/^www\./i.test(u)) return 'https://' + u; return u; };
  const t12 = hm => { if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return hm || ''; const [h, m] = hm.split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const dLong = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : (d || '');

  NL.render = function (nl, opts) {
    opts = opts || {};
    const E = CS.cfg.email, C = E.colors, FONT = E.font || 'Arial, Helvetica, sans-serif';
    const P = 'font-family:' + FONT + ';';
    const btn = (label, url, color) => label && url ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:14px 0 0;"><tr><td bgcolor="${color || C.accent}" style="border-radius:6px;"><a href="${esc(abs(url))}" target="_blank" class="nl-btn" style="${P}display:inline-block;padding:12px 22px;font-size:15px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(label)}</a></td></tr></table>` : '';
    const h2 = (t, eyebrow) => t ? `${eyebrow ? `<div style="${P}font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.accent};margin:0 0 4px;">${esc(eyebrow)}</div>` : ''}<h2 style="${P}margin:0 0 14px;font-size:24px;line-height:30px;color:${C.navy};">${esc(t)}</h2>` : '';
    const p = (t, extra) => t ? `<p style="${P}margin:0 0 12px;font-size:16px;line-height:26px;color:${C.text};${extra || ''}">${txt(t)}</p>` : '';
    const img = (im, radius) => im && im.src ? `${im.link ? `<a href="${esc(abs(im.link))}" target="_blank">` : ''}<img src="${esc(abs(im.src))}" alt="${esc(im.alt || '')}" width="588" style="display:block;width:100%;max-width:588px;height:auto;border:0;${radius ? 'border-radius:12px;' : ''}" />${im.link ? '</a>' : ''}` : '';
    const card = (inner, accent) => `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 12px;background:#ffffff;border:1px solid ${C.border};border-left:4px solid ${accent || C.accent};border-radius:10px;"><tr><td style="padding:16px 18px;">${inner}</td></tr></table>`;
    const row = (id, inner, bg, pad) => `<tr id="nl-${esc(id)}"><td class="mobile-pad" style="padding:${pad || '28px 40px'};background:${bg || '#ffffff'};">${inner}</td></tr>`;
    const kick = t => t ? `<div style="${P}font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.accent};margin:0 0 4px;">${esc(t)}</div>` : '';
    const lnk = (label, url) => label && url ? `<p style="${P}margin:10px 0 0;font-size:15px;line-height:22px;"><a href="${esc(abs(url))}" target="_blank" style="color:${C.navy};font-weight:bold;text-decoration:underline;">${esc(label)} &rarr;</a></p>` : '';
    const twoCol = (cells, render) => { let out = ''; for (let i = 0; i < cells.length; i += 2) out += `<tr>${[cells[i], cells[i + 1]].map((c, k) => `<td class="stack" width="50%" valign="top" style="padding:0 ${k ? 0 : 10}px 16px ${k ? 10 : 0}px;">${c ? render(c) : ''}</td>`).join('')}</tr>`; return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${out}</table>`; };
    const visible = (nl.sections || []).filter(s => s.visible !== false);
    const sectionTitle = s => { const c = s.content || {}; return c.heading || c.headline || ''; };
    const R = {
      masthead: (c, s) => `<tr id="nl-${esc(s.id)}"><td align="center" style="padding:22px 28px 16px;background:#ffffff;"><a href="${esc(E.siteUrl)}" target="_blank"><img src="${esc(E.logo)}" alt="${esc(E.logoAlt)}" width="150" style="display:block;width:150px;max-width:70%;height:auto;border:0;" /></a></td></tr>
        <tr><td class="mobile-pad" style="padding:0 40px 18px;background:#ffffff;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:3px solid ${C.navy};border-bottom:1px solid ${C.border};"><tr><td align="center" style="padding:16px 0 12px;text-align:center;">
          <div style="${P}font-size:12px;line-height:18px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.accent};">${esc(c.eyebrow)}</div>
          <div class="headline" style="font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:46px;font-weight:bold;color:${C.navy};margin:4px 0;">${esc(c.title)}</div>
          <div style="${P}font-size:13px;line-height:20px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.text};">${esc(c.issueLabel)}${c.issueNumber ? ' &nbsp;|&nbsp; ' + esc(c.issueNumber) : ''}</div>
        </td></tr></table></td></tr>
        ${c.heroImage && c.heroImage.src ? `<tr><td class="mobile-pad" style="padding:0 40px 8px;background:#ffffff;">${img(c.heroImage, true)}${c.heroCaption ? `<div style="${P}font-size:12px;line-height:18px;color:${C.text};font-style:italic;margin:6px 0 0;">${esc(c.heroCaption)}</div>` : ''}</td></tr>` : ''}`,
      contents: (c, s) => { const items = visible.filter(x => !['masthead', 'header', 'contents', 'divider', 'footer', 'quicklinks', 'social', 'fullImage', 'quote', 'ctaBanner'].includes(x.type)).map(sectionTitle).filter(Boolean); return items.length ? row(s.id, `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${C.calloutBg};border-radius:12px;"><tr><td style="padding:18px 22px;">${kick(c.heading || 'In This Issue')}${c.intro ? `<div style="${P}font-size:14px;line-height:22px;color:${C.text};margin:0 0 8px;">${esc(c.intro)}</div>` : ''}${items.map((t, i) => `<div style="${P}font-size:15px;line-height:26px;color:${C.navy};"><span style="color:${C.accent};font-weight:bold;">${String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;${esc(String(t).replace(/\[\[|\]\]/g, ''))}</div>`).join('')}</td></tr></table>`, '#ffffff', '8px 40px 20px') : ''; },
      letter: (c, s) => row(s.id, `${h2(c.heading)}<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${c.photo && c.photo.src ? `<td width="96" valign="top" class="stack" style="padding:0 16px 12px 0;"><img src="${esc(abs(c.photo.src))}" alt="${esc(c.photo.alt || c.signName || '')}" width="84" style="display:block;width:84px;height:auto;border-radius:50%;border:0;" /></td>` : ''}<td valign="top" class="stack">${p(c.body)}${c.signName ? `<p style="${P}margin:12px 0 0;font-size:15px;line-height:22px;color:${C.navy};"><strong>${esc(c.signName)}</strong>${c.signTitle ? `<br /><span style="color:${C.text};">${esc(c.signTitle)}</span>` : ''}</p>` : ''}</td></tr></table>`),
      feature: (c, s) => row(s.id, `${kick(c.kicker)}<h2 style="font-family:Georgia,'Times New Roman',serif;margin:0 0 8px;font-size:30px;line-height:36px;color:${C.navy};">${esc(c.headline)}</h2>${c.deck ? `<div style="${P}font-size:17px;line-height:26px;color:${C.text};margin:0 0 14px;">${esc(c.deck)}</div>` : ''}${c.image && c.image.src ? `<div style="margin:0 0 14px;">${img(c.image, true)}</div>` : ''}${p(c.body)}${lnk(c.linkLabel, c.linkUrl)}`),
      highlights: (c, s) => row(s.id, h2(c.heading) + twoCol(c.items || [], i => `${i.image && i.image.src ? `<div style="margin:0 0 10px;">${img(i.image, true).replace('width="588"', 'width="280"').replace('max-width:588px', 'max-width:280px')}</div>` : ''}${kick(i.kicker)}<div style="${P}font-size:18px;line-height:24px;font-weight:bold;color:${C.navy};margin:0 0 6px;">${esc(i.title)}</div>${i.body ? `<div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.body)}</div>` : ''}${lnk(i.linkLabel, i.linkUrl)}`), '#ffffff'),
      news: (c, s) => row(s.id, h2(c.heading) + (c.items || []).map((i, k) => `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="${k ? `border-top:1px solid ${C.border};` : ''}"><tr><td style="padding:${k ? '14px' : '0'} 0 14px;">${i.date ? kick(i.date) : ''}<div style="${P}font-size:18px;line-height:24px;font-weight:bold;color:${C.navy};margin:0 0 4px;">${esc(i.title)}</div>${i.body ? `<div style="${P}font-size:15px;line-height:24px;color:${C.text};">${txt(i.body)}</div>` : ''}${lnk(i.linkLabel, i.linkUrl)}</td></tr></table>`).join('')),
      dates: (c, s) => row(s.id, h2(c.heading) + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${(c.items || []).map(i => { const d = /^\d{4}-\d{2}-\d{2}$/.test(i.date || '') ? new Date(i.date + 'T12:00') : null; return `<tr><td width="92" valign="top" style="padding:8px 12px 8px 0;border-bottom:1px solid ${C.border};${P}font-size:14px;line-height:20px;font-weight:bold;color:${C.accent};text-transform:uppercase;">${d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : esc(i.date || 'TBD')}</td><td valign="top" style="padding:8px 0;border-bottom:1px solid ${C.border};${P}font-size:15px;line-height:22px;color:${C.navy};"><strong>${esc(i.label)}</strong>${i.note ? `<br /><span style="color:${C.text};font-size:14px;">${esc(i.note)}</span>` : ''}</td></tr>`; }).join('')}</table>`, C.calloutBg),
      shoutouts: (c, s) => row(s.id, h2(c.heading) + (c.items || []).map(i => `<div style="${P}margin:0 0 12px;padding:0 0 0 14px;border-left:3px solid ${C.accent};"><div style="${P}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};">${esc(i.name)}</div><div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.note)}</div></div>`).join('')),
      gallery: (c, s) => { const pics = (c.items || []).filter(i => i.image && i.image.src); return pics.length ? row(s.id, h2(c.heading) + twoCol(pics, i => `${img(i.image, true).replace('width="588"', 'width="280"').replace('max-width:588px', 'max-width:280px')}${i.caption ? `<div style="${P}font-size:12px;line-height:18px;color:${C.text};margin:6px 0 0;">${esc(i.caption)}</div>` : ''}`) + (c.caption ? p(c.caption) : '')) : ''; },
      qa: (c, s) => row(s.id, h2(c.heading) + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${c.photo && c.photo.src ? `<td width="140" valign="top" class="stack" style="padding:0 18px 12px 0;"><img src="${esc(abs(c.photo.src))}" alt="${esc(c.photo.alt || c.name || '')}" width="130" style="display:block;width:130px;height:auto;border-radius:12px;border:0;" /></td>` : ''}<td valign="top" class="stack"><div style="${P}font-size:20px;line-height:26px;font-weight:bold;color:${C.navy};">${esc(c.name)}</div>${c.role ? kick(c.role) : ''}${p(c.intro)}</td></tr></table>` + (c.items || []).filter(i => i.q).map(i => `<p style="${P}margin:12px 0 2px;font-size:15px;line-height:22px;font-weight:bold;color:${C.navy};">Q: ${esc(i.q)}</p><p style="${P}margin:0;font-size:15px;line-height:24px;color:${C.text};">${txt(i.a || '')}</p>`).join('')),
      tips: (c, s) => row(s.id, h2(c.heading) + p(c.intro) + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${(c.items || []).map((i, k) => `<tr><td width="44" valign="top" style="padding:0 0 14px;"><div style="width:30px;height:30px;border-radius:15px;background:${C.accent};${P}font-size:14px;line-height:30px;font-weight:bold;color:#ffffff;text-align:center;">${k + 1}</div></td><td valign="top" style="padding:3px 0 14px;"><div style="${P}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};">${esc(i.title)}</div><div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.body)}</div></td></tr>`).join('')}</table>`),
      stats: (c, s) => { const it = (c.items || []).filter(i => i.number); return it.length ? row(s.id, h2(c.heading) + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${it.slice(0, 3).map(i => `<td class="stack" align="center" valign="top" width="${Math.floor(100 / Math.min(3, it.length))}%" style="padding:6px;text-align:center;"><div style="${P}font-size:36px;line-height:42px;font-weight:bold;color:${C.accent};">${esc(i.number)}</div><div style="${P}font-size:14px;line-height:20px;color:${C.navy};font-weight:bold;">${esc(i.label)}</div></td>`).join('')}</tr></table>`, '#f7f9fc') : ''; },
      campus: (c, s) => row(s.id, h2(c.heading, 'Orange Coast College') + p(c.intro) + twoCol(c.items || [], i => `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-top:4px solid ${C.navy};border-radius:10px;border-collapse:separate;"><tr><td style="padding:14px 16px;"><div style="${P}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};margin:0 0 4px;">${esc(i.title)}</div>${i.body ? `<div style="${P}font-size:14px;line-height:22px;color:${C.text};">${txt(i.body)}</div>` : ''}${lnk(i.cta || (i.url ? 'Learn more' : ''), i.url)}</td></tr></table>`), '#f7f9fc'),
      quote: (c, s) => c.quote ? row(s.id, `<div style="text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:34px;font-style:italic;color:${C.navy};">&ldquo;${esc(c.quote)}&rdquo;</div>${c.attribution ? `<div style="${P}text-align:center;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${C.accent};margin:10px 0 0;">&mdash; ${esc(c.attribution)}</div>` : ''}`) : '',
      header: (c, s) => `<tr id="nl-${esc(s.id)}"><td align="center" style="padding:22px 28px 18px;background:#ffffff;border-bottom:1px solid ${C.border};"><a href="${esc(E.siteUrl)}" target="_blank"><img src="${esc(E.logo)}" alt="${esc(E.logoAlt)}" width="150" style="display:block;width:150px;max-width:70%;height:auto;border:0;" /></a></td></tr>
        <tr><td class="mobile-pad" align="center" style="padding:30px 40px 34px;background:${C.navy};text-align:center;">
          <div style="${P}font-size:13px;line-height:18px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.accent};">${esc(c.eyebrow)}</div>
          <div class="headline" style="${P}font-size:32px;line-height:38px;font-weight:bold;color:#ffffff;margin:8px 0 6px;letter-spacing:1px;">${esc(c.title)}</div>
          <div style="${P}font-size:15px;line-height:22px;font-weight:bold;letter-spacing:2px;color:${C.heroText};">${esc(c.monthLabel)}</div>
        </td></tr>
        <tr><td style="height:6px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
        ${c.heroImage && c.heroImage.src ? `<tr><td style="padding:0;background:#ffffff;">${img(c.heroImage).replace('max-width:588px', 'max-width:680px').replace('width="588"', 'width="680"')}</td></tr>` : ''}`,
      welcome: (c, s) => row(s.id, h2(c.heading) + p(c.body)),
      announcements: (c, s) => row(s.id, h2(c.heading, 'Announcements') + (c.items || []).map(i => card(`${i.image && i.image.src ? `<div style="margin:0 0 12px;">${img(i.image, true)}</div>` : ''}${i.date ? `<div style="${P}font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${C.accent};margin:0 0 4px;">${esc(i.date)}</div>` : ''}<div style="${P}font-size:18px;line-height:24px;font-weight:bold;color:${C.navy};margin:0 0 6px;">${esc(i.title)}</div>${i.body ? `<div style="${P}font-size:15px;line-height:24px;color:${C.text};">${txt(i.body)}</div>` : ''}${btn(i.buttonLabel, i.buttonUrl)}`)).join(''), C.calloutBg),
      events: (c, s) => row(s.id, h2(c.heading, 'This Month') + (c.items || []).map(i => {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(i.date || '') ? new Date(i.date + 'T12:00') : null;
        return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${C.border};border-radius:12px;border-collapse:separate;"><tr>
          <td width="76" valign="top" align="center" style="padding:14px 0 14px 14px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="62"><tr><td align="center" style="background:${C.accent};border-radius:10px 10px 0 0;${P}font-size:11px;font-weight:bold;letter-spacing:1px;color:#ffffff;padding:4px 0;">${d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'DATE'}</td></tr><tr><td align="center" style="background:#fff8f2;border-radius:0 0 10px 10px;${P}font-size:24px;font-weight:bold;color:${C.navy};padding:6px 0;">${d ? d.getDate() : '—'}</td></tr></table></td>
          <td valign="top" style="padding:14px 18px 14px 14px;">${i.image && i.image.src ? `<div style="margin:0 0 10px;">${img(i.image, true)}</div>` : ''}<div style="${P}font-size:18px;line-height:24px;font-weight:bold;color:${C.navy};">${esc(i.name)}</div>
            <div style="${P}font-size:13px;line-height:20px;color:${C.accent};font-weight:bold;margin:2px 0 6px;">${[d ? dLong(i.date) : esc(i.date), [t12(i.start), t12(i.end)].filter(Boolean).join(' – '), esc(i.location)].filter(Boolean).join(' &bull; ')}</div>
            ${i.description ? `<div style="${P}font-size:15px;line-height:24px;color:${C.text};">${txt(i.description)}</div>` : ''}${btn(i.cta || (i.rsvpUrl ? 'RSVP / Learn More' : ''), i.rsvpUrl, C.navy)}</td></tr></table>`;
      }).join('')),
      reminders: (c, s) => row(s.id, h2(c.heading, 'Reminders') + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${(c.items || []).map(i => `<tr><td width="22" valign="top" style="padding:8px 0 14px;"><div style="width:8px;height:8px;border-radius:4px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</div></td><td valign="top" style="padding:0 0 14px;"><div style="${P}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};">${esc(i.title)}</div><div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.body)}</div></td></tr>`).join('')}</table>`),
      maintenance: (c, s) => row(s.id, `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${C.calloutBg};border-left:4px solid ${C.accent};"><tr><td style="padding:22px 24px;">${h2(c.heading, 'Service Requests')}${p(c.body)}${c.emergency ? `<p style="${P}margin:0 0 4px;font-size:15px;line-height:24px;color:${C.text};"><strong style="color:${C.navy};">Emergency?</strong> ${txt(c.emergency)}</p>` : ''}${btn(c.cta, c.portalUrl)}</td></tr></table>`),
      spotlight: (c, s) => row(s.id, h2(c.heading, 'Spotlight') + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${c.photo && c.photo.src ? `<td width="140" valign="top" class="stack" style="padding:0 18px 12px 0;"><img src="${esc(abs(c.photo.src))}" alt="${esc(c.photo.alt || c.name || '')}" width="130" style="display:block;width:130px;height:auto;border-radius:12px;border:0;" /></td>` : ''}<td valign="top" class="stack"><div style="${P}font-size:19px;line-height:24px;font-weight:bold;color:${C.navy};">${esc(c.name)}</div>${c.role ? `<div style="${P}font-size:13px;font-weight:bold;color:${C.accent};text-transform:uppercase;letter-spacing:1px;margin:2px 0 8px;">${esc(c.role)}</div>` : ''}${c.headline ? `<div style="${P}font-size:16px;line-height:23px;font-weight:bold;color:${C.text};margin:0 0 6px;">${esc(c.headline)}</div>` : ''}${p(c.body)}</td></tr></table>`),
      occ: (c, s) => row(s.id, h2(c.heading, 'Orange Coast College') + p(c.intro) + (c.items || []).map(i => card(`<div style="${P}font-size:17px;line-height:23px;font-weight:bold;color:${C.navy};margin:0 0 4px;">${esc(i.heading)}</div>${i.description ? `<div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.description)}</div>` : ''}${btn(i.cta || (i.url ? 'Learn More' : ''), i.url, C.navy)}`, C.navy)).join(''), '#f7f9fc'),
      resource: (c, s) => row(s.id, h2(c.heading, c.category || 'Resource') + card(`${c.image && c.image.src ? `<div style="margin:0 0 12px;">${img(c.image, true)}</div>` : ''}<div style="${P}font-size:19px;line-height:25px;font-weight:bold;color:${C.navy};margin:0 0 6px;">${esc(c.title)}</div>${p(c.description)}${c.phone ? `<p style="${P}margin:0;font-size:15px;color:${C.text};">Phone: <a href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}" style="color:${C.navy};">${esc(c.phone)}</a></p>` : ''}${btn(c.cta || (c.website ? 'Learn More' : ''), c.website)}`)),
      quicklinks: (c, s) => row(s.id, h2(c.heading) + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${(c.items || []).filter(i => i.label).map(i => `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.navy}" style="border-radius:8px;"><a href="${esc(abs(i.url))}" target="_blank" style="${P}display:block;padding:14px 18px;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(i.label)} &rarr;</a></td></tr></table></td></tr>`).join('')}</table>`),
      social: (c, s) => row(s.id, `<div style="text-align:center;">${h2(c.heading)}${p(c.body, 'text-align:center;')}<p style="${P}margin:6px 0 0;font-size:15px;line-height:26px;">${[['Instagram', c.instagram], ['Facebook', c.facebook], ['TikTok', c.tiktok], ['Website', c.website]].filter(x => x[1]).map(([l, u]) => `<a href="${esc(abs(u))}" target="_blank" style="display:inline-block;margin:4px 6px;padding:8px 16px;border:2px solid ${C.accent};border-radius:999px;color:${C.navy};font-weight:bold;text-decoration:none;">${l}</a>`).join('')}</p></div>`),
      footer: (c, s) => `<tr id="nl-${esc(s.id)}"><td class="mobile-pad" align="center" style="padding:28px 38px;background:${C.navy};text-align:center;">
          <div style="${P}font-size:18px;line-height:24px;font-weight:bold;color:#ffffff;margin:0 0 10px;">${esc(c.tagline)}</div>
          <div style="${P}font-size:13px;line-height:22px;color:${C.footerText};"><strong style="color:#ffffff;">${esc(c.name)}</strong><br />${esc(c.address)}<br />${c.phone ? `<a href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}" style="color:#ffffff;text-decoration:none;">${esc(c.phone)}</a>` : ''}${c.phone && c.email ? ' &bull; ' : ''}${c.email ? `<a href="mailto:${esc(c.email)}" style="color:#ffffff;text-decoration:none;">${esc(c.email)}</a>` : ''}<br />${c.website ? `<a href="${esc(abs(c.website))}" target="_blank" style="color:#ffffff;text-decoration:underline;">${esc(String(c.website).replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}${c.hours ? `<br /><br /><strong style="color:#ffffff;">Office Hours</strong><br />${txt(c.hours)}` : ''}</div>
          ${c.disclaimer ? `<div style="${P}font-size:11px;line-height:17px;color:${C.footerText};margin:16px 0 0;opacity:.85;">${txt(c.disclaimer)}</div>` : ''}
        </td></tr>`,
      imageText: (c, s) => row(s.id, `${c.image && c.image.src ? `<div style="margin:0 0 14px;">${img(c.image, true)}</div>` : ''}${h2(c.heading)}${p(c.body)}${btn(c.buttonLabel, c.buttonUrl)}`),
      fullImage: (c, s) => c.image && c.image.src ? `<tr id="nl-${esc(s.id)}"><td style="padding:0;">${img(c.image).replace('max-width:588px', 'max-width:680px').replace('width="588"', 'width="680"')}${c.caption ? `<div class="mobile-pad" style="${P}padding:8px 40px 0;font-size:12px;line-height:18px;font-style:italic;color:${C.text};">${esc(c.caption)}</div>` : ''}</td></tr>` : '',
      ctaBanner: (c, s) => row(s.id, `<div style="text-align:center;"><div style="${P}font-size:24px;line-height:30px;font-weight:bold;color:#ffffff;margin:0 0 8px;">${esc(c.heading)}</div>${c.body ? `<div style="${P}font-size:16px;line-height:24px;color:${C.heroText};">${txt(c.body)}</div>` : ''}${c.buttonLabel && c.buttonUrl ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:16px auto 0;"><tr><td bgcolor="${C.accent}" style="border-radius:6px;"><a href="${esc(abs(c.buttonUrl))}" target="_blank" style="${P}display:inline-block;padding:13px 26px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(c.buttonLabel)}</a></td></tr></table>` : ''}</div>`, C.navy),
      divider: (c, s) => `<tr id="nl-${esc(s.id)}"><td class="mobile-pad" style="padding:6px 40px;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`,
      custom: (c, s) => row(s.id, h2(c.heading) + p(c.body)),
    };
    const sections = (nl.sections || []).filter(s => s.visible !== false);
    const bodyRows = sections.map(s => (R[s.type] || R.custom)(s.content || {}, s)).join('\n');
    const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="x-apple-disable-message-reformatting" /><meta name="color-scheme" content="light only" />
<title>${esc(nl.emailSubject || nl.title)}</title>
<style type="text/css">@media only screen and (max-width:680px){
  .email-container{width:100%!important;}
  .mobile-pad{padding-left:20px!important;padding-right:20px!important;}
  .headline{font-size:26px!important;line-height:32px!important;}
  .stack{display:block!important;width:100%!important;padding-right:0!important;}
  .nl-btn{display:block!important;text-align:center!important;}
}</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(nl.preheader || '')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background:${C.page};border-collapse:collapse;">
<tr><td align="center" style="padding:24px 10px;">
<table role="presentation" class="email-container" width="680" border="0" cellpadding="0" cellspacing="0" style="width:680px;max-width:680px;background:#ffffff;border-collapse:collapse;border-radius:16px;overflow:hidden;">
<tr><td style="height:6px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
${bodyRows}
<tr><td style="height:6px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
    return opts.highlightPlaceholders ? html.replace(/\[\[(.+?)\]\]/g, '<span style="background:#fff3c4;outline:1px dashed #f59e0b">[[$1]]</span>') : html;
  };

  // ── Plain-text version ──
  NL.plainText = function (nl) {
    const out = [nl.emailSubject || nl.title, nl.preheader, ''];
    const strip = s => String(s || '').replace(/\*\*/g, '').replace(/&#?\w+;/g, '').trim();
    (nl.sections || []).filter(s => s.visible !== false).forEach(s => {
      const c = s.content || {};
      const line = (...xs) => { const t = xs.filter(Boolean).map(strip).join(' — '); if (t) out.push(t); };
      if (s.type === 'masthead') { out.push(`${strip(c.eyebrow)} · ${strip(c.title)} · ${strip(c.issueLabel)}`, '='.repeat(40)); return; }
      if (s.type === 'contents') return;
      if (s.type === 'quote') { if (c.quote) out.push('', '"' + strip(c.quote) + '"' + (c.attribution ? ' - ' + strip(c.attribution) : '')); return; }
      if (s.type === 'feature') { out.push('', strip(c.kicker).toUpperCase(), strip(c.headline), strip(c.deck), strip(c.body)); if (c.linkUrl) line(c.linkLabel, c.linkUrl); return; }
      if (s.type === 'header') { out.push(`${strip(c.eyebrow)} · ${strip(c.title)} · ${strip(c.monthLabel)}`, '='.repeat(40)); return; }
      if (s.type === 'divider') { out.push('-'.repeat(40)); return; }
      if (c.heading) out.push('', strip(c.heading).toUpperCase());
      ['body', 'intro', 'description'].forEach(k => c[k] && out.push(strip(c[k])));
      if (s.type === 'maintenance' && c.emergency) out.push('Emergency: ' + strip(c.emergency));
      if (s.type === 'spotlight' || s.type === 'qa') line(c.name, c.role, c.headline);
      if (s.type === 'letter' && c.signName) line(c.signName, c.signTitle);
      if (s.type === 'resource') line(c.title, c.website, c.phone);
      (c.items || []).forEach(i => {
        if (s.type === 'events') line(`• ${strip(i.name)}`, dLong(i.date), [t12(i.start), t12(i.end)].filter(Boolean).join('–'), i.location, i.rsvpUrl);
        else if (s.type === 'quicklinks') line(`• ${strip(i.label)}`, i.url);
        else if (s.type === 'dates') line(`• ${i.date || 'TBD'}`, i.label, i.note);
        else if (s.type === 'qa') line(`Q: ${strip(i.q)}`, i.a);
        else if (s.type === 'stats') line(`• ${strip(i.number)}`, i.label);
        else if (s.type === 'shoutouts') line(`• ${strip(i.name)}`, i.note);
        else if (s.type === 'gallery') { if (i.caption) line('• ' + strip(i.caption)); }
        else line(`• ${strip(i.title || i.heading)}`, i.date, i.body || i.description, i.buttonUrl || i.url || i.linkUrl);
      });
      if (s.type === 'social') line(c.instagram, c.facebook, c.tiktok, c.website);
      if (s.type === 'footer') { out.push('', strip(c.tagline), strip(c.name), strip(c.address), [c.phone, c.email].filter(Boolean).join(' · '), strip(c.website), c.hours ? 'Office hours: ' + strip(c.hours) : ''); }
      if (['imageText', 'ctaBanner'].includes(s.type) && c.buttonUrl) line(c.buttonLabel, c.buttonUrl);
    });
    return out.filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  // ── Entrata validator ──
  NL.validate = function (nl, html) {
    const issues = [];
    if (!String(nl.emailSubject || '').trim()) issues.push('Add an email subject.');
    if (!String(nl.preheader || '').trim()) issues.push('Add preheader (preview) text.');
    if (/<script/i.test(html)) issues.push('Contains JavaScript (not allowed in email).');
    if (/<form|<input|<iframe/i.test(html)) issues.push('Contains forms or iframes (not supported in email).');
    (html.match(/<img\b[^>]*>/gi) || []).forEach(t => {
      const src = (t.match(/src="([^"]*)"/) || [])[1] || '';
      if (!/^https?:\/\//i.test(src)) issues.push(`Image without a full https:// URL: ${src.slice(0, 60) || '(empty)'}${src.startsWith('data:') ? ' — re-upload it so it gets a hosted link' : ''}`);
      if (/\.webp(\?|$)/i.test(src)) issues.push('A WebP image may not show in Outlook desktop — for best results use a JPG/PNG image from the Entrata Media Library.');
      if (!/alt="[^"]+"/.test(t)) issues.push(`Image missing alt text: ${src.split('/').pop().slice(0, 50)}`);
    });
    (html.match(/<a\b[^>]*>/gi) || []).forEach(t => { const h = (t.match(/href="([^"]*)"/) || [])[1]; if (!h || h === '#' || /^javascript:/i.test(h)) issues.push('A button or link has no destination URL.'); });
    const classes = [...new Set((html.match(/class="([^"]+)"/g) || []).map(c => c.slice(7, -1)).join(' ').split(/\s+/))].filter(c => !['email-container', 'mobile-pad', 'headline', 'stack', 'nl-btn'].includes(c));
    if (classes.length) issues.push('CSS classes that aren’t inlined: ' + classes.join(', '));
    if (/width="(\d+)"/g.test(html) && (html.match(/width="(\d+)"/g) || []).some(w => +w.match(/\d+/)[0] > 680)) issues.push('Something is wider than 680px.');
    const footer = (nl.sections || []).find(s => s.type === 'footer' && s.visible !== false);
    if (!footer || !(footer.content.phone || footer.content.email)) issues.push('Add contact information (footer phone or email).');
    const ph = (html.match(/\[\[(.+?)\]\]/g) || []).length;
    if (ph) issues.push(`${ph} placeholder${ph > 1 ? 's' : ''} still need to be filled in (shown [[like this]]).`);
    if (/\blease\b/i.test(NL.plainText(nl))) issues.push('Uses “lease” — The Harbour uses “License Agreement”.');
    return [...new Set(issues)];
  };
})(window.CS = window.CS || {});
