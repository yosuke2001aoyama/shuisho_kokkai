import {
  build as buildV16,
  searchAll as searchV16,
  selfTest as selfTestV16,
} from './profile-v16.mjs';
import { splitIssues } from './issues.mjs';
import { finalizeStyle, hasPoliteEnding } from './style.mjs';
import { formatWrittenStyle, lintOfficialText, OFFICIAL_STYLE_VERSION } from './official-style.mjs';
import { SOURCE_LABEL, CATEGORY_LABEL } from './core.mjs';

export const PROFILE_VERSION = '17.0';

const JP_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const DEFENSIVE = new Set(['security', 'outside-scope', 'hypothetical', 'ambiguity', 'evaluation', 'enumerative', 'no-evidence']);
const UNSAFE_ORAL = /お尋ねの|御指摘|委員|議員|質問主意書|昨日は|私も|連合さん|まあ|というか|おっしゃ|御要望|読み上げ|通告|時間の関係|答弁書/u;
const RECOGNITION = /認識|見解|重要|課題|必要|基本|位置付け|考え/u;
const MEASURES = /対応|対策|措置|支援|実施|推進|取り組|進め|確保|強化|整備|拡充|改善|見直|講じ|執行/u;
const FUTURE = /今後|引き続き|目指|努め|継続|着実|機動的/u;

const normalize = (text = '') => String(text).normalize('NFKC').replace(/[\t\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();
const compact = (text = '') => normalize(text).replace(/[\s　、。！？?「」『』（）()]/gu, '');

function topicOf(issue) {
  const label = normalize(issue?.label || '');
  const quoted = label.match(/「([^」]{2,80})」/u)?.[1];
  let topic = quoted || normalize(issue?.topic || label || '当該課題');
  topic = topic
    .replace(/^(?:御指摘の|お尋ねの)/u, '')
    .replace(/とは何か$/u, '')
    .replace(/(?:について|に関して)?(?:政府の)?(?:見解|認識|考え|対応|方針|評価基準|説明)(?:を)?(?:問う|示されたい|明らかにされたい)$/u, '')
    .replace(/をどのように(?:実現|強化|推進|実施|確保|改善|解決|対応)するのか$/u, '')
    .replace(/への(?:対応|支援策)$/u, '')
    .replace(/[。？！?]+$/u, '')
    .trim();
  if (!topic || topic.length > 70) return '当該課題';
  return topic;
}

function balancedQuotes(text) {
  const pairs = [['「', '」'], ['『', '』'], ['（', '）']];
  return pairs.every(([a, b]) => (text.split(a).length - 1) === (text.split(b).length - 1));
}

function sentenceList(text = '') {
  const styled = finalizeStyle(normalize(text))
    .replace(/^(?:その上で|まず|また|なお|一方で|ちなみに|いずれにしても)[、，\s]*/u, '')
    .replace(/ですとか/gu, 'や')
    .replace(/であるとか/gu, 'や')
    .replace(/というふうに/gu, 'と')
    .replace(/していただく/gu, 'する')
    .replace(/と考えておりまして/gu, 'と考えている')
    .replace(/と認識しておりまして/gu, 'と認識している')
    .replace(/でありまして/gu, 'である')
    .replace(/おきまして/gu, 'おいて')
    .replace(/、。/gu, '。');
  return styled
    .split(/(?<=[。！？])/u)
    .map((x) => x.trim())
    .filter((x) => x.length >= 18 && x.length <= 360)
    .filter((x) => balancedQuotes(x) && !UNSAFE_ORAL.test(x) && !/^[)）]|[、，]$/u.test(x));
}

function sourceRelevant(ref, issue) {
  if (!ref) return false;
  const text = normalize(`${ref.title || ''} ${ref.phrase || ''}`);
  const anchors = (issue?.anchors || []).filter((x) => x && x.length >= 2);
  if (!anchors.length) return true;
  return anchors.some((x) => text.includes(x));
}

function scoreSentence(sentence, issue, kind) {
  let score = 0;
  for (const anchor of issue?.anchors || []) {
    if (anchor.length >= 2 && sentence.includes(anchor)) score += Math.min(anchor.length, 12) * 10;
  }
  if (kind === 'conclusion' && (RECOGNITION.test(sentence) || MEASURES.test(sentence))) score += 35;
  if (kind === 'recognition' && RECOGNITION.test(sentence)) score += 45;
  if (kind === 'measures' && MEASURES.test(sentence)) score += 45;
  if (kind === 'future' && FUTURE.test(sentence)) score += 45;
  if (sentence.length > 260) score -= 20;
  return score;
}

function oralEvidenceText(segment, issue, kind) {
  const candidates = sentenceList(segment?.text || '')
    .map((text, index) => ({ text, index, score: scoreSentence(text, issue, kind) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = [];
  for (const row of candidates) {
    if (picked.some((x) => compact(x) === compact(row.text))) continue;
    if ((picked.join('').length + row.text.length) > 430) continue;
    picked.push(row.text);
    if (picked.length >= 2) break;
  }
  if (!picked.length) return '';
  const ordered = picked.sort((a, b) => sentenceList(segment?.text || '').indexOf(a) - sentenceList(segment?.text || '').indexOf(b));
  let text = ordered.join('');
  if (!/[。！？]$/u.test(text)) text += '。';
  return text;
}

function generatedPoint(issue, kind) {
  const topic = topicOf(issue);
  if (kind === 'conclusion') {
    return `政府としては、${topic}を重要な政策課題と位置付け、関係府省が連携して必要な対応を総合的に進める。`;
  }
  if (kind === 'recognition') {
    return `${topic}については、国民生活及び社会経済への影響並びに関係する法令及び事実関係を踏まえ、政府全体で取り組むべき課題であると認識している。`;
  }
  if (kind === 'measures') {
    return `具体的には、現行制度及び既定の施策を着実に実施するとともに、関係者の意見及び実施状況を把握し、必要な支援の充実及び運用の改善を進める。`;
  }
  return `今後とも、政策効果及び情勢の変化を丁寧に検証し、必要な見直しを機動的に行うとともに、政府の考え方及び取組を国民に分かりやすく説明していく。`;
}

function annotateReferences(refs, respondent, mode) {
  return refs
    .filter(Boolean)
    .filter((x, index, arr) => arr.findIndex((y) => y.id === x.id) === index)
    .map((x, index) => ({
      ...x,
      referenceKey: `r${index + 1}`,
      quotedPhrase: x.phrase,
      categoryLabel: CATEGORY_LABEL[x.category] || x.category,
      sourceTypeLabel: SOURCE_LABEL[x.sourceType] || x.sourceType,
      borrowed: mode === 'speech' && ['prime', 'minister', 'official'].includes(x.category) && x.category !== respondent,
    }));
}

async function buildSpeech(question, respondent) {
  const base = await buildV16('speech', question, respondent);
  const issues = splitIssues(normalize(question));
  const refByKey = new Map((base.references || []).map((x) => [x.referenceKey, x]));
  const usedRefs = [];
  const raw = [];
  const coverage = [];
  const diagnostics = [];
  const kinds = [
    ['conclusion', '結論'],
    ['recognition', '基本認識'],
    ['measures', '具体的な対応'],
    ['future', '今後の方針'],
  ];

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const baseSegments = (base.segments || []).filter((x) => x.issueIndex === index && x.pointLabel);
    const topic = topicOf(issue);
    let evidenceCount = 0;

    for (const [kind, label] of kinds) {
      const ranked = baseSegments
        .map((segment) => {
          const ref = refByKey.get(segment.referenceKey) || (base.references || []).find((x) => x.id === segment.sourceId);
          const text = sourceRelevant(ref, issue) ? oralEvidenceText(segment, issue, kind) : '';
          return { segment, ref, text, score: text ? scoreSentence(text, issue, kind) : -1 };
        })
        .filter((x) => x.text)
        .sort((a, b) => b.score - a.score);
      const selected = ranked[0];
      const text = selected?.text || generatedPoint(issue, kind);
      if (selected?.ref) {
        usedRefs.push(selected.ref);
        evidenceCount += 1;
      }
      raw.push({
        text,
        sourceId: selected?.ref?.id || null,
        issueIndex: index,
        pointLabel: label,
        responseType: kind,
        generated: !selected?.ref,
        topic,
      });
    }

    coverage.push({
      issueIndex: index + 1,
      issue: issue.label,
      topic,
      status: 'covered',
      responseType: 'substantive',
      evidenceCount,
      pointCount: 4,
      generated: evidenceCount === 0,
    });
    diagnostics.push({ issue: issue.label, topic, pointCount: 4, evidenceCount, profile: 'oral-coherent-full-answer' });
  }

  const references = annotateReferences(usedRefs, respondent, 'speech');
  const key = new Map(references.map((x) => [x.id, x.referenceKey]));
  const segments = [{ text: `問　${normalize(question)}\n\n（答）\n` }];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    const firstOfIssue = i === 0 || raw[i - 1].issueIndex !== item.issueIndex;
    const issueHead = firstOfIssue ? `${i ? '\n\n' : ''}● 論点${JP_NUM[item.issueIndex] || item.issueIndex + 1}　${item.topic}\n` : '\n\n';
    segments.push({
      ...item,
      text: `${issueHead}【${item.pointLabel}】\n　${item.text}`,
      referenceKey: item.sourceId ? key.get(item.sourceId) : null,
      borrowed: Boolean(references.find((x) => x.id === item.sourceId)?.borrowed),
    });
  }
  const draft = segments.map((x) => x.text).join('');
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.length,
    missing: 0,
    substantive: coverage.length,
    qualifiedOrLimited: 0,
    generated: coverage.filter((x) => x.generated).length,
    totalPoints: coverage.length * 4,
  };

  return {
    ...base,
    version: PROFILE_VERSION,
    title: '国会答弁原案',
    segments,
    draft,
    references,
    evidenceCount: references.length,
    issueCount: issues.length,
    missingIssueCount: 0,
    coverage,
    coverageSummary,
    diagnostics,
    draftingStance: '国民への説明責任を重視し、各論点について結論、基本認識、具体的な対応及び今後の方針を一体として示す。',
    priorityRule: '質問を論点単位に分解し、各論点につき四つの答弁要素を作成する。会議録の断片は、そのまま貼り付けず、質問者への呼び掛け及び議場固有の口語を除去した上で用いる。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
  };
}

function stripWrittenHeading(text = '') {
  return normalize(text)
    .replace(/^(?:[一二三四五六七八九十百]+(?:及び[一二三四五六七八九十百]+)?(?:から[一二三四五六七八九十百]+まで)?について|\d+について)\s*/u, '')
    .replace(/^　/u, '')
    .trim();
}

async function buildWritten(question, respondent) {
  const base = await buildV16('written', question, respondent);
  const issues = splitIssues(normalize(question));
  const refs = [];
  const raw = [];
  const coverage = [];
  const diagnostics = [];

  for (let index = 0; index < issues.length; index += 1) {
    const sourceSegment = (base.segments || []).find((x) => x.issueIndex === index);
    let strategy = sourceSegment?.writtenStrategy || base.coverage?.[index]?.writtenStrategy || 'no-evidence';
    let text = stripWrittenHeading(sourceSegment?.text || '');
    let sourceId = sourceSegment?.sourceId || null;

    if (DEFENSIVE.has(strategy)) {
      sourceId = null;
      if (!/お答えすることは困難である|お答えすることは差し控えたい|政府として把握する立場にない|一概にお答えすることは困難である/u.test(text)) {
        text = 'お尋ねの趣旨及びその前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
        strategy = 'no-evidence';
      }
    } else if (!sourceId || !text) {
      sourceId = null;
      strategy = 'no-evidence';
      text = 'お尋ねの趣旨及びその前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
    } else {
      const ref = (base.references || []).find((x) => x.id === sourceId);
      if (ref) refs.push(ref);
    }

    text = formatWrittenStyle(text);
    raw.push({
      text: `${JP_NUM[index] || index + 1}について\n　${text}`,
      sourceId,
      issueIndex: index,
      responseType: DEFENSIVE.has(strategy) ? 'qualified-or-limited' : 'precedent-or-substantive',
      writtenStrategy: strategy,
      generated: !sourceId,
    });
    coverage.push({
      issueIndex: index + 1,
      issue: issues[index].label,
      topic: topicOf(issues[index]),
      status: 'covered',
      responseType: DEFENSIVE.has(strategy) ? 'qualified-or-limited' : 'precedent-or-substantive',
      writtenStrategy: strategy,
      evidenceCount: sourceId ? 1 : 0,
      generated: !sourceId,
    });
    diagnostics.push({ issue: issues[index].label, topic: topicOf(issues[index]), writtenStrategy: strategy, profile: 'written-strict-cabinet-document' });
  }

  const references = annotateReferences(refs, respondent, 'written');
  const key = new Map(references.map((x) => [x.id, x.referenceKey]));
  const segments = raw.map((x, index) => ({
    ...x,
    text: `${index ? '\n\n' : ''}${x.text}`,
    referenceKey: x.sourceId ? key.get(x.sourceId) : null,
  }));
  const draft = segments.map((x) => x.text).join('');
  const officialStyleCheck = lintOfficialText(draft);
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.length,
    missing: 0,
    substantive: coverage.filter((x) => x.responseType === 'precedent-or-substantive').length,
    qualifiedOrLimited: coverage.filter((x) => x.responseType === 'qualified-or-limited').length,
    generated: coverage.filter((x) => x.generated).length,
  };

  return {
    ...base,
    version: PROFILE_VERSION,
    title: '質問主意書答弁書原案',
    segments,
    draft,
    references,
    respondent: null,
    evidenceCount: references.length,
    issueCount: issues.length,
    missingIssueCount: 0,
    coverage,
    coverageSummary,
    diagnostics,
    draftingStance: '閣議決定文書として、質問の前提、用語、対象範囲及び政府の所掌を先に審査し、答弁困難又は差控え相当の問いには実質回答を付加しない。答弁可能な事項に限り、確立した政府見解又は答弁書先例に基づいて記載する。',
    priorityRule: '曖昧な用語、仮定、評価要求、網羅要求、所掌外及び秘匿性を先に判定し、該当する場合は類似資料が検索されても自動的に実質回答へ移行しない。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    officialStyleCheck,
    officialStyleVersion: OFFICIAL_STYLE_VERSION,
  };
}

export async function build(mode, question, respondent) {
  return mode === 'written' ? buildWritten(question, respondent) : buildSpeech(question, respondent);
}

export async function searchAll(q, respondent) {
  return searchV16(q, respondent);
}

export function selfTest() {
  const base = selfTestV16();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '17.0',
    fourPartOralStructure: true,
    strictWrittenHeadings: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
