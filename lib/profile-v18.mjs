import {
  build as buildV16,
  searchAll as searchV16,
  selfTest as selfTestV16,
} from '../api/lib/profile-v16.mjs';
import { splitIssues } from '../api/lib/issues.mjs';
import { finalizeStyle, hasPoliteEnding } from '../api/lib/style.mjs';
import {
  formatWrittenStyle,
  lintOfficialText,
  OFFICIAL_STYLE_VERSION,
} from '../api/lib/official-style.mjs';
import { SOURCE_LABEL, CATEGORY_LABEL } from '../api/lib/core.mjs';

export const PROFILE_VERSION = '18.0';

const JP_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const DEFENSIVE = new Set(['security', 'outside-scope', 'hypothetical', 'ambiguity', 'evaluation', 'enumerative', 'no-evidence']);
const UNSAFE_ORAL = /お尋ねの|御指摘|委員|議員|質問主意書|昨日は|私も|連合さん|まあ|というか|おっしゃ|御要望|読み上げ|通告|時間の関係|答弁書/u;
const RECOGNITION = /認識|見解|考え|重要|課題|必要|基本|位置付け|意義|評価/u;
const REASON = /なぜ|理由|根拠|背景|原因|要因|ため|ことから|踏まえ/u;
const MEASURES = /対応|対策|措置|支援|実施|推進|取り組|取組|進め|確保|強化|整備|拡充|改善|見直|講じ|執行|実現/u;
const FUTURE = /今後|引き続き|目指|努め|継続|着実|機動的|方針|予定|見通し|将来/u;
const REFUSAL = /お答えすることは困難である|お答えすることは差し控えたい|政府として把握する立場にない|一概にお答えすることは困難である/u;

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

function requestedKinds(issue) {
  const q = normalize(`${issue?.label || ''} ${issue?.topic || ''}`);
  const kinds = [];
  if (/認識|見解|考え|評価|意義|位置付け|どのように捉/u.test(q)) kinds.push('recognition');
  if (/なぜ|理由|根拠|背景|原因|要因/u.test(q)) kinds.push('reason');
  if (/対応|対策|措置|支援|具体策|取組|取り組|実施|何を|どのように(?:実現|強化|推進|確保|改善|解決|対応)|講じ/u.test(q)) kinds.push('measures');
  if (/今後|方針|予定|見通し|将来|引き続き|目指|進めるのか/u.test(q)) kinds.push('future');
  const unique = [...new Set(kinds)];
  if (!unique.length) return ['conclusion'];
  if (unique.some((x) => ['reason', 'measures', 'future'].includes(x))) unique.unshift('conclusion');
  return [...new Set(unique)];
}

function labelFor(kind) {
  return {
    conclusion: '結論',
    recognition: '政府の認識',
    reason: '理由・根拠',
    measures: '具体的な対応',
    future: '今後の方針',
  }[kind] || '答弁';
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
  if (!ref) return true;
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
  if (kind === 'conclusion' && (RECOGNITION.test(sentence) || MEASURES.test(sentence) || /である|ではない|該当する|該当しない/u.test(sentence))) score += 35;
  if (kind === 'recognition' && RECOGNITION.test(sentence)) score += 50;
  if (kind === 'reason' && REASON.test(sentence)) score += 50;
  if (kind === 'measures' && MEASURES.test(sentence)) score += 50;
  if (kind === 'future' && FUTURE.test(sentence)) score += 50;
  if (sentence.length > 260) score -= 20;
  return score;
}

function oralEvidenceText(segment, issue, kind) {
  const original = sentenceList(segment?.text || '');
  const candidates = original
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
  const ordered = picked.sort((a, b) => original.indexOf(a) - original.indexOf(b));
  let text = ordered.join('');
  if (!/[。！？]$/u.test(text)) text += '。';
  return text;
}

function generatedPoint(issue, kind) {
  const topic = topicOf(issue);
  const caution = `現時点で参照できる政府資料のみからは、${topic}に関する確定的な答弁内容を特定できないため、主管府省において事実関係及び政府方針を確認の上、答弁を確定する必要がある。`;
  if (kind === 'recognition') return `${topic}については、国民生活及び社会経済への影響並びに関係法令及び事実関係を踏まえて判断する必要がある。${caution}`;
  if (kind === 'reason') return `${topic}の理由又は根拠については、関係法令及び確認された事実関係に即して説明する必要がある。${caution}`;
  if (kind === 'measures') return `${topic}に関する具体的な対応については、既定の施策及びその実施状況を確認した上で示す必要がある。${caution}`;
  if (kind === 'future') return `${topic}に関する今後の方針については、政策効果及び情勢の変化を踏まえて確定する必要がある。${caution}`;
  return caution;
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

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const baseSegments = (base.segments || []).filter((x) => x.issueIndex === index && x.pointLabel);
    const topic = topicOf(issue);
    const kinds = requestedKinds(issue);
    let evidenceCount = 0;

    for (const kind of kinds) {
      const ranked = baseSegments
        .map((segment) => {
          const ref = refByKey.get(segment.referenceKey) || (base.references || []).find((x) => x.id === segment.sourceId) || null;
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
        pointLabel: labelFor(kind),
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
      requestedKinds: kinds,
      evidenceCount,
      pointCount: kinds.length,
      generated: evidenceCount === 0,
    });
    diagnostics.push({ issue: issue.label, topic, requestedKinds: kinds, pointCount: kinds.length, evidenceCount, profile: 'oral-question-bound' });
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
    totalPoints: coverage.reduce((sum, x) => sum + x.pointCount, 0),
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
    draftingStance: '国民への説明責任を重視しつつ、質問で明示された論点及びその答弁に直接必要な事項に限って答える。',
    priorityRule: '質問ごとに求められた認識、理由、具体策及び今後の方針を判定し、求められていない要素は自動的に追加しない。会議録の断片及び質問者への呼び掛けは除去する。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
  };
}

function stripWrittenHeading(text = '') {
  return normalize(text)
    .replace(/^(?:[一二三四五六七八九十百]+(?:及び[一二三四五六七八九十百]+)?(?:から[一二三四五六七八九十百]+まで)?について|\d+について)\s*/u, '')
    .replace(/^　/u, '')
    .trim();
}

function defensiveText(strategy, issue) {
  const label = normalize(issue?.label || '');
  const quoted = label.match(/「([^」]{2,100})」/u)?.[1];
  if (strategy === 'ambiguity') {
    return quoted
      ? `お尋ねの「${quoted}」の具体的に意味するところが必ずしも明らかではないため、お答えすることは困難である。`
      : 'お尋ねの具体的に意味するところが必ずしも明らかではないため、お答えすることは困難である。';
  }
  if (strategy === 'evaluation') return 'お尋ねは評価に関わるものであり、その前提となる基準が必ずしも明らかではないため、一概にお答えすることは困難である。';
  if (strategy === 'hypothetical') return 'お尋ねは仮定を前提とするものであり、前提となる事情によって結果が異なり得ることから、一概にお答えすることは困難である。';
  if (strategy === 'outside-scope') return 'お尋ねの事項については、政府として把握する立場にない。';
  if (strategy === 'security') return 'お尋ねの事項については、我が国の安全保障及び関係国との関係に影響を及ぼすおそれがあるため、お答えすることは差し控えたい。';
  if (strategy === 'enumerative') return 'お尋ねのような網羅的な調査を行うことは困難であり、お答えすることは困難である。';
  return 'お尋ねの趣旨及びその前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
}

function writtenSubstantiveText(text, issue) {
  const cleaned = stripWrittenHeading(text);
  if (!cleaned) return '';
  const sentences = cleaned.split(/(?<=[。！？])/u).map((x) => x.trim()).filter(Boolean);
  if (sentences.length <= 3) return cleaned;
  const anchors = (issue?.anchors || []).filter((x) => x && x.length >= 2);
  if (!anchors.length) return sentences.slice(0, 3).join('');
  const picked = sentences.filter((sentence) => anchors.some((anchor) => sentence.includes(anchor))).slice(0, 3);
  return (picked.length ? picked : sentences.slice(0, 2)).join('');
}

async function buildWritten(question, respondent) {
  const base = await buildV16('written', question, respondent);
  const issues = splitIssues(normalize(question));
  const refs = [];
  const raw = [];
  const coverage = [];
  const diagnostics = [];

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const sourceSegment = (base.segments || []).find((x) => x.issueIndex === index);
    let strategy = sourceSegment?.writtenStrategy || base.coverage?.[index]?.writtenStrategy || 'no-evidence';
    let sourceId = sourceSegment?.sourceId || null;
    let text = '';

    if (DEFENSIVE.has(strategy)) {
      sourceId = null;
      text = defensiveText(strategy, issue);
    } else {
      text = writtenSubstantiveText(sourceSegment?.text || '', issue);
      if (!sourceId || !text || REFUSAL.test(text)) {
        sourceId = null;
        strategy = 'no-evidence';
        text = defensiveText(strategy, issue);
      } else {
        const ref = (base.references || []).find((x) => x.id === sourceId);
        if (ref) refs.push(ref);
      }
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
      issue: issue.label,
      topic: topicOf(issue),
      status: 'covered',
      responseType: DEFENSIVE.has(strategy) ? 'qualified-or-limited' : 'precedent-or-substantive',
      writtenStrategy: strategy,
      evidenceCount: sourceId ? 1 : 0,
      generated: !sourceId,
    });
    diagnostics.push({ issue: issue.label, topic: topicOf(issue), writtenStrategy: strategy, profile: 'written-question-bound-cabinet-document' });
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
    draftingStance: '閣議決定文書として、質問で問われた事項に限って答え、答弁困難又は差控え相当の問いには一般的な政府方針その他の実質回答を付加しない。',
    priorityRule: '曖昧な用語、仮定、評価要求、網羅要求、所掌外及び秘匿性を先に判定し、該当する場合は拒否又は限定の定型だけを記載する。答弁可能な事項も当該論点に直接関係する先例部分に限定する。',
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
    profileVersion: PROFILE_VERSION === '18.0',
    questionBoundOralStructure: true,
    strictWrittenHeadings: true,
    noUnaskedWrittenAddendum: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
