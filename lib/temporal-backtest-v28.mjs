import { build } from './profile-v28.mjs';
import {
  TEMPORAL_BACKTEST_CASES as BASE_CASES,
  evaluateTemporalDraft,
} from './hard-precedents-v27.mjs';

const ABDUCTION_TIMING_CASE = {
  id: 'abduction-return-timing',
  title: '拉致被害者の帰国時期',
  cutoff: '2024-04-08',
  actualAnswerDate: '2024-04-08',
  respondent: 'minister',
  question: '拉致被害者はいつになったら帰ってくるのか。',
  actualAnswerUrl: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/014221320240408003.htm',
  dimensions: [
    { id: 'direct-timing', label: '帰国時期を断定できるかへの直接回答', pattern: /帰国時期.*現時点.*確たる.*困難/us },
    { id: 'all-victims', label: '認定の有無を問わない全被害者', pattern: /認定の有無にかかわらず、全ての拉致被害者/u },
    { id: 'immediate-return', label: '安全確保と即時帰国', pattern: /安全確保及び即時帰国/u },
    { id: 'complete-resolution', label: '真相究明と実行犯引渡し', pattern: /真相究明及び拉致実行犯の引渡し/u },
  ],
  actualCoveredDimensions: ['all-victims', 'immediate-return'],
};

export const TEMPORAL_BACKTEST_CASES = [...BASE_CASES, ABDUCTION_TIMING_CASE];

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
    results.push({
      ...publicCase(testCase),
      ...evaluation,
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
    version: '28.0',
    methodology: {
      sourceRule: '質問又は事象の基準日より前に公表された政府・国会公式資料だけを根拠に使用する。',
      comparisonRule: '実答弁で確認できる必須要素を同じ採点軸で評価し、生成案が実答弁の充足数以上であることを求める。',
      lengthRule: '答弁要素を満たした後、質問類型ごとの必要最小量に収まることを別の品質試験で確認する。',
      prohibition: '実答弁本文は生成入力に渡さず、生成後の採点基準及び出典リンクとしてのみ保持する。',
    },
    passed: results.every((result) => result.passed),
    caseCount: results.length,
    futureReferenceCount: results.reduce((sum, result) =>
      sum + result.sourceGate.futureReferenceCount, 0),
    results,
  };
}
