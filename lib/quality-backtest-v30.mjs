import { QUALITY_BACKTEST_CASES } from './quality-backtest-v28.mjs';
import { build } from './profile-v30.mjs';

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
      sourceFormsSeparated: draft.sourceSeparation?.passed === true,
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
    version: '30.0',
    methodology: {
      dimensions: ['質問への直接性', '要求された判定事項', '必要要素の充足', '過不足のない長さ', '文の完結性', '質問数と答弁項目数の一致', '文書形式別の根拠分離'],
      rule: '質問が求める判断への直接回答と根拠の適合性を採点し、口頭答弁と質問主意書答弁書の相互引用も検査する。',
    },
    passed: results.every((result) => result.passed),
    caseCount: results.length,
    results,
  };
}
