/* Creative Studio — Monthly Newsletter: section schema, default template, email HTML renderer,
   plain-text renderer and Entrata validator. Brand values come from CS.cfg.email (Harbour Entrata shell). */
(function (CS) {
  const NL = CS.nl = CS.nl || {};
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  NL.MONTHS = MONTHS;
  const uid = () => 's' + Math.random().toString(36).slice(2, 10);

  // ── Field schema: drives the settings form for every section type ──
  // kinds: text · textarea · url · image · date · time · items (repeatable cards with sub-fields)
  const F = (key, label, kind, extra) => Object.assign({ key, label, kind: kind || 'text' }, extra || {});
  const IMG = F('image', 'Image', 'image');
  NL.TYPES = {
    header:        { name: 'Header', icon: '&#9873;', fields: [F('eyebrow', 'Top line'), F('title', 'Title'), F('monthLabel', 'Month label'), F('heroImage', 'Hero image (optional)', 'image')] },
    welcome:       { name: 'Welcome Message', icon: '&#128075;', fields: [F('heading', 'Heading'), F('body', 'Message', 'textarea')] },
    announcements: { name: 'Announcements', icon: '&#128227;', fields: [F('heading', 'Section heading'), F('items', 'Announcements', 'items', { itemLabel: 'Announcement', sub: [F('title', 'Title'), F('body', 'Details', 'textarea'), F('date', 'Date / deadline (optional)'), F('buttonLabel', 'Button label (optional)'), F('buttonUrl', 'Button link', 'url'), IMG] })] },
    events:        { name: 'Events', icon: '&#127881;', fields: [F('heading', 'Section heading'), F('items', 'Events', 'items', { itemLabel: 'Event', sub: [F('name', 'Event name'), F('date', 'Date', 'date'), F('start', 'Start time', 'time'), F('end', 'End time', 'time'), F('location', 'Location'), F('description', 'Description', 'textarea'), F('rsvpUrl', 'RSVP / info link', 'url'), F('cta', 'Button label'), IMG] })] },
    reminders:     { name: 'Resident Reminders', icon: '&#128276;', fields: [F('heading', 'Section heading'), F('items', 'Reminders', 'items', { itemLabel: 'Reminder', sub: [F('icon', 'Icon (emoji)'), F('title', 'Title'), F('body', 'Details', 'textarea')] })] },
    maintenance:   { name: 'Maintenance & Service Requests', icon: '&#128295;', fields: [F('heading', 'Heading'), F('body', 'How to submit', 'textarea'), F('emergency', 'Emergency maintenance instructions', 'textarea'), F('cta', 'Button label'), F('portalUrl', 'Resident Portal link', 'url')] },
    spotlight:     { name: 'ResLife Spotlight', icon: '&#11088;', fields: [F('heading', 'Section heading'), F('name', 'Name'), F('role', 'Role'), F('headline', 'Headline'), F('body', 'Short description', 'textarea'), F('photo', 'Photo', 'image')] },
    occ:           { name: 'OCC Campus Connection', icon: '&#127891;', fields: [F('heading', 'Section heading'), F('intro', 'Intro (optional)', 'textarea'), F('items', 'Campus items', 'items', { itemLabel: 'Campus item', sub: [F('heading', 'Heading'), F('description', 'Description', 'textarea'), F('url', 'Link', 'url'), F('cta', 'Button label')] })] },
    resource:      { name: 'Community Resource of the Month', icon: '&#128161;', fields: [F('heading', 'Section heading'), F('title', 'Resource title'), F('category', 'Category', 'select', { options: ['Academic', 'Mental Health', 'Financial', 'Food', 'Transportation', 'Career', 'Safety', 'Health', 'Student Life'] }), F('description', 'Description', 'textarea'), F('website', 'Website', 'url'), F('phone', 'Phone'), F('cta', 'Button label'), IMG] },
    quicklinks:    { name: 'Quick Links', icon: '&#128279;', fields: [F('heading', 'Section heading'), F('items', 'Links', 'items', { itemLabel: 'Link', sub: [F('label', 'Label'), F('url', 'Link', 'url')] })] },
    social:        { name: 'Follow The Harbour', icon: '&#128247;', fields: [F('heading', 'Heading'), F('body', 'Message', 'textarea'), F('instagram', 'Instagram URL', 'url'), F('facebook', 'Facebook URL', 'url'), F('tiktok', 'TikTok URL', 'url'), F('website', 'Website', 'url')] },
    footer:        { name: 'Contact / Footer', icon: '&#9993;', fields: [F('tagline', 'Tagline'), F('name', 'Property name'), F('address', 'Address'), F('phone', 'Phone'), F('email', 'Email'), F('website', 'Website', 'url'), F('hours', 'Office hours', 'textarea'), F('disclaimer', 'Footer note (optional)', 'textarea')] },
    imageText:     { name: 'Image + Text', icon: '&#9635;', fields: [F('heading', 'Heading'), F('body', 'Text', 'textarea'), F('buttonLabel', 'Button label'), F('buttonUrl', 'Button link', 'url'), IMG] },
    fullImage:     { name: 'Full Width Image', icon: '&#127748;', fields: [IMG] },
    ctaBanner:     { name: 'CTA Banner', icon: '&#10148;', fields: [F('heading', 'Heading'), F('body', 'Text', 'textarea'), F('buttonLabel', 'Button label'), F('buttonUrl', 'Button link', 'url')] },
    divider:       { name: 'Divider', icon: '&#8213;', fields: [] },
    custom:        { name: 'Custom Text', icon: '&#9998;', fields: [F('heading', 'Heading (optional)'), F('body', 'Text', 'textarea')] },
  };

  // Section library (what "Add Section" offers) → type + starter content
  NL.LIBRARY = [
    ['Announcement', 'announcements', { heading: 'Important This Month', items: [{ title: 'New announcement', body: '' }] }],
    ['Important Deadline', 'announcements', { heading: 'Important Deadline', items: [{ title: '[[What’s due]]', date: '[[Deadline]]', body: '' }] }],
    ['Event', 'events', { heading: 'What’s Happening at The Harbour', items: [{ name: 'New event', cta: 'RSVP / Learn More' }] }],
    ['Resident Reminder', 'reminders', { heading: 'Resident Reminders', items: [{ icon: '&#10004;', title: 'Reminder', body: '' }] }],
    ['Staff Spotlight', 'spotlight', { heading: 'Meet Your ResLife Team' }],
    ['Resident Spotlight', 'spotlight', { heading: 'Resident Spotlight' }],
    ['Maintenance Notice', 'announcements', { heading: 'Maintenance Notice', items: [{ title: '[[Notice title]]', body: '[[Dates, affected units and what residents should do]]' }] }],
    ['Community Standard Reminder', 'reminders', { heading: 'Community Standards', items: [{ icon: '&#129309;', title: 'Be a great neighbor', body: '[[Reminder details]]' }] }],
    ['Safety Information', 'announcements', { heading: 'Safety First', items: [{ title: '[[Safety topic]]', body: 'In an emergency, call 911.' }] }],
    ['OCC Campus Resource', 'occ', { heading: 'OCC Campus Connection', items: [{ heading: 'Resource', cta: 'Learn More' }] }],
    ['Featured Resource', 'resource', { heading: 'Community Resource of the Month', cta: 'Learn More' }],
    ['Quick Links', 'quicklinks', null],
    ['Social Media', 'social', null],
    ['Image + Text', 'imageText', { heading: 'Heading', body: '' }],
    ['Full Width Image', 'fullImage', {}],
    ['CTA Banner', 'ctaBanner', { heading: 'Don’t miss it!', buttonLabel: 'Learn More' }],
    ['Divider', 'divider', {}],
    ['Custom Text', 'custom', { heading: '', body: '' }],
  ];

  // ── Default Harbour template ──
  NL.defaults = function (month, year) {
    const E = CS.cfg.email, f = E.footer, res = CS.cfg.resources || [];
    const link = t => (res.find(r => r.title === t) || {}).url || '';
    const mk = (type, content, visible) => ({ id: uid(), type, visible: visible !== false, collapsed: false, content });
    return [
      mk('header', { eyebrow: 'THE HARBOUR AT OCC', title: 'RESIDENT NEWSLETTER', monthLabel: `${MONTHS[month - 1].toUpperCase()} ${year}`, heroImage: { src: location.origin + '/properties/harbour-occ/photos/rooftop-terrace-0235.webp', alt: 'The Harbour at OCC rooftop terrace', link: E.siteUrl } }),
      mk('welcome', { heading: 'Hello, Harbour Residents!', body: `Welcome to ${MONTHS[month - 1]}! Here’s what’s happening at The Harbour and around Orange Coast College this month — events, reminders and resources to help you make the most of your home.` }),
      mk('announcements', { heading: 'Important This Month', items: [{ title: '[[Announcement title]]', body: '[[Share an office notice, deadline or community update.]]', date: '', buttonLabel: '', buttonUrl: '' }] }),
      mk('events', { heading: 'What’s Happening at The Harbour', items: [{ name: '[[Event name]]', date: '', start: '19:00', end: '21:00', location: '[[Location]]', description: '[[Short event description]]', rsvpUrl: '', cta: 'RSVP / Learn More' }] }),
      mk('reminders', { heading: 'Resident Reminders', items: [{ icon: '&#128230;', title: 'Package pickup', body: '[[Package room hours and pickup instructions]]' }, { icon: '&#129309;', title: 'Community standards', body: 'Please be mindful of noise and keep shared spaces clean for everyone.' }, { icon: '&#128465;', title: 'Trash & recycling', body: '[[Trash procedures]]' }] }),
      mk('maintenance', { heading: 'Maintenance & Service Requests', body: 'Something not working? Submit a service request through the resident portal and our team will take care of it.', emergency: '[[Emergency maintenance instructions — e.g. call the office after hours]]', cta: 'Submit a Service Request', portalUrl: E.portalUrl }),
      mk('spotlight', { heading: 'ResLife Spotlight', name: '', role: '', headline: '', body: '', photo: null }, false),
      mk('occ', { heading: 'OCC Campus Connection', intro: '', items: [{ heading: 'Tutoring Services', description: 'Free tutoring for OCC students.', url: link('Tutoring Services'), cta: 'Get Help' }, { heading: 'Student Employment', description: 'Find on-campus jobs that fit your class schedule.', url: link('On-Campus Student Employment'), cta: 'View Jobs' }, { heading: 'Mental Health Care', description: 'Support from the OCC Student Health Center.', url: link('Mental Health Care'), cta: 'Learn More' }] }),
      mk('resource', { heading: 'Community Resource of the Month', title: 'OCC Basic Needs Center', category: 'Food', description: 'Food and basic-needs support for OCC students.', website: link('OCC Basic Needs Center (food pantry)'), phone: '', cta: 'Learn More', image: null }, false),
      mk('quicklinks', { heading: 'Quick Links', items: [{ label: 'Resident Portal', url: E.portalUrl }, { label: 'Submit a Service Request', url: E.portalUrl }, { label: 'The Harbour Website', url: E.siteUrl }, { label: 'OCC Website', url: 'https://orangecoastcollege.edu/' }, { label: 'Contact The Harbour', url: 'https://theharbourocc.com/contact-us/' }] }),
      mk('social', { heading: 'Follow The Harbour', body: 'Stay in the loop on events, giveaways and community news.', instagram: '', facebook: '', tiktok: '', website: E.siteUrl }),
      mk('footer', { tagline: 'Questions? Our team is here to help.', name: f.name, address: '1369 Adams Avenue, Costa Mesa, CA', phone: f.phone, email: f.email, website: E.siteUrl, hours: '[[Office hours]]', disclaimer: 'You are receiving this email because you are a resident of The Harbour at OCC.' }),
    ];
  };
  NL.newSection = function (type, content) {
    const def = NL.defaults(new Date().getMonth() + 1, new Date().getFullYear()).find(s => s.type === type);
    return { id: uid(), type, visible: true, collapsed: false, content: JSON.parse(JSON.stringify(content || (def ? def.content : {}))) };
  };
  NL.uid = uid;

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
    const R = {
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
      reminders: (c, s) => row(s.id, h2(c.heading, 'Reminders') + `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${(c.items || []).map(i => `<tr><td width="44" valign="top" style="padding:0 0 14px;${P}font-size:24px;line-height:28px;">${i.icon || '&#10004;'}</td><td valign="top" style="padding:0 0 14px;"><div style="${P}font-size:16px;line-height:22px;font-weight:bold;color:${C.navy};">${esc(i.title)}</div><div style="${P}font-size:15px;line-height:23px;color:${C.text};">${txt(i.body)}</div></td></tr>`).join('')}</table>`),
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
      fullImage: (c, s) => c.image && c.image.src ? `<tr id="nl-${esc(s.id)}"><td style="padding:0;">${img(c.image).replace('max-width:588px', 'max-width:680px').replace('width="588"', 'width="680"')}</td></tr>` : '',
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
      if (s.type === 'header') { out.push(`${strip(c.eyebrow)} · ${strip(c.title)} · ${strip(c.monthLabel)}`, '='.repeat(40)); return; }
      if (s.type === 'divider') { out.push('-'.repeat(40)); return; }
      if (c.heading) out.push('', strip(c.heading).toUpperCase());
      ['body', 'intro', 'description'].forEach(k => c[k] && out.push(strip(c[k])));
      if (s.type === 'maintenance' && c.emergency) out.push('Emergency: ' + strip(c.emergency));
      if (s.type === 'spotlight') line(c.name, c.role, c.headline);
      if (s.type === 'resource') line(c.title, c.website, c.phone);
      (c.items || []).forEach(i => {
        if (s.type === 'events') line(`• ${strip(i.name)}`, dLong(i.date), [t12(i.start), t12(i.end)].filter(Boolean).join('–'), i.location, i.rsvpUrl);
        else if (s.type === 'quicklinks') line(`• ${strip(i.label)}`, i.url);
        else line(`• ${strip(i.title || i.heading)}`, i.date, i.body || i.description, i.buttonUrl || i.url);
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
      if (/\.webp(\?|$)/i.test(src)) issues.push('A WebP image may not show in Outlook desktop — upload a JPG/PNG version for best results.');
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
