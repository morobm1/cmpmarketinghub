/**
 * Program Proposals — pure domain logic (no DB access) so it can be unit tested.
 *
 * Two independent classifications exist on a program:
 *   type        : delivery format, pre-existing field  -> 'active' | 'passive'
 *   programType : Fall 2026 programming phase           -> 'individual' | 'collaborative' | 'large_scale'
 *
 * Status workflow (legacy 'proposed' is read as 'submitted'):
 *   draft -> submitted -> under_review -> changes_requested -> (submitted again) -> approved -> scheduled -> completed
 *   plus rejected / cancelled.
 */

export const FORMATS = ['active', 'passive'];
export const PROGRAM_TYPES = ['individual', 'collaborative', 'large_scale'];
export const PROGRAM_TYPE_LABELS = { individual: 'Phase 1: Individual', collaborative: 'Phase 2: Collaborative', large_scale: 'Large Scale' };
export const STATUSES = ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'scheduled', 'completed', 'rejected', 'cancelled'];
export const VISIBLE_TO_ALL = ['approved', 'scheduled', 'completed'];
export const ITEM_KINDS = ['purchase', 'supply', 'flyer', 'task'];
export const ITEM_STATUSES = ['planned', 'approved', 'ordered', 'received', 'cancelled'];
export const FULFILLMENT = ['', 'delivery', 'pickup', 'in_store', 'on_hand', 'other'];
export const TASK_STATUSES = ['not_started', 'in_progress', 'done', 'blocked'];

export const DEFAULT_SETTINGS = {
  categories: ['Academic Excellence', 'Campus Pride', 'Equity, Diversity and Inclusion', 'Health & Wellness', 'Holistic Development', 'Safety & Bystander Prevention'],
  purchaseTypes: ['Food', 'Beverages', 'Supplies', 'Decorations', 'Equipment', 'Prizes', 'Printing', 'Other'],
  foodPurchaseTypes: ['Food', 'Beverages'],
  defaultTasks: [
    'Submit proposal', 'Receive REC approval', 'Finalize supply list', 'Confirm purchases', 'Confirm program location',
    'Arrange marketing and promotions', 'Coordinate setup', 'Confirm delivery or pickup', 'Complete program', 'Submit program evaluation',
  ],
  // Purchasing guidance from "Action Item Lists - Fall 2026 Programming". Each rule can be disabled
  // or reworded per property by an admin. Rules only WARN; they never change budget values.
  rules: {
    amazon_food: { enabled: true, message: 'Amazon is for supplies, decorations and other non-food items. Buy food and beverages from a local store (Costco, Vons, Target), often through Instacart.' },
    costco_food_court: { enabled: true, message: 'Costco Food Court does not accept MasterCard, so it cannot be paid with the Emburse card.' },
    delivery_fees: { enabled: true, message: 'Delivery selected: add this vendor\u2019s delivery/service fees and tip in the budget.' },
    instacart_fees: { enabled: true, message: 'Instacart orders must include Instacart fees and tip in the budget.' },
    pickup_details: { enabled: true, message: 'Pickup selected: add a needed-by date and the RA responsible for pickup, and coordinate pickup with your REC.' },
    perishable: { enabled: true, message: 'Perishable item: confirm the pickup window and that refrigeration is available until the program.' },
    over_budget: { enabled: true, message: 'Estimated total exceeds the approved budget. Revise the list or request a budget change.' },
    payment_policy: { enabled: true, message: 'All purchases use the Emburse Card (MasterCard). Out-of-pocket reimbursements are not permitted.' },
  },
  // Deliberately null: no approval threshold / default budget until confirmed by leadership.
  approvalThreshold: null,
  defaultBudget: null,
};

const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const num = v => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const cents = v => Math.round(num(v) * 100);
const fromCents = c => Math.round(c) / 100;
const pick = (v, list, dflt) => (list.includes(v) ? v : dflt);
const isoDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const httpUrl = v => { const s = str(v, 1000); return /^https?:\/\/[^\s]+$/i.test(s) ? s : ''; };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function normalizeStatus(s) {
  if (s === 'proposed') return 'submitted';
  return STATUSES.includes(s) ? s : 'draft';
}

export function mergeSettings(stored) {
  const s = stored || {};
  const rules = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS.rules)) {
    const o = (s.rules && s.rules[k]) || {};
    rules[k] = { enabled: o.enabled === undefined ? def.enabled : !!o.enabled, message: str(o.message, 400) || def.message };
  }
  const list = (v, d) => (Array.isArray(v) && v.map(x => str(x, 80)).filter(Boolean).length ? v.map(x => str(x, 80)).filter(Boolean) : d);
  return {
    categories: list(s.categories, DEFAULT_SETTINGS.categories),
    purchaseTypes: list(s.purchaseTypes, DEFAULT_SETTINGS.purchaseTypes),
    foodPurchaseTypes: list(s.foodPurchaseTypes, DEFAULT_SETTINGS.foodPurchaseTypes),
    defaultTasks: list(s.defaultTasks, DEFAULT_SETTINGS.defaultTasks),
    rules,
    approvalThreshold: s.approvalThreshold == null || s.approvalThreshold === '' ? null : num(s.approvalThreshold),
    defaultBudget: s.defaultBudget == null || s.defaultBudget === '' ? null : num(s.defaultBudget),
  };
}

export function cleanItem(it, i) {
  it = it || {};
  const kind = pick(it.kind, ITEM_KINDS, 'purchase');
  const out = {
    id: str(it.id, 40) || rid(),
    kind,
    item: str(it.item, 200),
    qty: Math.max(0, Math.round(num(it.qty === undefined || it.qty === '' ? (kind === 'flyer' ? 0 : 1) : it.qty))),
    order: Number.isFinite(+it.order) ? +it.order : i,
  };
  if (kind === 'purchase') Object.assign(out, {
    vendor: str(it.vendor, 120), link: httpUrl(it.link), price: fromCents(cents(it.price)),
    purchaseType: str(it.purchaseType, 60), assignedRA: str(it.assignedRA, 80),
    fulfillment: pick(it.fulfillment, FULFILLMENT, ''), neededBy: isoDate(it.neededBy),
    status: pick(it.status, ITEM_STATUSES, 'planned'), perishable: !!it.perishable,
    photoId: str(it.photoId, 40), photoUrl: httpUrl(it.photoUrl), notes: str(it.notes, 500),
  });
  if (kind === 'supply') Object.assign(out, { source: str(it.source, 200), owner: str(it.owner, 80) });
  if (kind === 'flyer') Object.assign(out, { due: isoDate(it.due), notes: str(it.notes, 500) });
  if (kind === 'task') Object.assign(out, { owner: str(it.owner, 80), due: isoDate(it.due) });
  return out;
}

export function cleanItems(list) {
  return (Array.isArray(list) ? list : []).slice(0, 300).map(cleanItem).filter(r => r.item)
    .sort((a, b) => a.order - b.order).map((r, i) => Object.assign(r, { order: i }));
}

export function cleanVendors(list) {
  return (Array.isArray(list) ? list : []).slice(0, 50).map(v => ({
    vendor: str(v && v.vendor, 120),
    taxRate: Math.min(num(v && v.taxRate), 100),
    deliveryFee: fromCents(cents(v && v.deliveryFee)),
    serviceFee: fromCents(cents(v && v.serviceFee)),
    instacartFee: fromCents(cents(v && v.instacartFee)),
    tip: fromCents(cents(v && v.tip)),
    actual: v && v.actual !== '' && v.actual != null ? fromCents(cents(v.actual)) : null,
  })).filter(v => v.vendor);
}

export function cleanTasks(list) {
  return (Array.isArray(list) ? list : []).slice(0, 100).map((t, i) => {
    const status = pick(t && t.status, TASK_STATUSES, 'not_started');
    return {
      id: str(t && t.id, 40) || rid(), title: str(t && t.title, 200), assignee: str(t && t.assignee, 80),
      due: isoDate(t && t.due), status, notes: str(t && t.notes, 1000), attachmentId: str(t && t.attachmentId, 40),
      completedAt: status === 'done' ? (str(t && t.completedAt, 40) || new Date().toISOString()) : '',
      order: i,
    };
  }).filter(t => t.title);
}

export function defaultTasks(settings) {
  return cleanTasks((settings || DEFAULT_SETTINGS).defaultTasks.map(title => ({ title })));
}

const vkey = s => str(s, 120).toLowerCase();

/** Per-vendor and overall budget. All arithmetic in integer cents. */
export function computeBudget(items, vendors, approvedBudget) {
  const purchases = (items || []).filter(i => (i.kind || 'purchase') === 'purchase' && i.status !== 'cancelled');
  const cfg = new Map((vendors || []).map(v => [vkey(v.vendor), v]));
  const groups = new Map();
  for (const it of purchases) {
    const k = vkey(it.vendor) || '(no vendor)';
    if (!groups.has(k)) groups.set(k, { vendor: str(it.vendor) || '(no vendor)', sub: 0, count: 0 });
    const g = groups.get(k); g.sub += cents(it.price) * Math.max(0, Math.round(num(it.qty))); g.count++;
  }
  // Vendors configured with fees but no items still count their fees.
  for (const [k, v] of cfg) if (!groups.has(k)) groups.set(k, { vendor: v.vendor, sub: 0, count: 0 });
  let sub = 0, tax = 0, fees = 0, tips = 0, actual = 0, hasActual = false;
  const rows = [...groups.entries()].map(([k, g]) => {
    const v = cfg.get(k) || {};
    const t = Math.round(g.sub * Math.min(num(v.taxRate), 100) / 100);
    const f = cents(v.deliveryFee) + cents(v.serviceFee) + cents(v.instacartFee);
    const tp = cents(v.tip);
    sub += g.sub; tax += t; fees += f; tips += tp;
    if (v.actual != null && v.actual !== '') { hasActual = true; actual += cents(v.actual); }
    return { vendor: g.vendor, items: g.count, subtotal: fromCents(g.sub), tax: fromCents(t), fees: fromCents(f), tip: fromCents(tp), total: fromCents(g.sub + t + f + tp), actual: v.actual == null || v.actual === '' ? null : fromCents(cents(v.actual)) };
  });
  const total = sub + tax + fees + tips;
  const approved = approvedBudget == null || approvedBudget === '' ? null : cents(approvedBudget);
  return {
    vendors: rows, subtotal: fromCents(sub), tax: fromCents(tax), fees: fromCents(fees), tips: fromCents(tips), total: fromCents(total),
    approvedBudget: approved == null ? null : fromCents(approved),
    remaining: approved == null ? null : fromCents(approved - total),
    overBudget: approved != null && approved > 0 && total > approved,
    actual: hasActual ? fromCents(actual) : null,
  };
}

/** Contextual purchasing-policy warnings. Never mutates inputs. */
export function policyWarnings(program, settings) {
  const s = mergeSettings(settings);
  const R = s.rules, out = [];
  const add = (rule, ref) => { if (R[rule] && R[rule].enabled) out.push({ rule, itemId: ref || '', message: R[rule].message }); };
  const food = new Set(s.foodPurchaseTypes.map(x => x.toLowerCase()));
  const vcfg = new Map((program.vendors || []).map(v => [vkey(v.vendor), v]));
  const flagged = new Set();
  for (const it of (program.items || program.shoppingList || [])) {
    if ((it.kind || 'purchase') !== 'purchase') continue;
    const vendor = vkey(it.vendor), isFood = food.has(String(it.purchaseType || '').toLowerCase());
    if (/amazon/.test(vendor) && isFood) add('amazon_food', it.id);
    if (/costco/.test(vendor) && /food\s*court/.test(vendor)) add('costco_food_court', it.id);
    if (it.fulfillment === 'pickup' && (!it.neededBy || !it.assignedRA)) add('pickup_details', it.id);
    if (it.perishable) add('perishable', it.id);
    const v = vcfg.get(vendor) || {};
    if (it.fulfillment === 'delivery' && !flagged.has('d:' + vendor) && !(num(v.deliveryFee) || num(v.serviceFee) || num(v.instacartFee) || num(v.tip))) {
      flagged.add('d:' + vendor); add('delivery_fees', it.id);
    }
    if (/instacart/.test(vendor + ' ' + String(it.notes || '').toLowerCase()) && !flagged.has('i:' + vendor) && !(num(v.instacartFee) || num(v.serviceFee)) ) {
      flagged.add('i:' + vendor); add('instacart_fees', it.id);
    }
  }
  const b = computeBudget(program.items || program.shoppingList || [], program.vendors || [], program.approvedBudget);
  if (b.overBudget) add('over_budget');
  return out;
}

/**
 * Status transitions. `role` is 'manager' (REC / Reslife Admin / site admin) or 'member'
 * (creator, primary owner or collaborator). Anyone else may not change status.
 */
const MEMBER_MOVES = {
  draft: ['submitted', 'cancelled'],
  submitted: ['draft', 'cancelled'],
  changes_requested: ['submitted', 'draft', 'cancelled'],
};
const MANAGER_MOVES = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'changes_requested', 'approved', 'rejected', 'draft', 'cancelled'],
  under_review: ['changes_requested', 'approved', 'rejected', 'cancelled'],
  changes_requested: ['submitted', 'under_review', 'approved', 'rejected', 'cancelled'],
  approved: ['scheduled', 'completed', 'changes_requested', 'cancelled'],
  scheduled: ['completed', 'approved', 'changes_requested', 'cancelled'],
  completed: ['scheduled'],
  rejected: ['draft'],
  cancelled: ['draft'],
};
export function canTransition(from, to, role) {
  from = normalizeStatus(from);
  if (!STATUSES.includes(to) || from === to) return false;
  const map = role === 'manager' ? MANAGER_MOVES : role === 'member' ? MEMBER_MOVES : {};
  return (map[from] || []).includes(to);
}

export const MATERIAL_FIELDS = ['title', 'eventDate', 'endDate', 'location', 'programType', 'type', 'estAttendance'];
/** True when a non-manager edit should send an approved/scheduled program back for re-review. */
export function isMaterialChange(existing, updates) {
  for (const f of MATERIAL_FIELDS) {
    if (updates[f] !== undefined && String(updates[f] ?? '') !== String(existing[f] ?? '')) return true;
  }
  if (updates.items !== undefined || updates.vendors !== undefined) {
    const before = computeBudget(existing.items || existing.shoppingList || [], existing.vendors || []).total;
    const after = computeBudget(updates.items !== undefined ? updates.items : (existing.items || existing.shoppingList || []), updates.vendors !== undefined ? updates.vendors : (existing.vendors || [])).total;
    if (after > before) return true;
  }
  return false;
}

/** Fields an RA must complete before a proposal can be submitted. */
export function missingForSubmit(p) {
  const miss = [];
  if (!str(p.title)) miss.push('Program title');
  if (!PROGRAM_TYPES.includes(p.programType)) miss.push('Program type');
  if (!str(p.category)) miss.push('Programming category');
  if (!p.eventDate) miss.push('Date');
  if (!str(p.location)) miss.push('Location');
  if (!str(p.description)) miss.push('Program description');
  if (!str(p.objectives)) miss.push('Learning objectives');
  if (p.programType === 'collaborative' && !(p.collaborators || []).length) miss.push('Collaborating RA(s)');
  if (!p.noItems && !(p.items || p.shoppingList || []).length) miss.push('Action Item List (or mark "No supplies needed")');
  return miss;
}

export function cleanEvaluation(e) {
  e = e || {};
  return {
    actualAttendance: e.actualAttendance === '' || e.actualAttendance == null ? null : Math.round(num(e.actualAttendance)),
    actualExpenses: e.actualExpenses === '' || e.actualExpenses == null ? null : fromCents(cents(e.actualExpenses)),
    results: str(e.results, 4000), feedback: str(e.feedback, 4000), challenges: str(e.challenges, 4000), recommendations: str(e.recommendations, 4000),
    attachmentIds: (Array.isArray(e.attachmentIds) ? e.attachmentIds : []).map(x => str(x, 40)).filter(Boolean).slice(0, 20),
  };
}

export const str_ = str;
export const num_ = num;
