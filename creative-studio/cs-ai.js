/* Creative Studio — AI assistant.
   Tries the server (/api/reslife-creative-ai). If no provider is configured, a built-in
   rule-based writer keeps everything working offline. Both are constrained to the property
   config: verified facts only, brand terminology, [[placeholders]] for unknowns. */
(function (CS) {
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function propertyContext() {
    const cfg = CS.cfg;
    const facts = [];
    Object.entries(cfg.info).forEach(([cat, items]) => items.forEach(i => { if (i.fact) facts.push(`${cat}: ${i.fact}`); if (i.q) facts.push(`FAQ: ${i.q} ${i.a}`); }));
    return { name: cfg.name, institution: cfg.institution, city: `${cfg.city}, ${cfg.state}`, voice: cfg.voice.default, terminology: cfg.terminology.prefer, facts };
  }

  async function server(payload) {
    try {
      const r = await CS.api('/reslife-creative-ai', { method: 'POST', body: JSON.stringify(Object.assign({ propertyContext: propertyContext(), today: new Date().toISOString().slice(0, 10) }, payload)) });
      return r && r.ok ? r.result : null;
    } catch (e) { return null; }
  }

  // Apply brand terminology (License Agreement, Resident, The Harbour …).
  function brandTerms(s) {
    let out = String(s || '');
    (CS.cfg.terminology.replace || []).forEach(r => { out = out.replace(r.avoid, m => (m[0] === m[0].toUpperCase() ? r.use : r.use.toLowerCase().replace('license agreement', 'License Agreement'))); });
    return out.replace(/License Agreement Agreement/g, 'License Agreement');
  }
  CS.brandTerms = brandTerms;

  // ───────── Local parser for prompts like "game night next Thursday at 7 PM in the community room" ─────────
  function parseDate(text) {
    const t = text.toLowerCase(); const now = new Date();
    const fmt = d => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (/\btoday\b|\btonight\b/.test(t)) return fmt(now);
    if (/\btomorrow\b/.test(t)) return fmt(new Date(now.getTime() + 864e5));
    const dm = t.match(/\b(next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (dm) {
      let diff = (DAYS.indexOf(dm[2]) - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      if (dm[1] && dm[1].trim() === 'next' && diff < 7 && (DAYS.indexOf(dm[2]) - now.getDay()) <= 0) diff += 0;
      return fmt(new Date(now.getTime() + diff * 864e5));
    }
    const md = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/);
    if (md) { const d = new Date(now.getFullYear(), MONTHS.indexOf(md[1]), +md[2]); if (d < now) d.setFullYear(d.getFullYear() + 1); return fmt(d); }
    const sl = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (sl) { const d = new Date(now.getFullYear(), +sl[1] - 1, +sl[2]); return fmt(d); }
    return '';
  }
  function parseTime(text) {
    const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b(?:\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
    if (!m) return /\bnoon\b/i.test(text) ? '12:00 PM' : '';
    const one = (h, mm, ap) => `${+h}:${mm || '00'} ${ap.replace(/\./g, '').toUpperCase()}`;
    return m[4] ? `${one(m[1], m[2], m[3])} – ${one(m[4], m[5], m[6] || m[3])}` : one(m[1], m[2], m[3]);
  }
  function parseLocation(text) {
    const re = /\b(?:in|at)\s+(?:the\s+)?([a-z][a-z0-9' \-]*?)(?=\s+(?:on|at|next|this|from|for|with|in)\b|[.,!]|$)/gi;
    let m;
    while ((m = re.exec(text))) {
      const loc = m[1].trim();
      if (loc.length >= 3 && !/^(am|pm|noon|night)$/i.test(loc)) return loc.replace(/\b\w/g, c => c.toUpperCase());
    }
    return '';
  }

  const EVENT_KINDS = [
    [/game night|board game|trivia/i, 'Game Night', 'Games, snacks & friendly competition', 'Bring a friend or make a new one — snacks provided!'],
    [/movie/i, 'Movie Night', 'Popcorn’s on us', 'Grab a seat and enjoy a movie with your neighbors.'],
    [/craft|paint|diy/i, 'Craft Night', 'Get creative with your community', 'All supplies provided. No experience needed!'],
    [/study|finals|midterm/i, 'Study Night', 'Focus together. Finish strong.', 'Quiet space, snacks and coffee to power you through.'],
    [/pizza|taco|food|bbq|breakfast|ice cream|snack/i, 'Free Food', 'Come hungry', 'Stop by for food and good company — while supplies last.'],
    [/wellness|yoga|self[- ]care|mental/i, 'Wellness Event', 'Recharge your mind and body', 'Join ResLife for activities focused on stress relief and self-care.'],
    [/meeting|town hall/i, 'Resident Meeting', 'Your community, your voice', 'Get updates, share ideas and meet your ResLife team.'],
    [/mixer|social|meet/i, 'Social Mixer', 'Meet your neighbors', 'Music, snacks and icebreakers with your community.'],
  ];

  function localGenerate(req, audience, format) {
    const text = String(req || '');
    const isMaint = /maintenance|entry|water shut|repair/i.test(text);
    const isEmerg = /emergency|evacuat|fire|outage|lockdown/i.test(text);
    const isParent = audience === 'parents' || /parent|guardian|family/i.test(text);
    const date = parseDate(text), time = parseTime(text), location = parseLocation(text);
    let kind = EVENT_KINDS.find(k => k[0].test(text));
    let out;
    if (isEmerg) {
      out = { layout: 'notice', headline: 'Important Safety Notice', subheadline: 'STAFF: verify all details before posting', body: '[[Clear, factual description]]\n[[What residents should do]]\nIn an emergency, call 911.', notes: 'Emergency content — verify before sending.' };
    } else if (isMaint) {
      out = { layout: 'notice', headline: 'Maintenance Notice', subheadline: 'Planned work in your building', body: 'Our team will be completing scheduled maintenance. Please secure pets and valuables.', contact: '[[Office contact]]' };
    } else if (isParent) {
      out = { layout: 'parent', headline: 'A Guide for Parents & Guardians', subheadline: `Supporting your student at ${CS.cfg.institution}`, body: 'Steps From Class: Less commuting, more time for learning.\nStudent Support: ResLife programming builds community and belonging.\nFurnished Living: Students bring linens and cookware.\nFinancial Clarity: Review the License Agreement together.' };
    } else if (kind || date || time) {
      kind = kind || [null, cleanTitle(text) || 'Community Event', 'Join your neighbors', 'Come hang out with the ResLife team and your community.'];
      out = { layout: 'event', headline: kind[1], subheadline: kind[2], body: kind[3], cta: 'All residents welcome' };
    } else {
      out = { layout: 'guide', headline: cleanTitle(text) || 'Resident Update', subheadline: `From your ${CS.cfg.shortName} ResLife team`, body: '- [[Key point 1]]\n- [[Key point 2]]\n- [[Key point 3]]' };
    }
    Object.assign(out, { date: out.date || date || (out.layout === 'event' ? '[[Date]]' : ''), time: out.time || time || (out.layout === 'event' ? '[[Time]]' : ''), location: out.location || location || (out.layout === 'event' ? '[[Location]]' : '') });
    if (format === 'post' || format === 'story' || format === 'sign') out.subheadline = [out.date, out.time, out.location].filter(Boolean).join(' • ') || out.subheadline;
    return out;
  }
  function cleanTitle(text) {
    const t = text.replace(/^(please\s+)?(make|create|design|build|write)\s+(me\s+)?(a|an)?\s*/i, '').replace(/\b(flyer|poster|post|sign|email|for|about)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const words = t.split(' ').slice(0, 5).join(' ');
    return words ? words.replace(/\b\w/g, c => c.toUpperCase()) : '';
  }

  // ───────── Local rewrite actions for design fields ─────────
  function localRewrite(c, action) {
    const o = Object.assign({}, c);
    const sentences = s => String(s || '').split(/(?<=[.!?])\s+/).filter(Boolean);
    switch (action) {
      case 'Make Shorter': {
        o.headline = o.headline.split(' ').slice(0, 5).join(' ');
        const lines = o.body.split('\n').filter(Boolean);
        o.body = lines.length > 1 ? lines.slice(0, Math.max(3, Math.ceil(lines.length / 2))).join('\n') : sentences(o.body).slice(0, 1).join(' ');
        o.subheadline = o.subheadline.split(' ').slice(0, 7).join(' ');
        break;
      }
      case 'Make Friendlier': o.subheadline = o.subheadline || 'We’d love to see you there'; o.body = o.body.replace(/\bPlease\b/g, 'Please').replace(/\.$/, ' — we can’t wait to see you!'); o.cta = o.cta || 'Everyone’s welcome'; break;
      case 'Make More Professional': ['headline', 'subheadline', 'body', 'cta'].forEach(k => { o[k] = String(o[k] || '').replace(/!+/g, '.').replace(/\s?[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\bgonna\b/gi, 'going to'); }); o.headline = o.headline.replace(/\.$/, ''); break;
      case 'Make More Exciting': o.headline = o.headline.replace(/[.!]*$/, '!'); o.subheadline = o.subheadline || 'You don’t want to miss this'; o.cta = o.cta || 'Don’t miss it!'; break;
      case 'Resident Focused': o.subheadline = o.subheadline || `For ${CS.cfg.shortName} residents`; o.cta = o.cta || 'All residents welcome'; break;
      case 'Parent Focused': o.layout = 'parent'; o.subheadline = 'For parents and guardians'; o.body = (localGenerate('parent', 'parents').body); break;
      case 'Make It More Harbour': o.subheadline = o.subheadline || `${CS.cfg.shortName} · ${CS.cfg.institution}`; o.footer = CS.cfg.defaults.footer; o.cta = o.cta || 'See you on the coast'; ['headline', 'subheadline', 'body', 'cta'].forEach(k => o[k] = brandTerms(o[k])); break;
      case 'Fix Grammar': ['headline', 'subheadline', 'body', 'cta'].forEach(k => { o[k] = brandTerms(String(o[k] || '').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I')); }); break;
    }
    return o;
  }

  // Convert design or text content into another channel.
  function localConvert(c, channel) {
    const when = [c.date, c.time].filter(Boolean).join(' at ');
    const where = c.location ? ` in the ${c.location}` : '';
    const name = CS.cfg.shortName.replace(/^The /, '');
    const plain = String(c.body || '').replace(/^[-•]\s+/gm, '• ');
    if (channel === 'sms') {
      let s = `${name}: ${c.headline}${when ? ' ' + when : ''}${where}! ${c.cta || ''}`.replace(/\s+/g, ' ').trim();
      if (s.length > 160) s = s.slice(0, 157) + '…';
      return { channel, body: s };
    }
    if (channel === 'social') {
      return { channel, graphicCopy: c.headline + (when ? `\n${when}` : ''), body: `${c.headline}${when ? ' — ' + when : ''}${where}. ${c.subheadline ? c.subheadline + '. ' : ''}${c.cta || ''}`.replace(/\s+/g, ' ').trim(), hashtags: CS.cfg.defaults.hashtags.slice(0, 4).join(' ') };
    }
    return { channel: 'email', subject: `${c.headline}${c.date ? ' — ' + c.date : ''}`, body: `Hi ${CS.cfg.shortName} residents,\n\n${c.subheadline ? c.subheadline + '.\n\n' : ''}${plain}\n\n${c.date ? 'Date: ' + c.date + '\n' : ''}${c.time ? 'Time: ' + c.time + '\n' : ''}${c.location ? 'Location: ' + c.location + '\n' : ''}\n${c.cta || ''}\n\n${CS.cfg.defaults.emailSignoff}\n${CS.cfg.website}`.replace(/\n{3,}/g, '\n\n') };
  }

  // ───────── Public API ─────────
  CS.aiGenerate = async function (request, audience, format) {
    const r = await server({ task: 'generate', request, audience, format });
    if (r && r.headline) return Object.assign({ layout: 'event' }, r, { _provider: 'ai' });
    return Object.assign(localGenerate(request, audience, format), { _provider: 'built-in' });
  };

  CS.aiRewriteFields = async function (content, action, format, audience) {
    if (/^Create (SMS|Email|Social)/.test(action)) {
      const ch = /SMS/.test(action) ? 'sms' : /Email/.test(action) ? 'email' : 'social';
      const r = await server({ task: 'rewrite', action, content, format: ch, audience });
      if (r) return { convert: ch, body: ch === 'sms' ? r.sms : ch === 'email' ? r.emailBody : r.caption, subject: r.emailSubject, graphicCopy: r.headline, hashtags: r.hashtags };
      const l = localConvert(content, ch);
      return { convert: ch, body: l.body, subject: l.subject, graphicCopy: l.graphicCopy, hashtags: l.hashtags };
    }
    const r = await server({ task: 'rewrite', action, content, format, audience });
    if (r && r.headline) { const o = Object.assign({}, content); ['headline', 'subheadline', 'body', 'cta', 'date', 'time', 'location'].forEach(k => { if (r[k]) o[k] = r[k]; }); if (r.layout && action === 'Parent Focused') o.layout = r.layout; return o; }
    return localRewrite(content, action);
  };

  CS.aiRewriteText = async function (text, action, channel, subject) {
    if (/^Create (SMS|Email|Social)/.test(action)) {
      const ch = /SMS/.test(action) ? 'sms' : /Email/.test(action) ? 'email' : 'social';
      const lines = String(text).split('\n').filter(Boolean);
      const c = { headline: subject || lines[0] || 'Update', subheadline: '', body: lines.slice(subject ? 0 : 1).join('\n'), cta: '' };
      const r = await server({ task: 'rewrite', action, content: c, format: ch });
      if (r) return { channel: ch, body: ch === 'sms' ? r.sms : ch === 'email' ? r.emailBody : r.caption, subject: r.emailSubject, graphicCopy: r.headline, hashtags: r.hashtags };
      return localConvert(c, ch);
    }
    const r = await server({ task: 'rewrite', action, content: { body: text, subject }, format: channel });
    if (r && (r.emailBody || r.body || r.sms || r.caption)) return { body: channel === 'sms' ? (r.sms || r.body) : channel === 'social' ? (r.caption || r.body) : (r.emailBody || r.body), subject: r.emailSubject };
    // Built-in text transforms
    let b = String(text);
    if (action === 'Make Shorter') { const paras = b.split(/\n\n+/); b = paras.length > 3 ? [paras[0], ...paras.slice(1, -1).slice(0, 2), paras[paras.length - 1]].join('\n\n') : b.split(/(?<=[.!?])\s+/).slice(0, 3).join(' '); if (channel === 'sms' && b.length > 160) b = b.slice(0, 157) + '…'; }
    if (action === 'Make More Professional') b = b.replace(/!+/g, '.').replace(/\s?[\u{1F300}-\u{1FAFF}]/gu, '');
    if (action === 'Make More Exciting') b = b.replace(/\.(\s|$)/, '!$1');
    if (action === 'Make Friendlier') b = b.replace(/^(Hello|Dear)\b/, 'Hi');
    if (action === 'Parent Focused') b = b.replace(/\bHi Harbour( residents)?,/i, 'Dear Parents and Guardians,').replace(/\byou\b/g, 'your student');
    if (action === 'Make It More Harbour' || action === 'Fix Grammar') b = brandTerms(b.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1'));
    return { body: b, subject };
  };

  // Home / communication "turn into a flyer" entry point.
  CS.aiCreateFromPrompt = async function (request, audience, format) {
    CS.toast('Creating your design…');
    format = format || (/\b(instagram|social|post)\b/i.test(request) ? 'post' : /\bstory\b/i.test(request) ? 'story' : /\b(digital sign|tv|screen)\b/i.test(request) ? 'sign' : /\b(door|notice)\b/i.test(request) ? 'notice' : 'letter');
    const r = await CS.aiGenerate(request, audience, format);
    const layout = format === 'notice' ? 'notice' : (r.layout || 'event');
    const photo = layout === 'event' ? 'rooftop-terrace' : layout === 'parent' ? 'occ-study' : layout === 'notice' ? '' : 'occ-walking';
    CS.openBuilder({
      name: r.headline || 'New design', format, layout, audience,
      content: { headline: r.headline || '', subheadline: r.subheadline || '', body: r.body || '', date: r.date || '', time: r.time || '', location: r.location || '', cta: r.cta || '', qr: '', contact: r.contact || '', photo, footer: '' },
      aiNote: r._provider === 'built-in' ? 'Drafted with the built-in writer. Review highlighted details.' : (r.notes || ''),
    });
  };
})(window.CS = window.CS || {});
