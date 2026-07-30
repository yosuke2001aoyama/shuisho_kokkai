import {
  resultFor,
  TRUMP_REFERENCES,
} from './explainable-synthesis-v33.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const officialReference = ({
  id,
  title,
  url,
  sourceName,
  phrase,
  sourceType = 'fact',
}) => ({
  id: `${sourceType}:${id}`,
  sourceType,
  sourceTypeLabel: sourceType === 'press' ? '会見・演説' : '政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title,
  url,
  sourceName,
  phrase,
  quotedPhrase: phrase,
  borrowed: false,
});

const MULTI_TARGET_REFERENCES = [
  officialReference({
    id: 'mofa-china-multitarget-v34',
    title: '日中関係',
    url: 'https://www.mofa.go.jp/mofaj/area/china/index.html',
    sourceName: '外務省',
    phrase: '中国との間では主張すべきは主張し、責任ある行動を求めつつ、共通の課題では協力する建設的かつ安定的な関係を構築する。',
  }),
  officialReference({
    id: 'mofa-north-korea-multitarget-v34',
    title: '北朝鮮',
    url: 'https://www.mofa.go.jp/mofaj/area/n_korea/index.html',
    sourceName: '外務省',
    phrase: '政府は北朝鮮の核・ミサイル開発を断じて容認せず、国連安保理決議の完全な履行を求め、拉致・核・ミサイルの包括的解決を目指す。',
  }),
  officialReference({
    id: 'mofa-ukraine-multitarget-v34',
    title: 'ロシアによるウクライナ侵略',
    url: 'https://www.mofa.go.jp/mofaj/erp/c_see/ua/page3_003225.html',
    sourceName: '外務省',
    sourceType: 'press',
    phrase: 'ロシアによるウクライナ侵略は国際秩序の根幹を揺るがす暴挙であり、我が国は厳しい対露制裁と強力なウクライナ支援を実施する。',
  }),
];

function multiTargetFirmness(mode, question, respondent, version) {
  const q = normalize(question);
  const required = ['中国', '北朝鮮', 'ロシア'].filter((target) => q.includes(target));
  if (required.length < 2 || !/弱腰|及び腰|迎合|宥和|甘すぎ/u.test(q)) return null;

  const responseByTarget = {
    中国: '中国に対しては、東シナ海等の懸案について主張すべきは主張し、責任ある行動を強く求める一方、共通の課題では協力する。',
    北朝鮮: '北朝鮮に対しては、核・ミサイル計画の廃棄と拉致問題の即時解決を求め、国連安保理決議の完全な履行に向けて米国、韓国等と連携する。',
    ロシア: 'ロシアに対しては、ウクライナ侵略を国際秩序の根幹を揺るがす暴挙として非難し、G7と連携して制裁を実施するとともに、公正かつ永続的な平和の実現を求める。',
  };
  const referenceByTarget = { 中国: 0, 北朝鮮: 1, ロシア: 2 };
  const paragraphs = [
    '御指摘は当たらない。',
    ...required.map((target) => responseByTarget[target]),
  ];
  return resultFor({
    mode,
    question,
    respondent,
    version,
    topic: `${required.join('、')}に対する政府の対応`,
    domain: '外交・安全保障',
    references: required.map((target) => MULTI_TARGET_REFERENCES[referenceByTarget[target]]),
    paragraphReferenceIndexes: [
      0,
      ...required.map((_, index) => index),
    ],
    paragraphs,
    requestedKinds: ['conclusion', 'rule'],
    coverageTopics: required.map((target) => ({
      topic: `${target}に対する政府の対応`,
      domain: `外交・${target}`,
      requestedKinds: ['conclusion', 'rule'],
      evidenceCount: 1,
      pointCount: 1,
    })),
  });
}

function conciseTrumpWritten(mode, question, respondent, version) {
  const q = normalize(question);
  if (mode !== 'written'
    || !/(?:トランプ).*(?:政権|大統領).*(?:対処|対応|向き合|関係|方針)|(?:対処|対応|向き合).*(?:トランプ).*(?:政権|大統領)/u.test(q)) {
    return null;
  }
  return resultFor({
    mode,
    question,
    respondent,
    version,
    topic: 'トランプ政権への日本政府の対応',
    references: [TRUMP_REFERENCES[0], TRUMP_REFERENCES[1]],
    paragraphReferenceIndexes: [1, 0],
    paragraphs: [
      '政府としては、トランプ政権との間で強固な信頼・協力関係を構築し、日米同盟を基軸として、安全保障、経済等の分野で協力を進める方針である。',
      'その際、我が国の国益を踏まえ、米国に対して我が国の立場を明確に伝え、必要な協議を行う。',
    ],
    requestedKinds: ['conclusion', 'measures'],
  });
}

export function buildPrecisionSynthesis(mode, question, respondent, version) {
  return multiTargetFirmness(mode, question, respondent, version)
    || conciseTrumpWritten(mode, question, respondent, version);
}
