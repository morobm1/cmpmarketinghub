/**
 * Schedule & On-Call — shared model helpers.
 *
 * Collections (all scoped by property NAME, like every reslife_* collection):
 *   sched_settings      { property, shiftTypes[], publishedThrough, requireConfirmation, swapNeedsApproval,
 *                         giveawayKeepsResponsible, reminders[], dutyPhone, emergencyContact, publications[], migratedRoster }
 *   sched_shifts        { property, typeId, date, start, end, crossesMidnight, startAt, endAt, assignedUser, backupUser,
 *                         status, published, notes, location, openDeadline, eligibleRoles, remindersSent[], legacy* }
 *   sched_availability  { property, user, kind:'weekly'|'date'|'timeoff', weekday, date, endDate, status, from, to, reason,
 *                         approval:'approved'|'pending'|'denied', comment }
 *   sched_requests      { property, shiftId, type:'giveaway'|'swap'|'pickup', from, to, status, reason, history[] }
 *   sched_staff         { property, username, title, phone, eligibleTypes[], maxShifts, active }
 *   sched_confirmations { property, publicationId, user, confirmedAt }
 *   sched_handoffs      { property, shiftId, from, to, notes, createdAt }
 *   sched_audit         { property, at, by, action, shiftId, details }
 */
export const TZ = 'America/Los_Angeles';

// Design tokens for shift colors — the UI maps these names to CSS variables.
export const COLOR_TOKENS = ['orange', 'navy', 'sky', 'teal', 'violet', 'rose', 'amber', 'slate'];

export const DEFAULT_SHIFT_TYPES = [
  { id: 'primary-on-call',   name: 'Primary On Call',   color: 'orange', start: '18:00', end: '08:00', level: 1, minStaff: 1, roles: ['reslife-ra', 'reslife-rec'], instructions: 'Carry the duty phone. Complete evening rounds. Document every call in the Duty Log. Escalate emergencies to the Secondary On Call.' },
  { id: 'secondary-on-call', name: 'Secondary On Call', color: 'navy',   start: '18:00', end: '08:00', level: 2, minStaff: 1, roles: ['reslife-rec', 'reslife-admin'], instructions: 'Backup for the Primary On Call. Respond to escalations and emergencies.' },
  { id: 'weekend-duty',      name: 'Weekend Duty',      color: 'teal',   start: '10:00', end: '18:00', level: 0, minStaff: 1, roles: ['reslife-ra', 'reslife-rec'], instructions: 'Daytime weekend coverage and community rounds.' },
  { id: 'event-coverage',    name: 'Event Coverage',    color: 'violet', start: '18:00', end: '22:00', level: 0, minStaff: 1, roles: [], instructions: 'Staff the event, check residents in and help with setup/cleanup.' },
  { id: 'move-in-coverage',  name: 'Move-In Coverage',  color: 'sky',    start: '08:00', end: '17:00', level: 0, minStaff: 2, roles: [], instructions: 'Welcome residents, hand out keys/fobs and answer questions.' },
];

const pad = n => String(n).padStart(2, '0');
export function localParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(date).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
export function localToUtc(y, m, d, h, min) {
  const guess = Date.UTC(y, m - 1, d, h, min || 0);
  const lp = localParts(new Date(guess));
  const asIf = Date.UTC(lp.y, lp.m - 1, lp.d, lp.h, lp.min);
  return new Date(guess - (asIf - guess));
}
export const todayLocal = () => { const p = localParts(new Date()); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00Z'));
export const validTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
export function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export const weekdayOf = dateStr => new Date(dateStr + 'T12:00:00Z').getUTCDay();

/** Compute absolute instants for a local date + times. End <= start means the shift crosses midnight. */
export function shiftInstants(date, start, end) {
  const [y, m, d] = date.split('-').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const crossesMidnight = (eh * 60 + em) <= (sh * 60 + sm);
  const startAt = localToUtc(y, m, d, sh, sm);
  const endAt = localToUtc(y, m, d + (crossesMidnight ? 1 : 0), eh, em);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString(), crossesMidnight };
}

export const overlaps = (a, b) => a.startAt < b.endAt && b.startAt < a.endAt;

/** Availability verdict for one user and one shift: 'available' | 'preferred' | 'unavailable' (+ reason). */
export function availabilityFor(user, shift, avail) {
  const mine = avail.filter(a => a.user === user);
  const dayOff = mine.find(a => (a.kind === 'date' && a.date === shift.date && a.status === 'unavailable') ||
    (a.kind === 'timeoff' && a.approval === 'approved' && a.date <= shift.date && (a.endDate || a.date) >= shift.date));
  if (dayOff) return { status: 'unavailable', reason: dayOff.reason || (dayOff.kind === 'timeoff' ? 'Approved time off' : 'Marked unavailable') };
  const pref = mine.find(a => a.kind === 'date' && a.date === shift.date && a.status === 'preferred');
  if (pref) return { status: 'preferred', reason: pref.reason || 'Preferred date' };
  const wd = weekdayOf(shift.date);
  const rules = mine.filter(a => a.kind === 'weekly' && +a.weekday === wd);
  for (const r of rules) {
    const inWindow = (!r.from || shift.start >= r.from) && (!r.to || shift.start < r.to);
    if (inWindow && r.status === 'unavailable') return { status: 'unavailable', reason: `Weekly: unavailable${r.from ? ' after ' + r.from : ''}${r.to ? ' before ' + r.to : ''}` };
    if (inWindow && r.status === 'preferred') return { status: 'preferred', reason: 'Weekly preference' };
  }
  return { status: 'available', reason: '' };
}

export const isWeekend = dateStr => { const d = weekdayOf(dateStr); return d === 5 || d === 6; }; // Fri/Sat nights
