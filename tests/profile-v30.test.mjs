import test from 'node:test';
import assert from 'node:assert/strict';

import { sourceRank } from '../api/lib/core.mjs';
import { FOREIGN_SECURITY_CASES } from '../lib/foreign-security-v30.mjs';
import { runMegaBacktests } from '../lib/mega-backtest-v30.mjs';
import { build, PROFILE_VERSION } from '../lib/profile-v30.mjs';
import { runTemporalBacktests } from '../lib/temporal-backtest-v30.mjs';

test('profile 30 applies form-specific source priority', () => {
  const types = ['answer', 'press', 'interview', 'fact', 'written'];
  const oral = types.map((sourceType) =>
    [sourceType, sourceRank({ sourceType, category: 'minister' }, 'speech', 'minister')]);
  const written = types.map((sourceType) =>
    [sourceType, sourceRank({ sourceType, category: 'minister' }, 'written', 'minister')]);
  assert.deepEqual(oral, [
    ['answer', 0],
    ['press', 1],
    ['interview', 4],
    ['fact', 6],
    ['written', 9],
  ]);
  assert.deepEqual(written, [
    ['answer', 4],
    ['press', 2],
    ['interview', 3],
    ['fact', 1],
    ['written', 0],
  ]);
});

test('diplomacy and security matrix has 64 verified decision categories', async () => {
  assert.equal(PROFILE_VERSION, '30.0');
  assert.equal(FOREIGN_SECURITY_CASES.length, 64);
  for (const entry of FOREIGN_SECURITY_CASES) {
    for (const mode of ['speech', 'written']) {
      const draft = await build(mode, entry.question, 'minister');
      assert.equal(draft.questionAnalysis?.answerContract?.passed, true, `${entry.id}:${mode}`);
      assert.equal(draft.issueCount, 1, `${entry.id}:${mode}`);
      assert.equal(
        Object.values(draft.draftingQuality || {}).every((gate) => gate.passed),
        true,
        `${entry.id}:${mode}`,
      );
      assert.equal(draft.sourceSeparation?.passed, true, `${entry.id}:${mode}`);
    }
  }
});

test('oral Senkaku answer is direct and does not cite a written answer', async () => {
  const draft = await build(
    'speech',
    '尖閣諸島に日米安全保障条約第五条は適用されるのか。',
    'prime',
  );
  assert.match(draft.draft, /第五条は、尖閣諸島に適用される/u);
  assert.match(draft.draft, /日本国の施政の下/u);
  assert.equal(draft.references.some((reference) => reference.sourceType === 'written'), false);
  assert.equal(draft.sourceSeparation?.crossFormReferenceCount, 0);
});

test('Graham reconstruction uses only pre-remark oral precedents', async () => {
  const report = await runTemporalBacktests('graham-atomic-remarks');
  assert.equal(report.passed, true);
  assert.equal(report.futureReferenceCount, 0);
  assert.equal(report.crossFormReferenceCount, 0);
  assert.equal(report.results[0].generatedScore, 5);
  assert.equal(report.results[0].references.every((reference) =>
    reference.sourceType === 'answer' && reference.date < report.results[0].cutoff), true);
});

test('口頭・答弁書を各1,000件以上検査し不要な形式間引用を生じない', async () => {
  const report = await runMegaBacktests();
  assert.equal(report.trialCount, 2568);
  assert.equal(report.oralTrialCount, 1284);
  assert.equal(report.writtenTrialCount, 1284);
  assert.equal(report.diplomacySecurityCaseCount, 64);
  assert.equal(report.failureCount, 0);
  assert.equal(report.unnecessaryCrossFormSourceCount, 0);
  assert.equal(report.passed, true);
});
