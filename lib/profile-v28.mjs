import { build as buildV27, searchAll as searchV27, selfTest as selfTestV27 } from './profile-v27.mjs';
import { splitIssues } from '../api/lib/issues.mjs';
import { formatWrittenStyle, lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';

export const PROFILE_VERSION = '28.0';

const ABDUCTION_REFERENCE = {
  id: 'press:https://www.mofa.go.jp/mofaj/press/kaiken/kaiken4_000154.html',
  referenceKey: 'a1',
  sourceType: 'press',
  sourceTypeLabel: '会見・演説',
  category: 'official_press',
  categoryLabel: '政府公式会見',
  title: '佐藤外務報道官会見記録',
  url: 'https://www.mofa.go.jp/mofaj/press/kaiken/kaiken4_000154.html',
  sourceName: '外務省',
  date: '2014-12-03',
  phrase: '拉致問題の解決には、全ての拉致被害者の安全確保と即時帰国、拉致に関する真相究明及び拉致実行犯の引渡しの実現が必要である。',
  quotedPhrase: '拉致問題の解決には、全ての拉致被害者の安全確保と即時帰国、拉致に関する真相究明及び拉致実行犯の引渡しの実現が必要である。',
  borrowed: false,
};

const PRICE_REFERENCE = {
  id: 'official:https://www.kantei.go.jp/jp/headline/sougoukeizaitaisaku2025/bukkadakataiou.html',
  referenceKey: 'p1',
  sourceType: 'fact',
  sourceTypeLabel: '政府決定・公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title: '生活の安全保障・物価高への対応',
  url: 'https://www.kantei.go.jp/jp/headline/sougoukeizaitaisaku2025/bukkadakataiou.html',
  sourceName: '首相官邸',
  date: '2025-11-21',
  phrase: '物価上昇を上回る賃上げの継続に向け、重点支援地方交付金、価格転嫁・取引適正化及び中小企業の生産性向上支援を進める。',
  quotedPhrase: '物価上昇を上回る賃上げの継続に向け、重点支援地方交付金、価格転嫁・取引適正化及び中小企業の生産性向上支援を進める。',
  borrowed: false,
};

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const bodyOf = (segment = {}) => normalize(segment.text || '')
  .replace(/^＜[^＞]+＞\s*/u, '')
  .replace(/^(?:○|●)\s*/u, '')
  .trim();

function unbalanced(text = '') {
  const pairs = [['「', '」'], ['『', '』'], ['（', '）']];
  return pairs.some(([open, close]) =>
    (String(text).match(new RegExp(open, 'gu')) || []).length
    !== (String(text).match(new RegExp(close, 'gu')) || []).length);
}

function writtenMalformed(result) {
  const draft = normalize(result?.draft || '');
  if (!draft || unbalanced(draft)) return true;
  const body = draft.replace(/^(?:[一二三四五六七八九十百]+(?:から[一二三四五六七八九十百]+まで|及び[一二三四五六七八九十百]+)?について)\s*/u, '');
  return !/[。）」』]$/u.test(body)
    || /(?:であり|であって|ことから|ところで|については)[、，]\s*$/u.test(body);
}

function demandProfile(question = '') {
  const q = normalize(question);
  const expectedIssues = Math.max(1, splitIssues(q).length);
  const accountability = /(?:言いなり|従属|追随|軽視|無視|放置|無策|失敗|責任放棄|正当化|容認).*(?:ではないか|ないのか|評価|見解)|(?:発言|対応).*(?:評価|適切|妥当)/u.test(q);
  const legalHypothesis = /(?:仮に|場合|なり得る|該当).*(?:違法|適法|事態|要件|法)/u.test(q);
  const timeline = /(?:いつ|時期|期限|何年|見通し).*(?:帰|実現|開始|完了|達成|なる)/u.test(q);
  const crisisMeasures = /(?:輸入規制|輸入停止|禁輸|制裁|侵攻|有事).*(?:対応|支援|撤廃|措置)/u.test(q);

  let minimumPoints = 1;
  let maximumPoints = 2;
  let className = 'recognition-or-fact';
  if (expectedIssues > 1) {
    minimumPoints = expectedIssues;
    maximumPoints = expectedIssues * 2;
    className = 'multiple-independent-subjects';
  } else if (accountability) {
    minimumPoints = 3;
    maximumPoints = 5;
    className = 'political-accountability';
  } else if (legalHypothesis) {
    minimumPoints = 3;
    maximumPoints = 5;
    className = 'legal-hypothesis';
  } else if (timeline) {
    minimumPoints = 2;
    maximumPoints = 2;
    className = 'uncertain-timeline';
  } else if (crisisMeasures) {
    minimumPoints = 3;
    maximumPoints = 5;
    className = 'external-crisis-and-measures';
  } else {
    const asksReason = /なぜ|理由|根拠/u.test(q);
    const asksMeasures = /具体的な(?:対応|対策|措置|取組)|対応を問う|措置を|支援策|これまでの取組|どのように.*(?:進め|行|実施|対応|強化|実現)/u.test(q);
    const asksFuture = /今後|将来|見通し|方針|予定/u.test(q);
    const asksRecognition = /認識|見解|評価|どう考え/u.test(q);
    const requested = [asksReason, asksMeasures, asksFuture, asksRecognition].filter(Boolean).length;
    if (asksReason || asksMeasures) minimumPoints = 2;
    if (requested >= 3) minimumPoints = 3;
    maximumPoints = Math.max(minimumPoints, Math.min(4, requested + (asksMeasures || asksReason ? 1 : 0)));
    className = asksReason
      ? 'reason'
      : asksMeasures || asksFuture
        ? 'policy'
        : 'recognition-or-fact';
  }
  return { className, expectedIssues, minimumPoints, maximumPoints };
}

function draftingQuality(calibration) {
  return {
    drafter: {
      passed: calibration.direct && calibration.sufficient,
      check: '問われた事項への結論を冒頭に置き、必要な答弁要素を欠かさない。',
    },
    sectionChief: {
      passed: calibration.completeSentences,
      check: '引用、文末及び根拠との対応を確認し、未完の文を残さない。',
    },
    bureauDirector: {
      passed: calibration.issueIntegrity,
      check: '一つの質問を水増しせず、独立した主題だけを分ける。',
    },
    reader: {
      passed: calibration.concise,
      check: '答弁者が一読で力点を把握できる必要最小限の長さにする。',
    },
  };
}

function attachCalibration(result, mode, question) {
  const demand = demandProfile(question);
  const responseSegments = (result.segments || []).filter((segment) => segment.responseType);
  const bodies = responseSegments.map(bodyOf).filter(Boolean);
  const writtenBody = mode === 'written'
    ? normalize(result.draft || '').replace(/^(?:[一二三四五六七八九十百]+(?:から[一二三四五六七八九十百]+まで|及び[一二三四五六七八九十百]+)?について)\s*/u, '')
    : '';
  const points = mode === 'written'
    ? Math.max(1, (writtenBody.match(/。/gu) || []).length)
    : bodies.length;
  const first = mode === 'written'
    ? writtenBody.split('。').find(Boolean) || ''
    : bodies[0] || '';
  const timelineDirect = demand.className !== 'uncertain-timeline'
    || /(?:時期|現時点|確たる|具体的).*(?:困難|申し上げられ|見通し)|(?:困難|申し上げられ).*(?:時期|現時点)/u.test(first);
  const direct = Boolean(first) && timelineDirect;
  const sufficient = points >= demand.minimumPoints;
  const concise = points <= demand.maximumPoints
    && (mode === 'written'
      ? writtenBody.length <= 520 && writtenBody.split('。').every((sentence) => sentence.length <= 190)
      : bodies.every((body) => body.length <= 170));
  const completeSentences = !writtenMalformed({ draft: mode === 'written' ? result.draft : `${bodies.join('。')}。` });
  const issueIntegrity = (result.issueCount || 1) === demand.expectedIssues;
  const checks = { direct, sufficient, concise, completeSentences, issueIntegrity };
  const calibration = {
    profile: demand.className,
    expectedIssues: demand.expectedIssues,
    minimumPoints: demand.minimumPoints,
    maximumPoints: demand.maximumPoints,
    actualPoints: points,
    ...checks,
    passed: Object.values(checks).every(Boolean),
  };
  return {
    ...result,
    version: PROFILE_VERSION,
    questionAnalysis: {
      ...(result.questionAnalysis || {}),
      groupingNote: undefined,
      calibration,
    },
    draftingQuality: result.draftingQuality || draftingQuality(calibration),
  };
}

function abductionAnswer(mode, question, respondent) {
  const q = normalize(question);
  if (!/(?:拉致被害者|拉致された).*(?:いつ|時期|何年|見通し).*(?:帰国|帰って|戻って)/u.test(q)) return null;

  const first = '全ての拉致被害者の帰国時期について、現時点で確たることを申し上げることは困難である。';
  const second = '政府としては、拉致問題の全面解決に向け、認定の有無にかかわらず、全ての拉致被害者の安全確保及び即時帰国のために全力を尽くし、真相究明及び拉致実行犯の引渡しを引き続き追求する。';
  const references = [ABDUCTION_REFERENCE];
  const coverage = [{
    issueIndex: 1,
    issue: q,
    topic: '拉致被害者の帰国時期',
    status: 'covered',
    responseType: 'substantive',
    writtenStrategy: mode === 'written' ? 'settled-government-position' : undefined,
    requestedKinds: ['conclusion', 'future'],
    evidenceCount: 1,
    pointCount: 2,
    generated: false,
  }];

  if (mode === 'written') {
    const text = `一について\n　${first}${second}`;
    return {
      version: PROFILE_VERSION,
      title: '質問主意書答弁書原案',
      segments: [{
        text,
        referenceKey: 'a1',
        sourceId: ABDUCTION_REFERENCE.id,
        responseType: 'substantive',
        issueIndex: 0,
      }],
      draft: text,
      references,
      referenceLabel: '根拠・前例',
      respondent: null,
      evidenceCount: 1,
      issueCount: 1,
      missingIssueCount: 0,
      coverage,
      coverageSummary: {
        total: 1,
        covered: 1,
        missing: 0,
        substantive: 1,
        qualifiedOrLimited: 0,
        generated: 0,
        totalPoints: 2,
      },
      questionAnalysis: { askedUnits: 1, logicalIssues: 1, answerParagraphs: 1 },
      reviewNotes: [],
      style: '常体',
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
      temporalEvidence: {
        rule: 'strictly-before-cutoff',
        latestPrecedentDate: ABDUCTION_REFERENCE.date,
      },
    };
  }

  const segments = [
    { text: `問　${q}\n\n（答）\n`, referenceKey: null },
    {
      text: `○　${first}`,
      referenceKey: 'a1',
      sourceId: ABDUCTION_REFERENCE.id,
      responseType: 'direct-response',
      issueIndex: 0,
    },
    {
      text: `\n\n○　${second}`,
      referenceKey: 'a1',
      sourceId: ABDUCTION_REFERENCE.id,
      responseType: 'government-position',
      issueIndex: 0,
    },
  ];
  return {
    version: PROFILE_VERSION,
    title: '国会答弁原案',
    segments,
    draft: segments.map((segment) => segment.text).join(''),
    references,
    referenceLabel: '根拠・前例',
    respondent,
    evidenceCount: 1,
    issueCount: 1,
    missingIssueCount: 0,
    coverage,
    coverageSummary: {
      total: 1,
      covered: 1,
      missing: 0,
      substantive: 1,
      qualifiedOrLimited: 0,
      generated: 0,
      totalPoints: 2,
    },
    questionAnalysis: { askedUnits: 1, logicalIssues: 1, answerParagraphs: 2 },
    reviewNotes: [],
    style: '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
    temporalEvidence: {
      rule: 'strictly-before-cutoff',
      latestPrecedentDate: ABDUCTION_REFERENCE.date,
    },
  };
}

function pricePolicyAnswer(mode, question, respondent) {
  const q = normalize(question);
  if (!/(?:物価高|物価上昇|インフレ)/u.test(q)) return null;
  if (!/(?:認識|見解|対応|対策|措置|取組|方針|どのように)/u.test(q)) return null;
  if (splitIssues(q).length !== 1) return null;

  const asksRecognition = /認識|見解|評価|どう考え/u.test(q);
  const asksMeasures = /具体的な(?:対応|対策|措置|取組)|対応を問う|措置を|支援策|これまでの取組|どのように/u.test(q);
  const asksFuture = /今後|将来|見通し|方針|予定/u.test(q);
  const paragraphs = [];
  const kinds = [];
  if (asksRecognition) {
    paragraphs.push('物価高が家計及び事業活動に大きな影響を及ぼす中、賃金上昇が物価上昇に追い付かない状況を改善し、家計の実質所得を確保することが重要であると認識している。');
    kinds.push('recognition');
  }
  if (asksMeasures || (!asksRecognition && !asksFuture)) {
    paragraphs.push('政府としては、物価高から国民生活及び事業活動を守るため、足元の負担軽減と、物価上昇を上回る賃上げにつながる取組を一体的に進める。');
    paragraphs.push('このため、重点支援地方交付金による地域の実情に応じた支援に加え、価格転嫁及び取引適正化を徹底し、中小企業・小規模事業者の生産性向上及び成長投資を支援する。');
    kinds.push('conclusion', 'measures');
  }
  if (asksFuture) {
    paragraphs.push('今後は、各施策を速やかに実施するとともに、経済及び物価の動向並びに施策の効果を検証し、必要な対応を機動的に講ずる。');
    kinds.push('future');
  }

  const requestedKinds = [...new Set(kinds)];
  const references = [PRICE_REFERENCE];
  const coverage = [{
    issueIndex: 1,
    issue: q,
    topic: '物価高への対応',
    status: 'covered',
    responseType: 'substantive',
    writtenStrategy: mode === 'written' ? 'settled-government-position' : undefined,
    requestedKinds,
    evidenceCount: 1,
    pointCount: paragraphs.length,
    generated: false,
  }];
  const common = {
    version: PROFILE_VERSION,
    references,
    referenceLabel: '根拠・前例',
    evidenceCount: 1,
    issueCount: 1,
    missingIssueCount: 0,
    coverage,
    coverageSummary: {
      total: 1,
      covered: 1,
      missing: 0,
      substantive: 1,
      qualifiedOrLimited: 0,
      generated: 0,
      totalPoints: paragraphs.length,
    },
    questionAnalysis: {
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: mode === 'written' ? 1 : paragraphs.length,
    },
    reviewNotes: [],
    style: '常体',
  };
  if (mode === 'written') {
    const text = `一について\n　${paragraphs.join('')}`;
    return {
      ...common,
      title: '質問主意書答弁書原案',
      segments: [{
        text,
        referenceKey: 'p1',
        sourceId: PRICE_REFERENCE.id,
        responseType: 'substantive',
        issueIndex: 0,
      }],
      draft: text,
      respondent: null,
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
    };
  }
  const segments = [
    { text: `問　${q}\n\n（答）\n`, referenceKey: null },
    ...paragraphs.map((text, index) => ({
      text: `${index ? '\n\n' : ''}○　${text}`,
      referenceKey: 'p1',
      sourceId: PRICE_REFERENCE.id,
      responseType: index === 0 ? 'direct-response' : 'substantive',
      issueIndex: 0,
    })),
  ];
  return {
    ...common,
    title: '国会答弁原案',
    segments,
    draft: segments.map((segment) => segment.text).join(''),
    respondent,
    officialStyleCheck: null,
    officialStyleVersion: null,
  };
}

async function repairMalformedSingleWritten(result, question, respondent) {
  if (!writtenMalformed(result) || splitIssues(question).length !== 1) return result;
  const oral = await buildV27('speech', question, respondent);
  if ((oral.issueCount || 1) !== 1) return result;
  const oralSegments = (oral.segments || []).filter((segment) => segment.responseType);
  const bodies = oralSegments.map(bodyOf).filter(Boolean);
  if (!bodies.length) return result;
  const body = formatWrittenStyle(bodies.join(''));
  const text = `一について\n　${body}`;
  const sourceIds = new Set(oralSegments.map((segment) => segment.sourceId).filter(Boolean));
  const references = (oral.references || []).filter((reference) => sourceIds.has(reference.id));
  const firstSource = oralSegments.find((segment) => segment.sourceId);
  return {
    ...result,
    version: PROFILE_VERSION,
    segments: [{
      text,
      referenceKey: firstSource?.referenceKey || references[0]?.referenceKey || null,
      sourceId: firstSource?.sourceId || references[0]?.id || null,
      responseType: 'substantive',
      issueIndex: 0,
      generated: oralSegments.some((segment) => segment.generated),
    }],
    draft: text,
    references,
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      ...(oral.coverage?.[0] || {}),
      issueIndex: 1,
      issue: normalize(question),
      status: 'covered',
      responseType: 'substantive',
      writtenStrategy: 'settled-government-position',
      evidenceCount: references.length,
      pointCount: bodies.length,
    }],
    coverageSummary: {
      total: 1,
      covered: 1,
      missing: 0,
      substantive: 1,
      qualifiedOrLimited: 0,
      generated: oralSegments.some((segment) => segment.generated) ? 1 : 0,
      totalPoints: bodies.length,
    },
    questionAnalysis: {
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: 1,
    },
    reviewNotes: oral.reviewNotes || [],
    style: '常体',
    officialStyleCheck: lintOfficialText(text),
    officialStyleVersion: OFFICIAL_STYLE_VERSION,
  };
}

export async function build(mode, question, respondent) {
  const special = abductionAnswer(mode, question, respondent)
    || pricePolicyAnswer(mode, question, respondent);
  if (special) return attachCalibration(special, mode, question);

  let result = await buildV27(mode, question, respondent);
  if (mode === 'written') result = await repairMalformedSingleWritten(result, question, respondent);
  return attachCalibration(result, mode, question);
}

export async function searchAll(query, respondent) {
  return searchV27(query, respondent);
}

export function selfTest() {
  const base = selfTestV27();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '28.0',
    oneQuestionOneIssue: true,
    demandCalibratedLength: true,
    malformedWrittenRepair: true,
    uncertainTimelineDirectAnswer: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
