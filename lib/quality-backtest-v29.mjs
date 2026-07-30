import { QUALITY_BACKTEST_CASES } from './quality-backtest-v28.mjs';
import { build } from './profile-v29.mjs';

export { QUALITY_BACKTEST_CASES };

export async function runQualityBacktests(caseId = '') {
  const selected = caseId
    ? QUALITY_BACKTEST_CASES.filter((testCase) => testCase.id === caseId)
    : QUALITY_BACKTEST_CASES;
  if (!selected.length) return null;
  const results = [];
  for (const testCase of selected) {
    const draft = await build(testCase.mode, testCase.question, testCase.respondent);
    const calibration = draft.questionAnalysis?.calibration || {};
    const answerContract = draft.questionAnalysis?.answerContract || {};
    const contentChecks = {
      requiredContent: testCase.must ? testCase.must.test(draft.draft || '') : true,
      prohibitedContent: testCase.mustNot ? !testCase.mustNot.test(draft.draft || '') : true,
      requestedPredicateAnswered: answerContract.passed === true,
    };
    results.push({
      id: testCase.id,
      title: testCase.title,
      mode: testCase.mode,
      question: testCase.question,
      passed: calibration.passed === true && Object.values(contentChecks).every(Boolean),
      calibration,
      answerContract,
      contentChecks,
      generatedAnswer: draft.draft,
    });
  }
  return {
    version: '29.0',
    methodology: {
      dimensions: ['質問への直接性', '要求された判定事項', '必要要素の充足', '過不足のない長さ', '文の完結性', '質問数と答弁項目数の一致'],
      rule: '質問類型ごとの長さだけでなく、質問が求める述語的判断に直接答え、根拠がその判断を裏付けることを採点する。',
    },
    passed: results.every((result) => result.passed),
    caseCount: results.length,
    results,
  };
}
