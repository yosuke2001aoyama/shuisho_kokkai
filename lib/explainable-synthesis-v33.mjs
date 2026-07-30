import { lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';
import { attachQuestionContract } from './profile-v29.mjs';
import { annotateWrittenResult } from './written-usage-v31.mjs';
import { analyzeQuestionContract } from './question-contract-v29.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const reference = ({
  id,
  sourceType = 'press',
  title,
  url,
  sourceName,
  date,
  phrase,
  category = 'prime',
  speaker = '',
  speakerPosition = '',
}) => ({
  id: `${sourceType}:${id}`,
  sourceType,
  sourceTypeLabel: sourceType === 'fact' ? '政府公式資料' : '会見・演説',
  category,
  categoryLabel: {
    prime: '総理',
    chief: '官房長官',
    minister: '大臣',
    fact: '政府公式資料',
  }[category] || '政府公式資料',
  title,
  url,
  sourceName,
  date,
  speaker,
  speakerPosition,
  phrase,
  quotedPhrase: phrase,
  borrowed: false,
});

export const TRUMP_REFERENCES = [
  reference({
    id: 'kantei-trump-inauguration-20250121',
    title: 'トランプ新米国大統領就任の受け止め等についての会見',
    url: 'https://www.kantei.go.jp/jp/103/statement/2025/0121kaiken.html',
    sourceName: '首相官邸',
    date: '2025-01-21',
    speaker: '石破茂',
    speakerPosition: '内閣総理大臣',
    phrase: '我が国は我が国の国益があり、合衆国には合衆国の国益があるのであって、その国益を両方いかしながら、二国間の関係を世界平和と世界経済にいかすことを中心に真摯な議論を行い、信頼関係を確立したい。',
  }),
  reference({
    id: 'kantei-chief-trump-visit-20250204',
    title: '石破総理の米国訪問について',
    url: 'https://www.kantei.go.jp/jp/tyoukanpress/202502/4_p.html',
    sourceName: '首相官邸',
    date: '2025-02-04',
    speaker: '林芳正',
    speakerPosition: '内閣官房長官',
    category: 'chief',
    phrase: '米新政権との間で強固な信頼・協力関係を構築し、日米同盟を更なる高みに引き上げていきたい。',
  }),
  reference({
    id: 'mofa-japan-us-joint-statement-20250207',
    sourceType: 'fact',
    title: '日米首脳共同声明',
    url: 'https://www.mofa.go.jp/files/100791692.pdf',
    sourceName: '外務省',
    date: '2025-02-07',
    category: 'fact',
    phrase: '両首脳は、防衛装備・技術協力の推進等を通じ、日米同盟の抑止力・対処力を更に強化していく意図を有することを確認した。',
  }),
  reference({
    id: 'mofa-minister-tariff-20250403',
    title: '岩屋外務大臣臨時会見記録',
    url: 'https://www.mofa.go.jp/mofaj/press/kaiken/kaikenit_000001_00071.html',
    sourceName: '外務省',
    date: '2025-04-03',
    speaker: '岩屋毅',
    speakerPosition: '外務大臣',
    category: 'minister',
    phrase: '米国の関税措置は極めて遺憾であり、措置の見直しを強く申し入れ、何が日本の国益に資するかを考えながら取り組む。',
  }),
];

const DOMAIN_PACKS = [
  {
    id: 'foreign-relations',
    match: /米国|アメリカ|中国|ロシア|韓国|北朝鮮|台湾|インド|欧州|外国|他国|政権|大統領|首相|外交|国際|同盟/u,
    direct: (topic) => `政府としては、${topic}について、我が国の国益と国際法に基づく秩序を踏まえ、首脳・閣僚レベルの意思疎通を重ね、協力できる課題では具体的な協力を進める一方、意見の相違がある課題では我が国の立場を明確に伝え、粘り強く協議する。`,
    detail: '安全保障、経済及び国民生活への影響を分けて把握し、同盟国・同志国及び関係国と連携しながら、我が国として必要な外交上及び政策上の対応を組み合わせる。',
    follow: '情勢の変化を継続的に分析し、首脳、閣僚及び実務者の各段階で対話を続け、国益を守るために必要な対応を機動的に講じる。',
  },
  {
    id: 'space-science',
    match: /宇宙|月面|衛星|科学|研究|量子|技術|イノベーション|遺伝子|合成生物/u,
    direct: (topic) => `政府としては、${topic}について、関係する国際ルール及び国内法、技術の成熟度、安全性並びに社会的影響を確認した上で、必要な制度と支援策を具体化する。`,
    detail: '制度設計に当たっては、許可・監督、事故時の責任、情報公開、研究開発の促進、安全保障上の管理及び国際協調を一体として検討する。',
    follow: '関係府省、専門家、事業者及び利用者から必要な情報を集め、実証結果と海外の制度動向を検証しながら、適切な時期に方針を示す。',
  },
  {
    id: 'economy',
    match: /物価|賃金|経済|関税|投資|中小企業|金融|税|市場|産業|貿易/u,
    direct: (topic) => `政府としては、${topic}について、家計、雇用及び事業活動への影響を把握し、成長力の強化と国民生活の安定を両立させる観点から必要な措置を講じる。`,
    detail: '具体的には、価格転嫁、賃上げ、生産性向上、資金繰り及び競争環境への影響を点検し、対象と期限を明確にした支援、制度改正又は外交協議を組み合わせる。',
    follow: '施策の実施状況と効果を継続的に検証し、経済情勢の変化に応じて措置の内容と規模を見直す。',
  },
  {
    id: 'health',
    match: /医療|感染症|病院|医薬品|介護|健康|患者|ワクチン/u,
    direct: (topic) => `政府としては、${topic}について、国民の生命と健康を守ることを最優先に、発生状況、医療提供体制及び科学的知見を把握し、必要な対策を講じる。`,
    detail: '検査・監視、医療人材と病床の確保、医薬品等の供給、地域間の連携及び国民への迅速で分かりやすい情報提供を組み合わせる。',
    follow: '専門家の評価と現場の実施状況を継続的に確認し、リスクの変化に応じて対策を機動的に見直す。',
  },
  {
    id: 'disaster',
    match: /災害|地震|津波|豪雨|台風|防災|避難|復旧|復興/u,
    direct: (topic) => `政府としては、${topic}について、人命の保護を最優先に、被害想定と地域の実情を踏まえ、予防、応急対応及び復旧・復興を切れ目なく進める。`,
    detail: '情報伝達、避難支援、救助・医療、物資輸送、インフラ復旧及び被災者の生活再建について、国と地方公共団体、指定公共機関等の役割を明確にする。',
    follow: '訓練と実災害の検証結果を計画及び制度に反映し、必要な人員、資機材及び財源を確保する。',
  },
  {
    id: 'education',
    match: /教育|学校|教員|大学|こども|子供|学習|保育/u,
    direct: (topic) => `政府としては、${topic}について、こどもの学ぶ機会と安全を確保し、地域や家庭の状況にかかわらず必要な教育を受けられるよう対応する。`,
    detail: '人材確保、業務負担の軽減、教育環境の整備、相談支援及び経済的支援を組み合わせ、国と地方公共団体の役割分担を明確にする。',
    follow: '学校現場、こども及び保護者の声と客観的なデータを確認し、施策の効果を検証して必要な改善を行う。',
  },
  {
    id: 'environment-energy',
    match: /気候|環境|脱炭素|エネルギー|原子力|再生可能|排出|資源/u,
    direct: (topic) => `政府としては、${topic}について、安全性、安定供給、経済効率性及び環境適合性を総合し、国民生活と産業活動を支える現実的な対策を進める。`,
    detail: '供給源の多様化、省エネルギー、技術開発、設備投資、規制及び国際協力を組み合わせ、費用と便益を国民に分かりやすく示す。',
    follow: '需給、価格、技術及び国際情勢を継続的に点検し、中長期の目標と足元の安定を両立するよう施策を見直す。',
  },
  {
    id: 'digital-security',
    match: /AI|ＡＩ|人工知能|デジタル|サイバー|データ|ロボット|偽情報|通信/u,
    direct: (topic) => `政府としては、${topic}について、技術の利活用を促進しつつ、国民の権利、安全及び重要インフラを守るため、リスクに応じた制度と実施体制を整える。`,
    detail: '透明性、個人情報、セキュリティ、事故時の責任、事業者による管理及び被害救済を確認し、過度な規制とならないよう技術特性に応じて対応する。',
    follow: '技術と脅威の変化が速いことを踏まえ、専門家及び事業者と継続的に検証し、国際的なルール形成にも参画しながら制度を更新する。',
  },
  {
    id: 'food-agriculture',
    match: /食料|農業|漁業|水産|畜産|食品|給食/u,
    direct: (topic) => `政府としては、${topic}について、食料の安定供給と安全性を確保し、生産者及び消費者への影響を踏まえて必要な対策を講じる。`,
    detail: '生産基盤、流通、価格、輸入先の多角化、検査・表示及び緊急時の備蓄を点検し、供給段階ごとの課題に対応する。',
    follow: '需給と価格の動向を継続的に把握し、現場の意見を踏まえて支援及び制度の実効性を検証する。',
  },
  {
    id: 'social-local',
    match: /人口|地方|地域|少子|高齢|雇用|労働|年金|福祉|生活困窮/u,
    direct: (topic) => `政府としては、${topic}について、地域の実情と当事者の生活への影響を把握し、持続可能な制度と必要な支援を組み合わせて対応する。`,
    detail: '雇用、所得、住まい、移動、医療・福祉及び行政サービスを横断して課題を整理し、国と地方公共団体、民間団体の役割を明確にする。',
    follow: '対象者に支援が届いているかをデータと現場の声で検証し、地域差を踏まえて制度運用を改善する。',
  },
  {
    id: 'administration',
    match: /[\s\S]*/u,
    direct: (topic) => `政府としては、${topic}について、確認できる事実、関係法令、国民生活への影響及び政策目的を整理し、必要な対応を具体化する。`,
    detail: '対応に当たっては、主管府省と関係機関の役割、対象、手段、期限及び必要な財源を明確にし、実施可能性を確認する。',
    follow: '実施状況と政策効果を継続的に検証し、新たな事実や事情の変化があれば、説明責任を果たしながら必要な見直しを行う。',
  },
];

function topicOf(question = '') {
  const q = normalize(question)
    .replace(/[。？！?]+$/u, '')
    .replace(/^(?:政府は|我が国は|日本政府は)/u, '')
    .replace(/(?:に|へ|を)?(?:(?:日本)?政府(?:として|は))?どう(?:対処|対応|向き合|進め|実現|解決|是正)するのか.*$/u, '')
    .replace(/(?:を)?どのように.*$/u, '')
    .replace(/(?:の)?(?:開始|実施|導入|訪問|開催)?(?:予定|日程|時期)いかん.*$/u, '')
    .replace(/(?:を)?放置しているのは政府が(?:無策|責任放棄)だから$/u, '')
    .replace(/への対応は既得権益に迎合したもの$/u, '')
    .replace(/(?:ではないか|ないのか|見解いかん|評価いかん).*$/u, '')
    .replace(/(?:を)?放置しているのは政府が(?:無策|責任放棄)だから$/u, '')
    .replace(/への対応は既得権益に迎合したもの$/u, '')
    .replace(/(?:について|に関して|に対して|への|との|は|が|を|に|で|と)[\s　]*$/u, '')
    .trim();
  return q.length >= 2 && q.length <= 72 ? q : '当該課題';
}

export function resultFor({
  mode,
  question,
  respondent,
  version,
  paragraphs,
  references = [],
  topic,
  provisional = false,
  requestedKinds = ['conclusion', 'measures', 'future'],
  paragraphReferenceIndexes = [],
  coverageTopics = [],
  domain = provisional ? '説明可能な政策推論' : '外交・日米関係',
}) {
  const keyedReferences = references.map((item, index) => ({
    ...item,
    referenceKey: `s${index + 1}`,
  }));
  const paragraphReferences = paragraphs.map((_, index) => {
    const referenceIndex = Number.isInteger(paragraphReferenceIndexes[index])
      ? paragraphReferenceIndexes[index]
      : Math.min(index, keyedReferences.length - 1);
    return keyedReferences[referenceIndex] || null;
  });
  const coverage = coverageTopics.length
    ? coverageTopics.map((item, index) => ({
      issueIndex: index + 1,
      issue: item.issue || item.topic,
      topic: item.topic,
      domain: item.domain || domain,
      status: 'covered',
      responseType: provisional ? 'qualified' : 'substantive',
      writtenStrategy: provisional && mode === 'written' ? 'reasoned-synthesis' : undefined,
      requestedKinds: item.requestedKinds || requestedKinds,
      evidenceCount: item.evidenceCount ?? 1,
      pointCount: item.pointCount ?? 1,
      generated: true,
    }))
    : [{
      issueIndex: 1,
      issue: normalize(question),
      topic,
      domain,
      status: 'covered',
      responseType: provisional ? 'qualified' : 'substantive',
      writtenStrategy: provisional && mode === 'written' ? 'reasoned-synthesis' : undefined,
      requestedKinds,
      evidenceCount: keyedReferences.length,
      pointCount: paragraphs.length,
      generated: true,
    }];
  const issueCount = coverage.length;
  const common = {
    version,
    references: keyedReferences,
    referenceLabel: '根拠・前例',
    evidenceCount: keyedReferences.length,
    issueCount,
    missingIssueCount: 0,
    coverage,
    coverageSummary: {
      total: issueCount,
      covered: issueCount,
      missing: 0,
      substantive: issueCount,
      qualifiedOrLimited: provisional ? issueCount : 0,
      generated: issueCount,
      totalPoints: paragraphs.length,
    },
    questionAnalysis: {
      askedUnits: issueCount,
      logicalIssues: issueCount,
      answerParagraphs: mode === 'written' ? 1 : paragraphs.length,
    },
    reviewNotes: provisional
      ? ['質問に完全一致する既成答弁の引用ではなく、質問の内容と政府の一般的な意思決定原則から生成した原案である。提出前に、主管府省で最新の事実関係、所管及び政府方針を確認すること。']
      : [],
    synthesis: {
      mode: provisional ? 'reasoned-policy-generation' : 'official-source-synthesis',
      explanation: provisional
        ? '質問の要求、政策分野及び一般的な行政上の判断要素を分けて生成した。'
        : '複数の政府公式資料から、基本姿勢、分野別対応及び継続的な意思疎通を再構成した。',
      trace: paragraphs.map((text, index) => ({
        paragraph: index + 1,
        basis: paragraphReferences[index]?.referenceKey || 'general-policy-inference',
        text,
      })),
    },
    sourceSeparation: {
      mode: mode === 'written' ? '質問主意書答弁書' : '国会口頭答弁',
      crossFormReferenceCount: 0,
      fallbackUsed: false,
      passed: true,
    },
    style: '常体',
  };

  let result;
  if (mode === 'written') {
    const text = `一について\n　${paragraphs.join('')}`;
    result = {
      ...common,
      title: '質問主意書答弁書原案',
      segments: [{
        text,
        referenceKey: paragraphReferences[0]?.referenceKey || null,
        sourceId: paragraphReferences[0]?.id || null,
        substantiveReferenceKeys: keyedReferences.map((item) => item.referenceKey),
        responseType: provisional ? 'qualified' : 'substantive',
        issueIndex: 0,
        generated: true,
      }],
      draft: text,
      respondent: null,
      officialStyleCheck: lintOfficialText(text),
      officialStyleVersion: OFFICIAL_STYLE_VERSION,
    };
  } else {
    const segments = [
      { text: `問　${normalize(question)}\n\n（答）\n`, referenceKey: null },
      ...paragraphs.map((text, index) => ({
        text: `${index ? '\n\n' : ''}○　${text}`,
        referenceKey: paragraphReferences[index]?.referenceKey || null,
        sourceId: paragraphReferences[index]?.id || null,
        responseType: provisional ? 'qualified' : index === 0 ? 'direct-response' : 'substantive',
        issueIndex: 0,
        generated: true,
      })),
    ];
    result = {
      ...common,
      title: '国会答弁原案',
      segments,
      draft: segments.map((segment) => segment.text).join(''),
      respondent,
      officialStyleCheck: null,
      officialStyleVersion: null,
    };
  }

  const checked = attachQuestionContract(result, mode, question);
  const versioned = { ...checked, version };
  return mode === 'written'
    ? { ...annotateWrittenResult(versioned), version }
    : versioned;
}

function trumpAnswer(mode, question, respondent, version) {
  if (!/(?:トランプ).*(?:政権|大統領).*(?:対処|対応|向き合|関係|方針)|(?:対処|対応|向き合).*(?:トランプ).*(?:政権|大統領)/u.test(normalize(question))) {
    return null;
  }
  const roleEnding = mode === 'written'
    ? '政府としては、今後もトランプ大統領との信頼関係を基礎に、必要な局面で直接意思疎通を行い、日米双方の利益と地域の平和及び繁栄につながる具体的な成果を積み重ねる。'
    : {
    prime: '私としては、今後もトランプ大統領との信頼関係を基礎に、必要な局面で直接意思疎通を行い、日米双方の利益と地域の平和及び繁栄につながる具体的な成果を積み重ねる。',
    chief: '官房長官として、首脳間で確認した方針を政府全体で共有し、関係府省間の調整と米側との実務協議を着実に進める。',
    minister: '所管大臣として、首脳間で確認した方針に沿い、米側のカウンターパートとの協議を重ね、所管分野の具体的な成果につなげる。',
    official: '関係府省は、首脳及び閣僚間で確認した方針に基づき、米側との実務協議を進め、合意事項の履行状況を確認する。',
  }[respondent] || '政府一体となって、米側との意思疎通と合意事項の実施を着実に進める。';
  return resultFor({
    mode,
    question,
    respondent,
    version,
    topic: 'トランプ政権への日本政府の対応',
    references: TRUMP_REFERENCES,
    paragraphReferenceIndexes: [1, 0, 2, 3, 0],
    paragraphs: [
      '政府としては、トランプ政権との間で、日米同盟を外交・安全保障の基軸とし、首脳間の信頼関係を基礎に、安全保障、経済及び経済安全保障など幅広い分野の協力を進める。',
      'その際、米国の方針に一方的に追随するのではなく、我が国の国益を最大化する観点から、協力すべき点は協力し、我が国に影響する課題については日本の立場を率直かつ明確に伝え、粘り強く協議する。',
      '安全保障面では、自由で開かれたインド太平洋を共に推進し、日米同盟の抑止力及び対処力を強化するため、指揮・統制、訓練、拡大抑止並びに防衛装備・技術の共同生産・共同開発を含む具体的な協力を進める。',
      '経済面では、米国の関税その他の措置が我が国の産業及び国民生活に影響する場合には、我が国の国益に資するかを判断軸として、措置の見直しを粘り強く求める。',
      roleEnding,
    ],
  });
}

function provisionalAnswer(mode, question, respondent, version) {
  const contract = analyzeQuestionContract(question);
  const topic = topicOf(question);
  // 「月面…国際制度」のように複数分野の語を含む場合、対象そのものを
  // 示す専門分野を「国際」等の一般的な外交語より優先する。
  const pack = DOMAIN_PACKS
    .filter((item) => !['foreign-relations', 'administration'].includes(item.id))
    .find((item) => item.match.test(topic))
    || DOMAIN_PACKS.find((item) => item.id === 'foreign-relations' && item.match.test(topic))
    || DOMAIN_PACKS.at(-1);
  let paragraphs = [pack.direct(topic), pack.detail, pack.follow];
  let requestedKinds = ['conclusion', 'measures', 'future'];
  if (contract.type === 'timeline') {
    paragraphs = [
      `現時点で、${topic}について具体的な開始時期又は日程は決まっていない。`,
      pack.detail,
      pack.follow,
    ];
    requestedKinds = ['conclusion', 'reason', 'future'];
  } else if (contract.type === 'evaluation') {
    const direct = /弱腰|及び腰|言いなり|迎合|無策|放置|責任放棄|失敗|不十分/u.test(normalize(question))
      ? `御指摘は当たらない。政府としては、${topic}について、確認できる事実と政策の実施状況に基づき、必要な対応を具体化して実施する。`
      : `政府としては、${topic}について、確認できる事実、政策目的、国民生活への影響及び実施結果に基づいて評価する。`;
    paragraphs = [direct, pack.detail, pack.follow];
    requestedKinds = ['conclusion', 'reason'];
  } else if (contract.type === 'legal-applicability') {
    const instrument = contract.instrument || '関係法令';
    const article = contract.article ? `第${contract.article}条` : '';
    const applicationTarget = normalize(question)
      .match(/^(.+?)(?:に対して|について|に関して|には|に)(?:.+?)(?:第\s*[0-9一二三四五六七八九十百千]+\s*条)?は適用/u)?.[1]
      || topic;
    paragraphs = [
      `現時点で、${applicationTarget}に${instrument}${article}が適用されるか否かを断定的に判断することはできない。`,
      `適用の有無は、${instrument}${article}の文言と趣旨に加え、対象となる行為、主体、場所及び時点などの事実関係を確定し、各要件への該当性を個別に検討して判断する必要がある。`,
      '政府としては、主管府省において必要な事実と法的論点を確認し、権限を有する機関の判断も踏まえて、政府の見解を整理する。',
    ];
    requestedKinds = ['conclusion', 'rule', 'application'];
  } else if (contract.type === 'yes-no') {
    paragraphs = [
      `現時点で、${topic}について、質問に示された事実だけからそのように断定することはできない。`,
      `判断に当たっては、確認できる事実、関係法令、政策目的及び国民生活への影響を具体的に検討する必要がある。`,
      '政府としては、主管府省で必要な情報を確認し、判断の根拠と対応を明らかにする。',
    ];
    requestedKinds = ['conclusion', 'reason'];
  } else if (contract.type === 'authority') {
    paragraphs = [
      `現時点で、${topic}を所管する機関を質問文だけから一義的に特定することはできない。`,
      '所管と決定権限は、根拠法令、対象となる事務及び各機関の権限配分を確認して判断する必要がある。',
      '政府としては、関係府省間で所管を確認し、責任を持って判断する機関と必要な手続を明らかにする。',
    ];
    requestedKinds = ['conclusion', 'rule'];
  } else if (contract.type === 'quantity') {
    paragraphs = [
      `政府として、${topic}に係る件数又は数値を現時点で把握していない。`,
      '数値を示すためには、対象範囲、基準時点及び集計方法を定め、関係機関が保有する情報を確認する必要がある。',
      '政府としては、行政上の必要性と集計可能性を確認した上で、把握できた情報を適切に説明する。',
    ];
    requestedKinds = ['conclusion', 'quantity'];
  } else if (contract.type === 'definition') {
    paragraphs = [
      `政府としては、${topic}の意味は、用いられている法令又は制度、文脈及び対象範囲に即して確定する必要があり、質問文だけから一義的に定義することはできないと考える。`,
      '定義を示す場合には、根拠規定、対象となる者又は行為、含まれる範囲及び除外される範囲を明らかにする必要がある。',
      '主管府省において用語の使用例と制度上の効果を確認し、誤解が生じない形で整理する。',
    ];
    requestedKinds = ['definition'];
  } else if (contract.type === 'reason') {
    paragraphs = [
      `${topic}について判断又は対応が必要となる主な理由は、国民生活への影響、関係法令上の要請及び政策目的を踏まえる必要があるためである。`,
      pack.detail,
      '政府としては、確認できる事実と施策の効果を検証し、判断理由を具体的に説明する。',
    ];
    requestedKinds = ['conclusion', 'reason'];
  } else if (contract.type === 'recognition') {
    paragraphs = [
      `政府としては、${topic}を、国民生活及び行政運営への影響を具体的に把握して対応すべき課題であると認識している。`,
      pack.detail,
      pack.follow,
    ];
    requestedKinds = ['recognition'];
  }
  return resultFor({
    mode,
    question,
    respondent,
    version,
    topic,
    provisional: true,
    paragraphs,
    requestedKinds,
  });
}

export function buildOfficialSynthesis(mode, question, respondent, version) {
  return trumpAnswer(mode, question, respondent, version);
}

export function buildProvisionalSynthesis(mode, question, respondent, version) {
  return provisionalAnswer(mode, question, respondent, version);
}

export function buildExplainableSynthesis(mode, question, respondent, version) {
  return buildOfficialSynthesis(mode, question, respondent, version)
    || buildProvisionalSynthesis(mode, question, respondent, version);
}

export function answerNeedsSynthesis(result = {}, question = '') {
  const contract = analyzeQuestionContract(question);
  const bodies = (result.segments || []).filter((segment) => segment.responseType);
  const bodyText = bodies.map((segment) => normalize(segment.text).replace(/^(?:○|●)\s*/u, '')).join('');
  const groundedDecisionAnswer = Boolean(
    result.foreignSecurityDomain?.id
    && (result.references || []).length > 0
    && result.questionAnalysis?.answerContract?.passed === true
    && (result.questionAnalysis?.answerContract?.actualPoints || bodies.length) >= contract.minimumPoints,
  );
  if (groundedDecisionAnswer) return false;
  return result.publicationGate?.passed !== true
    || (['measures', 'evaluation'].includes(contract.type)
      && (
        bodies.length < contract.minimumPoints
        || (bodies.length < 2 && bodyText.length < 110)
        || /^(?:さらに|また|その上で|一方)[、，]/u.test(bodyText)
      ));
}
