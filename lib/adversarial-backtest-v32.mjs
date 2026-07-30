import { FOREIGN_SECURITY_CASES } from './foreign-security-v30.mjs';
import { build } from './profile-v32.mjs';

const RESPONDENTS = ['prime', 'chief', 'minister', 'official'];
const MODES = ['speech', 'written'];

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

function stem(question = '') {
  return normalize(question).replace(/[。？！?]+$/u, '');
}

function rewriteEnding(question, replacements, fallback) {
  const original = stem(question);
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(original)) return original.replace(pattern, replacement);
  }
  return `${original}${fallback}`;
}

export function foreignSecurityParaphrases(question) {
  return [
    `${rewriteEnding(question, [
      [/は何か$/u, 'を具体的に示されたい'],
      [/なのか$/u, 'との認識でよいか'],
      [/のか$/u, 'か。政府の見解いかん'],
      [/か$/u, 'か、答弁を求める'],
    ], 'について答弁を求める')}。`,
    `${rewriteEnding(
      stem(question)
        .replaceAll('政府は', '政府としては')
        .replaceAll('我が国', '日本')
        .replaceAll('どのように', 'いかに'),
      [
        [/は何か$/u, 'について見解いかん'],
        [/なのか$/u, 'と認識しているのか'],
        [/のか$/u, 'か、明確にされたい'],
      ],
      'について明確にされたい',
    )}。`,
    `${rewriteEnding(
      stem(question)
        .replaceAll('政府の', '政府としての')
        .replaceAll('政府は', '政府としては')
        .replaceAll('どのように', 'いかなる方針で'),
      [
        [/理由は何か$/u, '理由いかん'],
        [/は何か$/u, 'はいかん'],
        [/なのか$/u, 'との認識か、所見を問う'],
        [/のか$/u, 'か、所見を問う'],
      ],
      'について所見を問う',
    )}。`,
  ];
}

const UNSEEN_SUBJECTS = [
  '月面資源採掘の国際許可制度',
  '海底データセンターの耐災害認証制度',
  '量子暗号通信の輸出審査基準',
  '培養肉の学校給食導入基準',
  '合成生物学実験施設の地域同意制度',
  '自律型配送ロボットの事故補償基金',
  '遺伝子編集ペットの輸入検疫制度',
  '民間気象衛星の災害警報責任',
  '脳機械接続機器の職場利用規制',
  '深海観光船の国際安全認証',
  'AI裁判支援システムの証拠評価基準',
  '砂漠農業向け水輸出の安全保障審査',
  '個人用飛行車の騒音補償制度',
];

const UNSEEN_TEMPLATES = [
  (subject) => `${subject}の開始予定いかん。`,
  (subject) => `${subject}を放置しているのは政府が無策だからではないか。`,
  (subject) => `${subject}について総理と関係国首脳が会談する日程いかん。`,
  (subject) => `${subject}への対応は既得権益に迎合したものではないか。`,
];

export const UNSEEN_HIGH_RISK_QUESTIONS = UNSEEN_SUBJECTS.flatMap((subject) =>
  UNSEEN_TEMPLATES.map((template) => template(subject)));

const supportedCases = FOREIGN_SECURITY_CASES.flatMap((entry) =>
  foreignSecurityParaphrases(entry.question).map((question, paraphraseIndex) => ({
    kind: 'supported-paraphrase',
    id: entry.id,
    paraphraseIndex,
    question,
    must: entry.must,
  })));

const unsupportedCases = UNSEEN_HIGH_RISK_QUESTIONS.map((question, index) => ({
  kind: 'unsupported-unseen',
  id: `unseen-${String(index + 1).padStart(2, '0')}`,
  question,
}));

async function evaluate(testCase, respondent, mode) {
  const draft = await build(mode, testCase.question, respondent);
  const oldGeneric = /関係法令及び個別具体的な状況に即して、政府として適切に判断する|政策効果を総合し、我が国として責任を持って行う/u.test(draft.draft || '');
  if (testCase.kind === 'unsupported-unseen') {
    const checks = {
      publicationBlocked: draft.publicationGate?.passed === false,
      noDisplayedGenericDraft: !(draft.draft || '').trim(),
      noInventedReference: (draft.references || []).length === 0,
      noOldGenericFallback: !oldGeneric,
    };
    return {
      ...testCase,
      respondent,
      mode,
      passed: Object.values(checks).every(Boolean),
      checks,
      publicationGate: draft.publicationGate,
    };
  }

  testCase.must.lastIndex = 0;
  const checks = {
    intendedDecisionCategory: draft.foreignSecurityDomain?.id === testCase.id,
    publicationAllowed: draft.publicationGate?.passed === true,
    directAnswerContract: draft.questionAnalysis?.answerContract?.passed === true,
    answerKeySatisfied: testCase.must.test(normalize(draft.draft)),
    officialReferencePresent: (draft.references || []).length > 0,
    noOldGenericFallback: !oldGeneric,
    noSyntheticIssueHeading: !/●|論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft || ''),
  };
  return {
    ...testCase,
    must: undefined,
    respondent,
    mode,
    passed: Object.values(checks).every(Boolean),
    checks,
    selectedId: draft.foreignSecurityDomain?.id || null,
    publicationGate: draft.publicationGate,
  };
}

export async function runAdversarialBacktests() {
  const cases = [...supportedCases, ...unsupportedCases];
  const results = [];
  for (const testCase of cases) {
    for (const respondent of RESPONDENTS) {
      for (const mode of MODES) {
        results.push(await evaluate(testCase, respondent, mode));
      }
    }
  }
  const failures = results.filter((result) => !result.passed);
  return {
    version: '32.0',
    methodology: {
      supported: '外交・安全保障66判断類型について、元の質問文と一致しない三種類の国会調言い換えを作り、正しい判断類型、直接回答、一次資料及び答弁要素を検査する。',
      unsupported: '収録していない13分野を予定問・政治評価問の四形式で尋ね、根拠のない汎用答弁や架空の出典を公開しないことを検査する。',
      rolesAndForms: '総理・官房長官・大臣・政府参考人の四役職と、口頭答弁・質問主意書答弁書の二形式を全組合せで検査する。',
    },
    passed: failures.length === 0,
    supportedQuestionCount: supportedCases.length,
    unsupportedQuestionCount: unsupportedCases.length,
    distinctQuestionCount: cases.length,
    trialCount: results.length,
    oralTrialCount: results.filter((result) => result.mode === 'speech').length,
    writtenTrialCount: results.filter((result) => result.mode === 'written').length,
    failureCount: failures.length,
    failures,
  };
}
