import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Collateral Meeting Records (Committee Meeting Minutes)
 * Modeled on the real biweekly committee agenda template: a Check-In /
 * track-based agenda plus an Action Items table (task, assigned to, due date),
 * plus attendance tracking and optional structured agenda sections
 * (Updates / Old Business / Current Projects / Upcoming Deadlines /
 * Decisions Needed / New Business / Action Items / Advisor Notes / Next
 * Steps) — the free-text `agenda` field remains for backward compatibility
 * with existing records.
 *
 * GET    ?property=X&committeeId=Y   - list minutes for a committee (any Reslife role + admin)
 * POST                                 - add a minutes entry (any Reslife role + admin)
 * PUT                                  - update an entry; author may edit their own,
 *                                        REC/Admin/site admin may edit any
 * DELETE ?id=X&property=Y            - delete; author may delete their own, REC/Admin/site admin any
 */
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Excused', 'Late', 'Not Recorded'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_committee_minutes');

  try {
    if (event.httpMethod === 'GET') {
      const { property, committeeId } = event.queryStringParameters || {};
      if (!property || !committeeId) return { statusCode: 400, body: 'Missing property/committeeId' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property, committeeId }).sort({ meetingDate: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, meetingDate, startTime, endTime, location, virtualLink, facilitator, agenda, agendaItems, actionItems, attendance, decisions, nextMeetingDate } = body;
      if (!property || !committeeId || !agenda) return { statusCode: 400, body: 'Missing property/committeeId/agenda' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId,
        meetingDate: meetingDate || now, startTime: startTime || '', endTime: endTime || '',
        location: location || '', virtualLink: virtualLink || '', facilitator: facilitator || '',
        agenda, agendaItems: Array.isArray(agendaItems) ? agendaItems : [],
        actionItems: Array.isArray(actionItems) ? actionItems : [],
        attendance: Array.isArray(attendance) ? attendance.filter(a => ATTENDANCE_STATUSES.includes(a.status)) : [],
        decisions: Array.isArray(decisions) ? decisions : [],
        nextMeetingDate: nextMeetingDate || '',
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      ['meetingDate', 'startTime', 'endTime', 'location', 'virtualLink', 'facilitator', 'agenda', 'nextMeetingDate'].forEach(f => {
        if (body[f] !== undefined) updates[f] = body[f];
      });
      if (body.agendaItems !== undefined) updates.agendaItems = Array.isArray(body.agendaItems) ? body.agendaItems : [];
      if (body.actionItems !== undefined) updates.actionItems = Array.isArray(body.actionItems) ? body.actionItems : [];
      if (body.decisions !== undefined) updates.decisions = Array.isArray(body.decisions) ? body.decisions : [];
      if (body.attendance !== undefined) updates.attendance = Array.isArray(body.attendance) ? body.attendance.filter(a => ATTENDANCE_STATUSES.includes(a.status)) : [];
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
