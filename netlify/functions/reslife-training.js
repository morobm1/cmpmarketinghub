import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Training Modules (Canvas-style lessons + quizzes)
 *
 * A module has a short lesson (text) plus an optional multiple-choice quiz,
 * and an optional canvasUrl if the property already has a real course built
 * in the institution's Canvas LMS (this app has no Canvas API integration —
 * canvasUrl is just a link-out, not a live sync).
 *
 * GET    ?property=X            - list modules (any Reslife role + admin).
 *                                  Quiz answer keys (correctIndex) are stripped
 *                                  for non-manager roles so RAs can't inspect
 *                                  the network response to see answers.
 * POST                            - create a module (manager tier: REC/Admin/site admin)
 * PUT                             - update a module (manager tier)
 * DELETE ?id=X&property=Y       - delete a module (manager tier), cascades progress records
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_training_modules');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ category: 1, title: 1 }).toArray();
      const manager = user.role === 'admin' || isReslifeManager(user.role);
      docs.forEach(d => {
        d.id = d._id.toString();
        if (!manager && Array.isArray(d.quiz)) {
          d.quiz = d.quiz.map(q => ({ question: q.question, options: q.options }));
        }
      });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, title, category, description, lessonContent, canvasUrl, quiz, passingScore } = body;
      if (!property || !title) return { statusCode: 400, body: 'Missing property/title' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property,
        title,
        category: category || 'General',
        description: description || '',
        lessonContent: lessonContent || '',
        canvasUrl: canvasUrl || '',
        quiz: Array.isArray(quiz) ? quiz : [],
        passingScore: Number.isFinite(passingScore) ? passingScore : 80,
        createdBy: user.sub,
        updatedBy: user.sub,
        createdAt: now,
        updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, title, category, description, lessonContent, canvasUrl, quiz, passingScore } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedBy: user.sub, updatedAt: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description;
      if (lessonContent !== undefined) updates.lessonContent = lessonContent;
      if (canvasUrl !== undefined) updates.canvasUrl = canvasUrl;
      if (quiz !== undefined) updates.quiz = Array.isArray(quiz) ? quiz : [];
      if (passingScore !== undefined) updates.passingScore = Number.isFinite(passingScore) ? passingScore : 80;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      await db.collection('reslife_training_progress').deleteMany({ moduleId: id, property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
