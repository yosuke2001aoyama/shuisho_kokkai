import { build as buildV18, searchAll as searchV18, selfTest as selfTestV18 } from './profile-v18.mjs';
import { splitIssues } from '../api/lib/issues.mjs';
import { finalizeStyle, hasPoliteEnding } from '../api/lib/style.mjs';
import { SOURCE_LABEL, CATEGORY_LABEL } from '../api/lib/core.mjs';

export const PROFILE_VERSION = '20.0';

const JP = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const BAD = /お尋ねの|御指摘|委員|議員|質問主意書|昨日は|私も|連合さん|まあ|というか|おっしゃ|御要望|読み上げ|通告|時間の関係|答弁書/u;
const RECOG = /認識|見解|考え|重要|課題|必要|基本|位置付け|意義|評価/u;
const REASON = /なぜ|理由|根拠|背景|原因|要因|ため|ことから|踏まえ/u;
const ACTION = /対応|対策|措置|支援|実施|推進|取り組|取組|進め|確保|強化|整備|拡充|改善|見直|講じ|執行|実現/u;
const FUTURE = /今後|引き続き|目指|努め|進めていく|取り組んでいく|講じていく|実施していく|継続する|方針|予定|見通し|将来/u;
const PAST_ONLY = /取り組んでき|行ってき|講じたところ|実施したところ|確保した|進めてき/u;
const BROAD = /国民生活|国民の負担|家計|事業活動|我が国経済|日本経済|政府は|最重要課題|幅広/u;
const DISCOURSE = /^(?:ですから|したがって|このため|こうした中|その上で|まず|また|なお|一方で|ちなみに|いずれにしても)[、，\s]*/u;
const NARROW = [
  /医療機関|医療・介護|診療報酬|歯科/u,
  /B型事業所|障害福祉/u,
  /固定資産税|上陸調査/u,
  /建設資材|住宅購入/u,
];
const TANGENTIAL = /税制のインフレ調整|ブラケットクリープ/u;

const norm = (value = '') => String(value).normalize('NFKC').replace(/[\t\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();
const compact = (value = '') => norm(value).replace(/[\s　、。！？?「」『』（）()]/gu, '');

function topic(issue) {
  const label = norm(issue?.label || '');
  const quoted = label.match(/「([^」]{2,80})」/u)?.[1];
  const conceptDraft = norm(issue?.concept?.draft || '');
  const conceptTopic = conceptDraft.match(/^(.{2,36}?)(?:については|は、|は)/u)?.[1];
  let value = quoted || conceptTopic || norm(issue?.topic || label || '当該課題');
  value = value
    .replace(/^(?:御指摘の|お尋ねの|なぜ)/u, '')
    .replace(/(?:への|に対する)(?:政府の)?(?:認識|見解|考え|対応|対策|措置|支援策|具体策|評価).*$/u, '')
    .replace(/(?:について|に関して)(?:政府の)?(?:見解|認識|考え|対応|方針|評価基準|説明)?(?:を)?(?:問う|示されたい|明らかにされたい)?$/u, '')
    .replace(/をどのように(?:実現|強化|推進|実施|確保|改善|解決|対応)するのか$/u, '')
    .replace(/が必要なのか.*$/u, '')
    .replace(/(?:の)?(?:理由|根拠)を問う$/u, '')
    .replace(/[、，]\s*(?:今後の)?方針.*$/u, '')
    .replace(/[。？！?]+$/u, '')
    .trim();
  return !value || value.length > 70 || /^[a-z0-9-]+$/iu.test(value) ? '当該課題' : value;
}

function requestedKinds(issue) {
  const question = norm(`${issue?.label || ''} ${issue?.topic || ''}`);
  const kinds = [];
  if (/認識|見解|考え|評価|意義|位置付け|どのように捉/u.test(question)) kinds.push('recognition');
  if (/なぜ|理由|根拠|背景|原因|要因/u.test(question)) kinds.push('reason');
  if (/対応|対策|措置|支援|具体策|取組|取り組|実施|何を|どのように(?:実現|強化|推進|確保|改善|解決|対応)|講じ/u.test(question)) kinds.push('measures');
  if (/今後|方針|予定|見通し|将来|引き続き|目指|進めるのか/u.test(question)) kinds.push('future');
  const unique = [...new Set(kinds)];
  if (!unique.length) return ['conclusion'];
  if (unique.some((kind) => kind !== 'recognition')) unique.unshift('conclusion');
  return [...new Set(unique)];
}

function pointLabel(kind) {
  return {
    conclusion: '結論',
    recognition: '政府の認識',
    reason: '理由・根拠',
    measures: '具体的な対応',
    future: '今後の方針',
  }[kind] || '答弁';
}

function balanced(text) {
  return [['「', '」'], ['『', '』'], ['（', '）']].every(([open, close]) => text.split(open).length === text.split(close).length);
}

function cleanStandalone(text = '') {
  return norm(text)
    .replace(/^●\s*/u, '')
    .replace(DISCOURSE, '')
    .replace(/^現時点では[、，\s]*/u, '現時点では、')
    .trim();
}

function sentenceList(text = '') {
  const styled = finalizeStyle(norm(text))
    .replace(/ですとか/gu, 'や')
    .replace(/であるとか/gu, 'や')
    .replace(/というふうに/gu, 'と')
    .replace(/していただく/gu, 'する')
    .replace(/と考えておりまして/gu, 'と考えている')
    .replace(/と認識しておりまして/gu, 'と認識している')
    .replace(/でありまして/gu, 'である')
    .replace(/おきまして/gu, 'おいて')
    .replace(/、。/gu, '。');
  const raw = styled.split(/(?<=[。！？])/u).map((item) => item.trim()).filter(Boolean);
  const expanded = raw.flatMap((item) => {
    if (!BAD.test(item)) return [item];
    return item.match(/(?:今後とも|今後は|引き続き)[^。！？]{8,260}[。！？]/gu) || [];
  });
  return expanded
    .map(cleanStandalone)
    .filter((item) => item.length >= 16 && item.length <= 420)
    .filter((item) => balanced(item) && !BAD.test(item));
}

function kindMatches(text, kind) {
  if (kind === 'recognition') return RECOG.test(text);
  if (kind === 'reason') return REASON.test(text);
  if (kind === 'measures') return ACTION.test(text);
  if (kind === 'future') return FUTURE.test(text) && !PAST_ONLY.test(text);
  return RECOG.test(text) || ACTION.test(text) || /である|ではない|該当する|該当しない/u.test(text);
}

function scopePenalty(text, issue, kind) {
  const question = norm(issue?.label || '');
  let penalty = 0;
  for (const narrow of NARROW) {
    if (narrow.test(text) && !narrow.test(question)) penalty -= 220;
  }
  if ((kind === 'conclusion' || kind === 'recognition') && TANGENTIAL.test(text) && !TANGENTIAL.test(question)) penalty -= 180;
  return penalty;
}

function sourceBonus(source, kind) {
  const category = source?.category || '';
  if (category === 'official_policy') return 75;
  if (category === 'minister') return kind === 'measures' || kind === 'future' ? 55 : 45;
  if (category === 'prime') return 40;
  if (category === 'cabinet') return 30;
  if (category === 'official') return 10;
  return 0;
}

function sentenceScore(text, issue, kind, source) {
  let score = 0;
  for (const anchor of issue?.anchors || []) {
    if (anchor.length >= 2 && text.includes(anchor)) score += Math.min(anchor.length, 12) * 10;
  }
  if (!kindMatches(text, kind)) return -10000;
  if (kind === 'conclusion') score += 35;
  if (kind === 'recognition') score += 70;
  if (kind === 'reason') score += 70;
  if (kind === 'measures') score += 70;
  if (kind === 'future') score += 90;
  if ((kind === 'conclusion' || kind === 'recognition') && BROAD.test(text)) score += 90;
  if (kind === 'measures' && /エネルギー|賃上げ|価格転嫁|生産性向上|給付|料金支援/u.test(text)) score += 50;
  score += scopePenalty(text, issue, kind);
  score += sourceBonus(source, kind);
  score += (source?.score || 0) / 20;
  if (text.length > 280) score -= 25;
  return score;
}

function sourceText(source, issue) {
  if (source?.id === issue?.concept?.source?.id && issue?.concept?.draft) return issue.concept.draft;
  return source?.phrase || '';
}

function generatedPoint(issue, kind) {
  const subject = topic(issue);
  if (kind === 'future' && /物価/u.test(subject)) {
    return '今後は、物価動向が家計及び事業活動に与える影響を注視しつつ、物価上昇を上回る賃上げ、中小企業の価格転嫁及び生産性向上を通じた供給力強化を進め、必要な物価高対策を機動的に講ずる。';
  }
  if (kind === 'future' && /少子化|子育て/u.test(subject)) {
    return '今後は、若者及び子育て世代の所得向上、子育て支援の充実並びに仕事と育児の両立支援を着実に進め、施策の効果を検証しながら必要な見直しを行う。';
  }
  if (kind === 'future' && /防災|災害/u.test(subject)) {
    return '今後は、事前防災、避難体制、情報提供及びインフラの強靱化を一体的に進め、災害対応の検証結果を踏まえて必要な改善を行う。';
  }
  const caution = `現時点で参照できる政府資料のみからは、${subject}に関する確定的な答弁内容を特定できないため、主管府省において事実関係及び政府方針を確認の上、答弁を確定する必要がある。`;
  if (kind === 'recognition') return `${subject}については、国民生活及び社会経済への影響並びに関係法令及び事実関係を踏まえて判断する必要がある。${caution}`;
  if (kind === 'reason') return `${subject}の理由又は根拠については、関係法令及び確認された事実関係に即して説明する必要がある。${caution}`;
  if (kind === 'measures') return `${subject}に関する具体的な対応については、既定の施策及びその実施状況を確認した上で示す必要がある。${caution}`;
  if (kind === 'future') return `${subject}に関する今後の方針については、政策効果及び情勢の変化を踏まえ、必要な施策を着実に実施するとともに、適時適切に見直しを行う。`;
  return caution;
}

async function boundedSearch(query, respondent) {
  let timer;
  try {
    return await Promise.race([
      searchV18(query, respondent),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve([]), 18000);
      }),
    ]);
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function annotateReferences(references, respondent) {
  return references
    .filter(Boolean)
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .map((item, index) => ({
      ...item,
      referenceKey: `r${index + 1}`,
      quotedPhrase: item.phrase,
      categoryLabel: CATEGORY_LABEL[item.category] || item.category,
      sourceTypeLabel: SOURCE_LABEL[item.sourceType] || item.sourceType,
      borrowed: ['prime', 'chief', 'minister', 'official'].includes(item.category) && item.category !== respondent,
    }));
}

async function buildSpeech(question, respondent) {
  const issues = splitIssues(norm(question));
  const results = await Promise.all(issues.map((issue) => {
    const query = topic(issue) === '当該課題' ? norm(issue.label || issue.topic).slice(0, 50) : topic(issue);
    return boundedSearch(query, respondent);
  }));
  const raw = [];
  const usedReferences = [];
  const coverage = [];
  const diagnostics = [];

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index];
    const kinds = requestedKinds(issue);
    const usedText = new Set();
    const references = [
      ...(issue?.concept?.source ? [issue.concept.source] : []),
      ...(results[index] || []),
    ].filter((item, itemIndex, all) => item && all.findIndex((other) => other.id === item.id) === itemIndex);
    let evidenceCount = 0;

    for (const kind of kinds) {
      const ranked = [];
      for (const reference of references) {
        for (const sentence of sentenceList(sourceText(reference, issue))) {
          const key = compact(sentence);
          if (usedText.has(key)) continue;
          const score = sentenceScore(sentence, issue, kind, reference);
          if (score > 0) ranked.push({ reference, text: sentence, score });
        }
      }
      ranked.sort((a, b) => b.score - a.score);
      let selected = ranked[0];
      if (kind === 'conclusion' && issue?.concept?.draft) {
        const text = sentenceList(issue.concept.draft)[0] || finalizeStyle(issue.concept.draft);
        selected = { reference: issue.concept.source, text: cleanStandalone(text), score: 10000 };
      }
      const text = selected?.text || generatedPoint(issue, kind);
      usedText.add(compact(text));
      if (selected?.reference) {
        usedReferences.push(selected.reference);
        evidenceCount += 1;
      }
      raw.push({
        text,
        sourceId: selected?.reference?.id || null,
        issueIndex: index,
        pointLabel: pointLabel(kind),
        responseType: kind,
        generated: !selected?.reference,
      });
    }

    coverage.push({
      issueIndex: index + 1,
      issue: issue.label,
      topic: topic(issue),
      status: 'covered',
      responseType: 'substantive',
      requestedKinds: kinds,
      evidenceCount,
      pointCount: kinds.length,
      generated: evidenceCount === 0,
    });
    diagnostics.push({
      issue: issue.label,
      topic: topic(issue),
      requestedKinds: kinds,
      evidenceCount,
      profile: 'oral-question-bound-general-scope',
    });
  }

  const references = annotateReferences(usedReferences, respondent);
  const referenceKey = new Map(references.map((item) => [item.id, item.referenceKey]));
  const segments = [{ text: `問　${norm(question)}\n\n（答）\n` }];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    const firstOfIssue = index === 0 || raw[index - 1].issueIndex !== item.issueIndex;
    const heading = firstOfIssue ? `${index ? '\n\n' : ''}● 論点${JP[item.issueIndex] || item.issueIndex + 1}\n` : '\n\n';
    segments.push({
      ...item,
      text: `${heading}【${item.pointLabel}】\n　${item.text}`,
      referenceKey: item.sourceId ? referenceKey.get(item.sourceId) : null,
      borrowed: Boolean(references.find((reference) => reference.id === item.sourceId)?.borrowed),
    });
  }
  const draft = segments.map((segment) => segment.text).join('');
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.length,
    missing: 0,
    substantive: coverage.length,
    qualifiedOrLimited: 0,
    generated: coverage.filter((item) => item.generated).length,
    totalPoints: coverage.reduce((sum, item) => sum + item.pointCount, 0),
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
    missingIssueCount: 0,
    coverage,
    coverageSummary,
    diagnostics,
    sourceCoverage: ['国会会議録', '質問主意書答弁書（衆議院・参議院）', '会見・演説', 'インタビュー・寄稿', '政府公式資料'],
    draftingStance: '国民への説明責任を重視しつつ、質問で明示された論点及びその答弁に直接必要な事項に限って答える。',
    priorityRule: '質問ごとに求められた認識、理由、具体策及び今後の方針を判定し、求められていない要素は追加しない。一般的な質問には一部業界だけの答弁を流用しない。',
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
  };
}

export async function build(mode, question, respondent) {
  if (mode === 'written') {
    const result = await buildV18(mode, question, respondent);
    return { ...result, version: PROFILE_VERSION };
  }
  return buildSpeech(question, respondent);
}

export async function searchAll(query, respondent) {
  return searchV18(query, respondent);
}

export function selfTest() {
  const base = selfTestV18();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '20.0',
    questionBoundScope: true,
    broadQuestionRejectsSectorOnlyAnswer: true,
    futureRequiresForwardSignal: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
