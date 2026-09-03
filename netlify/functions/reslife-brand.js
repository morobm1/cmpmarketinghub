import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';
import { canAccessReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Property Branding Lookup
 *
 * Bridges the Reslife property-scoping model (property NAME, matching
 * `user.properties`) with the existing Creative Studio brand kit system
 * (`email_brand_kits`, keyed by the property's slug `propertyId`). The
 * generic /api/email-brand-kits endpoint checks access against the same
 * `user.properties` NAME array, but the property IDs don't line up 1:1 for
 * a direct client-side call, so this endpoint resolves name -> slug id
 * server-side and applies the Reslife access check instead.
 *
 * GET ?property=<name> - returns the brand kit for that property (or null
 * if none has been configured yet), gated by canAccessReslifeProperty.
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const db = await getDb();
  await refreshReslifeUser(db, user);

  const { property } = event.queryStringParameters || {};
  if (!property) return { statusCode: 400, body: 'Missing property' };
  if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

  try {
    const propDoc = await db.collection('properties').findOne({ name: property });
    const col = db.collection('email_brand_kits');

    let kit = null;
    if (propDoc) kit = await col.findOne({ propertyId: propDoc._id });
    if (!kit) kit = await col.findOne({ propertyName: property });
    if (!kit) return json(200, null);

    kit.id = kit.id || kit._id.toString();
    return json(200, kit);
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
