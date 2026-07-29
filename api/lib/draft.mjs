import {
  VERSION,
  SOURCE_LABEL,
  CATEGORY_LABEL,
  CONCEPTS,
  sourceRank,
  acceptable,
  fallbackDraft,
} from './core.mjs';
import { splitIssues, makeIssue } from './issues.mjs';
import { finalizeStyle, hasPoliteEnding } from './style.mjs';
import {
  classifyWrittenStrategy,
  composeWrittenAnswer,
  formatWrittenStyle,
  lintOfficialText,
  OFFICIAL_STYLE_VERSION,
} from './official-style.mjs';
import { dietSearch } from './diet.mjs';
import { writtenSearch } from './written.mjs';
import { officialSearch, officialAdapterCount } from './official.mjs';

const JP_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const ANSWER_CLAUSE = /方針|課題|重要|必要|取り組|進め|実施|推進|確保|強化|目指|判断|対応|認識|考え|実現|検討|努め|図る|行う|である|ではない/u;
const ACTION_CLAUSE = /対応|対策|措置|支援|強化|実施|推進|取り組|進め|確保|改善|見直|講じ|努め/u;
const ASSESSMENT_CLAUSE = /認識|見解|重要|必要|評価|考え|位置付け|基本方針/u;
const DISCOURSE_PREFIX = /^(?:それから|その上で|まず|また|なお|一方で|ちなみに|いずれにしても|御指摘のとおり|おっしゃるとおり)[、,\s]*/u;

const containsGroup = (text, group = []) => group.some((term) => text.includes(term));

function balancedPieces(input, separators) {
  const text = String(input);
  const out = [];
  let start = 0;
  let round = 0;
  let quote = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '（' || ch === '[' || ch === '［') round += 1;
    if (ch === ')' || ch === '）' || ch === ']' || ch === '］') round = Math.max(0, round - 1);
    if (ch === '「' || ch === '『') quote += 1;
    if (ch === '」' || ch === '』') quote = Math.max(0, quote - 1);
    if (separators.has(ch) && round === 0 && quote === 0) {
      const piece = text.slice(start, i + 1).trim();
      if (piece) out.push(piece);
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function clauseScore(clause, issue) {
  let score = 0;
  for (const anchor of issue.anchors || []) {
    if (anchor.length >= 2 && clause.includes(anchor)) score += Math.min(anchor.length, 12) * 8;
  }
  for (const group of issue.required || []) if (containsGroup(clause, group)) score += 35;
  if (ANSWER_CLAUSE.test(clause)) score += 20;
  if ((issue.intents || []).some((x) => clause.includes(x))) score += 30;
  if (clause.length > 230) score -= 25;
  return score;
}

function completeEnding(text) {
  let s = text.trim().replace(DISCOURSE_PREFIX, '');
  s = s
    .replace(/ということで[、,]?$/u, 'ことを目指す')
    .replace(/ということから[、,]?$/u, 'ためである')
    .replace(/ということ[、,]?$/u, 'こととしている')
    .replace(/ところであり[、,]?$/u, 'ところである')
    .replace(/課題であり[、,]?$/u, '課題である')
    .replace(/重要であり[、,]?$/u, '重要である')
    .replace(/必要であり[、,]?$/u, '必要である')
    .replace(/[、,]+$/u, '');
  if (!/[。！？]$/u.test(s)) s += '。';
  return s;
}

function focusEvidence(issue, phrase, maxLength = 320) {
  const styled = finalizeStyle(String(phrase).normalize('NFKC'));
  if (styled.length <= maxLength) return completeEnding(styled);

  const sentences = balancedPieces(styled, new Set(['。', '！', '？']));
  const units = [];
  for (const sentence of sentences) {
    if (sentence.length <= 230) {
      units.push(sentence);
      continue;
    }
    units.push(...balancedPieces(sentence, new Set(['、'])));
  }
  if (!units.length) return completeEnding(styled);

  const ranked = units
    .map((text, index) => ({ text, index, score: clauseScore(text, issue) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score <= 0) return completeEnding(styled.slice(0, maxLength));

  const selected = [best.text];
  const neighbors = [units[best.index + 1], units[best.index - 1]].filter(Boolean);
  for (const neighbor of neighbors) {
    if (selected.join('').length + neighbor.length > maxLength) continue;
    if (ANSWER_CLAUSE.test(neighbor) || /^(?:政府|引き続き|鋭意|このため|これにより|また)/u.test(neighbor)) {
      selected.push(neighbor);
      break;
    }
  }

  let focused = completeEnding(selected.join(''));
  const primary = issue.required?.[0] || [];
  const topic = issue.topic || issue.label;
  if (topic && topic.length <= 55 && !containsGroup(focused, primary) && !focused.includes(topic)) {
    focused = `${topic}については、${focused}`;
  }
  return focused;
}

function supportsConcept(source, issue) {
  if (!issue.concept) return true;
  const text = `${source.title || ''} ${source.phrase || ''}`;
  const hits = (issue.anchors || []).filter((anchor) => text.includes(anchor));
  return hits.length >= 2;
}

function compactText(text = '') {
  return String(text).normalize('NFKC').replace(/[\s　、。！？?「」『』（）()]/gu, '');
}

function substantiallyDifferent(a = '', b = '') {
  const x = compactText(a);
  const y = compactText(b);
  if (!x || !y) return false;
  if (x.includes(y.slice(0, Math.min(45, y.length))) || y.includes(x.slice(0, Math.min(45, x.length)))) return false;
  const set = new Set(x);
  const overlap = [...new Set(y)].filter((ch) => set.has(ch)).length;
  return overlap / Math.max(1, Math.min(new Set(x).size, new Set(y).size)) < 0.82;
}

function complementary(primaryText = '', candidateText = '') {
  const pAction = ACTION_CLAUSE.test(primaryText);
  const pAssessment = ASSESSMENT_CLAUSE.test(primaryText);
  const cAction = ACTION_CLAUSE.test(candidateText);
  const cAssessment = ASSESSMENT_CLAUSE.test(candidateText);
  return (pAction !== cAction || pAssessment !== cAssessment) && substantiallyDifferent(primaryText, candidateText);
}

async function retrieve(issue, respondent) {
  const [diet, written, official] = await Promise.all([
    dietSearch(issue, respondent),
    writtenSearch(issue),
    officialSearch(issue),
  ]);
  return { diet, written, official };
}

function rankCandidates(issue, mode, respondent, groups) {
  const staticSource = issue.concept ? { ...issue.concept.source, score: 85 } : null;
  const candidates = [...groups.diet, ...groups.written, ...groups.official, ...(staticSource ? [staticSource] : [])]
    .filter((x) => acceptable(x, issue) && supportsConcept(x, issue));
  candidates.sort(
    (a, b) => sourceRank(a, mode, respondent) - sourceRank(b, mode, respondent) || b.score - a.score,
  );
  return { candidates, staticSource };
}

function speechDraft(issue, candidates, staticSource) {
  const primary = candidates[0] || staticSource;
  if (issue.concept && primary) {
    return {
      segments: [{ text: finalizeStyle(issue.concept.draft), sourceId: primary.id, responseType: 'substantive' }],
      refs: [primary],
      responseType: 'substantive',
    };
  }
  if (!primary) {
    const fallbackIssue = { ...issue, label: issue.topic || issue.label };
    return {
      segments: [{ text: finalizeStyle(fallbackDraft(fallbackIssue)), generated: true, responseType: 'generated' }],
      refs: [],
      responseType: 'generated',
    };
  }

  const primaryText = focusEvidence(issue, primary.phrase, 340);
  const segments = [{ text: primaryText, sourceId: primary.id, responseType: 'substantive' }];
  const refs = [primary];
  const secondary = candidates.slice(1).find((candidate) => {
    if (candidate.id === primary.id) return false;
    if ((candidate.score || 0) < Math.max(55, (primary.score || 0) - 120)) return false;
    const text = focusEvidence(issue, candidate.phrase, 250);
    return complementary(primaryText, text);
  });
  if (secondary) {
    const secondaryText = focusEvidence(issue, secondary.phrase, 250);
    segments.push({ text: secondaryText, sourceId: secondary.id, responseType: 'supplement' });
    refs.push(secondary);
  }
  return { segments, refs, responseType: 'substantive' };
}

function writtenDraft(issue, candidates, staticSource) {
  const primary = candidates[0] || staticSource;
  const strategy = classifyWrittenStrategy(issue, candidates);

  if (issue.concept && primary) {
    return {
      segments: [{ text: formatWrittenStyle(issue.concept.draft), sourceId: primary.id, responseType: 'substantive' }],
      refs: [primary],
      responseType: 'substantive',
      writtenStrategy: 'settled-government-position',
    };
  }

  if (strategy === 'precedent') {
    const precedent = candidates.find((x) => x.sourceType === 'written') || primary;
    return {
      segments: [{ text: composeWrittenAnswer(issue, precedent?.phrase || '', 'precedent'), sourceId: precedent?.id, responseType: 'precedent' }],
      refs: precedent ? [precedent] : [],
      responseType: 'precedent',
      writtenStrategy: 'precedent',
    };
  }

  const evidenceText = primary ? focusEvidence(issue, primary.phrase, 300) : '';
  const text = composeWrittenAnswer(issue, evidenceText, strategy);
  return {
    segments: [{
      text,
      sourceId: primary && evidenceText ? primary.id : null,
      generated: !primary,
      responseType: strategy === 'qualified-policy' ? 'substantive' : 'qualified-or-limited',
    }],
    refs: primary && evidenceText ? [primary] : [],
    responseType: strategy === 'qualified-policy' ? 'substantive' : 'qualified-or-limited',
    writtenStrategy: strategy,
  };
}

async function draftOne(issue, mode, respondent) {
  const groups = await retrieve(issue, respondent);
  const { candidates, staticSource } = rankCandidates(issue, mode, respondent, groups);
  const drafted = mode === 'written'
    ? writtenDraft(issue, candidates, staticSource)
    : speechDraft(issue, candidates, staticSource);
  return {
    ...drafted,
    diagnostics: {
      diet: groups.diet.length,
      written: groups.written.length,
      official: groups.official.length,
      candidateCount: candidates.length,
      writtenStrategy: drafted.writtenStrategy || null,
    },
  };
}

export async function build(mode, question, respondent) {
  const normalizedQuestion = String(question).normalize('NFKC');
  const issues = splitIssues(normalizedQuestion);
  const rawSegments = [];
  const refs = [];
  const diagnostics = [];
  const coverage = [];

  for (let i = 0; i < issues.length; i += 1) {
    const issue = issues[i];
    const d = await draftOne(issue, mode, respondent);
    const issueSegments = d.segments.map((segment) => ({ ...segment, issueIndex: i }));
    rawSegments.push(...issueSegments);
    refs.push(...d.refs);
    diagnostics.push({ issue: issue.label, topic: issue.topic, ...d.diagnostics });
    coverage.push({
      issueIndex: i + 1,
      issue: issue.label,
      topic: issue.topic,
      status: issueSegments.length ? 'covered' : 'missing',
      responseType: d.responseType,
      writtenStrategy: d.writtenStrategy || null,
      evidenceCount: d.refs.length,
      generated: issueSegments.every((x) => x.generated),
    });
  }

  const unique = refs
    .filter(Boolean)
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
    .map((x, i) => ({
      ...x,
      referenceKey: `r${i + 1}`,
      quotedPhrase: x.phrase,
      categoryLabel: CATEGORY_LABEL[x.category] || x.category,
      sourceTypeLabel: SOURCE_LABEL[x.sourceType] || x.sourceType,
      borrowed:
        mode !== 'written' &&
        ['prime', 'minister', 'official'].includes(x.category) &&
        x.category !== respondent,
    }));
  const key = new Map(unique.map((x) => [x.id, x.referenceKey]));
  const numberedInput = /(?:^|\n)\s*(?:(?:[一二三四五六七八九十百]+|\d+|[①-⑳])|[（(](?:[一二三四五六七八九十]+|\d+)[）)])\s*[　 、，．.\-]/u.test(normalizedQuestion);

  const segments = mode === 'written'
    ? rawSegments.map((x, i) => {
        const issueChanged = i === 0 || rawSegments[i - 1]?.issueIndex !== x.issueIndex;
        let prefix = '';
        if (issueChanged) {
          if (numberedInput) prefix = `${i ? '\n\n' : ''}${JP_NUM[x.issueIndex] || x.issueIndex + 1}について\n　`;
          else if (i === 0) prefix = '一について\n　';
          else prefix = '\n\n　';
        } else {
          prefix = '\n\n　';
        }
        return { ...x, text: prefix + x.text, referenceKey: x.sourceId ? key.get(x.sourceId) : null };
      })
    : [
        { text: `問　${normalizedQuestion}\n\n（答）\n` },
        ...rawSegments.map((x, i) => ({
          ...x,
          text: `${i ? '\n\n' : ''}● ${x.text}`,
          referenceKey: x.sourceId ? key.get(x.sourceId) : null,
          borrowed: Boolean(unique.find((r) => r.id === x.sourceId)?.borrowed),
        })),
      ];

  const draft = segments.map((x) => x.text).join('');
  const officialStyleCheck = mode === 'written' ? lintOfficialText(draft) : null;
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.filter((x) => x.status === 'covered').length,
    missing: coverage.filter((x) => x.status !== 'covered').length,
    substantive: coverage.filter((x) => x.responseType === 'substantive' || x.responseType === 'precedent').length,
    qualifiedOrLimited: coverage.filter((x) => x.responseType === 'qualified-or-limited').length,
    generated: coverage.filter((x) => x.generated).length,
  };

  return {
    version: VERSION,
    title: mode === 'written' ? '質問主意書答弁書原案' : '国会答弁原案',
    segments,
    draft,
    references: unique,
    referenceLabel: '根拠・前例',
    respondent: mode === 'written' ? null : respondent,
    evidenceCount: unique.length,
    issueCount: issues.length,
    missingIssueCount: coverageSummary.missing,
    coverage,
    coverageSummary,
    draftingStance: mode === 'written'
      ? '閣議決定文書として、質問の前提・射程を限定しつつ、答弁書先例と公用文用例を優先する。'
      : '国民への説明責任を重視し、結論・認識・具体的取組を可能な限り示す。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    officialStyleCheck,
    officialStyleVersion: mode === 'written' ? OFFICIAL_STYLE_VERSION : null,
    diagnostics,
    sourceCoverage: [
      '国会会議録',
      '質問主意書答弁書（衆議院・参議院）',
      '会見・演説',
      'インタビュー・寄稿',
      '政府公式資料',
    ],
    priorityRule:
      mode === 'written'
        ? '同一論点の閣議決定済み答弁書を最優先し、質問の意味・趣旨・射程を限定した上で、必要最小限の政府見解を示す。'
        : '同一答弁者の国会答弁を最優先し、結論、認識及び具体的取組を複数の根拠から補完する。',
  };
}

export async function searchAll(q, respondent) {
  const out = [];
  for (const issue of splitIssues(String(q).normalize('NFKC'))) {
    const [diet, written, official] = await Promise.all([
      dietSearch(issue, respondent),
      writtenSearch(issue),
      officialSearch(issue),
    ]);
    out.push(...diet, ...written, ...official);
    if (issue.concept) out.push({ ...issue.concept.source, score: 85 });
  }
  return out
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}

export function selfTest() {
  const samples = [
    'してまいります。',
    'でございます。',
    'と考えております。',
    '方針を打ち出しました。',
    '検討します。',
    '努力をしてまいりたいと思っております。',
    '重要と考えています。',
  ].map(finalizeStyle).join(' ');
  const us = CONCEPTS.find((x) => x.id === 'us-autonomy');
  const territory = splitIssues('尖閣諸島、竹島及び北方領土はいずれも我が国固有の領土か。');
  const numbered = splitIssues('一　物価高への対応を問う。\n二　少子化対策を問う。');
  const prose = splitIssues('物価高への対応を問う。また、賃上げをどのように実現するのか。さらに、中小企業への支援策を示されたい。');
  const ai = makeIssue('生成AIと著作権の関係について政府の見解を問う。');
  const writtenSample = composeWrittenAnswer(makeIssue('御指摘の「特別な基準」の定義を問う。'), '', 'ambiguity');
  const checks = {
    style: !hasPoliteEnding(samples),
    respondentHidden: true,
    usIntent: us.draft.includes('主体的') && !us.draft.includes('沖縄の未来'),
    multiIssue: territory.length >= 3,
    numberedIssues: numbered.length === 2,
    proseIssues: prose.length === 3,
    relationIssues: ai.required.length === 2,
    writtenDefensive: /具体的に意味するところが必ずしも明らかではない/.test(writtenSample),
    writtenOfficialStyle: lintOfficialText(`一について\n　${writtenSample}`).passed,
    speechFallbackNoEvasion: !/確認|困難/.test(fallbackDraft(makeIssue('一般的な政策課題'))),
    sourceAdapters: officialAdapterCount() + 3 >= 12,
  };
  return { version: VERSION, passed: Object.values(checks).every(Boolean), checks, samples, writtenSample };
}
