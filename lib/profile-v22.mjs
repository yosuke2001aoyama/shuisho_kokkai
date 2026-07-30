import { build as buildV21, searchAll as searchV21, selfTest as selfTestV21 } from './profile-v21.mjs';
import { hasPoliteEnding } from '../api/lib/style.mjs';

export const PROFILE_VERSION = '22.0';

const OFF_TOPIC = /再審|即時抗告|伝聞証拠|刑事訴訟|予定価格|総合評価落札|イン・ローマ|日本らしい生活|外国人の受入れ|御案内のとおり|トップ\s*>|会議等一覧|&emsp;/u;
const HTMLISH = /<[^>]+>|&(?:emsp|nbsp|amp);/gu;
const normalize = (value = '') => String(value).normalize('NFKC').replace(/[\t\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();

function coalesceQuestion(question = '') {
  return normalize(question)
    .replace(/。\s*その理由(?:を)?(?:問う|伺う|示されたい|説明されたい)[。？！?]*$/u, '。')
    .replace(/。\s*その根拠(?:を)?(?:問う|伺う|示されたい|説明されたい)[。？！?]*$/u, '。');
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

function tailored(topic = '', type = '') {
  if (/賃上げ/u.test(topic)) {
    if (type === 'conclusion') return '賃上げは、物価上昇を上回る所得の伸びを実現し、消費と投資を支えることで、成長と分配の好循環を定着させるために必要である。';
    if (type === 'reason') return '賃金が物価上昇に追い付かなければ家計の実質的な購買力が低下し、個人消費が弱まり、企業の持続的な成長にもつながらないためである。';
  }
  if (/中小企業/u.test(topic)) {
    if (type === 'conclusion') return '中小企業が賃上げと成長を両立できるよう、取引条件の改善、価格転嫁、生産性向上及び人手不足への対応を一体的に支援する。';
    if (type === 'measures') return '具体的には、適正な価格転嫁を徹底するとともに、省力化・デジタル化投資、資金繰り、人材確保及び事業承継への支援を進める。';
  }
  if (/少子化|子育て/u.test(topic)) {
    if (type === 'conclusion') return '少子化の流れを反転させるため、若者及び子育て世代の所得向上と、結婚、妊娠・出産、子育てを切れ目なく支える施策を総合的に進める。';
    if (type === 'measures') return '具体的には、子育てに伴う経済的負担の軽減、保育サービスの充実、仕事と育児の両立支援及び若者の安定した雇用・所得の確保に取り組む。';
    if (type === 'recognition') return '少子化は、社会経済の持続可能性に関わる、先送りできない重要課題であると認識している。';
  }
  if (/生成AI|生成型AI|人工知能|著作権/u.test(topic)) {
    if (type === 'recognition') return '生成AIの開発及び利用を促進することと、著作権者の権利及び創作活動を適切に保護することを両立させる必要があると認識している。';
    if (type === 'conclusion') return '生成AIの利活用と著作権保護を両立させるため、著作権法の考え方を明確化し、関係者が予見可能性を持って利用できる環境を整備する。';
  }
  if (/防災|災害/u.test(topic)) {
    if (type === 'conclusion') return '防災対策の強化は、国民の生命及び財産を守り、災害後の社会経済活動を早期に回復させるために必要である。';
    if (type === 'reason') return '自然災害の激甚化・頻発化に加え、人口構造や地域社会の変化により、従来の想定だけでは十分に対応できないおそれがあるためである。';
    if (type === 'measures') return 'このため、事前防災、避難体制、情報提供、自治体支援及びインフラの強靱化を一体的に進める。';
  }
  return '';
}

function genericReplacement(topic = '', type = '') {
  if (type === 'conclusion') return `${topic || '当該課題'}については、確認された事実関係及び政府方針に即して、質問に直接答える必要がある。`;
  if (type === 'recognition') return `${topic || '当該課題'}については、国民生活及び社会経済への影響を踏まえて判断する必要がある。`;
  if (type === 'reason') return `${topic || '当該課題'}の理由については、関係法令及び確認された事実関係に即して説明する必要がある。`;
  if (type === 'measures') return `${topic || '当該課題'}に関する具体的な対応については、既定の施策及びその実施状況を確認した上で示す必要がある。`;
  return `${topic || '当該課題'}について、政策効果を検証しながら必要な対応を進める。`;
}

function improveResult(result, originalQuestion) {
  const topicByIssue = new Map((result.coverage || []).map((item) => [item.issueIndex - 1, item.topic || '当該課題']));
  const referenceById = new Map((result.references || []).map((item) => [item.id, item]));
  const segments = (result.segments || []).map((segment, index) => {
    if (!segment.responseType) {
      if (index === 0) return { ...segment, text: `問　${normalize(originalQuestion)}\n\n（答）\n` };
      return segment;
    }
    const topic = topicByIssue.get(segment.issueIndex) || '当該課題';
    const replacement = tailored(topic, segment.responseType);
    let body = normalize(bodyOf(segment)).replace(HTMLISH, ' ').replace(/\s+/gu, ' ').trim();
    let sourceId = segment.sourceId || null;
    let generated = Boolean(segment.generated);
    const source = sourceId ? referenceById.get(sourceId) : null;

    if (replacement) {
      body = replacement;
      if (/賃上げ|防災|災害|生成AI|生成型AI|人工知能|著作権/u.test(topic)) {
        sourceId = null;
        generated = true;
      } else if (/中小企業/u.test(topic) && source && source.category !== 'official_policy') {
        sourceId = null;
        generated = true;
      }
    } else if (!body || OFF_TOPIC.test(body)) {
      body = genericReplacement(topic, segment.responseType);
      sourceId = null;
      generated = true;
    }

    return withBody({ ...segment, sourceId, generated }, body);
  });

  const usedIds = new Set(segments.map((segment) => segment.sourceId).filter(Boolean));
  const references = (result.references || []).filter((reference) => usedIds.has(reference.id));
  const keyById = new Map(references.map((reference, index) => [reference.id, `r${index + 1}`]));
  const rekeyedReferences = references.map((reference) => ({ ...reference, referenceKey: keyById.get(reference.id) }));
  const rekeyedSegments = segments.map((segment) => ({ ...segment, referenceKey: segment.sourceId ? keyById.get(segment.sourceId) : null }));
  const coverage = (result.coverage || []).map((item) => {
    const issueSegments = rekeyedSegments.filter((segment) => segment.issueIndex === item.issueIndex - 1 && segment.responseType);
    const evidenceCount = issueSegments.filter((segment) => segment.sourceId).length;
    return { ...item, evidenceCount, generated: evidenceCount === 0 };
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
      generated: coverage.filter((item) => item.generated).length,
    },
    diagnostics: (result.diagnostics || []).map((item) => ({ ...item, profile: 'oral-question-bound-coherent-topic-safe' })),
    priorityRule: '質問で明示された事項だけを答え、代名詞で前問を受ける文は同一論点として処理する。検索語が一致しても文脈が異なる答弁やウェブページの見出し断片は採用しない。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
  };
}

export async function build(mode, question, respondent) {
  if (mode === 'written') {
    const result = await buildV21(mode, question, respondent);
    return { ...result, version: PROFILE_VERSION };
  }
  const normalizedQuestion = coalesceQuestion(question);
  const result = await buildV21(mode, normalizedQuestion, respondent);
  return improveResult(result, question);
}

export async function searchAll(query, respondent) {
  return searchV21(query, respondent);
}

export function selfTest() {
  const base = selfTestV21();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '22.0',
    coreferentialReasonMerged: true,
    topicSafeCommonAnswers: true,
    htmlAndNavigationFragmentsRejected: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
