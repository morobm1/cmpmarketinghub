import { parseUnit } from './_units.js';

/**
 * Resident Directory — tags, auto-tag rules and RA assignments.
 *
 * reslife_dir_settings: { property, tags:[{name,color}], rules:[{field, op, value, tag}],
 *                         raAssignments:[{username, name, building, floors:[]}], lastRefresh }
 * Resident fields: tags[] (manual, kept forever) · autoTags[] (recomputed) · assignedRA (username) · assignedRAName
 *
 * Rule fields: building, floor, baseUnit, bed, unit, occupantType, unitType, name, email
 * Rule ops:    equals, not_equals, starts_with, contains, in (comma list), is_empty, not_empty
 */
export const DEFAULT_TAGS = [
  { name: 'Minor', color: 'amber' },
  { name: 'Pending Eviction', color: 'rose' },
  { name: 'Conduct Review', color: 'violet' },
  { name: 'Family', color: 'teal' },
];

export function unitFields(raw) {
  const p = parseUnit(raw);
  return { unit: p.unit, room: p.bed, bed: p.bed, baseUnit: p.baseUnit, building: p.building, floor: p.floor };
}

export async function getDirSettings(db, property) {
  const s = await db.collection('reslife_dir_settings').findOne({ property });
  return Object.assign({ property, tags: DEFAULT_TAGS, rules: [], raAssignments: [] }, s || {});
}

function fieldValue(r, field, unitTypes) {
  const u = parseUnit(r.unit || r.room);
  switch (field) {
    case 'building': return u.building;
    case 'floor': return u.floor;
    case 'baseUnit': return u.baseUnit;
    case 'bed': return u.bed;
    case 'unit': return u.unit;
    case 'occupantType': return r.occupantType || '';
    case 'unitType': return unitTypes.get(u.unit) || unitTypes.get(u.baseUnit) || '';
    case 'name': return r.residentName || '';
    case 'email': return r.email || '';
    default: return '';
  }
}
export function ruleMatches(rule, r, unitTypes) {
  const v = String(fieldValue(r, rule.field, unitTypes)).trim().toLowerCase();
  const x = String(rule.value || '').trim().toLowerCase();
  switch (rule.op) {
    case 'equals': return v === x;
    case 'not_equals': return v !== x;
    case 'starts_with': return !!x && v.startsWith(x);
    case 'contains': return !!x && v.includes(x);
    case 'in': return x.split(',').map(s => s.trim()).filter(Boolean).includes(v);
    case 'is_empty': return !v;
    case 'not_empty': return !!v;
    default: return false;
  }
}

/** Recompute auto tags + RA assignment for every resident (and normalize unit/bed fields). */
export async function refreshDirectoryTags(db, property) {
  const s = await getDirSettings(db, property);
  const col = db.collection('reslife_directory');
  const [residents, inv] = await Promise.all([
    col.find({ property }).project({ residentName: 1, unit: 1, room: 1, email: 1, occupantType: 1, autoTags: 1, assignedRA: 1 }).toArray(),
    db.collection('reslife_unit_inventory').find({ property }).project({ unit: 1, unitType: 1 }).toArray().catch(() => []),
  ]);
  const unitTypes = new Map(inv.map(u => [parseUnit(u.unit).unit, u.unitType]));
  inv.forEach(u => { const p = parseUnit(u.unit); if (!unitTypes.has(p.baseUnit)) unitTypes.set(p.baseUnit, u.unitType); });
  const ops = [];
  let raAssigned = 0, autoTagged = 0;
  for (const r of residents) {
    const u = parseUnit(r.unit || r.room);
    const auto = new Set();
    (s.rules || []).forEach(rule => { if (ruleMatches(rule, r, unitTypes)) auto.add(rule.tag); });
    const ra = (s.raAssignments || []).find(a => a.building === u.building && (!a.floors || !a.floors.length || a.floors.includes(u.floor)));
    if (ra) { auto.add('RA: ' + (ra.name || ra.username)); raAssigned++; }
    if (auto.size) autoTagged++;
    ops.push({ updateOne: { filter: { _id: r._id }, update: { $set: Object.assign({ autoTags: [...auto], assignedRA: ra ? ra.username : '', assignedRAName: ra ? (ra.name || ra.username) : '' }, unitFields(r.unit || r.room)) } } });
  }
  if (ops.length) await col.bulkWrite(ops);
  const at = new Date().toISOString();
  await db.collection('reslife_dir_settings').updateOne({ property }, { $set: { lastRefresh: at } }, { upsert: true });
  return { residents: residents.length, raAssigned, autoTagged, refreshedAt: at };
}
