import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../pulse-survey/engine.js';
import { fall2026Definition } from '../../pulse-survey/seed.js';

test('every question type has a valid default and the seed survey validates', () => {
  const def = E.emptyDefinition(); const sid = def.sections[0].id;
  for (const t of Object.keys(E.QUESTION_TYPES)) { const q = E.defaultQuestion(t, sid); q.text = q.text || `Q ${t}`; def.questions.push(q); }
  assert.deepEqual(E.validateDefinition(def).errors, []);
  const seed = fall2026Definition();
  assert.deepEqual(E.validateDefinition(seed, { anonymous: true }).errors, []);
  assert.equal(seed.questions.filter((q) => q.enabled !== false).length, 18); // Q13 group disabled by default
});

test('logic must reference earlier questions (no circular routing) and existing choices', () => {
  const def = fall2026Definition();
  const q5 = def.questions.find((q) => q.id === 'q5');
  q5.logic = { match: 'all', conditions: [{ questionId: 'q6', operator: 'anyOf', values: ['3'] }] };
  assert.ok(E.validateDefinition(def).errors.some((e) => e.questionId === 'q5' && /earlier/.test(e.message)));
  const d2 = fall2026Definition();
  d2.questions.find((q) => q.id === 'q15').logic.conditions[0].values = ['ghost'];
  assert.ok(E.validateDefinition(d2).errors.some((e) => e.questionId === 'q15'));
  const d3 = fall2026Definition();
  d3.questions.find((q) => q.id === 'q15').logic.conditions[0].questionId = 'q19'; // text question, later
  assert.ok(E.validateDefinition(d3).errors.some((e) => e.questionId === 'q15'));
});

test('conditional visibility: event skip and renewal branching', () => {
  const def = fall2026Definition();
  let v = E.computeVisibility(def, { q5: 'none' });
  assert.ok(!v.has('q6') && !v.has('q7') && !v.has('q9') && v.has('q8') && v.has('q10'));
  v = E.computeVisibility(def, { q5: 'few', q14: 'likely' });
  assert.ok(v.has('q6') && v.has('q15') && !v.has('q18'));
  v = E.computeVisibility(def, { q14: 'unlikely' });
  assert.ok(!v.has('q15') && v.has('q18'));
  assert.ok(!v.has('q13a'), 'disabled optional group hidden');
});

const fullAnswers = () => ({
  q1: 's', q2: { clean: 'good', study: 'exc', amen: 'avg', wifi: 'poor', maint: 'na', team: 'good', comm: 'fair' },
  q3: { safe: 'sa', welcome: 'a' }, q4: ['wifi', 'study'], q5: 'none', q6: '5', q8: '3', q10: ['food', 'social', 'career'],
  q12: ['email'], q14: 'unlikely', q15: 'keep', q18: 'cost', q19: 'Better Wi-Fi in study rooms please',
});

test('answer validation drops hidden answers, enforces required/max/exclusive', () => {
  const def = fall2026Definition();
  const r = E.validateAnswers(def, fullAnswers(), {});
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.answers.q6, undefined, 'hidden q6 dropped');
  assert.equal(r.answers.q15, undefined, 'hidden q15 dropped');
  assert.equal(r.answers.q18, 'cost');
  const bad = E.validateAnswers(def, { ...fullAnswers(), q4: ['wifi', 'study', 'clean'] });
  assert.match(bad.errors.q4, /no more than 2/);
  const ex = E.validateAnswers(def, { ...fullAnswers(), q4: ['none', 'wifi'] });
  assert.ok(ex.errors.q4);
  const miss = E.validateAnswers(def, { q1: 's' });
  assert.ok(miss.errors.q2 && miss.errors.q14);
  const inj = E.validateAnswers(def, { ...fullAnswers(), q1: 'not-a-choice' });
  assert.ok(inj.errors.q1);
  const grid = E.validateAnswers(def, { ...fullAnswers(), q3: { safe: 'sa' } });
  assert.match(grid.errors.q3, /every row/);
});

test('analytics: favorable top-two box excludes N/A; renewal sentiment', () => {
  const def = fall2026Definition();
  const mk = (a, i) => ({ version: 1, submittedAt: `2026-10-0${i + 1}T18:00:00Z`, answers: E.validateAnswers(def, a).answers, other: {} });
  const r = [mk(fullAnswers(), 0), mk({ ...fullAnswers(), q1: 'vs', q14: 'def', q15: 'keep', q2: { ...fullAnswers().q2, maint: 'good' } }, 1), mk({ ...fullAnswers(), q1: 'd', q14: 'undecided', q15: 'either' }, 2)];
  const a = E.computeSurveyAnalytics([{ version: 1, definition: def }], r);
  assert.equal(a.total, 3);
  assert.equal(a.kpis.overallSatisfaction.n, 3);
  assert.equal(a.kpis.overallSatisfaction.favorablePct, 66.7);
  const maint = a.questions.find((x) => x.question.id === 'q2').stats.rows.maint;
  assert.equal(maint.naN, 2); assert.equal(maint.scoredN, 1); assert.equal(maint.favorablePct, 100);
  assert.deepEqual([a.kpis.renewal.positive, a.kpis.renewal.undecided, a.kpis.renewal.negative], [1, 1, 1]);
  const themes = E.computeThemes(['Better Wi-Fi please', 'More food events', 'zzz']);
  assert.ok(themes.find((t) => t.key === 'wifi').quotes[0] === 'Better Wi-Fi please');
  assert.ok(themes.find((t) => t.key === 'general').count === 1);
});

test('diff flags significant changes; comparison matches by key only', () => {
  const a = fall2026Definition(); const b = fall2026Definition();
  b.questions.find((q) => q.id === 'q1').choices.pop();
  b.questions.find((q) => q.id === 'q8').text = 'Reworded';
  const d = E.diffDefinitions(a, b);
  assert.equal(d.significant[0].id, 'q1'); assert.equal(d.reworded[0].id, 'q8'); assert.equal(d.comparable, false);
  const an = E.computeSurveyAnalytics([{ version: 1, definition: a }], []);
  const bn = E.computeSurveyAnalytics([{ version: 1, definition: b }], []);
  const cmp = E.compareSurveys([{ id: 'A', title: 'A', analytics: an }, { id: 'B', title: 'B', analytics: bn }]);
  const sat = cmp.rows.find((r) => r.key === 'overall_satisfaction');
  assert.ok(sat.scaleMismatch);
  assert.ok(cmp.rows.find((r) => r.key === 'exp_wifi'));
});

test('sanitizeDefinition strips unknown types/fields and bad ids', () => {
  const s = E.sanitizeDefinition({ sections: [{ id: 's1<script>', title: 'x' }], questions: [{ id: 'a', sectionId: 's1script', type: 'evil' }, { id: 'b"', sectionId: 's1script', type: 'short', text: 'Hi', onclick: 'x' }] });
  assert.equal(s.sections[0].id, 's1script');
  assert.equal(s.questions.length, 1); assert.equal(s.questions[0].id, 'b'); assert.equal(s.questions[0].onclick, undefined);
});
