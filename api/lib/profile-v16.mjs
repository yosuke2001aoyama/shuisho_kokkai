import { build as legacyBuild, searchAll as legacySearchAll, selfTest as legacySelfTest } from './draft.mjs';
import { splitIssues } from './issues.mjs';
import { dietSearch } from './diet.mjs';
import { writtenSearch } from './written.mjs';
import { officialSearch } from './official.mjs';
import {
  SOURCE_LABEL,
  CATEGORY_LABEL,
  sourceRank,
  acceptable,
} from './core.mjs';
import { finalizeStyle, hasPoliteEnding } from './style.mjs';
import {
  formatWrittenStyle,
  lintOfficialText,
  OFFICIAL_STYLE_VERSION,
} from './official-style.mjs';

export const PROFILE_VERSION = '16.0';

const POSITION_RE = /認識|見解|考え|基本|方針|重要|必要|位置付け|課題|である|ではない/u;
const ACTION_RE = /対応|対策|措置|支援|実施|推進|取り組|進め|確保|強化|整備|拡充|改善|見直|講じ|実現/u;
const FUTURE_RE = /引き続き|今後|目指|努め|進めていく|取り組んでいく|継続|着実/u;
const DISCOURSE_RE = /^(?:その上で|まず|また|なお|一方で|ちなみに|いずれにしても|御指摘のとおり|おっしゃるとおり)[、，\s]*/u;
const SECURITY_RE = /外交交渉|交渉中|安全保障|機密|秘密|捜査|公判|訴訟|個別の事件|情報源|手の内|相手国との関係/u;
const OUTSIDE_RE = /私人|個人|民間|報道機関|取材活動|企業の判断|政党|議員個人|地方公共団体の判断|独立機関/u;
const HYPOTHETICAL_RE = /仮に|仮定|想定|可能性|将来|見込み|なった場合|するとすれば|あり得るか/u;
const EVALUATION_RE = /評価|責任|妥当|適切|十分|正しい|誤り|失敗|成功|問題ではないか|是非/u;
const ENUMERATIVE_RE = /全て|一切|一覧|網羅|全件|逐一|詳細な経緯|件数を示|全省庁|全期間/u;
const AMBIGUOUS_RE = /意味|趣旨|定義|範囲|実質的|本質的|真の|著しい|重大|明確な基準|どの程度|どこまで|十分な説明|適切な対応/u;
const QUOTE_RE = /「([^」]{2,100})」/gu;

const normalize = (text = '') => String(text).normalize('NFKC').replace(/\s+/gu, ' ').trim();
const compact = (text = '') => normalize(text).replace(/[\s　、。！？?「」『』（）()]/gu, '');

function sentences(text = '') {
  return normalize(text)
    .split(/(?<=[。！？])/u)
    .map((x) => x.trim())
    .filter((x) => x.length >= 12);
}

function cleanOral(text = '') {
  let s = finalizeStyle(normalize(text))
    .replace(/^●\s*/u, '')
    .replace(DISCOURSE_RE, '')
    .replace(/と考えておりまして。/gu, 'と考えている。')
    .replace(/と認識しておりまして。/gu, 'と認識している。')
    .replace(/でありまして。/gu, 'である。')
    .replace(/のでありまして。/gu, 'ためである。')
    .replace(/しているところであり。/gu, 'しているところである。')
    .replace(/であるところであり。/gu, 'である。')
    .replace(/、。/gu, '。')
    .trim();
  if (s && !/[。！？]$/u.test(s)) s += '。';
  return s;
}

function sentenceScore(sentence, issue) {
  let score = 0;
  for (const anchor of issue.anchors || []) {
    if (anchor.length >= 2 && sentence.includes(anchor)) score += Math.min(anchor.length, 12) * 8;
  }
  if (POSITION_RE.test(sentence)) score += 30;
  if (ACTION_RE.test(sentence)) score += 30;
  if (FUTURE_RE.test(sentence)) score += 15;
  if (sentence.length > 360) score -= 30;
  return score;
}

function focusedText(source, issue, maxLength = 430) {
  const all = sentences(source?.phrase || '').map(cleanOral).filter(Boolean);
  if (!all.length) return cleanOral(source?.phrase || '').slice(0, maxLength);
  const ranked = all
    .map((text, index) => ({ text, index, score: sentenceScore(text, issue) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = [];
  for (const row of ranked) {
    if (row.score <= 0 && selected.length) continue;
    if (selected.some((x) => compact(x) === compact(row.text))) continue;
    if ((selected.join('').length + row.text.length) > maxLength) continue;
    selected.push(row.text);
    if (selected.length >= 2) break;
  }
  return cleanOral(selected.join('') || all[0]);
}

function distinct(a = '', b = '') {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return false;
  if (x.includes(y.slice(0, Math.min(45, y.length))) || y.includes(x.slice(0, Math.min(45, x.length)))) return false;
  const xs = new Set(x);
  const ys = new Set(y);
  const overlap = [...ys].filter((ch) => xs.has(ch)).length;
  return overlap / Math.max(1, Math.min(xs.size, ys.size)) < 0.84;
}

async function richCandidates(issue, respondent, baseReferences = []) {
  const [diet, written, official] = await Promise.all([
    dietSearch(issue, respondent),
    writtenSearch(issue),
    officialSearch(issue),
  ]);
  const conceptSource = issue.concept ? [{ ...issue.concept.source, score: 90 }] : [];
  const all = [...diet, ...written, ...official, ...baseReferences, ...conceptSource]
    .filter((x) => x && (acceptable(x, issue) || x.id === issue.concept?.source?.id))
    .filter((x, index, arr) => arr.findIndex((y) => y.id === x.id) === index)
    .sort((a, b) => sourceRank(a, 'speech', respondent) - sourceRank(b, 'speech', respondent) || (b.score || 0) - (a.score || 0));

  const selected = [];
  for (const candidate of all) {
    const text = focusedText(candidate, issue);
    if (!text) continue;
    if (selected.some((x) => !distinct(x.text, text))) continue;
    selected.push({ source: candidate, text });
    if (selected.length >= 5) break;
  }
  return selected;
}

function topicLabel(issue) {
  const topic = normalize(issue.topic || issue.label || '当該課題')
    .replace(/[。！？?]+$/u, '')
    .replace(/^(?:政府|我が国)の/u, '');
  return topic.length > 70 ? '当該課題' : topic;
}

function generatedRecognition(issue) {
  const topic = topicLabel(issue);
  return `${topic}については、国民生活、我が国の国益及び関係する法令・事実関係を踏まえ、政府全体で取り組むべき重要な課題であると認識している。`;
}

function generatedMeasures(issue) {
  const topic = topicLabel(issue);
  return `具体的には、${topic}に関し、関係府省が連携し、現行制度及び既定の施策を着実に実施するとともに、必要な支援の充実及び実施状況の検証を進める。`;
}

function generatedFuture(issue) {
  const topic = topicLabel(issue);
  return `今後とも、${topic}をめぐる状況及び政策効果を丁寧に把握し、必要な見直しを機動的に行うとともに、政府の考え方及び取組を国民に分かりやすく説明していく。`;
}

function chooseCandidate(candidates, predicate, usedIds = new Set()) {
  return candidates.find((x) => !usedIds.has(x.source.id) && predicate(x.text));
}

function speechPoints(issue, candidates, baseSegments = []) {
  const usedIds = new Set();
  const points = [];
  const add = (label, text, source = null, responseType = 'substantive') => {
    const cleaned = cleanOral(text);
    if (!cleaned || points.some((x) => !distinct(x.text, cleaned))) return;
    if (source?.id) usedIds.add(source.id);
    points.push({ label, text: cleaned, source, responseType, generated: !source });
  };

  const baseText = baseSegments.map((x) => x.text).join(' ');
  const direct = issue.concept
    ? { text: issue.concept.draft, source: candidates.find((x) => x.source.id === issue.concept.source.id)?.source || issue.concept.source }
    : candidates[0] || (baseText ? { text: baseText, source: null } : null);
  if (direct) add('結論', direct.text, direct.source, 'conclusion');

  const position = chooseCandidate(candidates, (text) => POSITION_RE.test(text), usedIds);
  add('基本認識', position?.text || generatedRecognition(issue), position?.source || null, 'recognition');

  const action = chooseCandidate(candidates, (text) => ACTION_RE.test(text), usedIds);
  add('具体的な対応', action?.text || generatedMeasures(issue), action?.source || null, 'measures');

  const future = chooseCandidate(candidates, (text) => FUTURE_RE.test(text), usedIds);
  add('今後の方針', future?.text || generatedFuture(issue), future?.source || null, 'future');

  while (points.length < 3) {
    const fallback = points.length === 0 ? generatedRecognition(issue) : points.length === 1 ? generatedMeasures(issue) : generatedFuture(issue);
    add(points.length === 0 ? '基本認識' : points.length === 1 ? '具体的な対応' : '今後の方針', fallback, null, 'generated');
  }
  return points;
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
  const normalizedQuestion = normalize(question);
  const issues = splitIssues(normalizedQuestion);
  const legacy = await legacyBuild('speech', normalizedQuestion, respondent);
  const raw = [];
  const refs = [];
  const coverage = [];
  const diagnostics = [];

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const baseSegments = (legacy.segments || []).filter((x) => x.issueIndex === index);
    const baseReferenceIds = new Set(baseSegments.map((x) => x.sourceId).filter(Boolean));
    const baseReferences = (legacy.references || []).filter((x) => baseReferenceIds.has(x.id));
    const candidates = await richCandidates(issue, respondent, baseReferences);
    const points = speechPoints(issue, candidates, baseSegments);
    for (const point of points) {
      raw.push({
        text: point.text,
        sourceId: point.source?.id || null,
        issueIndex: index,
        pointLabel: point.label,
        responseType: point.responseType,
        generated: point.generated,
      });
      if (point.source) refs.push(point.source);
    }
    coverage.push({
      issueIndex: index + 1,
      issue: issue.label,
      topic: issue.topic,
      status: points.length >= 3 ? 'covered' : 'missing',
      responseType: 'substantive',
      evidenceCount: points.filter((x) => x.source).length,
      pointCount: points.length,
      generated: points.every((x) => x.generated),
    });
    diagnostics.push({
      issue: issue.label,
      topic: issue.topic,
      candidateCount: candidates.length,
      pointCount: points.length,
      profile: 'oral-full-answer',
    });
  }

  const references = annotateReferences(refs, respondent, 'speech');
  const key = new Map(references.map((x) => [x.id, x.referenceKey]));
  const segments = [
    { text: `問　${normalizedQuestion}\n\n（答）\n` },
    ...raw.map((x, index) => ({
      ...x,
      text: `${index ? '\n\n' : ''}● ${x.pointLabel}\n　${x.text}`,
      referenceKey: x.sourceId ? key.get(x.sourceId) : null,
      borrowed: Boolean(references.find((r) => r.id === x.sourceId)?.borrowed),
    })),
  ];
  const draft = segments.map((x) => x.text).join('');
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.filter((x) => x.status === 'covered').length,
    missing: coverage.filter((x) => x.status !== 'covered').length,
    substantive: coverage.length,
    qualifiedOrLimited: 0,
    generated: coverage.filter((x) => x.generated).length,
    totalPoints: coverage.reduce((sum, x) => sum + x.pointCount, 0),
  };

  return {
    version: PROFILE_VERSION,
    title: '国会答弁原案',
    segments,
    draft,
    references,
    referenceLabel: '根拠・前例',
    respondent,
    evidenceCount: references.length,
    issueCount: issues.length,
    missingIssueCount: coverageSummary.missing,
    coverage,
    coverageSummary,
    draftingStance: '国民への説明責任を重視し、各論点について結論、基本認識、具体的な対応及び今後の方針を可能な限り示す。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
    diagnostics,
    sourceCoverage: legacy.sourceCoverage,
    priorityRule: '同一答弁者の国会答弁を最優先し、各論点につき最低三つの答弁ポイントを構成し、答弁漏れを防止する。',
  };
}

function firstQuotedTerm(label = '') {
  const match = [...String(label).matchAll(QUOTE_RE)][0];
  return match?.[1]?.trim() || '';
}

function strictWrittenStrategy(issue) {
  const label = normalize(issue?.label || '');
  if (SECURITY_RE.test(label)) return 'security';
  if (OUTSIDE_RE.test(label)) return 'outside-scope';
  if (HYPOTHETICAL_RE.test(label)) return 'hypothetical';
  if (firstQuotedTerm(label) || AMBIGUOUS_RE.test(label)) return 'ambiguity';
  if (EVALUATION_RE.test(label)) return 'evaluation';
  if (ENUMERATIVE_RE.test(label)) return 'enumerative';
  return 'determinate';
}

function defensiveWrittenText(issue, strategy) {
  const term = firstQuotedTerm(issue?.label || '');
  if (strategy === 'security') {
    return 'お尋ねは、外交交渉、安全保障又は捜査等に関する個別具体的な情報に関わるものであり、これを明らかにすることにより、政府の事務の適正な遂行に支障を及ぼすおそれがあることから、お答えすることは差し控えたい。';
  }
  if (strategy === 'outside-scope') {
    return 'お尋ねは、私人、民間団体、報道機関その他政府以外の主体による個別具体的な活動又は判断に関するものであり、政府として把握する立場にないため、お答えすることは困難である。';
  }
  if (strategy === 'hypothetical') {
    return 'お尋ねは仮定を前提とするものであり、個別具体的な状況に即して判断されるべき事柄であることから、一概にお答えすることは困難である。';
  }
  if (strategy === 'ambiguity') {
    return term
      ? `お尋ねの「${term}」の具体的に意味するところが必ずしも明らかではなく、また、いかなる事実関係を前提とするものかも明らかではないため、お答えすることは困難である。`
      : 'お尋ねの趣旨及びその前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
  }
  if (strategy === 'evaluation') {
    return '御指摘の評価については、その前提及び評価基準が必ずしも明らかではなく、個別具体的な事情にも左右されるものであることから、一概にお答えすることは困難である。';
  }
  if (strategy === 'enumerative') {
    return 'お尋ねについて、対象となる期間、機関及び事案の範囲が明らかではなく、網羅的にお答えすることは困難である。';
  }
  return 'お尋ねの趣旨及び前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
}

function hasNumberedInput(question = '') {
  return /(?:^|\n)\s*(?:(?:[一二三四五六七八九十百]+|\d+|[①-⑳])|[（(](?:[一二三四五六七八九十]+|\d+)[）)])\s*[　 、，．.\-]/u.test(question);
}

async function buildWritten(question, respondent) {
  const normalizedQuestion = normalize(question);
  const issues = splitIssues(normalizedQuestion);
  const legacy = await legacyBuild('written', normalizedQuestion, respondent);
  const numbered = hasNumberedInput(question);
  const raw = [];
  const refs = [];
  const coverage = [];
  const diagnostics = [];
  const jp = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const strategy = strictWrittenStrategy(issue);
    const legacySegments = (legacy.segments || []).filter((x) => x.issueIndex === index);
    let text;
    let sourceId = null;
    let responseType;
    let generated;

    if (strategy === 'determinate' && legacySegments.length) {
      text = legacySegments.map((x) => x.text.replace(/^(?:\n\n)?(?:[一二三四五六七八九十]+について\n　|　)/u, '')).join('\n\n　');
      text = formatWrittenStyle(text);
      sourceId = legacySegments.find((x) => x.sourceId)?.sourceId || null;
      responseType = sourceId ? 'precedent-or-substantive' : 'qualified-or-limited';
      generated = !sourceId;
      const source = (legacy.references || []).find((x) => x.id === sourceId);
      if (source) refs.push(source);
    } else {
      text = formatWrittenStyle(defensiveWrittenText(issue, strategy));
      responseType = 'qualified-or-limited';
      generated = true;
    }

    const heading = numbered ? `${jp[index] || index + 1}について\n　` : index === 0 ? '一について\n　' : '\n\n　';
    raw.push({ text: heading + text, sourceId, issueIndex: index, responseType, writtenStrategy: strategy, generated });
    coverage.push({
      issueIndex: index + 1,
      issue: issue.label,
      topic: issue.topic,
      status: 'covered',
      responseType,
      writtenStrategy: strategy,
      evidenceCount: sourceId ? 1 : 0,
      generated,
    });
    diagnostics.push({
      issue: issue.label,
      topic: issue.topic,
      writtenStrategy: strategy,
      profile: 'written-defensive-cabinet-document',
    });
  }

  const references = annotateReferences(refs, respondent, 'written');
  const key = new Map(references.map((x) => [x.id, x.referenceKey]));
  const segments = raw.map((x) => ({ ...x, referenceKey: x.sourceId ? key.get(x.sourceId) : null }));
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
    version: PROFILE_VERSION,
    title: '質問主意書答弁書原案',
    segments,
    draft,
    references,
    referenceLabel: '根拠・前例',
    respondent: null,
    evidenceCount: references.length,
    issueCount: issues.length,
    missingIssueCount: 0,
    coverage,
    coverageSummary,
    draftingStance: '閣議決定文書として、質問の前提、用語及び射程を厳格に審査し、不明確、仮定、所掌外又は答弁差控え相当の問いには実質回答を付加せず、答弁可能な範囲だけを公用文で示す。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    officialStyleCheck,
    officialStyleVersion: OFFICIAL_STYLE_VERSION,
    diagnostics,
    sourceCoverage: legacy.sourceCoverage,
    priorityRule: '質問形式を先に分類し、曖昧性、仮定、所掌外、評価要求又は秘匿性がある場合は、類似答弁書が検索されても自動的に実質回答へ移行しない。',
  };
}

export async function build(mode, question, respondent) {
  return mode === 'written'
    ? buildWritten(question, respondent)
    : buildSpeech(question, respondent);
}

export async function searchAll(q, respondent) {
  return legacySearchAll(q, respondent);
}

export function selfTest() {
  const legacy = legacySelfTest();
  const vague = { label: '御指摘の「真に十分な対応」の定義及び評価基準を示されたい。' };
  const hypothetical = { label: '仮に制度が廃止された場合の全ての影響を示されたい。' };
  const checks = {
    ...legacy.checks,
    profileVersion: PROFILE_VERSION === '16.0',
    writtenAmbiguityFirst: strictWrittenStrategy(vague) === 'ambiguity',
    writtenHypotheticalFirst: strictWrittenStrategy(hypothetical) === 'hypothetical',
    writtenAmbiguityRefuses: /お答えすることは困難である/.test(defensiveWrittenText(vague, 'ambiguity')),
    writtenHypotheticalRefuses: /一概にお答えすることは困難である/.test(defensiveWrittenText(hypothetical, 'hypothetical')),
  };
  return {
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
    samples: legacy.samples,
    writtenSample: formatWrittenStyle(defensiveWrittenText(vague, 'ambiguity')),
  };
}
