import { lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const reference = (id, sourceType, title, url, sourceName, phrase, date = '') => ({
  id: `${sourceType}:${id}`,
  sourceType,
  sourceTypeLabel: sourceType === 'press'
    ? '会見・演説'
    : sourceType === 'interview'
      ? 'インタビュー・寄稿'
      : '政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title,
  url,
  sourceName,
  date,
  phrase,
  quotedPhrase: phrase,
  borrowed: false,
});

const SOURCES = {
  alliance: reference(
    'mofa-us-faq',
    'fact',
    'よくある質問集　北米',
    'https://www.mofa.go.jp/mofaj/comment/faq/area/n_america.html',
    '外務省',
    '日米同盟は日本外交の基軸であり、日本の平和と安全及びアジア太平洋地域の安定と発展に不可欠な役割を果たす。',
  ),
  securityTreaty: reference(
    'mofa-security-treaty',
    'fact',
    '日米安全保障条約（主要規定の解説）',
    'https://www.mofa.go.jp/mofaj/area/usa/hosho/jyoyaku_k.html',
    '外務省',
    '日米安全保障条約第五条は日本国の施政の下にある領域への武力攻撃について共通の危険に対処することを定め、第六条は日本の安全等に寄与するため米国に施設及び区域の使用を許すことを定める。',
  ),
  senkaku: reference(
    'mofa-senkaku-qa',
    'fact',
    '尖閣諸島に関するQ&A',
    'https://www.mofa.go.jp/mofaj/area/senkaku/qa_1010.html',
    '外務省',
    '尖閣諸島は日本固有の領土で現に我が国が有効に支配しており、米国は日本の施政下にある尖閣諸島に日米安全保障条約第五条が適用されるとの立場を明確にしている。',
  ),
  statusAgreement: reference(
    'mofa-sofa-qa',
    'fact',
    '日米地位協定Q&A',
    'https://www.mofa.go.jp/mofaj/area/usa/sfa/qa.html',
    '外務省',
    '日米地位協定は在日米軍の施設・区域の使用と我が国における米軍の地位を規律し、刑事裁判権について公務執行中か否か等に応じて第一次裁判権を定める。',
  ),
  extendedDeterrence: reference(
    'mofa-extended-deterrence',
    'press',
    '日米拡大抑止協議',
    'https://www.mofa.go.jp/mofaj/press/release/pressit_000001_00788.html',
    '外務省',
    '日米両政府は米国の核を含むあらゆる能力に裏付けられた拡大抑止の信頼性及び強靱性を維持・強化するため緊密に協議する。',
  ),
  taiwan: reference(
    'mofa-taiwan',
    'fact',
    '台湾基礎データ',
    'https://www.mofa.go.jp/mofaj/area/taiwan/data.html',
    '外務省',
    '我が国は日中共同声明に基づき台湾との関係を非政府間の実務関係として維持し、台湾海峡の平和と安定及び両岸問題の平和的解決を重視する。',
  ),
  china: reference(
    'mofa-china',
    'fact',
    '日中関係',
    'https://www.mofa.go.jp/mofaj/area/china/index.html',
    '外務省',
    '中国との間では主張すべきは主張し、責任ある行動を求めつつ、共通の課題では協力する建設的かつ安定的な関係を構築する。',
  ),
  northKorea: reference(
    'mofa-north-korea',
    'fact',
    '北朝鮮',
    'https://www.mofa.go.jp/mofaj/area/n_korea/index.html',
    '外務省',
    '政府は北朝鮮の核・ミサイル開発を断じて容認せず、国際社会と連携して国連安保理決議の完全な履行を求め、拉致・核・ミサイルの包括的解決を目指す。',
  ),
  abduction: reference(
    'rachi-policy',
    'fact',
    '北朝鮮による日本人拉致問題',
    'https://www.rachi.go.jp/',
    '政府拉致問題対策本部',
    '拉致問題は内閣の最重要課題であり、政府は全ての拉致被害者の安全確保及び即時帰国並びに真相究明に全力を尽くす。',
  ),
  korea: reference(
    'mofa-korea',
    'fact',
    '大韓民国',
    'https://www.mofa.go.jp/mofaj/area/korea/index.html',
    '外務省',
    '韓国は国際社会の様々な課題への対応にパートナーとして協力すべき重要な隣国であり、日韓関係を健全な形で発展させることが重要である。',
  ),
  takeshima: reference(
    'mofa-takeshima',
    'fact',
    '竹島問題',
    'https://www.mofa.go.jp/mofaj/area/takeshima/index.html',
    '外務省',
    '竹島は歴史的事実に照らしても国際法上も明らかに我が国固有の領土であり、韓国による占拠は国際法上何ら根拠のない不法占拠である。',
  ),
  historyKorea: reference(
    'mofa-history-korea',
    'fact',
    '日韓間の諸懸案',
    'https://www.mofa.go.jp/mofaj/area/korea/index.html',
    '外務省',
    '政府は日韓間の財産及び請求権の問題が日韓請求権協定により完全かつ最終的に解決されたとの立場であり、慰安婦問題に関する2015年の日韓合意の着実な実施が重要との立場である。',
  ),
  northernTerritories: reference(
    'mofa-northern-territories',
    'fact',
    '北方領土問題',
    'https://www.mofa.go.jp/mofaj/area/hoppo/index.html',
    '外務省',
    '北方四島は我が国が主権を有する島々であり、政府は領土問題を解決して平和条約を締結するとの方針を堅持する。',
  ),
  ukraine: reference(
    'mofa-ukraine',
    'press',
    'ロシアによるウクライナ侵略',
    'https://www.mofa.go.jp/mofaj/erp/c_see/ua/page3_003225.html',
    '外務省',
    'ロシアによるウクライナ侵略は国際秩序の根幹を揺るがす暴挙であり、我が国は厳しい対露制裁と強力なウクライナ支援を実施する。',
  ),
  middleEast: reference(
    'mofa-middle-east',
    'fact',
    '中東和平',
    'https://www.mofa.go.jp/mofaj/area/middleeast.html',
    '外務省',
    '我が国はイスラエルと将来の独立したパレスチナ国家が平和かつ安全に共存する二国家解決を支持し、国際人道法の遵守と人道状況の改善を求める。',
  ),
  iran: reference(
    'mofa-iran',
    'fact',
    'イラン・イスラム共和国',
    'https://www.mofa.go.jp/mofaj/area/iran/index.html',
    '外務省',
    '我が国はイラン核問題の平和的・外交的解決と国際的な核不拡散体制の維持を重視し、中東地域の緊張緩和に向けて外交努力を行う。',
  ),
  un: reference(
    'mofa-un',
    'fact',
    '国連外交',
    'https://www.mofa.go.jp/mofaj/gaiko/un_kaikaku/index.html',
    '外務省',
    '我が国は国連安保理の正統性、実効性、代表性及び透明性を高める改革を重視し、常任・非常任議席双方の拡大と我が国の常任理事国入りを目指す。',
  ),
  oda: reference(
    'mofa-development-cooperation',
    'fact',
    '開発協力大綱',
    'https://www.mofa.go.jp/mofaj/gaiko/oda/seisaku/taikou_202306.html',
    '外務省',
    '開発協力は非軍事的協力による平和と繁栄への貢献を基本とし、人間の安全保障及び開発途上国との対話と協働を重視する。',
  ),
  osa: reference(
    'mofa-osa',
    'fact',
    '政府安全保障能力強化支援（OSA）',
    'https://www.mofa.go.jp/mofaj/fp/ipc/page4_005828.html',
    '外務省',
    'OSAは同志国の軍等に資機材供与等を行い安全保障上の能力向上を支援する枠組みであり、開発を目的とするODAとは別の制度である。',
  ),
  foip: reference(
    'mofa-foip',
    'fact',
    '自由で開かれたインド太平洋',
    'https://www.mofa.go.jp/mofaj/gaiko/page25_001766.html',
    '外務省',
    '自由で開かれたインド太平洋は法の支配に基づく自由で開かれた国際秩序を維持・強化し、地域全体の平和と繁栄を確保する構想である。',
  ),
  asean: reference(
    'mofa-asean',
    'fact',
    '日ASEAN協力',
    'https://www.mofa.go.jp/mofaj/area/asean/index.html',
    '外務省',
    '我が国はインド太平洋の平和と繁栄にとってASEANの中心性と一体性が重要であるとの立場から、ASEAN主導の枠組みを支持する。',
  ),
  globalSouth: reference(
    'mofa-global-south',
    'fact',
    'グローバル・サウスとの連携',
    'https://www.mofa.go.jp/mofaj/gaiko/bluebook/index.html',
    '外務省',
    '政府は多様な事情と課題を有するグローバル・サウス諸国の声に耳を傾け、対話と協働を通じて関係を強化する。',
  ),
  nuclear: reference(
    'mofa-disarmament',
    'fact',
    '日本の軍縮・不拡散外交',
    'https://www.mofa.go.jp/mofaj/gaiko/kaku/index.html',
    '外務省',
    '唯一の戦争被爆国として核兵器のない世界を目指し、NPTを礎として核兵器国と非核兵器国の橋渡しを行い、現実的かつ実践的な核軍縮を進める。',
  ),
  tpnw: reference(
    'mofa-tpnw',
    'press',
    '吉田外務報道官会見記録',
    'https://www.mofa.go.jp/mofaj/press/kaiken/kaiken22_000030.html',
    '外務省',
    '政府は核兵器禁止条約の目標を共有する一方、核兵器国が参加しておらず我が国の安全保障における核抑止の現実も踏まえ、同条約には参加していない。',
  ),
  defensePolicy: reference(
    'mod-defense-policy',
    'fact',
    '防衛政策',
    'https://www.mod.go.jp/j/policy/index.html',
    '防衛省',
    '我が国の防衛政策は専守防衛を基本とし、文民統制を確保し、非核三原則を堅持しつつ、必要最小限度の防衛力を整備する。',
  ),
  securityLegislation: reference(
    'cas-security-legislation',
    'fact',
    '平和安全法制',
    'https://www.cas.go.jp/jp/gaiyou/jimu/anzenhoshouhousei.html',
    '内閣官房',
    '武力行使は新三要件を全て満たす場合に限られ、存立危機事態等の該当性は実際に発生した事態の個別具体的な状況と全ての情報を総合して判断する。',
  ),
  counterstrike: reference(
    'mod-national-defense-strategy',
    'fact',
    '国家防衛戦略',
    'https://www.mod.go.jp/j/policy/agenda/guideline/strategy/index.html',
    '防衛省',
    '反撃能力は憲法及び国際法の範囲内で武力行使の三要件を満たして初めて行使され、武力攻撃が発生していない段階での先制攻撃は許されない。',
  ),
  defenseBudget: reference(
    'mod-defense-buildup',
    'fact',
    '防衛力整備計画',
    'https://www.mod.go.jp/j/policy/agenda/guideline/plan/index.html',
    '防衛省',
    '防衛力整備計画は安全保障環境を踏まえて必要な防衛力と経費を定め、歳出・歳入両面の措置を通じて計画的に防衛力を整備する。',
  ),
  equipmentTransfer: reference(
    'mod-equipment-transfer',
    'fact',
    '防衛装備移転三原則',
    'https://www.mod.go.jp/j/press/wp/wp2025/html/n510301000.html',
    '防衛省',
    '防衛装備の移転は国際約束等に違反する場合や紛争当事国向けを禁止し、認め得る場合を限定して厳格審査と適正管理を行う。',
  ),
  pko: reference(
    'cao-pko',
    'fact',
    '国際平和協力',
    'https://www.cao.go.jp/pko/index.html',
    '内閣府',
    '国連PKO等への参加に当たっては停戦合意、受入同意、中立性、要件が満たされない場合の撤収、必要最小限の武器使用という参加五原則を満たす必要がある。',
  ),
  piracy: reference(
    'mod-piracy',
    'fact',
    '海賊対処への取組',
    'https://www.mod.go.jp/j/approach/kokusai_heiwa/piracy/index.html',
    '防衛省',
    '海賊対処法に基づき自衛隊はアデン湾等で民間船舶を海賊行為から防護し、関係国と連携して航行の安全を確保する。',
  ),
  evacuation: reference(
    'mofa-overseas-safety',
    'fact',
    '海外安全ホームページ',
    'https://www.anzen.mofa.go.jp/',
    '外務省',
    '政府は在外邦人の安全確保を最優先とし、情報提供、退避勧告、輸送手段の確保等を行うが、安全状況や受入国の同意等を踏まえて具体的な措置を判断する。',
  ),
  okinawa: reference(
    'mofa-us-forces-realignment',
    'fact',
    '日米安全保障協議委員会（日米「2＋2」）（概要）',
    'https://www.mofa.go.jp/mofaj/na/st/page4_005483.html',
    '外務省',
    '政府は日米同盟の抑止力を維持しつつ、沖縄を始めとする地元の基地負担の軽減を図る方針である。',
  ),
  cyber: reference(
    'nisc-cybersecurity',
    'fact',
    'サイバー安全保障',
    'https://www.nisc.go.jp/',
    '内閣官房',
    '政府は重大なサイバー攻撃から国、重要インフラ及び国民生活を守るため、官民連携、情報共有、対処能力及び国際連携を強化する。',
  ),
  space: reference(
    'mod-space-defense',
    'fact',
    '防衛省・自衛隊の宇宙政策',
    'https://www.mod.go.jp/j/policy/defense/space_domain_defense/index.html',
    '防衛省',
    '防衛省・自衛隊は宇宙状況把握、衛星通信等の抗たん性及び宇宙領域における対処能力を強化する。',
  ),
  economicSecurity: reference(
    'cas-economic-security',
    'fact',
    '経済安全保障推進法',
    'https://www.cao.go.jp/keizai_anzen_hosho/index.html',
    '内閣府',
    '経済安全保障推進法は重要物資の安定供給、基幹インフラの安定的提供、先端的な重要技術及び特許出願非公開に関する制度を定める。',
  ),
  civilProtection: reference(
    'civil-protection',
    'fact',
    '国民保護ポータルサイト',
    'https://www.kokuminhogo.go.jp/',
    '内閣官房',
    '武力攻撃事態等において国、地方公共団体及び関係機関は国民保護法に基づき警報、避難、救援及び被害対処の措置を実施する。',
  ),
};

const entry = (id, domain, matcher, question, paragraphs, sources, must) => ({
  id,
  domain,
  ministry: domain.startsWith('防衛') || domain.startsWith('安全保障') ? '防衛省・内閣官房' : '外務省',
  matcher,
  question,
  topic: question.replace(/[。？！?]+$/u, ''),
  paragraphs,
  references: sources,
  must,
});

export const FOREIGN_SECURITY_CASES = [
  entry('alliance-basis', '外交・日米同盟', /日米同盟.*(?:基軸|必要|意義)/u, '日米同盟を外交・安全保障の基軸とする理由は何か。', ['日米同盟は、我が国の平和と安全を確保する上で不可欠であり、我が国の外交・安全保障政策の基軸である。', '同盟を通じた米国の抑止力及び対処力は、地域の厳しい安全保障環境の下で我が国への攻撃を抑止するとともに、インド太平洋地域の平和と安定に寄与している。'], [SOURCES.alliance], /不可欠.*基軸.*抑止力/u),
  entry('alliance-autonomy', '外交・日米同盟', /(?:米国|アメリカ).*(?:言いなり|従属|自主)|主体的外交/u, '日本の外交は米国の言いなりなのではないか。', ['御指摘は当たらない。', '日米同盟を基軸としつつも、個々の外交・安全保障政策は、我が国の国益、国民の生命と財産及び国際情勢を踏まえ、政府が主体的に判断する。'], [SOURCES.alliance], /御指摘は当たらない.*主体的に判断/u),
  entry('senkaku-article-five', '安全保障・条約', /尖閣.*(?:安保|安全保障)条約.*(?:5|五)条.*適用|(?:安保|安全保障)条約.*(?:5|五)条.*尖閣/u, '尖閣諸島に日米安全保障条約第五条は適用されるのか。', ['日米安全保障条約第五条は、尖閣諸島に適用される。', '同条は日本国の施政の下にある領域への武力攻撃を対象としており、尖閣諸島は現に我が国の施政の下にあるためである。'], [SOURCES.senkaku, SOURCES.securityTreaty], /第五条は.*適用される.*施政の下/u),
  entry('article-five-scope', '安全保障・条約', /(?:安保|安全保障)条約.*(?:5|五)条.*(?:範囲|対象|どこ)/u, '日米安全保障条約第五条はどの地域への武力攻撃を対象とするのか。', ['日米安全保障条約第五条は、日本国の施政の下にある領域におけるいずれか一方に対する武力攻撃を対象とする。', '同条に基づく行動は、各締約国がそれぞれの憲法上の規定及び手続に従って行う。'], [SOURCES.securityTreaty], /施政の下.*憲法上の規定及び手続/u),
  entry('article-six-bases', '安全保障・条約', /(?:安保|安全保障)条約.*(?:6|六)条|在日米軍.*施設.*根拠/u, '在日米軍が日本国内の施設・区域を使用する条約上の根拠は何か。', ['在日米軍が我が国の施設及び区域を使用する条約上の根拠は、日米安全保障条約第六条である。', '同条は、日本の安全並びに極東における国際の平和及び安全への寄与のため、米国に施設及び区域の使用を許すことを定めている。'], [SOURCES.securityTreaty], /第六条.*(?:施設及び区域.*極東|極東.*施設及び区域)/u),
  entry('sofa-jurisdiction', '外交・日米地位協定', /地位協定.*(?:裁判権|刑事事件|身柄)/u, '在日米軍人の刑事事件では日本に裁判権がないのか。', ['在日米軍人の刑事事件について、我が国に裁判権がないということではない。', '日米地位協定は、公務執行中の作為又は不作為から生じた犯罪か否かなどに応じ、日米の第一次裁判権を区分している。'], [SOURCES.statusAgreement], /ないということではない.*第一次裁判権/u),
  entry('extended-deterrence', '安全保障・抑止', /拡大抑止|核の傘/u, '米国の拡大抑止は日本の安全保障でどのような役割を果たすのか。', ['米国の核を含むあらゆる能力に裏付けられた拡大抑止は、我が国への攻撃を抑止する上で不可欠である。', '政府は、その信頼性及び強靱性を維持・強化するため、日米拡大抑止協議等を通じて米国と緊密に意思疎通を行う。'], [SOURCES.extendedDeterrence], /不可欠.*信頼性及び強靱性/u),
  entry('nuclear-sharing', '安全保障・核政策', /核共有|ニュークリア.*シェアリング/u, '政府はNATO型の核共有を導入するのか。', ['政府は、NATO型の核共有を導入することは考えていない。', '我が国は非核三原則を政策上の方針として堅持しつつ、米国の拡大抑止の信頼性を日米間の協議により確保する。'], [SOURCES.defensePolicy, SOURCES.extendedDeterrence], /導入することは考えていない.*非核三原則/u),
  entry('taiwan-relations', '外交・台湾', /台湾.*(?:外交関係|政府間関係)/u, '日本は台湾と政府間の外交関係を有しているのか。', ['我が国は、台湾との政府間の外交関係を有していない。', '昭和四十七年の日中共同声明を踏まえ、台湾との関係を非政府間の実務関係として維持している。'], [SOURCES.taiwan], /外交関係を有していない.*非政府間の実務関係/u),
  entry('taiwan-stability', '外交・台湾', /台湾海峡.*(?:平和|安定|認識|重要)/u, '台湾海峡の平和と安定を政府はどのように位置付けているのか。', ['台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとって重要である。', '政府は、台湾をめぐる問題が対話により平和的に解決されることを期待し、関係国に直接働きかけていく。'], [SOURCES.taiwan], /国際社会全体.*対話により平和的/u),
  entry('one-china-position', '外交・台湾', /一つの中国|日中共同声明.*台湾/u, '日本政府は中国の「一つの中国」原則をそのまま承認しているのか。', ['我が国は、中華人民共和国政府が台湾は中華人民共和国の領土の不可分の一部であるとする立場を十分理解し、尊重するとの立場である。', 'これは日中共同声明に記載された我が国の立場であり、台湾との関係は非政府間の実務関係として維持している。'], [SOURCES.taiwan], /十分理解し、尊重.*非政府間/u),
  entry('taiwan-contingency', '安全保障・台湾', /台湾.*(?:有事|侵攻|封鎖).*(?:事態|対応|該当)/u, '台湾有事が発生すれば直ちに我が国の存立危機事態になるのか。', ['台湾をめぐる事態が発生したというだけで、直ちに存立危機事態となるものではない。', '該当性は、実際に発生した事態の個別具体的な状況に即し、政府が持ち得る全ての情報を総合して客観的かつ合理的に判断する。'], [SOURCES.securityLegislation, SOURCES.taiwan], /直ちに.*ものではない.*個別具体的/u),
  entry('senkaku-sovereignty', '外交・領土', /尖閣.*(?:領土|領有権|固有)/u, '尖閣諸島は我が国固有の領土なのか。', ['尖閣諸島は、歴史的にも国際法上も疑いのない我が国固有の領土であり、現に我が国はこれを有効に支配している。'], [SOURCES.senkaku], /固有の領土.*有効に支配/u),
  entry('senkaku-dispute', '外交・領土', /尖閣.*(?:領有権.*問題|紛争|解決すべき)/u, '尖閣諸島をめぐる領有権問題は存在するのか。', ['尖閣諸島をめぐって解決しなければならない領有権の問題は、そもそも存在しない。', '尖閣諸島は我が国固有の領土であり、現に我が国が有効に支配している。'], [SOURCES.senkaku], /そもそも存在しない.*有効に支配/u),
  entry('china-coast-guard', '外交・中国', /中国海警|中国.*領海侵入|尖閣.*中国船/u, '尖閣諸島周辺で中国海警船による領海侵入があった場合、政府はどう対応するのか。', ['中国海警船による尖閣諸島周辺の領海侵入は、誠に遺憾であり、受け入れられない。', '海上保安庁が警告及び退去要求を行い、政府は外交ルートを通じて中国側に厳重に抗議し、再発防止を強く求める。'], [SOURCES.senkaku, SOURCES.china], /受け入れられない.*退去要求.*厳重に抗議/u),
  entry('east-china-sea-resources', '外交・中国', /東シナ海.*(?:資源|ガス田|構造物)/u, '中国による東シナ海の一方的な資源開発に政府はどう対応するのか。', ['東シナ海における境界未画定海域で中国側が一方的な開発を進めることは極めて遺憾である。', '政府は、中国側に一方的な開発行為の中止を求めるとともに、二〇〇八年合意の実施に向けた協議の再開を働きかける。'], [SOURCES.china], /極めて遺憾.*中止.*協議の再開/u),
  entry('north-korea-missiles', '外交・北朝鮮', /北朝鮮.*(?:ミサイル|弾道)/u, '北朝鮮の弾道ミサイル発射を政府はどのように評価し対応するのか。', ['北朝鮮による弾道ミサイル発射は、我が国、地域及び国際社会の平和と安全を脅かすものであり、断じて容認できない。', '政府は情報収集・警戒監視に万全を期し、米国及び韓国等と連携するとともに、北朝鮮に厳重に抗議する。'], [SOURCES.northKorea], /断じて容認できない.*警戒監視.*厳重に抗議/u),
  entry('north-korea-nuclear', '外交・北朝鮮', /北朝鮮.*(?:核開発|非核化|核兵器)/u, '北朝鮮の核開発に対する政府の基本方針は何か。', ['北朝鮮の核兵器開発は断じて容認できず、北朝鮮の完全な非核化を実現することが政府の一貫した方針である。', '国際社会と緊密に連携し、関連する国連安保理決議の完全な履行を確保する。'], [SOURCES.northKorea], /断じて容認できず.*完全な非核化.*完全な履行/u),
  entry('abduction-resolution', '外交・北朝鮮', /拉致.*(?:解決|帰国|最重要)/u, '拉致問題の解決に向けた政府の方針は何か。', ['拉致問題は、政府の最重要課題である。', '全ての拉致被害者の安全確保及び即時帰国並びに真相究明の実現に向け、あらゆる機会を捉えて全力で取り組む。'], [SOURCES.abduction], /最重要課題.*即時帰国.*真相究明/u),
  entry('japan-dprk-normalization', '外交・北朝鮮', /日朝.*(?:国交正常化|平壌宣言)/u, '政府は北朝鮮との国交正常化を目指しているのか。', ['政府は、日朝平壌宣言に基づき、拉致、核及びミサイルといった諸懸案を包括的に解決し、不幸な過去を清算して国交正常化を実現するとの方針である。'], [SOURCES.northKorea], /諸懸案を包括的に解決.*国交正常化/u),
  entry('takeshima', '外交・領土', /竹島.*(?:領土|領有権|不法占拠)/u, '竹島に関する日本政府の基本的立場は何か。', ['竹島は、歴史的事実に照らしても国際法上も明らかに我が国固有の領土である。', '韓国による竹島の占拠は国際法上何ら根拠のない不法占拠であり、政府は国際法にのっとり平和的に解決する方針である。'], [SOURCES.takeshima], /固有の領土.*不法占拠.*平和的/u),
  entry('korea-relations', '外交・韓国', /日韓関係|韓国.*(?:重要な隣国|パートナー)/u, '韓国を政府はどのような外交上の相手と位置付けているのか。', ['韓国は、国際社会の様々な課題への対応にパートナーとして協力すべき重要な隣国である。', '日韓関係を健全な形で発展させ、日韓米の戦略的連携を進めることは、地域の平和と安定に重要である。'], [SOURCES.korea], /重要な隣国.*日韓米/u),
  entry('comfort-women-agreement', '外交・韓国', /慰安婦.*(?:合意|2015|日韓)/u, '慰安婦問題に関する二〇一五年の日韓合意は現在も有効なのか。', ['二〇一五年の日韓合意は、日韓両政府間の合意であり、現在も有効である。', '政府は、同合意の着実な実施が重要であるとの立場を韓国側に引き続き求める。'], [SOURCES.historyKorea], /現在も有効.*着実な実施/u),
  entry('former-workers', '外交・韓国', /徴用工|旧朝鮮半島出身労働者|請求権協定/u, '旧朝鮮半島出身労働者の請求権問題は解決済みなのか。', ['日韓間の財産及び請求権の問題は、日韓請求権協定により完全かつ最終的に解決されたというのが政府の一貫した立場である。', '政府は、日韓関係の基礎を損なうことがないよう、韓国側に適切な対応を求める。'], [SOURCES.historyKorea], /完全かつ最終的に解決.*適切な対応/u),
  entry('northern-territories', '外交・領土', /北方領土|北方四島.*(?:領土|帰属)/u, '北方四島に関する政府の基本的立場は何か。', ['北方四島は、我が国が主権を有する島々である。', '政府は、北方四島の帰属の問題を解決して平和条約を締結するとの基本方針を堅持する。'], [SOURCES.northernTerritories], /主権を有する.*平和条約/u),
  entry('russia-peace-treaty', '外交・ロシア', /日露.*平和条約|ロシア.*平和条約/u, 'ロシアとの平和条約交渉に関する政府の方針は何か。', ['政府は、領土問題を解決して平和条約を締結するとの方針を堅持している。', 'もっとも、ロシアによるウクライナ侵略が続く現状では、平和条約交渉について具体的に申し上げられる状況にはない。'], [SOURCES.northernTerritories, SOURCES.ukraine], /方針を堅持.*具体的に申し上げられる状況にはない/u),
  entry('ukraine-aggression', '外交・ウクライナ', /ウクライナ.*(?:侵略|侵攻).*(?:評価|認識)/u, 'ロシアによるウクライナ侵略を政府はどのように評価しているのか。', ['ロシアによるウクライナ侵略は、ウクライナの主権及び領土一体性を侵害し、国際秩序の根幹を揺るがす暴挙であり、断じて認められない。'], [SOURCES.ukraine], /国際秩序の根幹.*断じて認められない/u),
  entry('russia-sanctions', '外交・ウクライナ', /ロシア.*(?:制裁|資産凍結|輸出禁止)/u, 'ロシアに対する制裁を政府はなぜ続けるのか。', ['ロシアによる侵略の代償を明確にし、力による一方的な現状変更を許さないとの国際社会の意思を示すため、対露制裁を継続する必要がある。', '我が国はG7を始めとする国際社会と連携し、資産凍結、輸出入禁止等の措置を適切に実施する。'], [SOURCES.ukraine], /現状変更を許さない.*資産凍結/u),
  entry('ukraine-support', '外交・ウクライナ', /ウクライナ.*(?:支援|復旧|復興)/u, 'ウクライナに対して政府はどのような支援を行うのか。', ['政府は、ウクライナに寄り添った支援を継続する。', '地雷対策、がれき処理、電力・農業等の生活再建及び復旧・復興に関する我が国の知見を生かし、国際社会と連携して支援する。'], [SOURCES.ukraine], /支援を継続.*地雷対策.*復旧・復興/u),
  entry('gaza-humanitarian', '外交・中東', /ガザ.*(?:人道|停戦|戦闘休止)/u, 'ガザの人道状況に対して政府は何を求めているのか。', ['政府は、全ての当事者に国際法及び国際人道法の遵守を求め、人道状況の改善と持続可能な停戦の実現を強く求める。', '人道支援が安全かつ継続的に届けられるよう、国際機関を通じた支援と関係国への外交的働きかけを行う。'], [SOURCES.middleEast], /国際人道法.*停戦.*人道支援/u),
  entry('two-state-solution', '外交・中東', /二国家解決|イスラエル.*パレスチナ.*共存/u, '中東和平に関する日本政府の最終的な解決像は何か。', ['我が国は、イスラエルと将来の独立したパレスチナ国家が平和かつ安全に共存する二国家解決を支持している。', '当事者間の交渉を通じた政治的解決に向け、信頼醸成及びパレスチナ支援に取り組む。'], [SOURCES.middleEast], /二国家解決.*政治的解決/u),
  entry('palestine-recognition', '外交・中東', /パレスチナ.*国家承認/u, '日本はパレスチナを国家承認するのか。', ['パレスチナの国家承認については、和平プロセスの進展を後押しする観点から、適切な時期及び在り方を総合的に検討する。', '政府は、二国家解決を一貫して支持し、パレスチナの国家建設を支援する。'], [SOURCES.middleEast], /適切な時期及び在り方.*二国家解決/u),
  entry('iran-nuclear', '外交・イラン', /イラン.*(?:核問題|核開発|核合意)/u, 'イランの核問題に対する政府の立場は何か。', ['政府は、イランによる核兵器取得を認めず、国際的な核不拡散体制を維持するとの立場である。', '問題の平和的・外交的解決に向け、IAEAとの完全な協力をイランに求め、関係国への働きかけを行う。'], [SOURCES.iran], /核兵器取得を認めず.*平和的・外交的.*IAEA/u),
  entry('hormuz', '外交・中東', /ホルムズ海峡|中東.*シーレーン/u, 'ホルムズ海峡の航行が妨げられた場合、政府はどう対応するのか。', ['ホルムズ海峡における航行の安全と中東地域の平和と安定は、我が国のエネルギー安全保障にとって極めて重要である。', '政府は、邦人及び船舶の安全、原油供給及び国際情勢を把握し、関係国と連携して緊張緩和と航行の安全確保に必要な外交努力を行う。'], [SOURCES.iran], /エネルギー安全保障.*航行の安全確保/u),
  entry('un-reform', '外交・国連', /国連.*(?:改革|安保理改革)/u, '政府は国連安全保障理事会をどのように改革すべきと考えているのか。', ['政府は、国連安全保障理事会の正統性、実効性、代表性及び透明性を高める改革が必要と考えている。', '常任及び非常任議席の双方を拡大する改革の実現に向け、関係国と連携する。'], [SOURCES.un], /正統性、実効性、代表性及び透明性.*双方を拡大/u),
  entry('japan-permanent-seat', '外交・国連', /日本.*常任理事国|常任理事国入り/u, '日本は国連安全保障理事会の常任理事国入りを目指しているのか。', ['我が国は、国連安全保障理事会改革の一環として常任理事国入りを目指している。', '国際の平和と安全に一層大きな責任を果たす意思と能力を各国に説明し、改革への支持拡大に取り組む。'], [SOURCES.un], /常任理事国入りを目指している.*支持拡大/u),
  entry('oda-purpose', '外交・開発協力', /ODA|ＯＤＡ|政府開発援助.*(?:目的|軍事)/u, 'ODAは日本の安全保障上の利益だけを目的とするのか。', ['ODAは、我が国の安全保障上の利益だけを目的とするものではない。', '非軍事的協力による平和と繁栄への貢献を基本とし、人間の安全保障及び開発途上国との対話と協働を重視して実施する。'], [SOURCES.oda], /だけを目的とするものではない.*非軍事的協力.*人間の安全保障/u),
  entry('osa-purpose', '外交・安全保障協力', /OSA|ＯＳＡ|政府安全保障能力強化支援/u, 'OSAはODAと同じ制度なのか。', ['OSAは、ODAと同じ制度ではない。', 'OSAは同志国の軍等に資機材供与等を行って安全保障上の能力向上を支援する制度であり、開発を主目的とするODAとは別の枠組みである。'], [SOURCES.osa, SOURCES.oda], /同じ制度ではない.*別の枠組み/u),
  entry('foip', '外交・インド太平洋', /自由で開かれたインド太平洋|FOIP|ＦＯＩＰ/u, '自由で開かれたインド太平洋とは何か。', ['自由で開かれたインド太平洋は、法の支配に基づく自由で開かれた国際秩序を維持・強化し、地域全体の平和と繁栄を確保するための構想である。', '特定の国を排除するものではなく、趣旨に賛同する国・地域と協力を広げる。'], [SOURCES.foip], /法の支配.*特定の国を排除するものではなく/u),
  entry('asean-centrality', '外交・ASEAN', /ASEAN.*(?:中心性|一体性)|ＡＳＥＡＮ.*中心/u, '政府がASEANの中心性を重視する理由は何か。', ['ASEANの中心性及び一体性は、インド太平洋地域の安定と繁栄を実現する上で重要である。', '我が国は、ASEAN主導の地域協力枠組みを支持し、連結性、海洋協力、経済及び人的交流を強化する。'], [SOURCES.asean], /中心性及び一体性.*ASEAN主導/u),
  entry('global-south', '外交・グローバルサウス', /グローバル.?サウス/u, 'グローバル・サウスとの連携を政府はどのように進めるのか。', ['グローバル・サウスと一括りにするのではなく、各国の多様な事情及び課題を踏まえて連携する。', '相手国の声に耳を傾け、気候、保健、食料、エネルギー及び開発金融等の共通課題について対話と協働を進める。'], [SOURCES.globalSouth], /一括りにするのではなく.*対話と協働/u),
  entry('tpnw', '外交・核軍縮', /核兵器禁止条約|TPNW|ＴＰＮＷ/u, '日本は核兵器禁止条約に参加するのか。', ['政府は、核兵器禁止条約が掲げる核兵器廃絶という目標を共有しているが、現時点で同条約に参加する考えはない。', '核兵器国が参加していないこと及び我が国の安全保障における核抑止の現実を踏まえ、核兵器国を関与させる現実的かつ実践的な取組を進める。'], [SOURCES.tpnw, SOURCES.nuclear], /目標を共有.*参加する考えはない.*核兵器国/u),
  entry('three-nonnuclear-principles', '安全保障・核政策', /非核三原則/u, '政府は非核三原則を今後も堅持するのか。', ['政府は、「持たず、作らず、持ち込ませず」とする非核三原則を政策上の方針として堅持する。'], [SOURCES.defensePolicy, SOURCES.nuclear], /持たず、作らず、持ち込ませず.*堅持/u),
  entry('npt', '外交・核不拡散', /核不拡散条約|NPT|ＮＰＴ/u, '政府はNPTを核軍縮でどのように位置付けているのか。', ['政府は、核兵器不拡散条約を国際的な核軍縮・不拡散体制の礎と位置付けている。', '核兵器国による核軍縮、非核兵器国による不拡散及び原子力の平和的利用という三本柱を維持・強化する。'], [SOURCES.nuclear], /体制の礎.*三本柱/u),
  entry('ctbt', '外交・核軍縮', /包括的核実験禁止条約|CTBT|ＣＴＢＴ/u, '包括的核実験禁止条約を政府はなぜ重視するのか。', ['包括的核実験禁止条約は、あらゆる核兵器の実験的爆発及び他の核爆発を禁止し、核兵器の質的改善を抑える上で重要である。', '政府は、条約の早期発効に向けて未署名・未批准国に働きかける。'], [SOURCES.nuclear], /あらゆる核兵器の実験的爆発.*早期発効/u),
  entry('atomic-bomb-position', '外交・被爆国', /広島|長崎.*(?:原爆|原子爆弾)|原爆投下.*政府/u, '広島・長崎への原爆投下に関する政府の基本的立場は何か。', ['広島及び長崎への原爆投下は、数多くの尊い命を奪い、人道上極めて遺憾な事態をもたらした。', '核兵器の使用はその甚大な破壊力と殺傷力のため、国際法の基礎にある人道精神に合致しないとの立場である。'], [SOURCES.nuclear], /人道上極めて遺憾.*人道精神に合致しない/u),
  entry('sdf-constitutionality', '防衛・憲法', /自衛隊.*(?:違憲|合憲|憲法上)/u, '自衛隊は憲法第九条に違反するのか。', ['自衛隊は、憲法第九条に違反するものではない。', '憲法第九条の下でも、我が国が独立国として自国の平和と安全を維持し、存立を全うするために必要な自衛の措置を採ることは否定されず、自衛のための必要最小限度の実力を保持することは許される。'], [SOURCES.defensePolicy], /違反するものではない.*必要最小限度/u),
  entry('exclusive-defense', '防衛・基本政策', /専守防衛/u, '専守防衛とはどのような考え方か。', ['専守防衛とは、相手から武力攻撃を受けたとき初めて防衛力を行使し、その態様も自衛のための必要最小限にとどめ、保持する防衛力も自衛のための必要最小限に限るという受動的な防衛戦略である。'], [SOURCES.defensePolicy], /武力攻撃を受けたとき初めて.*必要最小限/u),
  entry('collective-self-defense', '防衛・安全保障法制', /集団的自衛権/u, '政府は集団的自衛権を無制限に行使できるのか。', ['集団的自衛権を無制限に行使することはできない。', '我が国と密接な関係にある他国への武力攻撃が発生し、新三要件を全て満たす場合に限り、我が国を防衛するための必要最小限度の武力行使が許される。'], [SOURCES.securityLegislation], /無制限に.*できない.*新三要件/u),
  entry('three-conditions', '防衛・安全保障法制', /武力行使.*(?:新)?三要件|新三要件/u, '武力行使の新三要件とは何か。', ['第一に我が国への武力攻撃が発生した場合、又は密接な関係にある他国への武力攻撃により我が国の存立が脅かされる明白な危険があること、第二に他に適当な手段がないこと、第三に必要最小限度の実力行使にとどまることが新三要件である。'], [SOURCES.securityLegislation], /明白な危険.*他に適当な手段.*必要最小限度/u),
  entry('survival-threatening', '防衛・安全保障法制', /存立危機事態/u, '存立危機事態に該当するかは誰がどのように判断するのか。', ['存立危機事態への該当性は、政府が判断し、対処基本方針について原則として国会の承認を求める。', '判断に当たっては、実際に発生した事態の個別具体的な状況に即し、政府が持ち得る全ての情報を総合して客観的かつ合理的に判断する。'], [SOURCES.securityLegislation], /政府が判断.*国会の承認.*個別具体的/u),
  entry('counterstrike-capability', '防衛・反撃能力', /反撃能力.*(?:行使|保有|条件)/u, '反撃能力はどのような場合に行使できるのか。', ['反撃能力は、我が国に対する武力攻撃が発生し、武力行使の三要件を満たす場合に限り行使できる。', '行使は憲法及び国際法の範囲内で必要最小限度にとどまり、相手のミサイル攻撃を防ぐため他に手段がない場合に行う。'], [SOURCES.counterstrike], /武力攻撃が発生.*三要件.*他に手段がない/u),
  entry('preemptive-strike', '防衛・反撃能力', /先制攻撃|武力攻撃.*発生していない.*攻撃/u, '反撃能力は相手国への先制攻撃を認めるものなのか。', ['反撃能力は、相手国への先制攻撃を認めるものではない。', '武力攻撃が発生していない段階で自ら先に攻撃することは、国際法上も憲法上も許されない。'], [SOURCES.counterstrike], /認めるものではない.*許されない/u),
  entry('defense-spending', '防衛・予算', /防衛費|防衛関係費.*(?:GDP|財源|増額)/u, '防衛費はGDP比二パーセントありきで決めるのか。', ['防衛力の整備は、GDP比という数値ありきで決めるものではない。', '国家防衛戦略に基づき必要な防衛力の内容を積み上げ、そのために必要な経費と安定的な財源を確保する。'], [SOURCES.defenseBudget], /数値ありき.*ものではない.*積み上げ/u),
  entry('equipment-transfer', '防衛・装備移転', /防衛装備移転三原則|武器輸出.*(?:自由|無制限)/u, '日本は防衛装備を自由に輸出できるのか。', ['我が国が防衛装備を自由に輸出することはできない。', '防衛装備移転三原則により移転を禁止する場合を明確にし、認め得る場合を限定して、厳格審査、情報公開及び目的外使用・第三国移転の適正管理を行う。'], [SOURCES.equipmentTransfer], /自由に.*できない.*厳格審査/u),
  entry('conflict-party-transfer', '防衛・装備移転', /紛争当事国.*(?:装備|武器|移転)/u, '紛争当事国に防衛装備を移転できるのか。', ['紛争当事国への防衛装備の移転は認められない。', '防衛装備移転三原則は、国連安全保障理事会が措置を採っている武力攻撃の当事国への移転を禁止している。'], [SOURCES.equipmentTransfer], /認められない.*移転を禁止/u),
  entry('pko-five-principles', '防衛・国際平和協力', /PKO|ＰＫＯ.*(?:五原則|参加)/u, '自衛隊はどのような条件でも国連PKOに参加できるのか。', ['自衛隊がどのような条件でも国連PKOに参加できるわけではない。', '停戦合意、紛争当事者の受入同意、中立性、要件が満たされない場合の撤収及び必要最小限の武器使用という参加五原則を満たす必要がある。'], [SOURCES.pko], /できるわけではない.*参加五原則/u),
  entry('anti-piracy', '防衛・海洋安全保障', /海賊対処|アデン湾/u, '自衛隊が海外で海賊対処を行う法的根拠と目的は何か。', ['自衛隊による海賊対処は、海賊対処法に基づく。', 'アデン湾等において国籍を問わず民間船舶を海賊行為から防護し、国際社会と連携して航行の安全を確保することが目的である。'], [SOURCES.piracy], /海賊対処法.*国籍を問わず.*航行の安全/u),
  entry('overseas-evacuation', '防衛・邦人保護', /邦人.*(?:退避|輸送|救出)|在外邦人.*保護/u, '海外で有事が発生すれば自衛隊は必ず邦人を救出できるのか。', ['海外で有事が発生した場合に、自衛隊が必ず邦人を救出できるとあらかじめ断定することはできない。', '政府は在外邦人の安全確保を最優先とし、現地の安全状況、受入国の同意、輸送経路等を確認した上で、自衛隊による輸送を含む最も適切な手段を判断する。'], [SOURCES.evacuation], /断定することはできない.*最優先.*最も適切な手段/u),
  entry('okinawa-burden', '防衛・在日米軍', /沖縄.*(?:基地負担|米軍基地)/u, '沖縄の基地負担を政府はどのように軽減するのか。', ['政府は、日米同盟の抑止力を維持しつつ、沖縄の基地負担を目に見える形で軽減する。', '在日米軍再編、土地返還、訓練移転、騒音対策及び事件・事故防止を進め、地元に丁寧に説明する。'], [SOURCES.okinawa], /抑止力を維持.*土地返還.*事件・事故防止/u),
  entry('cyber-defense', '安全保障・サイバー', /サイバー.*(?:攻撃|防御|安全保障)/u, '重大なサイバー攻撃に政府はどのように対処するのか。', ['政府は、重大なサイバー攻撃から国、重要インフラ及び国民生活を守るため、政府全体で対処する。', '官民の情報共有、被害拡大防止、攻撃者の特定、警察・外交・防衛その他の手段及び国際連携を組み合わせる。'], [SOURCES.cyber], /重要インフラ.*情報共有.*国際連携/u),
  entry('space-defense', '安全保障・宇宙', /宇宙.*(?:防衛|安全保障|作戦)/u, '宇宙領域を政府は防衛政策でどのように位置付けているのか。', ['宇宙領域は、情報収集、通信、測位等を通じて我が国の防衛に不可欠な領域である。', '政府は、宇宙状況把握、衛星の抗たん性及び宇宙領域における対処能力を強化し、同盟国・同志国との連携を進める。'], [SOURCES.space], /不可欠な領域.*宇宙状況把握.*抗たん性/u),
  entry('economic-security', '安全保障・経済', /経済安全保障.*(?:何|目的|推進法)/u, '経済安全保障推進法は何を確保するための法律か。', ['経済安全保障推進法は、経済活動に関して行われる国家及び国民の安全を害する行為を未然に防止するための法律である。', '重要物資の安定供給、基幹インフラの安定的提供、先端的な重要技術及び特許出願非公開に関する制度を定めている。'], [SOURCES.economicSecurity], /未然に防止.*重要物資.*基幹インフラ/u),
  entry('civil-protection', '安全保障・国民保護', /国民保護|武力攻撃.*(?:避難|警報|救援)/u, '武力攻撃事態で国民の避難や救援は誰が行うのか。', ['武力攻撃事態等における国民の避難及び救援は、国、地方公共団体及び関係機関が国民保護法に基づいて行う。', '国が警報の発令及び避難措置の指示等を行い、都道府県及び市町村が避難の指示、誘導、救援等を実施する。'], [SOURCES.civilProtection], /国、地方公共団体及び関係機関.*避難の指示、誘導、救援/u),
];

function resultFor(item, mode, question, respondent, version) {
  const q = normalize(question);
  const roleParagraphs = item.id === 'alliance-autonomy' && mode !== 'written'
    ? [{
      prime: '私としては、国益と国民の安全を最優先に、外交・安全保障上の判断について国民に説明する。',
      chief: '官房長官として、政府全体の方針が我が国自身の判断として一貫するよう総合調整し、説明責任を果たす。',
      minister: '所管大臣として、同盟国との協議を尽くした上で、我が国の立場と判断を明確に説明する。',
      official: '政府参考人として、制度及び政策決定の実務に即し、我が国が主体的に判断している根拠を具体的に説明する。',
    }[respondent] || '政府として、我が国自身の判断とその根拠を国民に明確に説明する。']
    : [];
  const answerParagraphs = [...item.paragraphs, ...roleParagraphs];
  const references = item.references.map((source, index) => ({
    ...source,
    referenceKey: `f${index + 1}`,
  }));
  const common = {
    version,
    references,
    referenceLabel: '根拠・前例',
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      issueIndex: 1,
      issue: q,
      topic: item.topic,
      domain: item.domain,
      status: 'covered',
      responseType: 'substantive',
      writtenStrategy: mode === 'written' ? 'settled-government-position' : undefined,
      requestedKinds: ['conclusion', 'rule', 'application'].slice(0, answerParagraphs.length),
      evidenceCount: references.length,
      pointCount: answerParagraphs.length,
      generated: false,
    }],
    coverageSummary: {
      total: 1,
      covered: 1,
      missing: 0,
      substantive: 1,
      qualifiedOrLimited: 0,
      generated: 0,
      totalPoints: answerParagraphs.length,
    },
    questionAnalysis: {
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: mode === 'written' ? 1 : answerParagraphs.length,
    },
    reviewNotes: [],
    foreignSecurityDomain: {
      id: item.id,
      domain: item.domain,
      ministry: item.ministry,
    },
    style: '常体',
  };
  if (mode === 'written') {
    const text = `一について\n　${answerParagraphs.join('')}`;
    return {
      ...common,
      title: '質問主意書答弁書原案',
      segments: [{
        text,
        referenceKey: references[0]?.referenceKey || null,
        sourceId: references[0]?.id || null,
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
    ...answerParagraphs.map((text, index) => {
      const source = references[Math.min(index, references.length - 1)];
      return {
        text: `${index ? '\n\n' : ''}○　${text}`,
        referenceKey: source?.referenceKey || null,
        sourceId: source?.id || null,
        responseType: index === 0 ? 'direct-response' : 'substantive',
        issueIndex: 0,
      };
    }),
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

function questionStem(value = '') {
  return normalize(value).replace(/[。？！?]+$/u, '');
}

export function buildForeignSecurityAnswer(mode, question, respondent, version) {
  const q = normalize(question);
  const exact = FOREIGN_SECURITY_CASES.find((item) => q.includes(questionStem(item.question)));
  const matched = exact || FOREIGN_SECURITY_CASES.find((item) => item.matcher.test(q));
  return matched ? resultFor(matched, mode, q, respondent, version) : null;
}

export function verifyForeignSecurityAnswer(result = {}) {
  const item = FOREIGN_SECURITY_CASES.find((entry) =>
    entry.id === result.foreignSecurityDomain?.id);
  if (!item) return false;
  item.must.lastIndex = 0;
  return item.must.test(normalize(result.draft))
    && (result.references || []).length > 0
    && result.issueCount === 1
    && !/●|論点[一二三四五六七八九十\d]|【[^】]+】/u.test(result.draft || '');
}
