import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';
import { canAdminReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Curriculum Management — Import from the legacy Quick Curriculum Tracker
 * (the simple `reslife_curriculum` semester trackers built earlier in this
 * app, itself the in-app replacement for the original Excel workbook).
 *
 * This performs a REAL migration into the normalized Term/Requirement
 * model — it never modifies the original legacy tracker document, and it
 * never invents or "corrects" data:
 *   - Legacy semesters become Terms with no start/end date and
 *     `needsDateReview: true` (the legacy tracker never stored term dates).
 *   - Legacy requirement due dates carry over as `programDue`, still
 *     flagged `needsDateReview: true` so an admin verifies them (the
 *     source Spring tracker's due dates spanned inconsistent years).
 *   - Legacy roster names carry over as `assignedRAs`, flagged
 *     `needsAssigneeReview: true` because legacy rosters store first names
 *     as free text, not verified Reslife account usernames — an admin must
 *     confirm/remap them to real accounts before publishing.
 *   - Imported requirements are created UNPUBLISHED. No assignments are
 *     generated until an admin reviews and explicitly publishes them.
 *
 * POST { property, legacyTrackerId } - import one legacy tracker (admin tier only)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const db = await getDb();
  await refreshReslifeUser(db, user);

  try {
    const body = JSON.parse(event.body || '{}');
    const { property, legacyTrackerId } = body;
    if (!property || !legacyTrackerId) return { statusCode: 400, body: 'Missing property/legacyTrackerId' };
    if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

    const { ObjectId } = await import('mongodb');
    const legacy = await db.collection('reslife_curriculum').findOne({ _id: new ObjectId(legacyTrackerId), property });
    if (!legacy) return { statusCode: 404, body: 'Legacy tracker not found' };

    const termCol = db.collection('reslife_curriculum_terms');
    const reqCol = db.collection('reslife_curriculum_requirements');
    const now = new Date().toISOString();

    const existingTerm = await termCol.findOne({ property, importedFromLegacyId: legacyTrackerId });
    if (existingTerm) return { statusCode: 409, body: 'This legacy tracker has already been imported as "' + existingTerm.name + '".' };

    const term = {
      property, name: legacy.semester, academicYear: '', startDate: '', endDate: '', status: 'Draft',
      needsDateReview: true, importedFromLegacyId: legacyTrackerId,
      createdBy: user.sub, createdAt: now, updatedAt: now,
    };
    const termResult = await termCol.insertOne(term);
    term.id = termResult.insertedId.toString();

    const roster = Array.isArray(legacy.roster) ? legacy.roster : [];
    const requirements = Array.isArray(legacy.requirements) ? legacy.requirements : [];
    const createdRequirements = [];

    for (const req of requirements) {
      const legacyCompletions = {};
      roster.forEach(name => {
        const key = name + '__' + req.id;
        if (legacy.completions && legacy.completions[key]) legacyCompletions[name] = legacy.completions[key];
      });
      const doc = {
        property, termId: term.id,
        title: req.name, description: '', category: 'Other', month: '',
        ownerType: 'RA', assignmentType: 'selected_ras', assignedRAs: roster.slice(),
        required: true, requiresDocumentation: false, requiresPurchase: false,
        workflowStages: [
          { key: 'assigned', label: 'Assigned', order: 0, required: true },
          { key: 'completed', label: 'Completed', order: 1, required: true },
        ],
        dates: { planningDue: '', purchaseDue: '', programDue: req.dueDate || '', documentationDue: '' },
        status: 'active', published: false,
        needsDateReview: true, needsAssigneeReview: true,
        legacyCompletions,
        importedFromLegacyId: legacyTrackerId,
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await reqCol.insertOne(doc);
      doc.id = result.insertedId.toString();
      createdRequirements.push(doc);
    }

    return json(200, {
      term,
      requirementsImported: createdRequirements.length,
      rosterSize: roster.length,
      note: 'Imported as a Draft term with unpublished requirements. Review dates and assignee names, then publish when ready — no assignments were created yet.',
    });
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
