// In-memory MongoDB stand-in for Reslife handler tests. Supports only the operators those handlers use.
// Uses the real ObjectId so `new ObjectId(id)` round-trips exactly like production.
import { ObjectId } from 'mongodb';

const isOid = v => v instanceof ObjectId;
const norm = v => (isOid(v) ? 'oid:' + v.toHexString() : v);
const eq = (a, b) => norm(a) === norm(b);
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, path, v) => { const ks = path.split('.'); let t = o; ks.slice(0, -1).forEach(k => { t[k] = t[k] ?? {}; t = t[k]; }); t[ks.at(-1)] = v; };
const delPath = (o, path) => { const ks = path.split('.'); let t = o; ks.slice(0, -1).forEach(k => { t = t && t[k]; }); if (t) delete t[ks.at(-1)]; };
const clone = x => {
  if (isOid(x)) return x;
  if (Array.isArray(x)) return x.map(clone);
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = clone(x[k]); return o; }
  return x;
};

function cond(v, c) {
  if (c && typeof c === 'object' && !Array.isArray(c) && !isOid(c) && Object.keys(c).some(k => k.startsWith('$'))) {
    return Object.entries(c).every(([op, x]) => {
      switch (op) {
        case '$in': return Array.isArray(v) ? v.some(e => x.some(y => eq(e, y))) : x.some(y => eq(v, y));
        case '$nin': return !(Array.isArray(v) ? v.some(e => x.some(y => eq(e, y))) : x.some(y => eq(v, y)));
        case '$ne': return !eq(v, x);
        case '$exists': return x ? v !== undefined : v === undefined;
        case '$lt': return v != null && v < x;
        case '$lte': return v != null && v <= x;
        case '$gt': return v != null && v > x;
        case '$gte': return v != null && v >= x;
        default: throw new Error('fake-mongo: unsupported operator ' + op);
      }
    });
  }
  if (Array.isArray(v) && !Array.isArray(c)) return v.some(e => eq(e, c));
  return eq(v, c);
}
export function match(doc, q) {
  return Object.entries(q || {}).every(([k, c]) => {
    if (k === '$or') return c.some(sub => match(doc, sub));
    if (k === '$and') return c.every(sub => match(doc, sub));
    return cond(get(doc, k), c);
  });
}

class Cursor {
  constructor(docs) { this.docs = docs; }
  sort(s) { const keys = Object.entries(s); this.docs.sort((a, b) => { for (const [k, d] of keys) { const x = get(a, k), y = get(b, k); if (x === y) continue; if (x == null) return -d; if (y == null) return d; return x > y ? d : -d; } return 0; }); return this; }
  skip(n) { this.docs = this.docs.slice(n); return this; }
  limit(n) { this.docs = this.docs.slice(0, n); return this; }
  project() { return this; }
  async toArray() { return this.docs.map(clone); }
}

class Collection {
  constructor(name) { this.name = name; this.docs = []; }
  async createIndex() {}
  async findOne(q) { const d = this.docs.find(x => match(x, q)); return d ? clone(d) : null; }
  find(q) { return new Cursor(this.docs.filter(x => match(x, q))); }
  async countDocuments(q) { return this.docs.filter(x => match(x, q)).length; }
  async insertOne(doc) { const d = clone(doc); if (d._id === undefined) d._id = new ObjectId(); doc._id = d._id; this.docs.push(d); return { insertedId: d._id }; }
  async insertMany(docs) { for (const d of docs) await this.insertOne(d); return { insertedCount: docs.length }; }
  _apply(d, u) {
    for (const [k, v] of Object.entries(u.$set || {})) setPath(d, k, clone(v));
    for (const k of Object.keys(u.$unset || {})) delPath(d, k);
    for (const [k, v] of Object.entries(u.$push || {})) { const arr = get(d, k) || []; arr.push(clone(v)); setPath(d, k, arr); }
    for (const [k, v] of Object.entries(u.$inc || {})) setPath(d, k, (get(d, k) || 0) + v);
  }
  async updateOne(q, u, opts = {}) {
    const d = this.docs.find(x => match(x, q));
    if (!d) {
      if (opts.upsert) { const n = {}; for (const [k, v] of Object.entries(q)) if (!k.startsWith('$')) n[k] = v; this._apply(n, u); await this.insertOne(n); return { matchedCount: 0, upsertedCount: 1 }; }
      return { matchedCount: 0, modifiedCount: 0 };
    }
    this._apply(d, u); return { matchedCount: 1, modifiedCount: 1 };
  }
  async deleteOne(q) { const i = this.docs.findIndex(x => match(x, q)); if (i >= 0) this.docs.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; }
  async deleteMany(q) { const before = this.docs.length; this.docs = this.docs.filter(x => !match(x, q)); return { deletedCount: before - this.docs.length }; }
}

export function fakeMongo() {
  const cols = {};
  return { collections: cols, collection(name) { return (cols[name] = cols[name] || new Collection(name)); } };
}
export { ObjectId };
