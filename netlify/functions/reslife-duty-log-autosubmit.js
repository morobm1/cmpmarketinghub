import { getDb } from './_db.js';
import { notifyDutyLog, managersForReslifeProperty } from './_reslife.js';

/**
 * Duty Log — Auto-Submit + Missed-Log Detection (scheduled, no user context)
 *
 * Runs every 5 minutes (Netlify scheduled function, UTC cron) and, for each
 * property, checks whether it is currently between 11:55 PM and 11:59 PM in
 * THAT property's own local timezone (config.timezone, set per-property in
 * the Duty Log Settings panel — see reslife-duty-log.js DEFAULT_CONFIG). This
 * avoids the classic "server runs in UTC" bug: a fixed UTC cron time would
 * fire at the wrong local hour for properties outside one timezone.
 *
 * When a property's local clock enters that end-of-day window (and hasn't
 * already been processed today — tracked via `lastAutosubmitRunDate` on its
 * reslife_duty_config doc, so re-running every 5 minutes doesn't double-fire):
 *
 *   1. Any Duty Log still in `draft`/`reopened` status for today is force-
 *      submitted (`auto_submitted: true`), and BOTH the owning RA and every
 *      REC/Admin for the property get a private in-app notification — never
 *      visible to other RAs (see reslife-duty-log-notifications.js).
 *   2. Any RA with a roster shift starting today (reslife_roster) who never
 *      even started a session gets a separate "missed log" notification,
 *      also copied to REC/Admin.
 *
 * Best-effort automation: if Netlify's scheduler has an outage spanning the
 * entire 11:55-11:59 PM local window for a property on a given day, that
 * day's sessions simply remain open (same as if this function didn't exist)
 * until an RA submits manually or a REC/Admin catches it — there is no
 * cross-day catch-up, since "today" rolls over the moment local midnight
 * passes and yesterday's still-open sessions are no longer "today" for the
 * missed-log/roster comparison.
 */
export const config = {
  schedule: '*/5 * * * *',
};

const DEFAULT_TIMEZONE = 'America/New_York';

function getLocalParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const parts = {};
  dtf.formatToParts(date).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0; // some ICU implementations report midnight as "24" with hour12:false
  return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, hour, minute: parseInt(parts.minute, 10) };
}

// The local calendar date a roster shift STARTS on, in the property's timezone.
function localDateOf(isoString, timeZone) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return getLocalParts(d, timeZone).dateStr;
}

export async function handler() {
  const db = await getDb();
  const properties = await db.collection('properties').find({}).toArray();
  const cfgCol = db.collection('reslife_duty_config');
  const sessionsCol = db.collection('reslife_duty_sessions');

  const now = new Date();
  const results = [];

  for (const prop of properties) {
    const property = prop.name;
    if (!property) continue;

    try {
      const cfgDoc = await cfgCol.findOne({ property });
      const timezone = (cfgDoc && cfgDoc.config && cfgDoc.config.timezone) || DEFAULT_TIMEZONE;
      const local = getLocalParts(now, timezone);
      const inWindow = local.hour === 23 && local.minute >= 55;
      if (!inWindow) continue;
      if (cfgDoc && cfgDoc.lastAutosubmitRunDate === local.dateStr) continue; // already processed tonight

      const todayLocalDate = local.dateStr;
      const nowIso = now.toISOString();
      const managerUsernames = await managersForReslifeProperty(db, property);

      // 1) Force-submit anything still open for today.
      const openSessions = await sessionsCol.find({ property, duty_date: todayLocalDate, status: { $in: ['draft', 'reopened'] } }).toArray();
      for (const s of openSessions) {
        await sessionsCol.updateOne({ _id: s._id }, { $set: {
          status: 'submitted', submitted_at: nowIso, submitted_by_username: null,
          auto_submitted: true, updated_at: nowIso,
        } });
        const shiftMembers = [...new Set([s.primary_ra_username, s.duty_partner_username, ...(s.collaborators || [])].filter(Boolean))];
        if (shiftMembers.length) {
          await notifyDutyLog(
            db, property, shiftMembers, 'auto_submitted',
            'Duty Log auto-submitted',
            `The ${s.shift_label ? s.shift_label + ' ' : ''}${todayLocalDate} Duty Log was still in progress at 11:59 PM and was automatically submitted for you. If you still need to add or fix something, use "Request Edit" to ask your REC/Admin to unlock it.`,
            { sessionId: s._id.toString(), dutyDate: todayLocalDate }
          );
        }
        if (managerUsernames.length) {
          await notifyDutyLog(
            db, property, managerUsernames, 'auto_submitted_manager',
            'Duty Log auto-submitted',
            `${shiftMembers.join(' & ') || 'A Duty RA'}'s ${s.shift_label ? s.shift_label + ' ' : ''}${todayLocalDate} Duty Log was still in progress at 11:59 PM and was auto-submitted.`,
            { sessionId: s._id.toString(), dutyDate: todayLocalDate }
          );
        }
      }

      // 2) Published on-call shifts today (Schedule & On-Call) with no Duty Log at all -> "missed log".
      const schedSettings = await db.collection('sched_settings').findOne({ property });
      const onCallTypes = ((schedSettings && schedSettings.shiftTypes) || []).filter(t => t.level === 1).map(t => t.id);
      const shiftsToday = onCallTypes.length ? await db.collection('sched_shifts').find({ property, published: true, status: { $ne: 'cancelled' }, date: todayLocalDate, typeId: { $in: onCallTypes } }).toArray() : [];
      const todaySessions = await sessionsCol.find({ property, duty_date: todayLocalDate }, { projection: { shift_key: 1, primary_ra_username: 1, duty_partner_username: 1, collaborators: 1 } }).toArray();
      let missedRAs = [];
      for (const sh of shiftsToday) {
        const people = [sh.assignedUser, sh.backupUser].filter(Boolean);
        const logged = todaySessions.some(s => s.shift_key === 'sched:' + sh._id.toString() || people.some(p => [s.primary_ra_username, s.duty_partner_username, ...(s.collaborators || [])].includes(p)));
        if (logged || !people.length) continue;
        missedRAs.push(...people);
        await notifyDutyLog(db, property, people, 'missed_log', 'Duty Log not submitted', `You were on ${sh.start}–${sh.end} duty on ${todayLocalDate}, but no Duty Log was started or submitted.`, { dutyDate: todayLocalDate });
      }
      missedRAs = [...new Set(missedRAs)];
      if (missedRAs.length && managerUsernames.length) {
        await notifyDutyLog(db, property, managerUsernames, 'missed_log_manager', 'Duty Log not submitted', `${missedRAs.join(', ')} ${missedRAs.length === 1 ? 'was' : 'were'} on duty ${todayLocalDate} but no Duty Log was started or submitted.`, { dutyDate: todayLocalDate });
      }

      await cfgCol.updateOne({ property }, { $set: { property, lastAutosubmitRunDate: todayLocalDate } }, { upsert: true });
      results.push({ property, timezone, autoSubmitted: openSessions.length, missed: missedRAs.length });
    } catch (e) {
      console.error('[DutyLogAutosubmit] property failed:', property, e && e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, ranAt: now.toISOString(), results }) };
}
