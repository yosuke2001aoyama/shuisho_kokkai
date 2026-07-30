import test from 'node:test';
import assert from 'node:assert/strict';

import { build, selfTest } from '../lib/profile-v27.mjs';
import { TEMPORAL_BACKTEST_CASES, evaluateTemporalDraft } from '../lib/hard-precedents-v27.mjs';
import { runTemporalBacktests } from '../lib/temporal-backtest.mjs';

test('難問の時点バックテストは後発資料を一件も参照しない', async () => {
  for (const testCase of TEMPORAL_BACKTEST_CASES) {
    const draft = await build('speech', testCase.question, testCase.respondent);
    const evaluation = evaluateTemporalDraft(testCase, draft);
    assert.equal(evaluation.sourceGate.futureReferenceCount, 0, testCase.id);
    assert.equal(evaluation.sourceGate.nonOfficialReferenceCount, 0, testCase.id);
    assert.ok(
      evaluation.sourceGate.latestReferenceDate < testCase.cutoff,
      `${testCase.id}: ${evaluation.sourceGate.latestReferenceDate} !< ${testCase.cutoff}`,
    );
  }
});

test('四つの難問すべてで実答弁の必須要素充足数以上となる', async () => {
  const report = await runTemporalBacktests();
  assert.equal(report.caseCount, 4);
  assert.equal(report.futureReferenceCount, 0);
  assert.equal(report.passed, true);
  for (const result of report.results) {
    assert.equal(result.passed, true, result.id);
    assert.ok(result.generatedScore >= result.actualBenchmarkScore, result.id);
  }
});

test('グラハム原爆発言への案は評価・原則・外交対応・非開示・今後を一つの主題で答える', async () => {
  const testCase = TEMPORAL_BACKTEST_CASES.find((item) => item.id === 'graham-atomic-remarks');
  const draft = await build('speech', testCase.question, 'minister');
  assert.equal(draft.issueCount, 1);
  assert.equal((draft.draft.match(/^○　/gmu) || []).length, 5);
  assert.match(draft.draft, /適切ではなく、受け入れることはできない/u);
  assert.match(draft.draft, /米国政府及び発言者の議員事務所/u);
  assert.match(draft.draft, /外交上のやり取りの詳細/u);
  assert.match(draft.draft, /核兵器のない世界/u);
  assert.doesNotMatch(draft.draft, /●|論点[一二三四五六七八九十\d]|【[^】]+】/u);
});

test('台湾有事案は実答弁より具体的な認定要素を示し、断定を避ける', async () => {
  const testCase = TEMPORAL_BACKTEST_CASES.find((item) =>
    item.id === 'taiwan-survival-threatening-situation');
  const draft = await build('speech', testCase.question, 'prime');
  assert.match(draft.draft, /攻撃国の意思と能力/u);
  assert.match(draft.draft, /規模、態様及び推移/u);
  assert.match(draft.draft, /犠牲の深刻性と重大性/u);
  assert.match(draft.draft, /一律に該当性を断定することはできない/u);
  assert.match(draft.draft, /存立危機事態となり得る/u);
});

test('難問案にも起案者・課長・局長・読み手の品質ゲートを適用する', async () => {
  for (const testCase of TEMPORAL_BACKTEST_CASES) {
    const draft = await build('speech', testCase.question, testCase.respondent);
    assert.ok(Object.values(draft.draftingQuality).every((gate) => gate.passed), testCase.id);
    assert.equal(draft.reviewNotes.length, 0);
    assert.equal(draft.questionAnalysis.groupingNote, undefined);
  }
});

test('プロファイル27の自己診断が通る', () => {
  const report = selfTest();
  assert.equal(report.version, '27.0');
  assert.equal(report.passed, true);
  assert.equal(report.checks.strictTemporalSourceGate, true);
  assert.equal(report.checks.difficultQuestionBacktests, true);
});

