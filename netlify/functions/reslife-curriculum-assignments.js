import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, canManageReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Curriculum Management — Assignments (the per-RA / per-group tracked
 * instance of a published Requirement). This single document embeds what
 * the spec describes as separate Submission / Approval / PurchaseRequest /
 * ProgramCompletion / Attachment / Comment / StatusHistory entities — the
 * Mongo-idiomatic normalization for this scale of tool, avoiding both a
 * giant spreadsheet-style collection and unnecessary collection sprawl.
 *
 * "Overdue" is never stored — computeDeadlineCondition() derives it fresh
 * on every GET from dueDates + today's date + workflowStatus, per the
 * requirement that deadline condition stay separate from workflow status.
 *
 * GET    ?property=X&termId=Y (optional filters: assignedTo, requirementId) - list (scoped by role)
 * GET    ?property=X&id=Y                                                   - single assignment
 * PUT    { id, property, action, ...fields }                                - all mutations (see ACTION HANDLERS)
 * PUT    { bulk:true, ids:[], property, action, ...fields }                 - bulk mutation across many assignments
 * DELETE ?id=X&property=Y                                                   - admin-only hard delete (rare; prefer waive/reopen)
 */
const TERMINAL_STATUSES = ['Completed', 'Verified Complete', 'Waived', 'Not Applicable'];

function uidLike() { return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

function computeWorkflowStatus(a) {
  if (a.waived) return 'Waived';
  const stages = a.workflowStages || [];
  const requiredStages = stages.filter(s => s.required !== false);
  const doneRequired = requiredStages.filter(s => a.stageProgress[s.key] && a.stageProgress[s.key].done);
  if (requiredStages.length > 0 && doneRequired.length === requiredStages.length) {
    return a.reviewStatus === 'verified_complete' ? 'Verified Complete' : 'Completed';
  }
  if (a.reviewStatus === 'revision_requested') return 'Revision Requested';
  if (a.reviewStatus === 'pending') return 'Awaiting REC Review';
  if (a.purchase && a.purchase.status === 'Purchase Request Needed') return 'Purchase Needed';
  if (a.purchase && a.purchase.status === 'Request Submitted') return 'Purchase Submitted';
  if (a.purchase && a.purchase.status === 'Purchased') return 'Purchased';
  if (a.submission) return 'Submitted';
  if (doneRequired.length > 0) return 'In Progress';
  return 'Not Started';
}
function completionPercent(a) {
  const stages = (a.workflowStages || []).filter(s => s.required !== false);
  if (stages.length === 0) return a.workflowStatus === 'Completed' || a.workflowStatus === 'Verified Complete' ? 100 : 0;
  const done = stages.filter(s => a.stageProgress[s.key] && a.stageProgress[s.key].done).length;
  return Math.round((done / stages.length) * 100);
}
function nextRelevantDueDate(a) {
  const dd = a.dueDates || {};
  const candidates = [dd.planningDue, dd.purchaseDue, dd.programDue, dd.documentationDue].filter(Boolean);
  if (candidates.length === 0) return null;
  if (TERMINAL_STATUSES.includes(a.workflowStatus)) return null;
  const today = new Date().toISOString().slice(0, 10);
  const future = candidates.filter(d => d >= today).sort();
  if (future.length) return future[0];
  return candidates.sort()[0];
}
function computeDeadlineCondition(a) {
  if (TERMINAL_STATUSES.includes(a.workflowStatus)) return { condition: 'none', dueDate: null, days: null };
  const due = nextRelevantDueDate(a);
  if (!due) return { condition: 'none', dueDate: null, days: null };
  const msPerDay = 86400000;
  const todayMid = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  const dueMid = new Date(due + 'T00:00:00Z').getTime();
  const diffDays = Math.round((dueMid - todayMid) / msPerDay);
  let condition;
  if (diffDays < 0) condition = 'overdue';
  else if (diffDays === 0) condition = 'due_today';
  else if (diffDays === 1) condition = 'due_tomorrow';
  else if (diffDays <= 3) condition = 'due_3_days';
  else if (diffDays <= 7) condition = 'due_7_days';
  else if (diffDays <= 14) condition = 'due_14_days';
  else condition = 'upcoming';
  return { condition, dueDate: due, days: diffDays };
}
function decorate(a) {
  a.id = a.id || a._id.toString();
  a.workflowStatus = computeWorkflowStatus(a);
  a.completionPercent = completionPercent(a);
  a._deadline = computeDeadlineCondition(a);
  return a;
}
function pushHistory(a, user, field, oldValue, newValue, note) {
  a.statusHistory = a.statusHistory || [];
  a.statusHistory.push({ id: uidLike(), field, oldValue, newValue, changedBy: user.sub, timestamp: new Date().toISOString(), note: note || '' });
}
function isOwnerOrParticipant(a, user) {
  return a.assignedTo === user.sub || (Array.isArray(a.participants) && a.participants.includes(user.sub));
}

async function notify(db, property, recipients, type, title, message, assignmentId) {
  const now = new Date().toISOString();
  const docs = [...new Set(recipients.filter(Boolean))].map(username => ({
    property, forUsername: username, type, title, message, assignmentId: assignmentId || null, read: false, createdAt: now,
  }));
  if (docs.length) await db.collection('reslife_curriculum_notifications').insertMany(docs);
}
async function managersForProperty(db, property) {
  const users = await db.collection('users').find({ role: { $in: ['reslife-rec', 'reslife-admin'] }, properties: property }, { projection: { username: 1 } }).toArray();
  return users.map(u => u.username);
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_curriculum_assignments');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const { property, id } = q;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id), property });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!manager && !isOwnerOrParticipant(doc, user)) return { statusCode: 403, body: 'Forbidden' };
        return json(200, decorate(doc));
      }

      const filter = { property };
      if (q.termId) filter.termId = q.termId;
      if (q.requirementId) filter.requirementId = q.requirementId;
      if (!manager) filter.$or = [{ assignedTo: user.sub }, { participants: user.sub }];
      else if (q.assignedTo) filter.assignedTo = q.assignedTo;

      const docs = await col.find(filter).sort({ updatedAt: -1 }).toArray();
      return json(200, docs.map(decorate));
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { property, action } = body;
      if (!property || !action) return { statusCode: 400, body: 'Missing property/action' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      const ids = body.bulk ? (body.ids || []) : [body.id];
      if (ids.length === 0) return { statusCode: 400, body: 'No assignment id(s) provided' };

      const results = [];
      for (const rawId of ids) {
        let oid;
        try { oid = new ObjectId(rawId); } catch (e) { continue; }
        const a = await col.findOne({ _id: oid, property });
        if (!a) continue;

        const isSelf = isOwnerOrParticipant(a, user);
        const now = new Date().toISOString();
        let allowed = false;

        if (action === 'submitPlan') {
          allowed = manager || isSelf;
          if (allowed) {
            a.submission = Object.assign({}, body.submission || {}, { submittedAt: now, submittedBy: user.sub });
            a.stageProgress = a.stageProgress || {};
            const planStage = (a.workflowStages || []).find(s => /plan/i.test(s.key));
            if (planStage) a.stageProgress[planStage.key] = { done: true, completedAt: now, completedBy: user.sub };
            a.reviewStatus = 'pending';
            pushHistory(a, user, 'submission', null, 'submitted', 'Plan submitted');
            await notify(db, property, await managersForProperty(db, property), 'plan_submitted', 'Plan submitted', `${user.sub} submitted a plan for "${a.requirementSnapshot.title}".`, rawId);
          }
        } else if (action === 'submitPurchaseRequest') {
          allowed = manager || isSelf;
          if (allowed) {
            a.purchase = a.purchase || { items: [] };
            a.purchase.items = Array.isArray(body.items) ? body.items : a.purchase.items;
            a.purchase.status = 'Request Submitted';
            a.purchase.requestedAt = now; a.purchase.requestedBy = user.sub;
            a.stageProgress = a.stageProgress || {};
            const purchStage = (a.workflowStages || []).find(s => /purchase.*request|sentpurchase/i.test(s.key));
            if (purchStage) a.stageProgress[purchStage.key] = { done: true, completedAt: now, completedBy: user.sub };
            pushHistory(a, user, 'purchase.status', a.purchase.status, 'Request Submitted', 'Purchase request submitted');
            await notify(db, property, await managersForProperty(db, property), 'purchase_submitted', 'New purchase request', `${user.sub} submitted a purchase request for "${a.requirementSnapshot.title}".`, rawId);
          }
        } else if (action === 'updatePurchaseStatus') {
          allowed = manager;
          if (allowed) {
            const old = a.purchase ? a.purchase.status : null;
            a.purchase = a.purchase || { items: [] };
            a.purchase.status = body.status;
            a.purchase.reviewedAt = now; a.purchase.reviewedBy = user.sub;
            if (body.status === 'Purchased') {
              a.stageProgress = a.stageProgress || {};
              const purchasedStage = (a.workflowStages || []).find(s => /^purchased$/i.test(s.key) || /purchased/i.test(s.label || ''));
              if (purchasedStage) a.stageProgress[purchasedStage.key] = { done: true, completedAt: now, completedBy: user.sub };
            }
            pushHistory(a, user, 'purchase.status', old, body.status, body.note || '');
            if (['Approved', 'Denied', 'Purchased'].includes(body.status)) {
              await notify(db, property, [a.assignedTo, ...(a.participants || [])], 'purchase_status', 'Purchase ' + body.status.toLowerCase(), `Your purchase request for "${a.requirementSnapshot.title}" is now: ${body.status}.`, rawId);
            }
          }
        } else if (action === 'approve') {
          allowed = manager;
          if (allowed) {
            a.reviewStatus = 'approved';
            pushHistory(a, user, 'reviewStatus', 'pending', 'approved', body.note || '');
            await notify(db, property, [a.assignedTo, ...(a.participants || [])], 'approved', 'Plan approved', `Your submission for "${a.requirementSnapshot.title}" was approved.`, rawId);
          }
        } else if (action === 'requestRevision') {
          allowed = manager;
          if (allowed) {
            if (!body.reason) { results.push({ id: rawId, error: 'A revision reason is required.' }); continue; }
            a.revisionRequests = a.revisionRequests || [];
            a.revisionRequests.push({ id: uidLike(), reason: body.reason, comment: body.comment || '', requestedBy: user.sub, requestedAt: now, resolved: false });
            a.reviewStatus = 'revision_requested';
            pushHistory(a, user, 'reviewStatus', a.reviewStatus, 'revision_requested', body.reason);
            await notify(db, property, [a.assignedTo, ...(a.participants || [])], 'revision_requested', 'Revision requested', `${body.reason}: ${body.comment || ''}`.trim() + ` (Requirement: "${a.requirementSnapshot.title}")`, rawId);
          }
        } else if (action === 'markComplete') {
          allowed = manager || isSelf;
          if (allowed) {
            a.program = a.program || {};
            a.program.actual = Object.assign({}, body.actual || {}, { recordedAt: now, recordedBy: user.sub });
            a.stageProgress = a.stageProgress || {};
            const heldStage = (a.workflowStages || []).find(s => /held|complete/i.test(s.key));
            const targetStage = heldStage || (a.workflowStages || [])[(a.workflowStages || []).length - 1];
            if (targetStage) a.stageProgress[targetStage.key] = { done: true, completedAt: now, completedBy: user.sub };
            pushHistory(a, user, 'program.actual', null, 'recorded', 'Program/meeting marked complete');
          }
        } else if (action === 'markVerified') {
          allowed = manager;
          if (allowed) {
            a.reviewStatus = 'verified_complete';
            pushHistory(a, user, 'reviewStatus', a.reviewStatus, 'verified_complete', body.note || '');
            await notify(db, property, [a.assignedTo, ...(a.participants || [])], 'verified', 'Marked verified complete', `"${a.requirementSnapshot.title}" was verified complete.`, rawId);
          }
        } else if (action === 'toggleStage') {
          allowed = manager || isSelf;
          if (allowed) {
            a.stageProgress = a.stageProgress || {};
            const key = body.stageKey;
            const wasDone = a.stageProgress[key] && a.stageProgress[key].done;
            a.stageProgress[key] = wasDone ? { done: false } : { done: true, completedAt: now, completedBy: user.sub };
            pushHistory(a, user, 'stage:' + key, wasDone, !wasDone, '');
          }
        } else if (action === 'addComment') {
          allowed = manager || isSelf;
          if (allowed) {
            if (!body.message) { results.push({ id: rawId, error: 'Comment message required.' }); continue; }
            a.comments = a.comments || [];
            a.comments.push({ id: uidLike(), author: user.sub, role: user.role, message: body.message, timestamp: now });
          }
        } else if (action === 'overrideStatus') {
          allowed = canAdminReslifeProperty(user, property);
          if (allowed) {
            const old = a.workflowStatus;
            a.manualStatusOverride = body.status;
            pushHistory(a, user, 'workflowStatus', old, body.status, 'Manually overridden by admin: ' + (body.note || ''));
          }
        } else if (action === 'reopen') {
          allowed = canAdminReslifeProperty(user, property);
          if (allowed) {
            a.reviewStatus = 'none';
            a.waived = false;
            a.manualStatusOverride = null;
            const lastStage = (a.workflowStages || [])[(a.workflowStages || []).length - 1];
            if (lastStage) a.stageProgress[lastStage.key] = { done: false };
            pushHistory(a, user, 'workflowStatus', 'Completed', 'Reopened', body.note || 'Reopened by admin');
          }
        } else if (action === 'waive') {
          allowed = canAdminReslifeProperty(user, property);
          if (allowed) {
            a.waived = true; a.waivedReason = body.reason || '';
            pushHistory(a, user, 'workflowStatus', a.workflowStatus, 'Waived', body.reason || '');
          }
        } else if (action === 'extendDeadline') {
          allowed = canAdminReslifeProperty(user, property);
          if (allowed) {
            const old = Object.assign({}, a.dueDates);
            a.dueDates = Object.assign({}, a.dueDates, body.dueDates || {});
            pushHistory(a, user, 'dueDates', JSON.stringify(old), JSON.stringify(a.dueDates), body.note || 'Deadline extended');
          }
        } else if (action === 'reassignRec' || action === 'reassign') {
          allowed = canAdminReslifeProperty(user, property);
          if (allowed) {
            const old = a.assignedTo;
            if (body.assignedTo) a.assignedTo = body.assignedTo;
            if (body.notes !== undefined) a.notes = body.notes;
            pushHistory(a, user, 'assignedTo', old, a.assignedTo, 'Reassigned');
          }
        } else if (action === 'markNotApplicable') {
          allowed = manager;
          if (allowed) {
            a.reviewStatus = 'none';
            a.manualStatusOverride = 'Not Applicable';
            pushHistory(a, user, 'workflowStatus', a.workflowStatus, 'Not Applicable', body.note || '');
          }
        }

        if (!allowed) { results.push({ id: rawId, error: 'Forbidden' }); continue; }

        a.workflowStatus = a.manualStatusOverride || computeWorkflowStatus(a);
        a.updatedAt = now;
        await col.replaceOne({ _id: oid }, a);
        results.push({ id: rawId, success: true });
      }

      return json(200, { results });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
