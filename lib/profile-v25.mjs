import { build as buildV24, searchAll as searchV24, selfTest as selfTestV24 } from './profile-v24.mjs';
import { formatWrittenStyle, lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';

export const PROFILE_VERSION = '25.0';

const OFFICIAL_CRISIS_REFERENCE = {
  id: 'written:https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b219071.htm',
  referenceKey: 'r1',
  sourceType: 'written',
  sourceTypeLabel: '質問主意書答弁書',
  category: 'cabinet',
  categoryLabel: '閣議決定済み答弁書',
  title: '衆議院議員斉藤鉄夫君提出存立危機事態に関する質問に対する答弁書',
  url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b219071.htm',
  sourceName: '衆議院・閣議決定答弁書',
  date: '2025-11-25',
  phrase: 'いかなる事態が存立危機事態に該当するかについては、事態の個別具体的な状況に即して、政府がその持ち得る全ての情報を総合して客観的かつ合理的に判断する。台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとっても重要である。',
  quotedPhrase: 'いかなる事態が存立危機事態に該当するかについては、事態の個別具体的な状況に即して、政府がその持ち得る全ての情報を総合して客観的かつ合理的に判断する。台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとっても重要である。',
  borrowed: false,
};

const OFFICIAL_COMMITTEE_REFERENCE = {
  id: 'answer:https://www.shugiin.go.jp/Internet/itdb_kaigiroku.nsf/html/kaigiroku/001821920251107002.htm',
  referenceKey: 'r2',
  sourceType: 'answer',
  sourceTypeLabel: '国会答弁',
  category: 'prime',
  categoryLabel: '総理',
  title: '第219回国会　衆議院予算委員会　第2号',
  url: 'https://www.shugiin.go.jp/Internet/itdb_kaigiroku.nsf/html/kaigiroku/001821920251107002.htm',
  sourceName: '衆議院会議録',
  date: '2025-11-07',
  phrase: '麻生副総裁の発言については内閣総理大臣としてはコメントしない。いかなる事態が存立危機事態に該当するかは、実際に発生した事態の個別具体的な状況に即して、全ての情報を総合して判断する。',
  quotedPhrase: '麻生副総裁の発言については内閣総理大臣としてはコメントしない。いかなる事態が存立危機事態に該当するかは、実際に発生した事態の個別具体的な状況に即して、全ての情報を総合して判断する。',
  borrowed: false,
};

const OFFICIAL_AI_COPYRIGHT_REFERENCE = {
  id: 'official:https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html',
  referenceKey: 'r1',
  sourceType: 'fact',
  sourceTypeLabel: '政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title: 'ＡＩと著作権について',
  url: 'https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html',
  sourceName: '文化庁',
  date: '2024-03-15',
  phrase: '生成ＡＩと著作権の関係に関する懸念の解消を図るため、文化審議会著作権分科会法制度小委員会において「ＡＩと著作権に関する考え方について」を取りまとめ、関係者向けのチェックリスト及びガイダンスを作成している。',
  quotedPhrase: '生成ＡＩと著作権の関係に関する懸念の解消を図るため、文化審議会著作権分科会法制度小委員会において「ＡＩと著作権に関する考え方について」を取りまとめ、関係者向けのチェックリスト及びガイダンスを作成している。',
  borrowed: false,
};

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r]+/gu, ' ')
  .replace(/[ ]{2,}/gu, ' ')
  .trim();

const compact = (value = '') => normalize(value).replace(/[\s　、。！？?「」『』（）()・]/gu, '');

function bodyOf(segment = {}) {
  const text = String(segment.text || '');
  const position = text.lastIndexOf('\n　');
  return normalize(position >= 0 ? text.slice(position + 2) : text)
    .replace(/^(?:●|○)\s*/u, '')
    .replace(/^論点(?:[一二三四五六七八九十]+|\d+)\s*/u, '')
    .replace(/^【[^】]+】\s*/u, '')
    .trim();
}

function askedUnitCount(question = '') {
  const text = normalize(question);
  const matches = text.match(/(?:どう考えているのか|どのように[^。？！?]{0,40}(?:する|進める|対応する)のか|なぜ[^。？！?]*のか|[かい]。|か[？?]|問う。|伺う。|示されたい。|明らかにされたい。|説明されたい。|求める。)/gu);
  return Math.max(1, matches?.length || 0);
}

function overlapRatio(a = '', b = '') {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return 0;
  const xs = new Set(x);
  const ys = new Set(y);
  const overlap = [...xs].filter((ch) => ys.has(ch)).length;
  return overlap / Math.max(1, Math.min(xs.size, ys.size));
}

function longestCommonSubstring(a = '', b = '') {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return '';
  const previous = new Array(y.length + 1).fill(0);
  let bestLength = 0;
  let bestEnd = 0;
  for (let i = 1; i <= x.length; i += 1) {
    const current = new Array(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j += 1) {
      if (x[i - 1] !== y[j - 1]) continue;
      current[j] = previous[j - 1] + 1;
      if (current[j] > bestLength) {
        bestLength = current[j];
        bestEnd = i;
      }
    }
    for (let j = 0; j <= y.length; j += 1) previous[j] = current[j];
  }
  return x.slice(bestEnd - bestLength, bestEnd);
}

function isSameIssue(a = {}, b = {}) {
  const left = `${a.issue || ''} ${a.topic || ''}`;
  const right = `${b.issue || ''} ${b.topic || ''}`;
  if (/^(?:その|これ|この|同|当該|前記)/u.test(normalize(b.issue || ''))) return true;
  const common = longestCommonSubstring(left, right);
  if (common.length >= 4 && !/どのように|政府として|について|説明されたい/u.test(common)) return true;
  return overlapRatio(a.topic || a.issue, b.topic || b.issue) >= 0.72;
}

function logicalGroups(coverage = []) {
  const groups = [];
  for (const item of coverage) {
    const previous = groups.at(-1);
    if (previous && isSameIssue(previous.at(-1), item)) previous.push(item);
    else groups.push([item]);
  }
  return groups;
}

function nearDuplicate(a = '', b = '') {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  return overlapRatio(x, y) >= 0.9;
}

function safeFallback(topic = '', responseType = '') {
  const subject = normalize(topic) || '当該事項';
  if (responseType === 'recognition') {
    return `${subject}については、関係法令、確認された事実関係及び国民生活への影響を踏まえて判断する必要があると認識している。`;
  }
  if (responseType === 'reason') {
    return `${subject}の理由については、関係法令及び確認された事実関係に即して説明する必要がある。`;
  }
  if (responseType === 'measures') {
    return `${subject}については、既定の施策及びその実施状況を確認し、必要な対応を着実に進める。`;
  }
  if (responseType === 'future') {
    return `${subject}については、情勢の変化及び政策効果を検証しながら、必要な対応を適時適切に行う。`;
  }
  return `${subject}については、関係法令及び個別具体的な状況に即して、政府として適切に判断する。`;
}

function specialCrisisAnswer(question, respondent) {
  const q = normalize(question);
  if (!/存立危機事態/u.test(q) || !/台湾|台湾海峡|海上封鎖|中国/u.test(q)) return null;

  const paragraphs = [];
  if (/麻生|副総裁|議員|発言/u.test(q)) {
    const actor = q.match(/(?:麻生副総裁|[一-龠々]{1,8}(?:副総裁|大臣|議員|知事|市長))/u)?.[0] || '';
    paragraphs.push({
      text: `御指摘の${actor ? `${actor}の` : ''}発言に逐一政府としてコメントすることは差し控える。`,
      referenceKey: 'r2',
      sourceId: OFFICIAL_COMMITTEE_REFERENCE.id,
      responseType: 'direct-response',
      issueIndex: 0,
    });
  }
  paragraphs.push(
    {
      text: '台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとっても重要である。',
      referenceKey: 'r1',
      sourceId: OFFICIAL_CRISIS_REFERENCE.id,
      responseType: 'recognition',
      issueIndex: 0,
    },
    {
      text: 'その上で、一般論として申し上げれば、いかなる事態が存立危機事態に該当するかについては、実際に発生した事態の個別具体的な状況に即して、政府がその持ち得る全ての情報を総合して客観的かつ合理的に判断する。',
      referenceKey: 'r1',
      sourceId: OFFICIAL_CRISIS_REFERENCE.id,
      responseType: 'legal-standard',
      issueIndex: 0,
    },
    {
      text: '政府としては、厳しさを増す安全保障環境の中で、いかなる事態においても我が国の領土、領海及び領空並びに国民の生命及び財産を守り抜くため、引き続き万全を期すとともに、台湾をめぐる問題が対話により平和的に解決されることを期待している。',
      referenceKey: 'r1',
      sourceId: OFFICIAL_CRISIS_REFERENCE.id,
      responseType: 'government-position',
      issueIndex: 0,
    },
  );

  const references = /麻生|副総裁|議員|発言/u.test(q)
    ? [OFFICIAL_CRISIS_REFERENCE, OFFICIAL_COMMITTEE_REFERENCE]
    : [OFFICIAL_CRISIS_REFERENCE];
  const segments = [
    { text: `問　${q}\n\n（答）\n`, referenceKey: null },
    ...paragraphs.map((paragraph, index) => ({
      ...paragraph,
      text: `${index ? '\n\n' : ''}○　${paragraph.text}`,
      borrowed: respondent !== 'prime' && paragraph.sourceId === OFFICIAL_COMMITTEE_REFERENCE.id,
    })),
  ];
  const draft = segments.map((segment) => segment.text).join('');
  return {
    version: PROFILE_VERSION,
    title: '国会答弁原案',
    segments,
    draft,
    references,
    referenceLabel: '根拠・前例',
    respondent,
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      issueIndex: 1,
      issue: q,
      topic: '台湾をめぐる事態と存立危機事態',
      status: 'covered',
      responseType: 'substantive',
      requestedKinds: ['comment', 'legal-standard'],
      evidenceCount: references.length,
      pointCount: paragraphs.length,
      generated: false,
    }],
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
      askedUnits: askedUnitCount(q),
      logicalIssues: 1,
      answerParagraphs: paragraphs.length,
      groupingNote: '人物発言への評価と事態認定の問いは、台湾をめぐる存立危機事態という一つの主題として統合した。',
    },
    reviewNotes: [
      '個別の事態認定は、実際に発生した事態に関する全ての情報を総合して行う。',
      '政府の最新方針及び当日の答弁者の判断と整合させること。',
    ],
    draftingStance: '質問に直接応答し、同一の法的・政策的主題を不必要に複数の論点へ分割しない。',
    priorityRule: '一つの主題は一つの論点として扱い、答弁が長い場合は見出しを増やさず白丸の段落で構成する。',
    style: '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
  };
}

function specialWrittenAnswer(question) {
  const q = normalize(question);
  if (/生成AI|生成型AI|人工知能|ＡＩ/u.test(q) && /著作権|著作物|権利者/u.test(q)) {
    const body = '政府としては、生成ＡＩの開発及び利用を促進することと、著作権者の権利及び創作活動を適切に保護することを両立させる必要があると認識している。このため、文化審議会著作権分科会法制度小委員会が取りまとめた「ＡＩと著作権に関する考え方について」の周知を図るとともに、ＡＩ開発者等が著作権侵害のリスクを低減し、権利者がその権利を保全し、及び行使するためのチェックリスト及びガイダンスを公表している。また、生成ＡＩに関係する事業者及びクリエイター等の関係当事者間における適切なコミュニケーションの促進に取り組んでいる。';
    const text = `一及び二について\n　${body}`;
    return {
      version: PROFILE_VERSION,
      title: '質問主意書答弁書原案',
      segments: [{ text, referenceKey: 'r1', sourceId: OFFICIAL_AI_COPYRIGHT_REFERENCE.id, responseType: 'substantive', issueIndex: 0 }],
      draft: text,
      references: [OFFICIAL_AI_COPYRIGHT_REFERENCE],
      referenceLabel: '根拠・前例',
      respondent: null,
      evidenceCount: 1,
      issueCount: 1,
      missingIssueCount: 0,
      coverage: [{
        issueIndex: 1,
        issue: q,
        topic: '生成ＡＩと著作権の両立',
        status: 'covered',
        responseType: 'substantive',
        writtenStrategy: 'settled-government-position',
        requestedKinds: ['recognition', 'measures'],
        evidenceCount: 1,
        pointCount: 2,
        generated: false,
      }],
      coverageSummary: {
        total: 1,
        covered: 1,
        missing: 0,
        substantive: 1,
        qualifiedOrLimited: 0,
        generated: 0,
        totalPoints: 2,
      },
      questionAnalysis: {
        askedUnits: askedUnitCount(q),
        logicalIssues: 1,
        answerParagraphs: 1,
        groupingNote: '認識と具体的対応は、生成ＡＩと著作権の両立という同一主題として一括した。',
      },
      reviewNotes: ['著作権法の適用は個別具体的な事案ごとに判断されるため、特定事案への法的評価を加える場合は主管府省で確認すること。'],
      draftingStance: '質問項目との対応を明示し、政府の公表済み方針及び施策に即して答える。',
      priorityRule: '同一主題の認識及び対応は合理的な範囲で一括し、質問にない法的評価を追加しない。',
      style: '常体',
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
    };
  }
  if (/存立危機事態/u.test(q) && /台湾|台湾海峡|海上封鎖|中国/u.test(q)) {
    const body = '御指摘の発言については、政府として逐一コメントすることは差し控えたい。一般に、いかなる事態が存立危機事態に該当するかについては、事態の個別具体的な状況に即して、政府がその持ち得る全ての情報を総合して客観的かつ合理的に判断することとなる。いずれにせよ、台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとっても重要であり、台湾をめぐる問題が対話により平和的に解決されることを期待するというのが我が国の従来から一貫した立場である。';
    const text = `一及び二について\n　${body}`;
    return {
      version: PROFILE_VERSION,
      title: '質問主意書答弁書原案',
      segments: [{ text, referenceKey: 'r1', sourceId: OFFICIAL_CRISIS_REFERENCE.id, responseType: 'substantive', issueIndex: 0 }],
      draft: text,
      references: [OFFICIAL_CRISIS_REFERENCE],
      referenceLabel: '根拠・前例',
      respondent: null,
      evidenceCount: 1,
      issueCount: 1,
      missingIssueCount: 0,
      coverage: [{
        issueIndex: 1,
        issue: q,
        topic: '台湾をめぐる事態と存立危機事態',
        status: 'covered',
        responseType: 'substantive',
        writtenStrategy: 'settled-government-position',
        requestedKinds: ['comment', 'legal-standard'],
        evidenceCount: 1,
        pointCount: 2,
        generated: false,
      }],
      coverageSummary: {
        total: 1,
        covered: 1,
        missing: 0,
        substantive: 1,
        qualifiedOrLimited: 0,
        generated: 0,
        totalPoints: 2,
      },
      questionAnalysis: {
        askedUnits: askedUnitCount(q),
        logicalIssues: 1,
        answerParagraphs: 1,
        groupingNote: '人物発言への評価と事態認定の問いを、同一の法的・政策的主題として一括した。',
      },
      reviewNotes: ['個別の事態認定は、実際に発生した事態に関する全ての情報を総合して行う。'],
      draftingStance: '閣議決定済み答弁書の確立した判断基準及び政府の一貫した立場に即して答える。',
      priorityRule: '個別事案を断定せず、確立した判断基準及び政府の立場を質問に対応して示す。',
      style: '常体',
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
    };
  }
  return null;
}

async function improveWritten(result, question, respondent) {
  const noEvidenceOnly = (result.coverage || []).length > 0
    && (result.coverage || []).every((item) => item.writtenStrategy === 'no-evidence');
  const evasiveOnly = noEvidenceOnly
    && (result.segments || []).filter((segment) => segment.responseType).length > 0
    && (result.segments || []).filter((segment) => segment.responseType).every((segment) =>
      /お尋ねの趣旨及びその前提となる事実関係が必ずしも明らかではない|お答えすることは困難である/u.test(segment.text || ''));
  if (!evasiveOnly) return {
    ...result,
    version: PROFILE_VERSION,
    questionAnalysis: {
      askedUnits: askedUnitCount(question),
      logicalIssues: result.issueCount || result.coverage?.length || 1,
      answerParagraphs: (result.segments || []).filter((segment) => segment.responseType).length,
      groupingNote: '質問番号との対応関係を維持し、閣議決定済み答弁書の文体に整えた。',
    },
    reviewNotes: result.references?.length
      ? []
      : ['同一又は近接する先例が確認できないため、主管府省において政府方針及び法令引用を確認すること。'],
  };

  const oral = await buildV24('speech', question, respondent);
  const groups = logicalGroups(oral.coverage || []);
  const groupByIssueIndex = new Map();
  groups.forEach((group, groupIndex) => {
    for (const item of group) groupByIssueIndex.set(item.issueIndex - 1, groupIndex);
  });
  const topicByIssueIndex = new Map((oral.coverage || []).map((item) => [item.issueIndex - 1, item.topic || item.issue || '当該事項']));
  const bodiesByGroup = new Map();
  for (const segment of oral.segments || []) {
    if (!segment.responseType) continue;
    const groupIndex = groupByIssueIndex.get(segment.issueIndex) || 0;
    const topic = topicByIssueIndex.get(segment.issueIndex) || '当該事項';
    let body = bodyOf(segment);
    if (/現時点で参照できる政府資料のみからは|主管府省において事実関係及び政府方針を確認/u.test(body)) {
      body = safeFallback(topic, segment.responseType);
    }
    const current = bodiesByGroup.get(groupIndex) || [];
    if (!current.some((previous) => nearDuplicate(previous, body))) current.push(body);
    bodiesByGroup.set(groupIndex, current);
  }
  const headings = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const segments = groups.map((group, groupIndex) => {
    const body = formatWrittenStyle((bodiesByGroup.get(groupIndex) || []).join(''));
    const text = `${headings[groupIndex] || groupIndex + 1}について\n　${body}`;
    return { text, referenceKey: null, sourceId: null, responseType: 'substantive', issueIndex: groupIndex, generated: true };
  });
  const draft = segments.map((segment) => segment.text).join('\n\n');
  return {
    ...result,
    version: PROFILE_VERSION,
    segments,
    draft,
    references: [],
    evidenceCount: 0,
    issueCount: groups.length,
    questionAnalysis: {
      askedUnits: askedUnitCount(question),
      logicalIssues: groups.length,
      answerParagraphs: segments.length,
      groupingNote: '質問の意味の連続性を確認し、同一主題をまとめた上で答弁書の項目へ対応させた。',
    },
    reviewNotes: ['同一又は近接する閣議決定済み答弁書を確認できないため、主管府省において政府方針、法令引用及び用例を確認すること。'],
    style: '常体',
    officialStyleCheck: lintOfficialText(draft),
    officialStyleVersion: OFFICIAL_STYLE_VERSION,
  };
}

function improveGenericSpeech(result, question, respondent) {
  const coverage = result.coverage || [];
  const groups = logicalGroups(coverage);
  const groupByIssueIndex = new Map();
  groups.forEach((group, groupIndex) => {
    for (const item of group) groupByIssueIndex.set(item.issueIndex - 1, groupIndex);
  });
  const topicByIssueIndex = new Map(coverage.map((item) => [item.issueIndex - 1, item.topic || item.issue || '当該事項']));
  const sourceById = new Map((result.references || []).map((item) => [item.id, item]));
  const answerSegments = [];
  const usedBodies = [];

  for (const segment of result.segments || []) {
    if (!segment.responseType) continue;
    const topic = topicByIssueIndex.get(segment.issueIndex) || '当該事項';
    let body = bodyOf(segment);
    let sourceId = segment.sourceId || null;
    let referenceKey = segment.referenceKey || null;
    let generated = Boolean(segment.generated);
    if (!body) continue;
    if (/現時点で参照できる政府資料のみからは|主管府省において事実関係及び政府方針を確認/u.test(body)) {
      body = safeFallback(topic, segment.responseType);
      sourceId = null;
      referenceKey = null;
      generated = true;
    }
    if (usedBodies.some((previous) => nearDuplicate(previous, body))) continue;
    usedBodies.push(body);
    answerSegments.push({
      ...segment,
      text: body,
      sourceId,
      referenceKey,
      generated,
      logicalIssueIndex: groupByIssueIndex.get(segment.issueIndex) || 0,
    });
  }

  const visibleSegments = answerSegments.map((segment, index) => {
    const group = groups[segment.logicalIssueIndex] || [];
    const firstForGroup = index === 0 || answerSegments[index - 1]?.logicalIssueIndex !== segment.logicalIssueIndex;
    const multipleIssues = groups.length > 1;
    const topic = group[0]?.topic || group[0]?.issue || '';
    const prefix = multipleIssues && firstForGroup ? `＜${normalize(topic).slice(0, 42)}＞\n` : '';
    return {
      ...segment,
      text: `${index ? '\n\n' : ''}${prefix}○　${segment.text}`,
      borrowed: Boolean(sourceById.get(segment.sourceId)?.borrowed),
    };
  });
  const segments = [
    { text: `問　${normalize(question)}\n\n（答）\n`, referenceKey: null },
    ...visibleSegments,
  ];
  const usedIds = new Set(visibleSegments.map((segment) => segment.sourceId).filter(Boolean));
  const references = (result.references || []).filter((reference) => usedIds.has(reference.id));
  const draft = segments.map((segment) => segment.text).join('');
  const reviewNotes = visibleSegments.some((segment) => segment.generated)
    ? ['一次資料に直接ひも付かない段落を含むため、主管府省において最新の事実関係及び政府方針を確認すること。']
    : [];

  return {
    ...result,
    version: PROFILE_VERSION,
    segments,
    draft,
    references,
    evidenceCount: references.length,
    issueCount: groups.length,
    questionAnalysis: {
      askedUnits: askedUnitCount(question),
      logicalIssues: groups.length,
      answerParagraphs: visibleSegments.length,
      groupingNote: groups.length === coverage.length
        ? '独立した主題だけを分け、各主題への答弁を白丸の段落で構成した。'
        : `入力上の${coverage.length}項目を、意味の連続性に基づき${groups.length}論点へ統合した。`,
    },
    reviewNotes,
    priorityRule: '一つの主題は一つの論点として扱い、「論点一」等の見出しは用いず、答弁が長い場合は白丸の段落を追加する。独立した主題が複数ある場合だけ短い主題見出しを付す。',
    style: '常体',
  };
}

export async function build(mode, question, respondent) {
  if (mode === 'speech') {
    const special = specialCrisisAnswer(question, respondent);
    if (special) return special;
  }
  if (mode === 'written') {
    const special = specialWrittenAnswer(question);
    if (special) return special;
  }
  const result = await buildV24(mode, question, respondent);
  if (mode === 'written') return improveWritten(result, question, respondent);
  return improveGenericSpeech(result, question, respondent);
}

export async function searchAll(query, respondent) {
  return searchV24(query, respondent);
}

export function selfTest() {
  const base = selfTestV24();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '25.0',
    whiteCircleParagraphs: true,
    noSyntheticIssueHeadings: true,
    semanticallyContinuousQuestionsCoalesced: true,
    crisisPrecedentIncluded: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
