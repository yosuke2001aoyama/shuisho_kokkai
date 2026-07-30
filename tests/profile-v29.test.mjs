import test from 'node:test';
import assert from 'node:assert/strict';

import { build as buildV28 } from '../lib/profile-v28.mjs';
import { build, selfTest } from '../lib/profile-v29.mjs';
import { evaluateQuestionContract } from '../lib/question-contract-v29.mjs';
import { runBreadthBacktests } from '../lib/breadth-backtest-v29.mjs';
import { runQualityBacktests } from '../lib/quality-backtest-v29.mjs';
import { runTemporalBacktests } from '../lib/temporal-backtest-v29.mjs';

const SENKAKU_QUESTION = '尖閣諸島に対して日米安保条約第5条は適用されるのか。';

test('主題だけが一致する旧答弁を不合格にする', async () => {
  const oldDraft = await buildV28('speech', SENKAKU_QUESTION, 'prime');
  const contract = evaluateQuestionContract(oldDraft, SENKAKU_QUESTION);
  assert.match(oldDraft.draft, /我が国固有の領土/u);
  assert.doesNotMatch(oldDraft.draft, /第五条は、尖閣諸島に適用される/u);
  assert.equal(contract.passed, false);
  assert.equal(contract.checks.conclusion, false);
  assert.equal(contract.checks.evidence, false);
});

test('尖閣諸島への安保条約第五条適用を結論・条文・当てはめで答える', async () => {
  const draft = await build('speech', SENKAKU_QUESTION, 'prime');
  assert.equal(draft.issueCount, 1);
  assert.equal((draft.draft.match(/^○　/gmu) || []).length, 3);
  assert.match(draft.segments[1].text, /日米安全保障条約第五条は、尖閣諸島に適用される/u);
  assert.match(draft.draft, /日本国の施政の下.*共通の危険.*現に我が国の施政の下.*適用対象/us);
  assert.equal(draft.questionAnalysis.answerContract.passed, true);
  assert.equal(draft.questionAnalysis.answerContract.checks.evidence, true);
  assert.ok(Object.values(draft.draftingQuality).every((gate) => gate.passed));
});

test('46分野を口頭・答弁書の92形式で横断検査する', async () => {
  const report = await runBreadthBacktests();
  assert.equal(report.domainCount, 46);
  assert.equal(report.sourceCaseCount, 46);
  assert.equal(report.formCaseCount, 92);
  assert.equal(report.failedCount, 0);
  assert.equal(report.passed, true);
});

test('既存の長短・論点数試験にも質問判定契約を追加して通す', async () => {
  const report = await runQualityBacktests();
  assert.equal(report.caseCount, 10);
  assert.equal(report.passed, true);
  assert.ok(report.results.every((result) => result.answerContract.passed));
});

test('質問前資料だけを使う時点遮断試験でも判定対象へ直接答える', async () => {
  const report = await runTemporalBacktests();
  assert.equal(report.caseCount, 5);
  assert.equal(report.futureReferenceCount, 0);
  assert.equal(report.passed, true);
  assert.ok(report.results.every((result) => result.answerContractPassed));
});

test('直接根拠のない法令適用問は主題だけの資料で断定しない', async () => {
  const draft = await build(
    'speech',
    '架空島に対して架空条約第九条は適用されるのか。',
    'minister',
  );
  assert.equal(draft.missingIssueCount, 1);
  assert.match(draft.draft, /直接の根拠を確認できない.*断定的にお答えすることはできない/us);
  assert.equal(draft.questionAnalysis.answerContract.passed, false);
});

test('プロファイル29の自己診断が通る', () => {
  const report = selfTest();
  assert.equal(report.version, '29.0');
  assert.equal(report.passed, true);
  assert.equal(report.checks.predicateAwareQuestionContract, true);
  assert.equal(report.checks.crossDomainPrecedentMatrix, true);
});
