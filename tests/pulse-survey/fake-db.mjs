// Minimal in-memory MongoDB stand-in for Pulse Survey handler tests (only the operators the handlers use).
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, path, v) => { const ks = path.split('.'); let t = o; ks.slice(0, -1).forEach((k) => { t[k] = t[k] ?? {}; t = t[k]; }); t[ks.at(-1)] = v; };
function match(doc, q) {
  return Object.entries(q || {}).every(([k, cond]) => {
    const v = get(doc, k);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && Object.keys(cond).some((x) => x.startsWith('$'))) {
      return Object.entries(cond).every(([op, c]) => ({ $gte: () => v >= c, $lte: () => v <= c, $gt: () => v > c, $lt: () => v < c, $ne: () => v !== c, $in: () => c.includes(v) }[op] || (() => false))());
    }
    return v === cond;
  });
}
const clone = (x) => structuredClone(x);
class Cursor {
  constructor(docs) { this.docs = docs; }
  sort(s) { const [[k, d]] = Object.entries(s); this.docs.sort((a, b) => (get(a, k) > get(b, k) ? d : get(a, k) < get(b, k) ? -d : 0)); return this; }
  skip(n) { this.docs = this.docs.slice(n); return this; }
  limit(n) { this.docs = this.docs.slice(0, n); return this; }
  async toArray() { return this.docs.map(clone); }
}
class Collection {
  constructor(name, unique = []) { this.name = name; this.docs = []; this.unique = ['_id', ...unique]; }
  async createIndex() {}
  async findOne(q) { const d = this.docs.find((x) => match(x, q)); return d ? clone(d) : null; }
  find(q) { return new Cursor(this.docs.filter((x) => match(x, q))); }
  async countDocuments(q) { return this.docs.filter((x) => match(x, q)).length; }
  async insertOne(doc) {
    const d = clone(doc); if (d._id === undefined) d._id = 'oid_' + Math.random().toString(36).slice(2);
    for (const u of this.unique) if (d[u] !== undefined && this.docs.some((x) => x[u] === d[u])) throw Object.assign(new Error('E11000 duplicate'), { code: 11000 });
    this.docs.push(d); return { insertedId: d._id };
  }
  _apply(d, upd) {
    for (const [k, v] of Object.entries(upd.$set || {})) setPath(d, k, clone(v));
    for (const [k, v] of Object.entries(upd.$inc || {})) setPath(d, k, (get(d, k) || 0) + v);
  }
  async updateOne(q, upd, opts = {}) {
    const d = this.docs.find((x) => match(x, q));
    if (!d) { if (opts.upsert) { const n = { ...q }; this._apply(n, upd); await this.insertOne(n); return { matchedCount: 0, upsertedCount: 1 }; } return { matchedCount: 0 }; }
    this._apply(d, upd); return { matchedCount: 1 };
  }
  async findOneAndUpdate(q, upd) { const d = this.docs.find((x) => match(x, q)); if (!d) return { value: null }; this._apply(d, upd); return { value: clone(d) }; }
  async deleteOne(q) { const i = this.docs.findIndex((x) => match(x, q)); if (i >= 0) this.docs.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; }
}
export function fakeDb() {
  const cols = {};
  return { collections: cols, collection(name) { if (!cols[name]) cols[name] = new Collection(name, name === 'pulse_responses' ? ['submissionId'] : name === 'pulse_surveys' ? ['publicId'] : []); return cols[name]; } };
}
