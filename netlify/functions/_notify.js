/**
 * Reslife in-app notifications (bell in the Reslife Hub header).
 * reslife_notifications: { property, to: '<username>' | '*', title, message, type, priority: 'normal'|'urgent',
 *                          link, createdBy, createdAt, readBy: [usernames] }
 */
export async function notify(db, { property, to, title, message, type, priority, link, createdBy }) {
  if (!property || !to || !title) return null;
  const recipients = Array.isArray(to) ? [...new Set(to.filter(Boolean))] : [to];
  const now = new Date().toISOString();
  const docs = recipients.map(r => ({ property, to: r, title: String(title).slice(0, 140), message: String(message || '').slice(0, 2000), type: type || 'system', priority: priority === 'urgent' ? 'urgent' : 'normal', link: link || '', createdBy: createdBy || 'system', createdAt: now, readBy: [] }));
  if (!docs.length) return null;
  try { await db.collection('reslife_notifications').insertMany(docs); } catch (e) { console.error('notify failed', e.message); }
  return docs.length;
}
