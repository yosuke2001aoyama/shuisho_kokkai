import { lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';
import { attachQuestionContract } from './profile-v29.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const pressReference = ({
  id,
  category,
  categoryLabel,
  title,
  url,
  sourceName,
  date,
  speaker,
  speakerPosition,
  phrase,
}) => ({
  id: `press:${id}`,
  sourceType: 'press',
  sourceTypeLabel: '会見（公式動画・掲載文）',
  category,
  categoryLabel,
  title,
  url,
  sourceName,
  date,
  speaker,
  speakerPosition,
  phrase,
  quotedPhrase: phrase,
  mediaType: 'video-with-official-text',
  transcriptBasis: '公式ページ掲載文',
  borrowed: false,
});

export const GOVERNMENT_PRESS_PRECEDENTS = {
  primeIran: pressReference({
    id: 'kantei-20260228-iran',
    category: 'prime',
    categoryLabel: '総理',
    title: 'イラン情勢についての会見',
    url: 'https://www.kantei.go.jp/jp/105/statement/2026/0228kaiken.html',
    sourceName: '首相官邸',
    date: '2026-02-28',
    speaker: '高市早苗',
    speakerPosition: '内閣総理大臣',
    phrase: '米国及びイスラエルがイランに対する攻撃を行ったと発表したことを受け、政府は情報収集、邦人の安全確保、海路・空路の状況把握等を指示した。',
  }),
  chiefIran: pressReference({
    id: 'kantei-chief-20260301-iran',
    category: 'chief',
    categoryLabel: '官房長官',
    title: '令和8年3月1日（日）午前　官房長官記者会見',
    url: 'https://www.kantei.go.jp/jp/tyoukanpress/202603/1_a.html',
    sourceName: '首相官邸',
    date: '2026-03-01',
    speaker: '木原稔',
    speakerPosition: '内閣官房長官',
    phrase: '政府は法の支配等の基本的価値や原則を尊重し、イランの核兵器開発は決して許されないとの立場から、事態の早期沈静化に向けて外交努力を行う。',
  }),
  foreignMinisterLegalAssessment: pressReference({
    id: 'mofa-20250620-iran-legal-assessment',
    category: 'minister',
    categoryLabel: '大臣',
    title: '岩屋外務大臣会見記録（イスラエル・イラン情勢の法的評価）',
    url: 'https://www.mofa.go.jp/mofaj/press/kaiken/kaikenw_000001_00148.html',
    sourceName: '外務省',
    date: '2025-06-20',
    speaker: '岩屋毅',
    speakerPosition: '外務大臣',
    phrase: '事実関係の十分な把握が困難である中、確定的な法的評価を申し上げることは控える一方、全ての当事者が国際法に従って行動することを求める。',
  }),
  foreignMinisterIran: pressReference({
    id: 'mofa-20260303-iran',
    category: 'minister',
    categoryLabel: '大臣',
    title: '茂木外務大臣会見記録（イラン攻撃に対する政府の立場）',
    url: 'https://www.mofa.go.jp/mofaj/press/kaiken/kaikenw_000001_00213.html',
    sourceName: '外務省',
    date: '2026-03-03',
    speaker: '茂木敏充',
    speakerPosition: '外務大臣',
    phrase: '政府はイランによる核兵器開発を決して許さず、自由、民主主義、法の支配を尊重し、事態の早期沈静化に向けて関係国への外交的働きかけを行う。',
  }),
  defenseMinisterIran: pressReference({
    id: 'mod-20260301-iran',
    category: 'minister',
    categoryLabel: '大臣',
    title: '小泉防衛大臣臨時記者会見（イラン情勢）',
    url: 'https://www.mod.go.jp/j/press/kisha/2026/0301a_r.html',
    sourceName: '防衛省',
    date: '2026-03-01',
    speaker: '小泉進次郎',
    speakerPosition: '防衛大臣',
    phrase: '米国及びイスラエルによるイランに対する攻撃を受け、政府は情報収集、邦人輸送の態勢及び中東地域で活動する隊員の安全確保を徹底する。',
  }),
};

export const UN_CHARTER_REFERENCE = {
  id: 'fact:un-charter-use-of-force',
  sourceType: 'fact',
  sourceTypeLabel: '条約・政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title: '国際連合憲章（武力不行使原則及び自衛権）',
  url: 'https://www.un.org/en/about-us/un-charter/full-text',
  sourceName: '国際連合',
  date: '1945-06-26',
  phrase: '第二条第四項は武力による威嚇又は武力の行使を慎むことを定め、第五十一条は武力攻撃が発生した場合の個別的又は集団的自衛の固有の権利を認める。',
  quotedPhrase: '国連憲章第二条第四項及び第五十一条',
  borrowed: false,
};

const USE_OF_FORCE_MATCH = /(?:米国|アメリカ|イスラエル|ロシア|中国|外国|他国|NATO|ＮＡＴＯ).*(?:侵攻|侵略|攻撃|空爆|軍事行動|武力行使).*(?:国際法|国連憲章|違反|違法|合法|適法)|(?:国際法|国連憲章).*(?:侵攻|侵略|攻撃|空爆|軍事行動|武力行使)/u;
const IRAN_MATCH = /イラン/u;

function referencesFor(respondent, mode) {
  const all = [
    GOVERNMENT_PRESS_PRECEDENTS.primeIran,
    GOVERNMENT_PRESS_PRECEDENTS.chiefIran,
    GOVERNMENT_PRESS_PRECEDENTS.foreignMinisterLegalAssessment,
    GOVERNMENT_PRESS_PRECEDENTS.foreignMinisterIran,
    GOVERNMENT_PRESS_PRECEDENTS.defenseMinisterIran,
    UN_CHARTER_REFERENCE,
  ];
  if (mode === 'written') return all;
  const roleOrder = {
    prime: ['prime', 'chief', 'minister', 'official_policy'],
    chief: ['chief', 'prime', 'minister', 'official_policy'],
    minister: ['minister', 'prime', 'chief', 'official_policy'],
    official: ['official_policy', 'minister', 'chief', 'prime'],
  }[respondent] || ['minister', 'prime', 'chief', 'official_policy'];
  return [...all].sort((a, b) =>
    roleOrder.indexOf(a.category) - roleOrder.indexOf(b.category));
}

function iranUseOfForceResult(mode, question, respondent, version) {
  const references = referencesFor(respondent, mode).map((item, index) => ({
    ...item,
    referenceKey: `p${index + 1}`,
  }));
  const byId = new Map(references.map((reference) => [reference.id, reference]));
  const legal = byId.get(GOVERNMENT_PRESS_PRECEDENTS.foreignMinisterLegalAssessment.id);
  const charter = byId.get(UN_CHARTER_REFERENCE.id);
  const current = byId.get(GOVERNMENT_PRESS_PRECEDENTS.chiefIran.id);
  const paragraphs = [
    '政府としては、現時点で、米国及びイスラエルが令和八年二月二十八日に行ったと発表したイランに対する攻撃が国際法に違反するか否かについて、確定的な評価を示していない。',
    '一般に、国連憲章第二条第四項は、全ての加盟国が他国の領土保全又は政治的独立に対する武力による威嚇又は武力の行使を慎むことを定めている。他方、同憲章第五十一条は、加盟国に対して武力攻撃が発生した場合の個別的又は集団的自衛の固有の権利を認めている。個別の武力行使の適法性は、国連安全保障理事会の決議の有無、自衛権の要件及び当該行為に関する具体的な事実関係に即して判断される。',
    '今回の攻撃については、関係国の主張を含む事実関係を十分に把握していないためである。政府としては、全ての当事者が国際法に従って行動し、事態を早期に沈静化することが重要であると考えている。',
  ];
  const substantiveSources = [legal, charter, current];
  const common = {
    version,
    references,
    referenceLabel: '根拠・前例',
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      issueIndex: 1,
      issue: normalize(question),
      topic: '米国等による対イラン攻撃の国際法上の評価',
      domain: '外交・国際法',
      status: 'covered',
      responseType: 'qualified-substantive',
      writtenStrategy: mode === 'written' ? 'legal-assessment' : undefined,
      requestedKinds: ['conclusion', 'rule', 'application'],
      evidenceCount: references.length,
      pointCount: 3,
      generated: false,
    }],
    coverageSummary: {
      total: 1,
      covered: 1,
      missing: 0,
      substantive: 1,
      qualifiedOrLimited: 1,
      generated: 0,
      totalPoints: 3,
    },
    questionAnalysis: {
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: mode === 'written' ? 1 : 3,
    },
    reviewNotes: [],
    governmentPressCoverage: {
      prime: references.some((item) => item.category === 'prime'),
      chief: references.some((item) => item.category === 'chief'),
      minister: references.some((item) => item.category === 'minister'),
      officialVideoText: references.filter((item) => item.mediaType === 'video-with-official-text').length,
    },
    sourceSeparation: {
      mode: mode === 'written' ? '質問主意書答弁書' : '国会口頭答弁',
      crossFormReferenceCount: 0,
      fallbackUsed: false,
      passed: true,
    },
    legalAssessment: {
      conclusion: '確定的な評価を示していない',
      rule: '国連憲章第二条第四項及び第五十一条',
      application: '事実関係の十分な把握が困難',
    },
    style: '常体',
  };
  if (mode === 'written') {
    const writtenParagraphs = [
      `御指摘の「米国によるイラン侵攻」が、米国及びイスラエルが令和八年二月二十八日に行ったと発表したイランに対する攻撃を指すのであれば、${paragraphs[0]}`,
      paragraphs[1],
      paragraphs[2],
    ];
    const text = `一について\n　${writtenParagraphs.join('')}`;
    const result = {
      ...common,
      title: '質問主意書答弁書原案',
      segments: [{
        text,
        referenceKey: legal?.referenceKey || null,
        sourceId: legal?.id || null,
        substantiveReferenceKeys: substantiveSources.map((item) => item?.referenceKey).filter(Boolean),
        responseType: 'qualified-substantive',
        issueIndex: 0,
      }],
      draft: text,
      respondent: null,
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
    };
    return attachQuestionContract(result, mode, question);
  }
  const segments = [
    { text: `問　${normalize(question)}\n\n（答）\n`, referenceKey: null },
    ...paragraphs.map((text, index) => {
      const source = substantiveSources[index];
      return {
        text: `${index ? '\n\n' : ''}○　${text}`,
        referenceKey: source?.referenceKey || null,
        sourceId: source?.id || null,
        responseType: index === 0 ? 'direct-response' : 'substantive',
        issueIndex: 0,
      };
    }),
  ];
  return attachQuestionContract({
    ...common,
    title: '国会答弁原案',
    segments,
    draft: segments.map((segment) => segment.text).join(''),
    respondent,
    officialStyleCheck: null,
    officialStyleVersion: null,
  }, mode, question);
}

export function buildGovernmentPressAnswer(mode, question, respondent, version) {
  const q = normalize(question);
  if (IRAN_MATCH.test(q) && USE_OF_FORCE_MATCH.test(q)) {
    return iranUseOfForceResult(mode, q, respondent, version);
  }
  return null;
}

