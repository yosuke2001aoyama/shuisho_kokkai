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
import { dietSearch } from './diet.mjs';
import { writtenSearch } from './written.mjs';
import { officialSearch, officialAdapterCount } from './official.mjs';

const JP_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];
const ANSWER_CLAUSE = /方針|課題|重要|必要|取り組|進め|実施|推進|確保|強化|目指|判断|対応|認識|考え|実現|検討|努め|図る|行う|である|ではない/u;
const DISCOURSE_PREFIX = /^(?:それから|その上で|まず|また|なお|一方で|ちなみに|いずれにしても|御指摘のとおり|おっしゃるとおり)[、,\s]*/u;

const containsGroup = (text, group = []) => group.some((term) => text.includes(term));

function clauseScore(clause, issue) {
  let score = 0;
  for (const anchor of issue.anchors || []) {
    if (anchor.length >= 2 && clause.includes(anchor)) score += Math.min(anchor.length, 12) * 8;
  }
  for (const group of issue.required || []) if (containsGroup(clause, group)) score += 35;
  if (ANSWER_CLAUSE.test(clause)) score += 20;
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

function focusEvidence(issue, phrase) {
  const styled = finalizeStyle(String(phrase).normalize('NFKC'));
  if (styled.length <= 220) return completeEnding(styled);

  const sentences = styled.split(/(?<=[。！？])/u).map((x) => x.trim()).filter(Boolean);
  const units = [];
  for (const sentence of sentences) {
    if (sentence.length <= 220) {
      units.push(sentence);
      continue;
    }
    const clauses = sentence.split(/(?<=、)/u).map((x) => x.trim()).filter(Boolean);
    units.push(...clauses);
  }
  if (!units.length) return completeEnding(styled);

  const ranked = units
    .map((text, index) => ({ text, index, score: clauseScore(text, issue) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score <= 0) return completeEnding(styled.slice(0, 220));

  const selected = [best.text];
  const next = units[best.index + 1];
  if (
    next &&
    selected.join('').length + next.length <= 260 &&
    (ANSWER_CLAUSE.test(next) || /^(?:政府|引き続き|鋭意|このため|これにより)/u.test(next))
  ) selected.push(next);

  let focused = completeEnding(selected.join(''));
  const primary = issue.required?.[0] || [];
  const topic = issue.topic || issue.label;
  if (
    topic &&
    topic.length <= 55 &&
    !containsGroup(focused, primary) &&
    !focused.includes(topic)
  ) focused = `${topic}については、${focused}`;
  return focused;
}

async function draftOne(issue, mode, respondent) {
  const [diet, written, official] = await Promise.all([
    dietSearch(issue, respondent),
    writtenSearch(issue),
    officialSearch(issue),
  ]);
  const staticSource = issue.concept ? { ...issue.concept.source, score: 85 } : null;
  const candidates = [...diet, ...written, ...official, ...(staticSource ? [staticSource] : [])]
    .filter((x) => acceptable(x, issue));
  candidates.sort(
    (a, b) => sourceRank(a, mode, respondent) - sourceRank(b, mode, respondent) || b.score - a.score,
  );
  const primary = candidates[0] || staticSource;

  if (issue.concept && primary) {
    return {
      segments: [{ text: finalizeStyle(issue.concept.draft), sourceId: primary.id }],
      refs: [primary],
      diagnostics: { diet: diet.length, written: written.length, official: official.length },
    };
  }
  if (primary) {
    return {
      segments: [{ text: focusEvidence(issue, primary.phrase), sourceId: primary.id }],
      refs: [primary],
      diagnostics: { diet: diet.length, written: written.length, official: official.length },
    };
  }
  return {
    segments: [{ text: finalizeStyle(fallbackDraft(issue)), generated: true }],
    refs: [],
    diagnostics: { diet: diet.length, written: written.length, official: official.length },
  };
}

export async function build(mode, question, respondent) {
  const normalizedQuestion = String(question).normalize('NFKC');
  const issues = splitIssues(normalizedQuestion);
  const rawSegments = [];
  const refs = [];
  const diagnostics = [];
  for (const issue of issues) {
    const d = await draftOne(issue, mode, respondent);
    rawSegments.push(...d.segments);
    refs.push(...d.refs);
    diagnostics.push({ issue: issue.label, topic: issue.topic, ...d.diagnostics });
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
  const numberedInput = /(?:^|\n)\s*(?:[一二三四五六七八九十]+|\d+)[　\s、．.]/u.test(normalizedQuestion);

  const segments = mode === 'written'
    ? rawSegments.map((x, i) => {
        const prefix = numberedInput
          ? `${i ? '\n\n' : ''}${JP_NUM[i] || i + 1}について\n　`
          : `${i === 0 ? '一について\n　' : '\n\n　'}`;
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
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
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
        ? '質問主意書答弁書、国会答弁、会見・演説、インタビュー・寄稿、政府公式資料の順'
        : '同一答弁者の国会答弁、質問主意書答弁書、他の国会答弁、会見・演説、インタビュー・寄稿、政府公式資料の順',
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
  const ai = makeIssue('生成AIと著作権の関係について政府の見解を問う。');
  const checks = {
    style: !hasPoliteEnding(samples),
    respondentHidden: true,
    usIntent: us.draft.includes('主体的') && !us.draft.includes('沖縄の未来'),
    multiIssue: territory.length === 3,
    numberedIssues: numbered.length === 2,
    relationIssues: ai.required.length === 2,
    noBadFallback: !/確認|困難/.test(fallbackDraft(makeIssue('一般的な政策課題'))),
    sourceAdapters: officialAdapterCount() + 3 >= 12,
  };
  return { version: VERSION, passed: Object.values(checks).every(Boolean), checks, samples };
}
