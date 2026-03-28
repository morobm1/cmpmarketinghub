import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/* ──────────────────────────────────────────────────────────────
   SOP Acknowledgement API
   
   Collections:
   ─────────────
   sopAckGroups — Reusable staff groups
   {
     _id, name, members: [{ name, email }],
     createdAt, updatedAt, createdBy
   }

   sopAckAssignments — Per-SOP assignment of staff & groups
   {
     _id, sopId, 
     staff: [{ name, email }],
     groupIds: [String],
     createdAt, updatedAt, updatedBy
   }

   sopAckRecords — Individual acknowledgement records (immutable audit trail)
   {
     _id, sopId, sopTitle,
     staffName, staffEmail,
     acknowledgedAt: Date,
     statement: String,
     recordedBy: String (username or 'self')
   }

   Routes (via ?action=...):
   GET    ?action=groups                  — list all groups
   POST   ?action=group                   — create/update group
   DELETE  ?action=group&id=X             — delete group
   GET    ?action=assignment&sopId=X      — get assignment for SOP
   POST   ?action=assignment              — save assignment for SOP
   GET    ?action=records&sopId=X         — get ack records for SOP
   POST   ?action=acknowledge             — record acknowledgement
   GET    ?action=dashboard               — admin overview of all SOPs
   GET    ?action=resolved-staff&sopId=X  — resolved staff list for SOP
────────────────────────────────────────────────────────────── */

function cors(body, sc = 200) {
  return {
    statusCode: sc,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

// Resolve the full staff list for an SOP (individual + group members, deduplicated)
async function resolveStaffList(db, assignment) {
  if (!assignment) return [];
  const staff = [...(assignment.staff || [])];

  if (assignment.groupIds && assignment.groupIds.length > 0) {
    const groupCol = db.collection('sopAckGroups');
    const objectIds = assignment.groupIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));
    if (objectIds.length > 0) {
      const groups = await groupCol.find({ _id: { $in: objectIds } }).toArray();
      for (const g of groups) {
        if (Array.isArray(g.members)) {
          staff.push(...g.members);
        }
      }
    }
  }

  // Deduplicate by lowercase email (primary) or lowercase name (fallback)
  const seen = new Set();
  const unique = [];
  for (const s of staff) {
    const key = (s.email || '').toLowerCase().trim() || s.name.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ name: s.name, email: s.email || '' });
  }
  return unique.sort((a, b) => a.name.localeCompare(b.name));
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return cors(JSON.stringify({ error: 'Unauthorized' }), 401);

  const db = await getDb();
  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  try {
    // ═══════════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════════

    if (action === 'groups' && method === 'GET') {
      const groups = await db.collection('sopAckGroups')
        .find({}).sort({ name: 1 }).toArray();
      const result = groups.map(g => {
        g.id = g._id.toString(); delete g._id; return g;
      });
      return cors(result);
    }

    if (action === 'group' && method === 'POST') {
      if (user.role !== 'admin') return cors(JSON.stringify({ error: 'Admin only' }), 403);
      const body = JSON.parse(event.body || '{}');
      const { id, name, members } = body;
      if (!name || !name.trim()) return cors(JSON.stringify({ error: 'Group name required' }), 400);
      if (!Array.isArray(members) || members.length === 0) {
        return cors(JSON.stringify({ error: 'At least one member required' }), 400);
      }
      const cleanMembers = members
        .filter(m => m.name && m.name.trim())
        .map(m => ({ name: m.name.trim(), email: (m.email || '').trim() }));

      const col = db.collection('sopAckGroups');
      const now = new Date();

      if (id) {
        // Update
        await col.updateOne({ _id: new ObjectId(id) }, {
          $set: { name: name.trim(), members: cleanMembers, updatedAt: now, updatedBy: user.sub }
        });
        return cors({ success: true, id });
      } else {
        // Create
        const doc = {
          name: name.trim(),
          members: cleanMembers,
          createdAt: now,
          updatedAt: now,
          createdBy: user.sub
        };
        const res = await col.insertOne(doc);
        doc.id = res.insertedId.toString();
        delete doc._id;
        return cors(doc, 201);
      }
    }

    if (action === 'group' && method === 'DELETE') {
      if (user.role !== 'admin') return cors(JSON.stringify({ error: 'Admin only' }), 403);
      const id = qs.id;
      if (!id) return cors(JSON.stringify({ error: 'id required' }), 400);
      await db.collection('sopAckGroups').deleteOne({ _id: new ObjectId(id) });
      // Also remove from any assignments
      await db.collection('sopAckAssignments').updateMany(
        { groupIds: id },
        { $pull: { groupIds: id } }
      );
      return cors({ deleted: true });
    }

    // ═══════════════════════════════════════════
    // ASSIGNMENTS
    // ═══════════════════════════════════════════

    if (action === 'assignment' && method === 'GET') {
      const sopId = qs.sopId;
      if (!sopId) return cors(JSON.stringify({ error: 'sopId required' }), 400);
      const assignment = await db.collection('sopAckAssignments').findOne({ sopId });
      if (!assignment) return cors({ sopId, staff: [], groupIds: [], groups: [] });
      assignment.id = assignment._id.toString();
      delete assignment._id;

      // Also resolve group names for display
      if (assignment.groupIds && assignment.groupIds.length > 0) {
        const groupCol = db.collection('sopAckGroups');
        const objectIds = assignment.groupIds
          .filter(gid => ObjectId.isValid(gid))
          .map(gid => new ObjectId(gid));
        const groups = objectIds.length > 0
          ? await groupCol.find({ _id: { $in: objectIds } }).toArray()
          : [];
        assignment.groups = groups.map(g => ({
          id: g._id.toString(),
          name: g.name,
          memberCount: (g.members || []).length
        }));
      } else {
        assignment.groups = [];
      }
      return cors(assignment);
    }

    if (action === 'assignment' && method === 'POST') {
      if (user.role !== 'admin') return cors(JSON.stringify({ error: 'Admin only' }), 403);
      const body = JSON.parse(event.body || '{}');
      const { sopId, staff, groupIds } = body;
      if (!sopId) return cors(JSON.stringify({ error: 'sopId required' }), 400);

      const cleanStaff = (staff || [])
        .filter(s => s.name && s.name.trim())
        .map(s => ({ name: s.name.trim(), email: (s.email || '').trim() }));
      const cleanGroupIds = (groupIds || []).filter(Boolean);

      const col = db.collection('sopAckAssignments');
      const now = new Date();
      const existing = await col.findOne({ sopId });

      if (existing) {
        await col.updateOne({ sopId }, {
          $set: { staff: cleanStaff, groupIds: cleanGroupIds, updatedAt: now, updatedBy: user.sub }
        });
      } else {
        await col.insertOne({
          sopId, staff: cleanStaff, groupIds: cleanGroupIds,
          createdAt: now, updatedAt: now, updatedBy: user.sub
        });
      }
      return cors({ success: true, sopId });
    }

    // ═══════════════════════════════════════════
    // RESOLVED STAFF LIST (for SOP acknowledgement section)
    // ═══════════════════════════════════════════

    if (action === 'resolved-staff' && method === 'GET') {
      const sopId = qs.sopId;
      if (!sopId) return cors(JSON.stringify({ error: 'sopId required' }), 400);

      const assignment = await db.collection('sopAckAssignments').findOne({ sopId });
      const staffList = await resolveStaffList(db, assignment);

      // Get existing ack records for this SOP
      const records = await db.collection('sopAckRecords')
        .find({ sopId }).sort({ acknowledgedAt: -1 }).toArray();

      // Build map: lowered email/name → latest record
      const ackMap = {};
      for (const r of records) {
        const key = (r.staffEmail || '').toLowerCase().trim() || r.staffName.toLowerCase().trim();
        if (!ackMap[key]) {
          ackMap[key] = {
            acknowledgedAt: r.acknowledgedAt,
            statement: r.statement
          };
        }
      }

      // Merge
      const result = staffList.map(s => {
        const key = (s.email || '').toLowerCase().trim() || s.name.toLowerCase().trim();
        const ack = ackMap[key];
        return {
          name: s.name,
          email: s.email,
          acknowledged: !!ack,
          acknowledgedAt: ack ? ack.acknowledgedAt : null
        };
      });

      return cors(result);
    }

    // ═══════════════════════════════════════════
    // ACKNOWLEDGE
    // ═══════════════════════════════════════════

    if (action === 'acknowledge' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { sopId, sopTitle, staffName, staffEmail, statement } = body;
      if (!sopId || !staffName) {
        return cors(JSON.stringify({ error: 'sopId and staffName required' }), 400);
      }

      const defaultStatement = 'I acknowledge that I have reviewed, understand, and agree to follow this SOP/policy.';
      const doc = {
        sopId,
        sopTitle: sopTitle || '',
        staffName: staffName.trim(),
        staffEmail: (staffEmail || '').trim(),
        acknowledgedAt: new Date(),
        statement: statement || defaultStatement,
        recordedBy: user.sub
      };

      await db.collection('sopAckRecords').insertOne(doc);
      doc.id = doc._id.toString();
      delete doc._id;
      return cors(doc, 201);
    }

    // ═══════════════════════════════════════════
    // RECORDS (ack history for an SOP)
    // ═══════════════════════════════════════════

    if (action === 'records' && method === 'GET') {
      const sopId = qs.sopId;
      if (!sopId) return cors(JSON.stringify({ error: 'sopId required' }), 400);
      const records = await db.collection('sopAckRecords')
        .find({ sopId }).sort({ acknowledgedAt: -1 }).toArray();
      const result = records.map(r => {
        r.id = r._id.toString(); delete r._id; return r;
      });
      return cors(result);
    }

    // ═══════════════════════════════════════════
    // DASHBOARD (admin: all SOPs with ack status summary)
    // ═══════════════════════════════════════════

    if (action === 'dashboard' && method === 'GET') {
      if (user.role !== 'admin') return cors(JSON.stringify({ error: 'Admin only' }), 403);

      // Get all assignments
      const assignments = await db.collection('sopAckAssignments').find({}).toArray();
      // Get all records
      const allRecords = await db.collection('sopAckRecords').find({}).toArray();
      // Get all SOPs for title reference
      const sops = await db.collection('sops').find({}, { projection: { title: 1, sopType: 1, property: 1 } }).toArray();
      const sopMap = {};
      for (const s of sops) { sopMap[s._id.toString()] = s; }

      // Build ack records map per SOP
      const recordsBySop = {};
      for (const r of allRecords) {
        if (!recordsBySop[r.sopId]) recordsBySop[r.sopId] = [];
        recordsBySop[r.sopId].push(r);
      }

      const dashboard = [];
      for (const a of assignments) {
        const staffList = await resolveStaffList(db, a);
        if (staffList.length === 0) continue;

        const records = recordsBySop[a.sopId] || [];
        const ackSet = new Set();
        for (const r of records) {
          const key = (r.staffEmail || '').toLowerCase().trim() || r.staffName.toLowerCase().trim();
          ackSet.add(key);
        }

        const completed = staffList.filter(s => {
          const key = (s.email || '').toLowerCase().trim() || s.name.toLowerCase().trim();
          return ackSet.has(key);
        }).length;

        const sop = sopMap[a.sopId];
        dashboard.push({
          sopId: a.sopId,
          sopTitle: sop ? sop.title : '(Unknown SOP)',
          sopType: sop ? sop.sopType : '',
          property: sop ? sop.property : '',
          totalStaff: staffList.length,
          completed,
          pending: staffList.length - completed
        });
      }

      // Sort: pending first (descending), then by title
      dashboard.sort((a, b) => b.pending - a.pending || a.sopTitle.localeCompare(b.sopTitle));
      return cors(dashboard);
    }

    return cors(JSON.stringify({ error: 'Unknown action or method' }), 400);

  } catch (e) {
    console.error('SOP Acknowledgement error:', e);
    return cors(JSON.stringify({ error: e.message }), 500);
  }
}
