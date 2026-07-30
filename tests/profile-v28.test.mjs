import test from 'node:test';
import assert from 'node:assert/strict';

import { splitIssues } from '../api/lib/issues.mjs';
import { build, selfTest } from '../lib/profile-v28.mjs';
import { runQualityBacktests } from '../lib/quality-backtest-v28.mjs';
import { runTemporalBacktests } from '../lib/temporal-backtest-v28.mjs';

test('既知の主題と質問文を別々の問いに水増ししない', () => {
  const issues = splitIssues('拉致被害者はいつになったら帰ってくるのか。');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].topic, 'abduction');
  assert.match(issues[0].label, /いつになったら/u);
});

test('拉致被害者の帰国時期には一項で直接答えてから政府方針を示す', async () => {
  const question = '拉致被害者はいつになったら帰ってくるのか。';
  const [written, speech] = await Promise.all([
    build('written', question, 'minister'),
    build('speech', question, 'prime'),
  ]);
  assert.equal(written.issueCount, 1);
  assert.match(written.draft, /^一について/mu);
  assert.doesNotMatch(written.draft, /二について|趣旨.*明らかではない/u);
  assert.match(written.draft, /帰国時期.*現時点.*困難.*即時帰国/us);
  assert.equal(speech.issueCount, 1);
  assert.equal((speech.draft.match(/^○　/gmu) || []).length, 2);
  assert.match(speech.segments[1].text, /帰国時期.*困難/u);
  assert.equal(written.questionAnalysis.calibration.passed, true);
  assert.equal(speech.questionAnalysis.calibration.passed, true);
  assert.ok(Object.values(written.draftingQuality).every((gate) => gate.passed));
  assert.ok(Object.values(speech.draftingQuality).every((gate) => gate.passed));
});

test('途中で切れた引用を採用せず質問に対応する完結した答弁書にする', async () => {
  const result = await build(
    'written',
    '物価高に対する政府の認識と具体的な対応を問う。',
    'minister',
  );
  assert.equal(result.issueCount, 1);
  assert.match(result.draft, /物価高.*実質所得.*価格転嫁.*生産性向上/us);
  assert.doesNotMatch(result.draft, /インフレ対策担当大臣|「「|[^」]「[^」]*$/u);
  assert.equal(result.officialStyleCheck.passed, true);
  assert.equal(result.questionAnalysis.calibration.passed, true);
});

test('十種類の要求類型で直接性・十分性・簡潔性を同時に満たす', async () => {
  const report = await runQualityBacktests();
  assert.equal(report.caseCount, 10);
  assert.equal(report.passed, true);
  for (const result of report.results) {
    assert.equal(result.passed, true, result.id);
    assert.equal(result.calibration.direct, true, result.id);
    assert.equal(result.calibration.sufficient, true, result.id);
    assert.equal(result.calibration.concise, true, result.id);
    assert.equal(result.calibration.issueIntegrity, true, result.id);
  }
});

test('五件の時点遮断試験で後発資料を使わず実答弁以上の要素を満たす', async () => {
  const report = await runTemporalBacktests();
  assert.equal(report.caseCount, 5);
  assert.equal(report.futureReferenceCount, 0);
  assert.equal(report.passed, true);
  for (const result of report.results) {
    assert.equal(result.passed, true, result.id);
    assert.ok(result.generatedScore >= result.actualBenchmarkScore, result.id);
  }
});

test('プロファイル28の自己診断が通る', () => {
  const report = selfTest();
  assert.equal(report.version, '28.0');
  assert.equal(report.passed, true);
  assert.equal(report.checks.demandCalibratedLength, true);
  assert.equal(report.checks.uncertainTimelineDirectAnswer, true);
});
