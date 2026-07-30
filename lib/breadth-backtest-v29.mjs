import { DOMAIN_PRECEDENT_CASES } from './cross-domain-precedents-v29.mjs';
import { build } from './profile-v29.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const publicCase = (entry) => ({
  id: entry.id,
  domain: entry.domain,
  ministry: entry.ministry,
  question: entry.question,
});

export function listBreadthBacktests() {
  return DOMAIN_PRECEDENT_CASES.map(publicCase);
}

const sentences = (draft = '') => normalize(draft)
  .replace(/^(?:問.+?（答）|[一二三四五六七八九十百]+について)\s*/u, '')
  .match(/[^。！？]+[。！？]/gu) || [];

async function evaluate(entry, mode) {
  const draft = await build(mode, entry.question, 'minister');
  const normalizedDraft = normalize(draft.draft);
  entry.must.lastIndex = 0;
  const checks = {
    selectedIntendedPrecedent: draft.breadthDomain?.id === entry.id,
    answersRequestedPredicate: draft.questionAnalysis?.answerContract?.passed === true,
    satisfiesDomainAnswerKey: entry.must.test(normalizedDraft),
    oneIndependentIssue: draft.issueCount === 1,
    noSyntheticIssueHeadings: !/●|論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft),
    completeSentences: sentences(draft.draft).length >= 1
      && /[。）」』]$/u.test(normalizedDraft),
    roleReviewPassed: Object.values(draft.draftingQuality || {}).every((gate) => gate.passed),
    officialWrittenStyle: mode !== 'written' || draft.officialStyleCheck?.passed === true,
    oralUsesWhiteCircles: mode !== 'speech'
      || (draft.draft.match(/^○　/gmu) || []).length
        === entry.paragraphs.length,
    answerLengthBounded: mode === 'written'
      ? normalizedDraft.length <= 720
      : (draft.segments || [])
        .filter((segment) => segment.responseType)
        .every((segment) => normalize(segment.text).replace(/^○\s*/u, '').length <= 190),
  };
  return {
    id: entry.id,
    domain: entry.domain,
    ministry: entry.ministry,
    mode,
    question: entry.question,
    passed: Object.values(checks).every(Boolean),
    checks,
    answerContract: draft.questionAnalysis?.answerContract,
    generatedAnswer: draft.draft,
    references: (draft.references || []).map((reference) => ({
      title: reference.title,
      sourceName: reference.sourceName,
      url: reference.url,
    })),
  };
}

export async function runBreadthBacktests(caseId = '') {
  const entries = caseId
    ? DOMAIN_PRECEDENT_CASES.filter((entry) => entry.id === caseId)
    : DOMAIN_PRECEDENT_CASES;
  if (!entries.length) return null;
  const results = [];
  for (const entry of entries) {
    results.push(await evaluate(entry, 'speech'));
    results.push(await evaluate(entry, 'written'));
  }
  const domains = [...new Set(entries.map((entry) => entry.domain))];
  const ministries = [...new Set(entries.flatMap((entry) => entry.ministry.split('・')))];
  return {
    version: '29.0',
    methodology: {
      coverageRule: '国政の主要な制度分野を省庁横断で選び、各分野に判定対象が明確な難問を置く。',
      formRule: '同じ質問を国会口頭答弁と質問主意書答弁書の二形式で生成し、結論、根拠、当てはめ及び分量を検査する。',
      evidenceRule: '質問の主題が一致するだけでは合格とせず、対象、法令及び求められた判断を直接裏付ける前例だけを合格とする。',
      failureRule: '一つでも判定対象への直接回答を欠く場合は全体を不合格とする。',
    },
    passed: results.every((result) => result.passed),
    domainCount: domains.length,
    sourceCaseCount: entries.length,
    formCaseCount: results.length,
    ministries,
    domains,
    failedCount: results.filter((result) => !result.passed).length,
    results,
  };
}
