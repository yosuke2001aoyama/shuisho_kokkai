import test from 'node:test';
import assert from 'node:assert/strict';

import {
  foreignSecurityParaphrases,
  runAdversarialBacktests,
  UNSEEN_HIGH_RISK_QUESTIONS,
} from '../lib/adversarial-backtest-v32.mjs';

test('外交・安保66類型を元質問と一致しない三種類の国会調表現へ変換する', () => {
  const variants = foreignSecurityParaphrases('我が国は中国に対して弱腰なのではないか。');
  assert.equal(variants.length, 3);
  assert.equal(new Set(variants).size, 3);
  assert.ok(variants.every((question) => question !== '我が国は中国に対して弱腰なのではないか。'));
  assert.equal(UNSEEN_HIGH_RISK_QUESTIONS.length, 52);
});

test('未知の聞き方を含む口頭・答弁書各1000件を公開判定まで検査する', async () => {
  const report = await runAdversarialBacktests();
  assert.equal(report.supportedQuestionCount, 198);
  assert.equal(report.unsupportedQuestionCount, 52);
  assert.equal(report.distinctQuestionCount, 250);
  assert.equal(report.trialCount, 2000);
  assert.equal(report.oralTrialCount, 1000);
  assert.equal(report.writtenTrialCount, 1000);
  assert.equal(report.version, '33.0');
  assert.equal(report.failureCount, 0, JSON.stringify(report.failures.slice(0, 5), null, 2));
  assert.equal(report.passed, true);
});
