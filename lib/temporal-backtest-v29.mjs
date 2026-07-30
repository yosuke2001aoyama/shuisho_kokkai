import {
  TEMPORAL_BACKTEST_CASES,
} from './temporal-backtest-v28.mjs';
import { evaluateTemporalDraft } from './hard-precedents-v27.mjs';
import { build } from './profile-v29.mjs';

const publicCase = (testCase) => ({
  id: testCase.id,
  title: testCase.title,
  cutoff: testCase.cutoff,
  actualAnswerDate: testCase.actualAnswerDate,
  actualAnswerUrl: testCase.actualAnswerUrl,
  respondent: testCase.respondent,
  question: testCase.question,
  requiredDimensions: testCase.dimensions.map((dimension) => ({
    id: dimension.id,
    label: dimension.label,
  })),
});

export function listTemporalBacktests() {
  return TEMPORAL_BACKTEST_CASES.map(publicCase);
}

export async function runTemporalBacktests(caseId = '') {
  const selected = caseId
    ? TEMPORAL_BACKTEST_CASES.filter((testCase) => testCase.id === caseId)
    : TEMPORAL_BACKTEST_CASES;
  if (!selected.length) return null;
  const results = [];
  for (const testCase of selected) {
    const draft = await build('speech', testCase.question, testCase.respondent);
    const evaluation = evaluateTemporalDraft(testCase, draft);
    const answerContractPassed = draft.questionAnalysis?.answerContract?.passed === true;
    results.push({
      ...publicCase(testCase),
      ...evaluation,
      passed: evaluation.passed && answerContractPassed,
      answerContractPassed,
      generatedAnswer: draft.draft,
      references: (draft.references || []).map((reference) => ({
        title: reference.title,
        sourceName: reference.sourceName,
        date: reference.date,
        url: reference.url,
      })),
    });
  }
  return {
    version: '29.0',
    methodology: {
      sourceRule: '質問又は事象の基準日より前に公表された政府・国会公式資料だけを根拠に使用する。',
      comparisonRule: '実答弁で確認できる必須要素を同じ採点軸で評価し、生成案が実答弁の充足数以上であることを求める。',
      predicateRule: '実答弁と同じ話題であるだけでは足りず、質問が求める評価、法的判断、対応又は時期に直接答えることを求める。',
      prohibition: '実答弁本文は生成入力に渡さず、生成後の採点基準及び出典リンクとしてのみ保持する。',
    },
    passed: results.every((result) => result.passed),
    caseCount: results.length,
    futureReferenceCount: results.reduce((sum, result) =>
      sum + result.sourceGate.futureReferenceCount, 0),
    results,
  };
}
