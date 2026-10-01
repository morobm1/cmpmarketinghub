import { getDb } from './_db.js';
import { notify } from './_notify.js';

/**
 * Scheduled (every 15 min, see netlify.toml): in-app reminders before published shifts.
 * Lead times come from each property's sched_settings.reminders (minutes, e.g. [1440, 120, 30]).
 * Each reminder is sent once per shift (tracked in shift.remindersSent). Email/SMS can hook in here later.
 */
export async function handler() {
  const db = await getDb();
  const now = Date.now();
  const all = await db.collection('sched_settings').find({}).toArray();
  let sent = 0;
  for (const s of all) {
    const leads = (s.reminders && s.reminders.length ? s.reminders : [1440, 120]).map(Number);
    const horizon = new Date(now + Math.max(...leads) * 60e3).toISOString();
    const shifts = await db.collection('sched_shifts').find({ property: s.property, published: true, status: 'assigned', startAt: { $gt: new Date(now).toISOString(), $lte: horizon } }).toArray();
    for (const sh of shifts) {
      const type = (s.shiftTypes || []).find(t => t.id === sh.typeId) || { name: 'Shift' };
      for (const lead of leads) {
        const due = new Date(sh.startAt).getTime() - lead * 60e3;
        if (now < due || (sh.remindersSent || []).includes(lead)) continue;
        const when = lead >= 1440 ? `in ${Math.round(lead / 1440)} day(s)` : lead >= 60 ? `in ${Math.round(lead / 60)} hour(s)` : `in ${lead} minutes`;
        await notify(db, { property: s.property, to: [sh.assignedUser, sh.backupUser].filter(Boolean), title: `Upcoming: ${type.name} ${when}`, message: `${sh.date} ${sh.start}–${sh.end}${sh.location ? ' · ' + sh.location : ''}`, type: 'schedule', link: 'roster', createdBy: 'scheduler' });
        await db.collection('sched_shifts').updateOne({ _id: sh._id }, { $addToSet: { remindersSent: lead } });
        sent++;
      }
    }
  }
  return { statusCode: 200, body: JSON.stringify({ sent }) };
}
