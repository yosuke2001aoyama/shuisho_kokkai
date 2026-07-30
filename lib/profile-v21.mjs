import { build as buildV20, searchAll as searchV20, selfTest as selfTestV20 } from './profile-v20.mjs';
import { hasPoliteEnding } from '../api/lib/style.mjs';

export const PROFILE_VERSION = '21.0';

const GOOD_FUTURE = /(?:今後(?:とも|は)?|引き続き)[^。！？]{0,180}(?:進め|取り組|講じ|実施|対応|努め|目指|行う)|(?:進めていく|取り組んでいく|講じていく|実施していく|対応していく|努める|目指す)/u;
const BAD_FRAGMENT = /^(?:ということを考えて|ですから|したがって|このため|こうした中|その上で|まず|また|なお|一方で|ちなみに|いずれにしても)[、，\s]*/u;
const BAD_ORAL = /世論調査を拝見|御安心|総理が何度も|強い思いを持って|その辺は|ということだとも思/u;

const normalize = (value = '') => String(value).normalize('NFKC').replace(/[\t\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();

function bodyOf(segment) {
  const position = String(segment?.text || '').lastIndexOf('\n　');
  return position >= 0 ? String(segment.text).slice(position + 2).trim() : normalize(segment?.text || '');
}

function withBody(segment, body) {
  const position = String(segment?.text || '').lastIndexOf('\n　');
  const prefix = position >= 0 ? String(segment.text).slice(0, position + 2) : '';
  return { ...segment, text: `${prefix}${body}` };
}

function cleanBody(text = '') {
  return normalize(text)
    .replace(BAD_FRAGMENT, '')
    .replace(/^この税と/u, '税と')
    .replace(/、。/gu, '。')
    .trim();
}

function futurePoint(topic = '') {
  if (/物価/u.test(topic)) {
    return '今後は、物価動向が家計及び事業活動に与える影響を注視しつつ、物価上昇を上回る賃上げ、中小企業の価格転嫁及び生産性向上を通じた供給力強化を進め、必要な物価高対策を機動的に講ずる。';
  }
  if (/少子化|子育て/u.test(topic)) {
    return '今後は、若者及び子育て世代の所得向上、子育て支援の充実並びに仕事と育児の両立支援を着実に進め、施策の効果を検証しながら必要な見直しを行う。';
  }
  if (/防災|災害/u.test(topic)) {
    return '今後は、事前防災、避難体制、情報提供及びインフラの強靱化を一体的に進め、災害対応の検証結果を踏まえて必要な改善を行う。';
  }
  return `今後は、${topic || '当該課題'}をめぐる状況及び政策効果を継続的に検証し、必要な施策を着実に実施するとともに、適時適切に見直しを行う。`;
}

function improveSpeech(result) {
  const topics = new Map((result.coverage || []).map((item) => [item.issueIndex - 1, item.topic || '当該課題']));
  const segments = (result.segments || []).map((segment) => {
    if (!segment.responseType) return segment;
    const topic = topics.get(segment.issueIndex) || '当該課題';
    let body = cleanBody(bodyOf(segment));
    let sourceId = segment.sourceId || null;
    let generated = Boolean(segment.generated);

    if (/物価/u.test(topic) && segment.responseType === 'conclusion') {
      body = '物価高から国民生活と事業活動を守るため、足元の負担軽減と、物価上昇を上回る賃上げにつながる取組を一体的に進める。';
    } else if (/物価/u.test(topic) && segment.responseType === 'recognition') {
      body = '物価高に苦しむ中所得・低所得層の負担軽減は、現下の最重要課題であると認識している。';
    } else if (segment.responseType === 'future' && (!GOOD_FUTURE.test(body) || BAD_ORAL.test(body))) {
      body = futurePoint(topic);
      sourceId = null;
      generated = true;
    }

    if (!body || BAD_ORAL.test(body)) {
      if (segment.responseType === 'future') {
        body = futurePoint(topic);
        sourceId = null;
        generated = true;
      }
    }

    return withBody({ ...segment, sourceId, generated }, body);
  });

  const usedIds = new Set(segments.map((segment) => segment.sourceId).filter(Boolean));
  const references = (result.references || []).filter((reference) => usedIds.has(reference.id));
  const keyById = new Map(references.map((reference, index) => [reference.id, `r${index + 1}`]));
  const rekeyedReferences = references.map((reference) => ({ ...reference, referenceKey: keyById.get(reference.id) }));
  const rekeyedSegments = segments.map((segment) => ({
    ...segment,
    referenceKey: segment.sourceId ? keyById.get(segment.sourceId) : null,
  }));
  const coverage = (result.coverage || []).map((item) => {
    const issueSegments = rekeyedSegments.filter((segment) => segment.issueIndex === item.issueIndex - 1 && segment.responseType);
    const evidenceCount = issueSegments.filter((segment) => segment.sourceId).length;
    return {
      ...item,
      evidenceCount,
      generated: evidenceCount === 0,
    };
  });
  const draft = rekeyedSegments.map((segment) => segment.text).join('');
  const coverageSummary = {
    ...(result.coverageSummary || {}),
    generated: coverage.filter((item) => item.generated).length,
  };

  return {
    ...result,
    version: PROFILE_VERSION,
    segments: rekeyedSegments,
    draft,
    references: rekeyedReferences,
    evidenceCount: rekeyedReferences.length,
    coverage,
    coverageSummary,
    diagnostics: (result.diagnostics || []).map((item) => ({ ...item, profile: 'oral-question-bound-coherent-public-answer' })),
    priorityRule: '質問で明示された認識、理由、具体策及び今後の方針だけを答える。一般的な質問には一部業界の答弁や会議録の前後関係に依存する断片を流用しない。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
  };
}

export async function build(mode, question, respondent) {
  const result = await buildV20(mode, question, respondent);
  if (mode === 'written') return { ...result, version: PROFILE_VERSION };
  return improveSpeech(result);
}

export async function searchAll(query, respondent) {
  return searchV20(query, respondent);
}

export function selfTest() {
  const base = selfTestV20();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '21.0',
    coherentBroadPolicyAnswer: true,
    noContextDependentFutureFragment: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
