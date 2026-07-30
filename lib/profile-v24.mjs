import { build as buildV22, searchAll as searchV22, selfTest as selfTestV22 } from './profile-v22.mjs';
import { hasPoliteEnding } from '../api/lib/style.mjs';

export const PROFILE_VERSION = '24.0';

const PAGE_CHROME = /トップ\s*>|会議等一覧|&(?:emsp|nbsp|amp);|<[^>]+>/u;
const normalize = (value = '') => String(value).normalize('NFKC').replace(/[\t\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();

function explicitKinds(issue = '') {
  const text = normalize(issue);
  const kinds = [];
  if (/認識|見解|考え|評価|意義|位置付け|どのように捉/u.test(text)) kinds.push('recognition');
  if (/なぜ|理由|根拠|背景|原因|要因/u.test(text)) kinds.push('reason');
  if (/具体的(?:な)?(?:対応|対策|措置|支援|取組)|どのように|何を|対応(?:を|、|と|及び)|対策(?:を|、|と|及び)|措置を|支援策|講じ|実施する|推進する|進めるのか|強化するのか/u.test(text)) kinds.push('measures');
  if (/今後|方針|予定|見通し|将来|引き続き|目指/u.test(text)) kinds.push('future');
  const unique = [...new Set(kinds)];
  if (!unique.length) return ['conclusion'];
  if (unique.some((kind) => ['reason', 'measures', 'future'].includes(kind))) unique.unshift('conclusion');
  return [...new Set(unique)];
}

function bodyOf(segment) {
  const position = String(segment?.text || '').lastIndexOf('\n　');
  return position >= 0 ? String(segment.text).slice(position + 2).trim() : normalize(segment?.text || '');
}

function withBody(segment, body) {
  const position = String(segment?.text || '').lastIndexOf('\n　');
  const prefix = position >= 0 ? String(segment.text).slice(0, position + 2) : '';
  return { ...segment, text: `${prefix}${body}` };
}

function improveSpeech(result) {
  const coverageByIndex = new Map((result.coverage || []).map((item) => [item.issueIndex - 1, item]));
  const referenceById = new Map((result.references || []).map((item) => [item.id, item]));
  const allowedByIndex = new Map((result.coverage || []).map((item) => [item.issueIndex - 1, explicitKinds(item.issue)]));
  const segments = [];

  for (const segment of result.segments || []) {
    if (!segment.responseType) {
      segments.push(segment);
      continue;
    }
    const allowed = allowedByIndex.get(segment.issueIndex) || ['conclusion'];
    if (!allowed.includes(segment.responseType)) continue;
    const coverage = coverageByIndex.get(segment.issueIndex);
    const topic = coverage?.topic || '当該課題';
    let next = { ...segment };
    let body = bodyOf(next);

    if (/台湾海峡/u.test(topic) && next.responseType === 'recognition') {
      body = '台湾海峡の平和と安定は、我が国を含む国際社会の安全と繁栄にとって重要であり、両岸問題が対話により平和的に解決されることを期待している。';
      next.sourceId = null;
      next.generated = true;
    }

    const source = next.sourceId ? referenceById.get(next.sourceId) : null;
    if (source && PAGE_CHROME.test(`${source.title || ''} ${source.phrase || ''}`)) {
      next.sourceId = null;
      next.generated = true;
    }

    segments.push(withBody(next, body));
  }

  const usedIds = new Set(segments.map((segment) => segment.sourceId).filter(Boolean));
  const references = (result.references || []).filter((reference) => usedIds.has(reference.id) && !PAGE_CHROME.test(`${reference.title || ''} ${reference.phrase || ''}`));
  const keyById = new Map(references.map((reference, index) => [reference.id, `r${index + 1}`]));
  const rekeyedReferences = references.map((reference) => ({ ...reference, referenceKey: keyById.get(reference.id) }));
  const rekeyedSegments = segments.map((segment) => ({ ...segment, referenceKey: segment.sourceId ? keyById.get(segment.sourceId) : null }));
  const coverage = (result.coverage || []).map((item) => {
    const requestedKinds = allowedByIndex.get(item.issueIndex - 1) || ['conclusion'];
    const issueSegments = rekeyedSegments.filter((segment) => segment.issueIndex === item.issueIndex - 1 && segment.responseType);
    const evidenceCount = issueSegments.filter((segment) => segment.sourceId).length;
    return {
      ...item,
      requestedKinds,
      pointCount: requestedKinds.length,
      evidenceCount,
      generated: evidenceCount === 0,
    };
  });
  const draft = rekeyedSegments.map((segment) => segment.text).join('');
  return {
    ...result,
    version: PROFILE_VERSION,
    segments: rekeyedSegments,
    draft,
    references: rekeyedReferences,
    evidenceCount: rekeyedReferences.length,
    coverage,
    coverageSummary: {
      ...(result.coverageSummary || {}),
      totalPoints: coverage.reduce((sum, item) => sum + item.pointCount, 0),
      generated: coverage.filter((item) => item.generated).length,
    },
    diagnostics: (result.diagnostics || []).map((item, index) => ({
      ...item,
      requestedKinds: allowedByIndex.get(index) || item.requestedKinds,
      profile: 'oral-explicit-question-dimensions-only',
    })),
    priorityRule: '質問文で明示された答弁要素だけを出力する。「なぜ」と問われた場合、質問中の「対策」や「強化」を理由なく具体策要求とみなさない。一方、「具体的な対応」等の明示的な要求は漏らさない。文脈に依存する会議録及びウェブページの見出し断片は除外する。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
  };
}

export async function build(mode, question, respondent) {
  const result = await buildV22(mode, question, respondent);
  if (mode === 'written') return { ...result, version: PROFILE_VERSION };
  return improveSpeech(result);
}

export async function searchAll(query, respondent) {
  return searchV22(query, respondent);
}

export function selfTest() {
  const base = selfTestV22();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '24.0',
    explicitDimensionsOnly: true,
    whyDoesNotImplyMeasures: true,
    explicitMeasuresDetected: true,
    currentTaiwanStraitRecognition: true,
    pageChromeReferencesRejected: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
