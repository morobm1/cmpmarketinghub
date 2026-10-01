import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

const TYPES = ['active', 'passive'];
// draft (red) → proposed = pending approval (yellow) → approved / completed (green)
const STATUSES = ['draft', 'proposed', 'approved', 'completed'];
const isMgr = u => u.role === 'admin' || isReslifeManager(u.role);
// Stations: [{ station, people, location, job }] (legacy plain strings are converted)
const cleanStations = arr => (Array.isArray(arr) ? arr : []).map(s => typeof s === 'string' ? { station: s, people: '', location: '', job: '' } : { station: String(s.station || '').trim(), people: String(s.people || '').trim(), location: String(s.location || '').trim(), job: String(s.job || '').trim() }).filter(s => s.station || s.people || s.job);

/**
 * Reslife Hub — Program Proposals (Active / Passive Programming)
 * Modeled on the property's real programming SOP + collateral docs:
 * monthly Active Program ($ budget, stations, shopping/action-item list)
 * and Passive Program (tabling, bulletin boards, etc.).
 *
 * GET    ?property=X            - list programs for a property (any Reslife role + admin)
 * POST                            - propose a program (any Reslife role + admin)
 * PUT                             - update a program; creator may edit their own proposal,
 *                                   REC/Admin/site admin may edit any and change status
 * DELETE ?id=X&property=Y       - delete; creator may delete their own, REC/Admin/site admin any
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_programs');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      // Drafts and pending proposals: creator + REC/Admin only. Approved/completed: everyone.
      const filter = { property };
      if (!isMgr(user)) filter.$or = [{ createdBy: user.sub }, { status: { $in: ['approved', 'completed'] } }];
      const docs = await col.find(filter).sort({ eventDate: 1, createdAt: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, title, type, month, eventDate, location, description, budget, stations, shoppingList } = body;
      if (!property || !title) return { statusCode: 400, body: 'Missing property/title' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property,
        title,
        type: TYPES.includes(type) ? type : 'active',
        month: month || '',
        eventDate: eventDate || null,
        location: location || '',
        description: description || '',
        budget: typeof budget === 'number' ? budget : (parseFloat(budget) || 0),
        stations: cleanStations(stations),
        shoppingList: Array.isArray(shoppingList) ? shoppingList : [],
        status: body.status === 'draft' ? 'draft' : 'proposed',
        createdBy: user.sub,
        createdAt: now,
        updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, title, type, month, eventDate, location, description, budget, stations, shoppingList, status } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedAt: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (type !== undefined && TYPES.includes(type)) updates.type = type;
      if (month !== undefined) updates.month = month;
      if (eventDate !== undefined) updates.eventDate = eventDate;
      if (location !== undefined) updates.location = location;
      if (description !== undefined) updates.description = description;
      if (budget !== undefined) updates.budget = typeof budget === 'number' ? budget : (parseFloat(budget) || 0);
      if (stations !== undefined) updates.stations = cleanStations(stations);
      if (shoppingList !== undefined) updates.shoppingList = Array.isArray(shoppingList) ? shoppingList : [];

      if (status !== undefined && status !== existing.status) {
        const ownDraftFlow = existing.createdBy === user.sub && ['draft', 'proposed'].includes(status) && ['draft', 'proposed'].includes(existing.status);
        if (!isMgr(user) && !ownDraftFlow) return { statusCode: 403, body: 'Only an REC or Admin can approve programs' };
        updates.status = STATUSES.includes(status) ? status : 'proposed';
        if (updates.status === 'approved') { updates.approvedBy = user.sub; updates.approvedAt = updates.updatedAt; }
      } else if (!isMgr(user) && ['approved', 'completed'].includes(existing.status) && (title !== undefined || eventDate !== undefined || description !== undefined)) {
        updates.status = 'proposed'; // RA edits to an approved program go back for approval
      }

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
