import test from 'node:test';
import assert from 'node:assert/strict';

import { sourceRank } from '../api/lib/core.mjs';
import { runMegaBacktests } from '../lib/mega-backtest-v30.mjs';
import { build, PROFILE_VERSION, selfTest } from '../lib/profile-v31.mjs';

const IRAN_QUESTION = '米国によるイラン侵攻は、国際法違反ではないのか。';

test('イランへの攻撃の国際法問を資料不存在扱いにせず結論・規範・当てはめで答える', async () => {
  const draft = await build('written', IRAN_QUESTION, 'minister');
  assert.equal(PROFILE_VERSION, '31.0');
  assert.doesNotMatch(draft.draft, /直接の根拠を確認できない/u);
  assert.match(draft.draft, /国際法に違反するか否かについて、確定的な評価を示していない/u);
  assert.match(draft.draft, /国連憲章第二条第四項/u);
  assert.match(draft.draft, /同憲章第五十一条/u);
  assert.match(draft.draft, /事実関係を十分に把握していないため/u);
  assert.equal(draft.questionAnalysis.answerContract.passed, true);
  assert.equal(draft.missingIssueCount, 0);
  assert.equal(draft.issueCount, 1);
  assert.equal(draft.officialStyleCheck.passed, true);
});

test('総理・官房長官・大臣の公式動画掲載文を役職付きで引用する', async () => {
  const draft = await build('written', IRAN_QUESTION, 'minister');
  assert.equal(draft.governmentPressCoverage.prime, true);
  assert.equal(draft.governmentPressCoverage.chief, true);
  assert.equal(draft.governmentPressCoverage.minister, true);
  assert.ok(draft.governmentPressCoverage.officialVideoText >= 5);
  assert.ok(draft.references.some((item) =>
    item.category === 'prime' && item.speakerPosition === '内閣総理大臣'));
  assert.ok(draft.references.some((item) =>
    item.category === 'chief' && item.speakerPosition === '内閣官房長官'));
  assert.ok(draft.references.some((item) =>
    item.category === 'minister' && /外務大臣|防衛大臣/u.test(item.speakerPosition)));
  assert.ok(draft.references
    .filter((item) => item.sourceType === 'press')
    .every((item) => item.transcriptBasis === '公式ページ掲載文'));
});

test('答弁書本文を御指摘の等の短句単位で用例へ結び付ける', async () => {
  const draft = await build('written', IRAN_QUESTION, 'minister');
  const phrases = draft.usageExamples.map((item) => item.phrase);
  assert.ok(phrases.includes('御指摘の'));
  assert.ok(phrases.includes('について'));
  assert.ok(phrases.includes('一般に'));
  assert.ok(phrases.includes('及び'));
  assert.ok(phrases.includes('に関する'));
  assert.ok(phrases.includes('に即して'));
  assert.ok(phrases.includes('確定的な評価を示していない'));
  assert.ok(draft.usageExamples.every((item) => item.url && item.example && item.usageKey));
  assert.ok(draft.segments[0].usageSpans.every((span) => span.start < span.end));
  assert.equal(draft.usageGranularity, '短句・助詞・接続語単位');
});

test('口頭答弁は同じ役職の会見を他役職会見より優先する', () => {
  assert.equal(sourceRank({ sourceType: 'press', category: 'prime' }, 'speech', 'prime'), 1);
  assert.equal(sourceRank({ sourceType: 'press', category: 'minister' }, 'speech', 'prime'), 3);
  assert.equal(sourceRank({ sourceType: 'answer', category: 'minister' }, 'speech', 'prime'), 2);
});

test('口頭・答弁書を各1284件プロファイル31で全件検査する', async () => {
  const report = await runMegaBacktests();
  assert.equal(report.version, '31.0');
  assert.equal(report.trialCount, 2568);
  assert.equal(report.oralTrialCount, 1284);
  assert.equal(report.writtenTrialCount, 1284);
  assert.equal(report.failureCount, 0);
  assert.equal(report.unnecessaryCrossFormSourceCount, 0);
  assert.equal(report.passed, true);
});

test('プロファイル31の自己診断が通る', () => {
  const report = selfTest();
  assert.equal(report.version, '31.0');
  assert.equal(report.passed, true);
  assert.equal(report.checks.roleAwareOfficialPress, true);
  assert.equal(report.checks.officialVideoTextIngestion, true);
  assert.equal(report.checks.phraseLevelWrittenUsage, true);
});
