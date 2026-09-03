import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Training Module Completion Tracking
 *
 * Quiz grading always happens server-side against the module's stored
 * correctIndex answer key, never trusting a client-submitted score.
 *
 * GET  ?property=X                 - the caller's own attempt history (any Reslife role + admin)
 * GET  ?property=X&all=1           - every user's attempt history for this property (manager tier only)
 * POST { property, moduleId, answers: [selectedIndex, ...] } - submit/grade a quiz attempt (any Reslife role + admin)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_training_progress');
  const moduleCol = db.collection('reslife_training_modules');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const { property, all } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (!(all && manager)) filter.username = user.sub;
      const docs = await col.find(filter).sort({ completedAt: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, moduleId, answers } = body;
      if (!property || !moduleId || !Array.isArray(answers)) return { statusCode: 400, body: 'Missing property/moduleId/answers' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      const module = await moduleCol.findOne({ _id: new ObjectId(moduleId), property });
      if (!module) return { statusCode: 404, body: 'Module not found' };

      const quiz = Array.isArray(module.quiz) ? module.quiz : [];
      let correctCount = 0;
      quiz.forEach((q, i) => { if (answers[i] === q.correctIndex) correctCount++; });
      const total = quiz.length;
      const score = total === 0 ? 100 : Math.round((correctCount / total) * 100);
      const passed = score >= (module.passingScore || 80);
      const now = new Date().toISOString();

      await col.updateOne(
        { property, moduleId, username: user.sub },
        { $set: { property, moduleId, username: user.sub, score, correctCount, total, passed, completedAt: now } },
        { upsert: true }
      );

      return json(200, { score, correctCount, total, passed, passingScore: module.passingScore || 80 });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
