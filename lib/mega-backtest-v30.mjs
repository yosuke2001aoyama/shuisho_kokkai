import { DOMAIN_PRECEDENT_CASES } from './cross-domain-precedents-v29.mjs';
import { FOREIGN_SECURITY_CASES } from './foreign-security-v30.mjs';
import { build } from './profile-v30.mjs';

const RESPONDENTS = ['prime', 'chief', 'minister', 'official'];
const MODES = ['speech', 'written'];
const QUESTION_VARIANTS = [
  (question) => question,
  (question) => `次の点を確認する。${question}`,
];

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const domesticCases = DOMAIN_PRECEDENT_CASES.filter((entry) =>
  ![
    'territory-senkaku-article-five',
    'foreign-taiwan-relations',
    'space-policy',
  ].includes(entry.id));

const sourceCases = [
  ...FOREIGN_SECURITY_CASES.map((entry) => ({
    family: 'foreign-security',
    id: entry.id,
    domain: entry.domain,
    ministry: entry.ministry,
    question: entry.question,
    paragraphs: entry.paragraphs,
    must: entry.must,
  })),
  ...domesticCases.map((entry) => ({
    family: 'domestic',
    id: entry.id,
    domain: entry.domain,
    ministry: entry.ministry,
    question: entry.question,
    paragraphs: entry.paragraphs,
    must: entry.must,
  })),
];

function publicCase(entry) {
  return {
    family: entry.family,
    id: entry.id,
    domain: entry.domain,
    ministry: entry.ministry,
    question: entry.question,
  };
}

export function listMegaBacktests() {
  return sourceCases.map(publicCase);
}

function matchedExpectedCase(draft, entry) {
  return entry.family === 'foreign-security'
    ? draft.foreignSecurityDomain?.id === entry.id
    : draft.breadthDomain?.id === entry.id;
}

function crossFormCount(draft, mode) {
  return (draft.references || []).filter((reference) =>
    mode === 'written'
      ? reference.sourceType === 'answer'
      : reference.sourceType === 'written').length;
}

async function evaluate(entry, variantIndex, respondent, mode) {
  const question = QUESTION_VARIANTS[variantIndex](entry.question);
  const draft = await build(mode, question, respondent);
  const normalizedDraft = normalize(draft.draft);
  entry.must.lastIndex = 0;
  const crossForm = crossFormCount(draft, mode);
  const expectedParagraphs = entry.id === 'alliance-autonomy' && mode === 'speech'
    ? entry.paragraphs.length + 1
    : entry.paragraphs.length;
  const answerSegments = (draft.segments || []).filter((segment) => segment.responseType);
  const checks = {
    selectedIntendedPrecedent: matchedExpectedCase(draft, entry),
    answersRequestedPredicate: draft.questionAnalysis?.answerContract?.passed === true,
    satisfiesDomainAnswerKey: entry.must.test(normalizedDraft),
    oneIndependentIssue: draft.issueCount === 1,
    noSyntheticIssueHeadings: !/●|論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft),
    roleReviewPassed: Object.values(draft.draftingQuality || {}).every((gate) => gate.passed),
    sourceFormsSeparated: draft.sourceSeparation?.passed === true,
    noUnnecessaryCrossFormSource: crossForm === 0 || draft.sourceSeparation?.fallbackUsed === true,
    officialWrittenStyle: mode !== 'written' || draft.officialStyleCheck?.passed === true,
    oralUsesWhiteCircles: mode !== 'speech'
      || (draft.draft.match(/^○　/gmu) || []).length === expectedParagraphs,
    paragraphCountCalibrated: mode === 'written'
      ? answerSegments.length === 1
      : answerSegments.length === expectedParagraphs,
    completeAnswer: /[。）」』]$/u.test(normalizedDraft),
    answerLengthBounded: mode === 'written'
      ? normalizedDraft.length <= 720
      : answerSegments.every((segment) =>
        normalize(segment.text).replace(/^○\s*/u, '').length <= 190),
  };
  return {
    id: entry.id,
    family: entry.family,
    domain: entry.domain,
    variantIndex,
    respondent,
    mode,
    passed: Object.values(checks).every(Boolean),
    checks,
    crossFormReferenceCount: crossForm,
    fallbackUsed: draft.sourceSeparation?.fallbackUsed === true,
    question,
    generatedAnswer: draft.draft,
    references: (draft.references || []).map((reference) => ({
      sourceType: reference.sourceType,
      title: reference.title,
      sourceName: reference.sourceName,
      url: reference.url,
    })),
  };
}

export async function runMegaBacktests(caseId = '') {
  const entries = caseId
    ? sourceCases.filter((entry) => entry.id === caseId)
    : sourceCases;
  if (!entries.length) return null;
  const results = [];
  for (const entry of entries) {
    for (let variantIndex = 0; variantIndex < QUESTION_VARIANTS.length; variantIndex += 1) {
      for (const respondent of RESPONDENTS) {
        for (const mode of MODES) {
          results.push(await evaluate(entry, variantIndex, respondent, mode));
        }
      }
    }
  }
  const failures = results.filter((result) => !result.passed);
  const sourceViolations = results.filter((result) =>
    result.crossFormReferenceCount > 0 && !result.fallbackUsed);
  return {
    version: '30.0',
    methodology: {
      scope: '外交・安全保障64判断類型と、重複を除く外交・安全保障以外43制度類型を対象とする。',
      matrix: '各類型を二つの聞き方、総理・官房長官・大臣・政府参考人、国会口頭答弁・質問主意書答弁書の全組合せで試験する。',
      answerRule: '質問の判定対象への直接回答、確定した政府見解、必要な法的限界、白丸段落、分量及び文の完結を同時に検査する。',
      sourceRule: '国会口頭答弁と質問主意書答弁書の相互引用は、会見・演説、インタビュー、法令又は政府公式資料等の代替根拠がない場合に限る。',
      limitation: '試験は判断類型と聞き方の組合せを検証するもので、将来発生する全ての固有事件の事実関係を事前に保証するものではない。',
    },
    passed: failures.length === 0 && sourceViolations.length === 0,
    sourceCaseCount: entries.length,
    diplomacySecurityCaseCount: entries.filter((entry) =>
      entry.family === 'foreign-security').length,
    domesticCaseCount: entries.filter((entry) => entry.family === 'domestic').length,
    questionVariantCount: QUESTION_VARIANTS.length,
    respondentCount: RESPONDENTS.length,
    formCount: MODES.length,
    trialCount: results.length,
    oralTrialCount: results.filter((result) => result.mode === 'speech').length,
    writtenTrialCount: results.filter((result) => result.mode === 'written').length,
    failureCount: failures.length,
    unnecessaryCrossFormSourceCount: sourceViolations.length,
    failures,
    results: caseId ? results : undefined,
  };
}
