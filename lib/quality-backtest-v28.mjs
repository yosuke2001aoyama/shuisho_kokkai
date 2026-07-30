import { build } from './profile-v28.mjs';

export const QUALITY_BACKTEST_CASES = [
  {
    id: 'simple-fact',
    title: '単純事実は一段落で完結',
    mode: 'speech',
    respondent: 'minister',
    question: '尖閣諸島は我が国固有の領土か。',
    must: /我が国固有の領土/u,
  },
  {
    id: 'uncertain-timeline',
    title: '不確実な時期は直接回答と方針の二点',
    mode: 'written',
    respondent: 'minister',
    question: '拉致被害者はいつになったら帰ってくるのか。',
    must: /帰国時期.*困難.*即時帰国/us,
    mustNot: /二について|趣旨.*明らかではない/u,
  },
  {
    id: 'single-policy',
    title: '単一施策問は結論と対応',
    mode: 'speech',
    respondent: 'minister',
    question: '物価高に対する政府の対応を問う。',
    must: /国民生活.*賃上げ/us,
  },
  {
    id: 'reason-only',
    title: '理由問は結論と理由に限定',
    mode: 'speech',
    respondent: 'minister',
    question: 'なぜ防災対策の強化が必要なのか。',
    must: /必要である.*ためである/us,
  },
  {
    id: 'three-part-policy',
    title: '認識・取組・今後は三点を充足',
    mode: 'speech',
    respondent: 'minister',
    question: '少子化対策について、政府の認識、これまでの取組及び今後の方針を問う。',
    must: /重要課題.*今後/us,
  },
  {
    id: 'political-accountability',
    title: '政治的評価は結論・基準・行動まで説明',
    mode: 'speech',
    respondent: 'chief',
    question: '日本は米国の言いなりなのではないか。',
    must: /御指摘は当たらない.*国益.*官房長官として/us,
  },
  {
    id: 'legal-hypothesis',
    title: '法的仮定は基準・考慮要素・結論の限界を説明',
    mode: 'speech',
    respondent: 'prime',
    question: '台湾海峡が海上封鎖された場合、存立危機事態となり得るのか。',
    must: /個別具体的な状況.*攻撃国の意思と能力.*一律に.*断定することはできない/us,
  },
  {
    id: 'genuine-ambiguity',
    title: '真に曖昧な答弁書問は理由を示して一項で限定',
    mode: 'written',
    respondent: 'minister',
    question: '御指摘の「真に十分な少子化対策」の具体的な意味及び政府の評価基準を示されたい。',
    must: /具体的に意味するところ.*明らかではない|一概にお答えすることは困難/u,
    mustNot: /二について/u,
  },
  {
    id: 'two-independent-subjects',
    title: '独立した二主題だけを二項に分ける',
    mode: 'speech',
    respondent: 'minister',
    question: '物価高への対応を問う。また、中小企業への支援策を示されたい。',
    must: /＜物価高＞.*＜中小企業＞/us,
  },
  {
    id: 'malformed-source-repair',
    title: '途中で切れた引用を答弁本文に残さない',
    mode: 'written',
    respondent: 'minister',
    question: '物価高に対する政府の認識と具体的な対応を問う。',
    must: /物価.*賃上げ/us,
    mustNot: /「「|[^」]「[^」]*$/u,
  },
];

export async function runQualityBacktests(caseId = '') {
  const selected = caseId
    ? QUALITY_BACKTEST_CASES.filter((testCase) => testCase.id === caseId)
    : QUALITY_BACKTEST_CASES;
  if (!selected.length) return null;
  const results = [];
  for (const testCase of selected) {
    const draft = await build(testCase.mode, testCase.question, testCase.respondent);
    const calibration = draft.questionAnalysis?.calibration || {};
    const contentChecks = {
      requiredContent: testCase.must ? testCase.must.test(draft.draft || '') : true,
      prohibitedContent: testCase.mustNot ? !testCase.mustNot.test(draft.draft || '') : true,
    };
    results.push({
      id: testCase.id,
      title: testCase.title,
      mode: testCase.mode,
      question: testCase.question,
      passed: calibration.passed === true && Object.values(contentChecks).every(Boolean),
      calibration,
      contentChecks,
      generatedAnswer: draft.draft,
    });
  }
  return {
    version: '28.0',
    methodology: {
      dimensions: ['質問への直接性', '必要要素の充足', '過不足のない長さ', '文の完結性', '質問数と答弁項目数の一致'],
      rule: '単純事実、理由、施策、不確実な時期、政治的評価、法的仮定、曖昧な質問及び複数主題を別々の長さ基準で採点する。',
    },
    passed: results.every((result) => result.passed),
    caseCount: results.length,
    results,
  };
}
