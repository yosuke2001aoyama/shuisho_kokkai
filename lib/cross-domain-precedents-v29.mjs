import { lintOfficialText, OFFICIAL_STYLE_VERSION } from '../api/lib/official-style.mjs';

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const ref = (id, title, url, sourceName, phrase, date = '') => ({
  id,
  sourceType: /syuisyo|shitsumon/u.test(url) ? 'written' : 'fact',
  sourceTypeLabel: /syuisyo|shitsumon/u.test(url) ? '質問主意書答弁書' : '政府公式資料',
  category: /syuisyo|shitsumon/u.test(url) ? 'cabinet' : 'official_policy',
  categoryLabel: /syuisyo|shitsumon/u.test(url) ? '閣議決定済み答弁書' : '政府公式資料',
  title,
  url,
  sourceName,
  date,
  phrase,
  quotedPhrase: phrase,
  borrowed: false,
});

const law = (lawId, title, phrase) => ref(
  `law:https://laws.e-gov.go.jp/law/${lawId}`,
  title,
  `https://laws.e-gov.go.jp/law/${lawId}`,
  'e-Gov法令検索',
  phrase,
);

const SENKAKU_WRITTEN = ref(
  'written:https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/177/touh/t177065.htm',
  '尖閣諸島の防衛に関する質問に対する答弁書',
  'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/177/touh/t177065.htm',
  '参議院・閣議決定答弁書',
  '尖閣諸島を含む我が国の施政の下にある領域における武力攻撃には、日米安全保障条約第五条が適用され、日米両国は共通の危険に対処する。',
  '2011-02-25',
);

const SECURITY_TREATY = ref(
  'official:https://www.mofa.go.jp/mofaj/area/usa/hosho/jyoyaku_k.html',
  '日米安全保障条約（主要規定の解説）',
  'https://www.mofa.go.jp/mofaj/area/usa/hosho/jyoyaku_k.html',
  '外務省',
  '日米安全保障条約第五条は、日本国の施政の下にある領域における武力攻撃に対し、両国が共通の危険に対処するよう行動することを規定する。',
);

export const DOMAIN_PRECEDENT_CASES = [
  {
    id: 'territory-senkaku-article-five',
    domain: '領土・安全保障',
    ministry: '外務省・防衛省',
    matcher: /尖閣諸島.*日米(?:安全保障|安保)条約.*第\s*[5五]\s*条.*適用|日米(?:安全保障|安保)条約.*第\s*[5五]\s*条.*尖閣諸島.*適用/u,
    question: '尖閣諸島に対して日米安保条約第5条は適用されるのか。',
    topic: '尖閣諸島への日米安全保障条約第五条の適用',
    paragraphs: [
      '日米安全保障条約第五条は、尖閣諸島に適用される。',
      '同条は、日本国の施政の下にある領域におけるいずれか一方に対する武力攻撃について、日米両国がそれぞれの憲法上の規定及び手続に従い、共通の危険に対処するよう行動することを定めている。',
      '尖閣諸島は現に我が国の施政の下にあるため同条の適用対象であり、このことは日米間で累次確認されている。',
    ],
    references: [SENKAKU_WRITTEN, SECURITY_TREATY],
    must: /第五条は、尖閣諸島に適用される.*日本国の施政の下.*適用対象/us,
  },
  {
    id: 'constitution-amendment',
    domain: '憲法',
    ministry: '内閣官房',
    matcher: /(?:国会だけ|国会のみ).*(?:憲法改正|改憲)|憲法改正.*(?:国民投票|発議要件)/u,
    question: '国会の議決だけで憲法を改正できるのか。',
    topic: '憲法改正手続',
    paragraphs: [
      '国会の議決だけで憲法を改正することはできない。',
      '日本国憲法第九十六条により、各議院の総議員の三分の二以上の賛成で国会が発議し、国民投票において過半数の承認を得る必要がある。',
    ],
    references: [law('321CONSTITUTION', '日本国憲法第九十六条', '日本国憲法第九十六条は、憲法改正について各議院の総議員の三分の二以上による発議と国民投票の過半数の承認を求める。')],
    must: /できない.*三分の二以上.*国民投票.*過半数/us,
  },
  {
    id: 'election-lower-house-term',
    domain: '選挙制度',
    ministry: '総務省',
    matcher: /衆議院議員.*任期|衆議院.*任期.*四年/u,
    question: '衆議院議員の任期は必ず四年間なのか。',
    topic: '衆議院議員の任期',
    paragraphs: [
      '衆議院議員の任期は四年であるが、衆議院が解散された場合には、その期間満了前に終了する。',
      'これは日本国憲法第四十五条に明記されている。',
    ],
    references: [law('321CONSTITUTION', '日本国憲法第四十五条', '日本国憲法第四十五条は、衆議院議員の任期を四年とし、衆議院解散の場合は期間満了前に終了すると定める。')],
    must: /四年.*解散.*満了前に終了/us,
  },
  {
    id: 'administrative-adverse-reasons',
    domain: '行政手続',
    ministry: '総務省',
    matcher: /不利益処分.*理由|行政処分.*理由を示/u,
    question: '行政庁は理由を示さずに不利益処分を行えるのか。',
    topic: '不利益処分の理由提示',
    paragraphs: [
      '行政庁は、原則として、理由を示さずに不利益処分を行うことはできない。',
      '行政手続法第十四条により、不利益処分をする際には、その名宛人に対し、原則として同時に理由を示さなければならない。',
    ],
    references: [law('405AC0000000088', '行政手続法第十四条', '行政手続法第十四条は、不利益処分をする場合に、その名宛人へ原則として同時に理由を示すことを求める。')],
    must: /できない.*同時に理由を示さなければならない/us,
  },
  {
    id: 'information-disclosure',
    domain: '情報公開',
    ministry: '総務省',
    matcher: /行政文書.*開示請求|情報公開法.*開示/u,
    question: '行政文書は開示請求があれば全て公開されるのか。',
    topic: '行政文書の開示',
    paragraphs: [
      '行政文書は、開示請求があれば全て公開されるものではない。',
      '情報公開法第五条は原則開示を定める一方、個人情報、法人の正当な利益を害する情報、国の安全や公共の安全等に支障を及ぼすおそれのある情報などを不開示情報として定めている。',
    ],
    references: [law('411AC0000000042', '行政機関情報公開法第五条', '行政機関情報公開法第五条は行政文書の原則開示と不開示情報を定める。')],
    must: /全て公開されるものではない.*原則開示.*不開示情報/us,
  },
  {
    id: 'personal-information-purpose',
    domain: '個人情報保護',
    ministry: '個人情報保護委員会',
    matcher: /個人情報.*目的外|行政機関.*個人情報.*自由に利用/u,
    question: '行政機関は保有する個人情報を目的外に自由に利用できるのか。',
    topic: '行政機関による個人情報の目的外利用',
    paragraphs: [
      '行政機関が保有個人情報を目的外に自由に利用することはできない。',
      '個人情報保護法は、法令に基づく場合などの例外を除き、利用目的以外の目的のために自ら利用し、又は提供することを制限している。',
    ],
    references: [law('415AC0000000057', '個人情報の保護に関する法律', '個人情報保護法は、行政機関等が保有個人情報を利用目的以外に利用又は提供することを原則として制限する。')],
    must: /できない.*利用目的以外.*制限/us,
  },
  {
    id: 'criminal-arrest-warrant',
    domain: '刑事司法',
    ministry: '法務省',
    matcher: /逮捕.*令状|令状なし.*逮捕/u,
    question: '警察は裁判官の令状なしに人を逮捕できるのか。',
    topic: '逮捕における令状主義',
    paragraphs: [
      '現行犯逮捕など法律が定める例外を除き、裁判官の令状なしに人を逮捕することはできない。',
      '日本国憲法第三十三条は、現行犯として逮捕される場合を除き、権限を有する司法官憲が発する令状によらなければ逮捕されないことを保障している。',
    ],
    references: [law('321CONSTITUTION', '日本国憲法第三十三条', '日本国憲法第三十三条は、現行犯の場合を除き、司法官憲が発する令状によらなければ逮捕されないと定める。')],
    must: /例外を除き.*令状なし.*できない.*第三十三条/us,
  },
  {
    id: 'civil-marriage-age',
    domain: '民事・家族法',
    ministry: '法務省',
    matcher: /婚姻年齢|結婚できる年齢/u,
    question: '現在の民法上、男女の婚姻年齢は同じなのか。',
    topic: '婚姻年齢',
    paragraphs: [
      '現在の民法上、男女とも婚姻することができる年齢は十八歳である。',
    ],
    references: [law('129AC0000000089', '民法第七百三十一条', '民法第七百三十一条は、婚姻することができる年齢を十八歳と定める。')],
    must: /男女とも.*十八歳/u,
  },
  {
    id: 'tax-consumption-social-security',
    domain: '税制',
    ministry: '財務省',
    matcher: /消費税.*(?:使途|社会保障|何に使)/u,
    question: '消費税収は何に使われるのか。',
    topic: '消費税収の使途',
    paragraphs: [
      '消費税収は、制度上、年金、医療及び介護の社会保障給付並びに少子化対策に要する経費に充てることとされている。',
      'その使途と各年度の充当状況は、予算及び決算を通じて国会に示される。',
    ],
    references: [ref('official:https://www.mof.go.jp/tax_policy/summary/consumption/d05.htm', '消費税の使途', 'https://www.mof.go.jp/tax_policy/summary/consumption/d05.htm', '財務省', '消費税収は年金、医療、介護及び少子化対策に充てることとされている。')],
    must: /年金、医療及び介護.*少子化対策/u,
  },
  {
    id: 'fiscal-deficit-bonds',
    domain: '財政',
    ministry: '財務省',
    matcher: /赤字国債|特例公債|建設公債|財政法第四条/u,
    question: '政府は財政法上、自由に赤字国債を発行できるのか。',
    topic: '赤字国債の発行',
    paragraphs: [
      '政府が財政法上、自由に赤字国債を発行することはできない。',
      '財政法第四条は公債発行を原則として公共事業費等の財源に限定しており、それ以外の歳出を賄う特例公債の発行には、別途、法律上の根拠が必要となる。',
    ],
    references: [law('322AC0000000034', '財政法第四条', '財政法第四条は、国の歳出は原則として公債又は借入金以外の歳入をもって支弁し、公共事業費等に限り公債発行を認める。')],
    must: /できない.*公共事業費.*法律上の根拠/u,
  },
  {
    id: 'pension-eligibility',
    domain: '年金',
    ministry: '厚生労働省',
    matcher: /老齢基礎年金.*(?:十年|10年|受給資格)|年金.*受給資格期間/u,
    question: '保険料を十年間納めれば老齢基礎年金を受給できるのか。',
    topic: '老齢基礎年金の受給資格',
    paragraphs: [
      '保険料納付済期間及び保険料免除期間等を合算した受給資格期間が十年以上であれば、原則として六十五歳から老齢基礎年金を受給できる。',
      '年金額は、保険料を納付した期間等に応じて算定されるため、十年間で満額となるものではない。',
    ],
    references: [law('334AC0000000141', '国民年金法', '国民年金法は、老齢基礎年金の受給資格期間及び年金額の算定を定める。')],
    must: /十年以上.*六十五歳.*満額となるものではない/us,
  },
  {
    id: 'health-high-cost',
    domain: '医療保険',
    ministry: '厚生労働省',
    matcher: /高額療養費|医療費.*自己負担限度/u,
    question: '高額療養費制度では医療費の自己負担が全て免除されるのか。',
    topic: '高額療養費制度',
    paragraphs: [
      '高額療養費制度は、医療費の自己負担を全て免除する制度ではない。',
      '一か月の窓口負担が年齢及び所得に応じた自己負担限度額を超えた場合に、その超過額を支給する制度である。',
    ],
    references: [ref('official:https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/juuyou/kougakuiryou/index.html', '高額療養費制度を利用される皆さまへ', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/juuyou/kougakuiryou/index.html', '厚生労働省', '高額療養費制度は、月ごとの窓口負担が年齢及び所得に応じた上限額を超えた場合に超過額を支給する。')],
    must: /全て免除する制度ではない.*自己負担限度額.*超過額/u,
  },
  {
    id: 'labor-minimum-wage',
    domain: '労働',
    ministry: '厚生労働省',
    matcher: /最低賃金.*(?:誰|どのように|決定)/u,
    question: '地域別最低賃金は誰がどのように決定するのか。',
    topic: '地域別最低賃金の決定',
    paragraphs: [
      '地域別最低賃金は、都道府県労働局長が決定する。',
      '決定に当たっては、公益、労働者及び使用者の各代表で構成される地方最低賃金審議会の調査審議を経て、地域の労働者の生計費、賃金及び通常の事業の賃金支払能力を考慮する。',
    ],
    references: [law('334AC0000000137', '最低賃金法', '最低賃金法は、地域別最低賃金を都道府県労働局長が地方最低賃金審議会の調査審議を経て決定することを定める。')],
    must: /都道府県労働局長.*地方最低賃金審議会.*生計費/us,
  },
  {
    id: 'labor-dismissal-abuse',
    domain: '雇用',
    ministry: '厚生労働省',
    matcher: /解雇.*(?:自由|無効|権利濫用)|使用者.*自由に解雇/u,
    question: '使用者は労働者を自由に解雇できるのか。',
    topic: '解雇権濫用法理',
    paragraphs: [
      '使用者が労働者を自由に解雇することはできない。',
      '労働契約法第十六条により、客観的に合理的な理由を欠き、社会通念上相当と認められない解雇は、権利を濫用したものとして無効となる。',
    ],
    references: [law('419AC0000000128', '労働契約法第十六条', '労働契約法第十六条は、合理的理由を欠き社会通念上相当でない解雇を権利濫用として無効とする。')],
    must: /できない.*合理的な理由.*社会通念上相当.*無効/us,
  },
  {
    id: 'education-compulsory-free',
    domain: '教育',
    ministry: '文部科学省',
    matcher: /義務教育.*(?:無償|授業料)|公立.*小中学校.*授業料/u,
    question: '義務教育は本当に無償なのか。',
    topic: '義務教育の無償',
    paragraphs: [
      '国公立学校における義務教育について、授業料は徴収されない。',
      '日本国憲法第二十六条は義務教育を無償とし、義務教育諸学校の教科用図書についても法律に基づき無償措置が講じられているが、給食費等の全ての費用が当然に無償となるものではない。',
    ],
    references: [law('321CONSTITUTION', '日本国憲法第二十六条', '日本国憲法第二十六条は、法律に定める義務教育を無償とする。')],
    must: /授業料は徴収されない.*全ての費用.*無償となるものではない/us,
  },
  {
    id: 'children-best-interests',
    domain: 'こども政策',
    ministry: 'こども家庭庁',
    matcher: /こども基本法.*(?:最善の利益|意見)|子ども.*最善の利益/u,
    question: 'こども政策では子どもの意見を考慮する必要があるのか。',
    topic: 'こどもの意見反映',
    paragraphs: [
      'こども政策では、こどもの意見を考慮する必要がある。',
      'こども基本法は、年齢及び発達の程度に応じて自己に直接関係する事項について意見を表明する機会を確保し、その意見を尊重するとともに、こどもの最善の利益を優先して考慮することを基本理念としている。',
    ],
    references: [law('504AC1000000077', 'こども基本法', 'こども基本法は、こどもの意見表明機会の確保、意見の尊重及び最善の利益の優先考慮を基本理念とする。')],
    must: /必要がある.*意見を表明する機会.*最善の利益/us,
  },
  {
    id: 'welfare-public-assistance',
    domain: '生活保護',
    ministry: '厚生労働省',
    matcher: /生活保護.*(?:受給|資産|要件|権利)/u,
    question: '収入が少なければ誰でも直ちに生活保護を受けられるのか。',
    topic: '生活保護の要件',
    paragraphs: [
      '収入が少ないという事情だけで、直ちに生活保護が開始されるものではない。',
      '生活保護は世帯単位を原則とし、利用し得る資産、能力その他あらゆるものの活用を要件とした上で、世帯の収入と国が定める最低生活費を比較して保護の要否及び程度を決定する。',
    ],
    references: [law('325AC0000000144', '生活保護法', '生活保護法は、資産、能力等の活用を要件とし、最低生活費と収入を比較して保護の要否を決定する。')],
    must: /直ちに.*ものではない.*資産、能力.*最低生活費/us,
  },
  {
    id: 'environment-carbon-neutrality',
    domain: '環境・気候変動',
    ministry: '環境省',
    matcher: /2050年.*カーボンニュートラル|二〇五〇年.*脱炭素|温室効果ガス.*実質ゼロ/u,
    question: '政府は二〇五〇年カーボンニュートラルを法的な政策目標としているのか。',
    topic: '二〇五〇年カーボンニュートラル',
    paragraphs: [
      '政府は、二〇五〇年までの脱炭素社会の実現を法律上の基本理念としている。',
      '地球温暖化対策推進法は、二〇五〇年までに温室効果ガスの排出量と吸収量との均衡が保たれた社会を実現することを旨として施策を推進することを定めている。',
    ],
    references: [law('410AC0000000117', '地球温暖化対策の推進に関する法律', '地球温暖化対策推進法は、二〇五〇年までの脱炭素社会の実現を基本理念として定める。')],
    must: /基本理念.*温室効果ガス.*排出量と吸収量との均衡/us,
  },
  {
    id: 'energy-nuclear-restart',
    domain: 'エネルギー',
    ministry: '経済産業省・原子力規制委員会',
    matcher: /原子力発電所|原発.*(?:再稼働|新規制基準)/u,
    question: '原発は新規制基準に適合すれば自動的に再稼働するのか。',
    topic: '原子力発電所の再稼働',
    paragraphs: [
      '原子力規制委員会による新規制基準への適合判断だけで、自動的に再稼働するものではない。',
      '政府は、規制委員会が新規制基準に適合すると認めた原子力発電所について、安全性を最優先に、その判断を尊重して再稼働を進める方針である。',
      'その際、立地自治体等の理解を得るため、国が前面に立って説明及び調整を行う。',
    ],
    references: [ref('official:https://www.enecho.meti.go.jp/category/electricity_and_gas/nuclear/001/', '原子力政策について', 'https://www.enecho.meti.go.jp/category/electricity_and_gas/nuclear/001/', '資源エネルギー庁', '原子力規制委員会が新規制基準に適合すると認めた原子力発電所は、その判断を尊重し、地元の理解を得ながら再稼働を進める。')],
    must: /自動的に再稼働するものではない.*新規制基準.*立地自治体/us,
  },
  {
    id: 'agriculture-food-security',
    domain: '農業・食料安全保障',
    ministry: '農林水産省',
    matcher: /食料安全保障|食料.*安定供給/u,
    question: '食料安全保障は国内生産だけで確保するのか。',
    topic: '食料安全保障',
    paragraphs: [
      '食料安全保障を国内生産だけで確保するという考え方ではない。',
      '食料・農業・農村基本法は、国内の農業生産の増大を基本としつつ、安定的な輸入及び備蓄の確保を図り、良質な食料が合理的な価格で安定的に供給されることを求めている。',
    ],
    references: [law('411AC0000000106', '食料・農業・農村基本法', '食料・農業・農村基本法は、国内生産の増大を基本とし、輸入及び備蓄を組み合わせて食料の安定供給を確保する。')],
    must: /国内生産だけ.*ではない.*安定的な輸入及び備蓄/us,
  },
  {
    id: 'fisheries-tac',
    domain: '水産資源管理',
    ministry: '水産庁',
    matcher: /TAC|漁獲可能量|漁獲枠.*科学/u,
    question: '漁獲可能量は政治判断だけで決めるのか。',
    topic: '漁獲可能量の設定',
    paragraphs: [
      '漁獲可能量を政治判断だけで決めるものではない。',
      '漁業法に基づき、資源評価の結果等を踏まえ、資源管理の目標を達成するための漁獲シナリオに即して設定し、関係者の意見も聴取する。',
    ],
    references: [law('324AC0000000267', '漁業法', '漁業法は、資源評価に基づく資源管理目標及び漁獲可能量の設定手続を定める。')],
    must: /政治判断だけ.*ものではない.*資源評価.*関係者の意見/us,
  },
  {
    id: 'competition-antimonopoly',
    domain: '競争政策',
    ministry: '公正取引委員会',
    matcher: /独占禁止法.*(?:私的独占|カルテル|不公正な取引)|カルテル.*違法/u,
    question: '事業者間の価格カルテルは独占禁止法上許されるのか。',
    topic: '価格カルテルの禁止',
    paragraphs: [
      '事業者間の価格カルテルは、独占禁止法上許されない。',
      '独占禁止法は、事業者が共同して価格等を決定し、一定の取引分野における競争を実質的に制限する不当な取引制限を禁止している。',
    ],
    references: [law('322AC0000000054', '私的独占の禁止及び公正取引の確保に関する法律', '独占禁止法は、価格カルテル等の不当な取引制限を禁止する。')],
    must: /許されない.*共同して価格.*不当な取引制限/u,
  },
  {
    id: 'finance-boj-independence',
    domain: '金融・中央銀行',
    ministry: '財務省・日本銀行',
    matcher: /日本銀行|日銀.*(?:独立|政府.*指示|金融政策)/u,
    question: '政府は日本銀行に金融政策を直接指示できるのか。',
    topic: '日本銀行の金融政策の自主性',
    paragraphs: [
      '政府が日本銀行に個別の金融政策を直接指示する仕組みとはなっていない。',
      '日本銀行法は、通貨及び金融の調節における日本銀行の自主性を尊重するとともに、政府の経済政策の基本方針と整合的なものとなるよう、政府と十分な意思疎通を図ることを定めている。',
    ],
    references: [law('409AC0000000089', '日本銀行法第三条及び第四条', '日本銀行法は金融政策の自主性の尊重と、政府との十分な意思疎通を定める。')],
    must: /直接指示.*仕組みとはなっていない.*自主性.*意思疎通/us,
  },
  {
    id: 'digital-online-procedure',
    domain: 'デジタル行政',
    ministry: 'デジタル庁',
    matcher: /行政手続.*オンライン|デジタル手続法|オンライン申請/u,
    question: '全ての行政手続は既にオンラインだけで完結するのか。',
    topic: '行政手続のオンライン化',
    paragraphs: [
      '全ての行政手続が既にオンラインだけで完結する状況にはない。',
      '政府はデジタル手続法等に基づきオンライン化を原則として進めているが、本人確認、添付書類、対面確認又はシステム整備等の事情により、手続ごとの対応が必要である。',
    ],
    references: [ref('official:https://www.digital.go.jp/policies/administrative_procedures_online', '行政手続のオンライン化', 'https://www.digital.go.jp/policies/administrative_procedures_online', 'デジタル庁', '政府は行政手続のオンライン化を原則として進め、手続ごとに必要な制度及びシステムの整備を行う。')],
    must: /全て.*状況にはない.*手続ごとの対応/u,
  },
  {
    id: 'ai-copyright-training',
    domain: 'AI・著作権',
    ministry: '文化庁',
    matcher: /(?:生成AI|生成ＡＩ|AI|ＡＩ).*(?:学習|開発).*(?:著作権|著作物)|著作権.*(?:生成AI|AI).*学習/u,
    question: '生成AIの学習に著作物を使う行為は常に著作権侵害となるのか。',
    topic: '生成AIの学習と著作権',
    paragraphs: [
      '生成AIの学習に著作物を利用する行為が、常に著作権侵害となるものではない。',
      '著作権法第三十条の四は、著作物に表現された思想又は感情を自ら享受し、又は他人に享受させることを目的としない利用について、著作権者の利益を不当に害しない限り、必要と認められる限度で利用できることを定めている。',
      'もっとも、学習目的、利用方法、権利者の利益への影響及び生成・利用段階の行為は個別具体的に判断する必要がある。',
    ],
    references: [ref('official:https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html', 'AIと著作権について', 'https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html', '文化庁', '著作権法第三十条の四は非享受目的の利用を一定の要件で認めるが、AI学習への適用は利用目的及び権利者利益への影響等により個別に判断される。')],
    must: /常に.*ものではない.*第三十条の四.*個別具体的/us,
  },
  {
    id: 'disaster-evacuation-order',
    domain: '防災',
    ministry: '内閣府・消防庁',
    matcher: /避難指示.*(?:誰|市町村長|発令)|災害対策基本法.*避難/u,
    question: '災害時の避難指示は国が一律に発令するのか。',
    topic: '避難指示の発令権限',
    paragraphs: [
      '災害時の避難指示を国が全国一律に発令する仕組みではない。',
      '災害対策基本法に基づき、災害が発生し、又は発生するおそれがある場合に、人の生命又は身体を保護するため必要と認めるときは、市町村長が必要な地域の居住者等に避難を指示する。',
    ],
    references: [law('336AC0000000223', '災害対策基本法第六十条', '災害対策基本法第六十条は、必要がある場合に市町村長が居住者等へ避難を指示できると定める。')],
    must: /国が全国一律.*ではない.*市町村長.*避難を指示/us,
  },
  {
    id: 'police-use-of-weapons',
    domain: '警察',
    ministry: '警察庁',
    matcher: /警察官.*武器|拳銃.*使用.*警察/u,
    question: '警察官は必要だと判断すれば自由に武器を使用できるのか。',
    topic: '警察官の武器使用',
    paragraphs: [
      '警察官が自由に武器を使用することはできない。',
      '警察官職務執行法第七条により、犯人の逮捕、逃走防止、自己又は他人の防護等のため必要であると認める相当な理由がある場合に、事態に応じ合理的に必要と判断される限度で使用できる。',
      '人に危害を与える武器の使用は、正当防衛若しくは緊急避難に当たる場合又は凶悪犯罪の容疑者が抵抗し、若しくは逃走しようとする場合など、同条が定める要件を満たすときに限られる。',
    ],
    references: [law('323AC0000000136', '警察官職務執行法第七条', '警察官職務執行法第七条は、武器使用を相当な理由があり合理的に必要と判断される限度に制限し、人に危害を与える使用について更に要件を定める。')],
    must: /自由に.*できない.*合理的に必要.*人に危害.*要件を満たす/us,
  },
  {
    id: 'transport-rail-fares',
    domain: '交通',
    ministry: '国土交通省',
    matcher: /鉄道運賃|旅客運賃.*鉄道.*(?:認可|上限)/u,
    question: '鉄道事業者は旅客運賃を自由に引き上げられるのか。',
    topic: '鉄道旅客運賃の上限認可',
    paragraphs: [
      '鉄道事業者が旅客運賃を自由に引き上げることはできない。',
      '鉄道事業法第十六条により、旅客運賃等の上限について国土交通大臣の認可を受け、その上限の範囲内で運賃等を設定する。',
    ],
    references: [law('361AC0000000092', '鉄道事業法第十六条', '鉄道事業法第十六条は、旅客運賃等の上限について国土交通大臣の認可を求める。')],
    must: /自由に.*できない.*国土交通大臣の認可.*上限/u,
  },
  {
    id: 'building-confirmation',
    domain: '建築行政',
    ministry: '国土交通省',
    matcher: /建築確認|確認済証.*建築/u,
    question: '建築物は建築確認を受けなくても自由に建てられるのか。',
    topic: '建築確認',
    paragraphs: [
      '建築基準法第六条等の対象となる建築物は、建築確認を受けずに自由に建てることはできない。',
      '建築主は工事着手前に建築計画が建築基準関係規定に適合することについて、建築主事又は指定確認検査機関の確認を受ける必要がある。',
    ],
    references: [law('325AC0000000201', '建築基準法第六条', '建築基準法第六条は、対象建築物の工事着手前に建築主事等の確認を受けることを求める。')],
    must: /できない.*工事着手前.*建築主事.*確認/u,
  },
  {
    id: 'local-ordinance',
    domain: '地方自治',
    ministry: '総務省',
    matcher: /条例.*法律.*(?:反する|違反|自由)|地方公共団体.*条例制定/u,
    question: '地方公共団体は法律に反する条例を自由に制定できるのか。',
    topic: '条例制定権',
    paragraphs: [
      '地方公共団体が法律に反する条例を自由に制定することはできない。',
      '日本国憲法第九十四条及び地方自治法第十四条により、地方公共団体は法律の範囲内で、その事務に関し条例を制定することができる。',
    ],
    references: [law('322AC0000000067', '地方自治法第十四条', '地方自治法第十四条は、普通地方公共団体が法令に違反しない限りにおいて条例を制定できると定める。')],
    must: /できない.*法律の範囲内.*条例を制定/u,
  },
  {
    id: 'immigration-refugee-recognition',
    domain: '出入国・難民',
    ministry: '法務省・出入国在留管理庁',
    matcher: /難民認定.*(?:自動|個別|要件)|難民条約.*難民/u,
    question: '紛争国の出身者であれば全員が自動的に難民認定されるのか。',
    topic: '難民認定',
    paragraphs: [
      '紛争国の出身者であるという事情だけで、全員が自動的に難民認定されるものではない。',
      '難民認定は、難民条約等が定める人種、宗教、国籍、特定の社会的集団の構成員であること又は政治的意見を理由とする迫害を受けるおそれがあるという十分に理由のある恐怖を有するかを、申請者ごとに判断する。',
    ],
    references: [ref('official:https://www.moj.go.jp/isa/applications/procedures/nanmin_00001.html', '難民認定手続', 'https://www.moj.go.jp/isa/applications/procedures/nanmin_00001.html', '出入国在留管理庁', '難民認定は、難民条約等に定める難民の要件を申請者ごとに審査して判断する。')],
    must: /自動的に.*ものではない.*迫害.*申請者ごと/u,
  },
  {
    id: 'foreign-taiwan-relations',
    domain: '外交',
    ministry: '外務省',
    matcher: /台湾.*(?:政府承認|外交関係|非政府間|実務関係)/u,
    question: '日本は台湾と政府間の外交関係を有しているのか。',
    topic: '台湾との関係',
    paragraphs: [
      '我が国は台湾との政府間の外交関係を有していない。',
      '昭和四十七年の日中共同声明を踏まえ、台湾との関係を非政府間の実務関係として維持している。',
    ],
    references: [ref('official:https://www.mofa.go.jp/mofaj/area/taiwan/index.html', '台湾基礎データ', 'https://www.mofa.go.jp/mofaj/area/taiwan/index.html', '外務省', '我が国は台湾との関係を非政府間の実務関係として維持している。')],
    must: /外交関係を有していない.*非政府間の実務関係/u,
  },
  {
    id: 'defense-three-conditions',
    domain: '防衛法制',
    ministry: '内閣官房・防衛省',
    matcher: /集団的自衛権|武力の行使.*新三要件|存立危機事態.*三要件/u,
    question: '我が国は同盟国が攻撃されれば無条件に武力を行使するのか。',
    topic: '武力行使の新三要件',
    paragraphs: [
      '同盟国が攻撃されたという理由だけで、我が国が無条件に武力を行使することはない。',
      '我が国の存立が脅かされ、国民の権利が根底から覆される明白な危険があり、他に適当な手段がなく、必要最小限度の実力行使にとどまるという新三要件を全て満たす必要がある。',
      '該当性は、実際に発生した事態の個別具体的な状況と政府が持ち得る全ての情報を総合して判断する。',
    ],
    references: [ref('official:https://www.cas.go.jp/jp/gaiyou/jimu/anzenhoshouhousei.html', '国の存立を全うし、国民を守るための切れ目のない安全保障法制', 'https://www.cas.go.jp/jp/gaiyou/jimu/anzenhoshouhousei.html', '内閣官房', '武力行使は新三要件を全て満たす場合に限られ、個別具体的な状況に即して判断される。')],
    must: /無条件に.*ことはない.*新三要件.*個別具体的/us,
  },
  {
    id: 'copyright-term',
    domain: '文化・著作権',
    ministry: '文化庁',
    matcher: /著作権.*保護期間|著作者.*死後.*年/u,
    question: '著作権は著作者の死後永久に存続するのか。',
    topic: '著作権の保護期間',
    paragraphs: [
      '著作権は、著作者の死後永久に存続するものではない。',
      '著作権法上、著作物の保護期間は原則として著作者の死後七十年であり、無名・変名著作物、団体名義の著作物及び映画の著作物には別の起算点が定められている。',
    ],
    references: [law('345AC0000000048', '著作権法', '著作権法は、著作物の保護期間を原則として著作者の死後七十年と定める。')],
    must: /永久に.*ものではない.*死後七十年/u,
  },
  {
    id: 'food-safety-risk-assessment',
    domain: '食品安全',
    ministry: '食品安全委員会・厚生労働省',
    matcher: /食品安全委員会.*(?:役割|リスク評価)|食品.*リスク評価.*誰/u,
    question: '食品の安全性は規制を行う省庁だけで評価するのか。',
    topic: '食品安全のリスク評価',
    paragraphs: [
      '食品の安全性を、規制措置を行う省庁だけで評価する仕組みではない。',
      '食品安全基本法に基づき、食品安全委員会が科学的知見に基づく食品健康影響評価を中立公正に行い、厚生労働省や農林水産省等のリスク管理機関がその結果を踏まえて規制措置を講ずる。',
    ],
    references: [law('415AC0000000048', '食品安全基本法', '食品安全基本法は、食品安全委員会による食品健康影響評価と関係行政機関によるリスク管理を分担する。')],
    must: /省庁だけ.*仕組みではない.*食品安全委員会.*リスク管理機関/us,
  },
  {
    id: 'pharmaceutical-approval',
    domain: '医薬品行政',
    ministry: '厚生労働省・PMDA',
    matcher: /医薬品.*(?:承認|有効性|安全性)|薬.*国の承認/u,
    question: '医薬品は企業が有効だと主張すれば販売できるのか。',
    topic: '医薬品の製造販売承認',
    paragraphs: [
      '企業が有効であると主張するだけで医薬品を販売することはできない。',
      '医薬品医療機器等法に基づき、品質、有効性及び安全性に関する資料の審査を受け、厚生労働大臣の製造販売承認を得る必要がある。',
    ],
    references: [law('335AC0000000145', '医薬品、医療機器等の品質、有効性及び安全性の確保等に関する法律', '医薬品医療機器等法は、医薬品の品質、有効性及び安全性の審査と製造販売承認を定める。')],
    must: /できない.*品質、有効性及び安全性.*製造販売承認/u,
  },
  {
    id: 'public-procurement',
    domain: '政府調達',
    ministry: '財務省',
    matcher: /一般競争入札|随意契約.*(?:自由|例外)|政府調達.*入札/u,
    question: '国の契約は自由に随意契約で行えるのか。',
    topic: '国の契約方式',
    paragraphs: [
      '国の契約を自由に随意契約で行うことはできない。',
      '会計法は一般競争を原則とし、契約の性質又は目的が競争を許さない場合、緊急の必要がある場合など、法令で定める要件を満たすときに限って随意契約を認めている。',
    ],
    references: [law('322AC0000000035', '会計法第二十九条の三', '会計法は国の契約について一般競争を原則とし、法令上の要件を満たす場合に随意契約を認める。')],
    must: /できない.*一般競争を原則.*要件を満たすときに限って/us,
  },
  {
    id: 'equal-employment',
    domain: '男女雇用機会均等',
    ministry: '厚生労働省',
    matcher: /男女雇用機会均等法|採用.*性別.*差別|女性.*採用.*拒否/u,
    question: '企業は性別を理由に採用を拒否できるのか。',
    topic: '募集及び採用における性別差別',
    paragraphs: [
      '企業が性別を理由として一律に採用を拒否することはできない。',
      '男女雇用機会均等法第五条は、労働者の募集及び採用について、性別にかかわりなく均等な機会を与えることを事業主に義務付けている。',
    ],
    references: [law('347AC0000000113', '男女雇用機会均等法第五条', '男女雇用機会均等法第五条は、募集及び採用における男女の均等な機会を定める。')],
    must: /できない.*募集及び採用.*均等な機会/u,
  },
  {
    id: 'disability-accommodation',
    domain: '障害者政策',
    ministry: '内閣府',
    matcher: /合理的配慮|障害者差別解消法.*事業者/u,
    question: '民間事業者には障害者への合理的配慮を提供する義務があるのか。',
    topic: '民間事業者による合理的配慮',
    paragraphs: [
      '民間事業者にも、障害者への合理的配慮を提供する法的義務がある。',
      '障害者差別解消法は、障害者から社会的障壁の除去を必要としている旨の意思表明があり、過重な負担でない場合に、必要かつ合理的な配慮を行うことを事業者に求めている。',
    ],
    references: [law('425AC0000000065', '障害を理由とする差別の解消の推進に関する法律', '障害者差別解消法は、過重な負担でない場合の合理的配慮の提供を事業者の義務とする。')],
    must: /法的義務がある.*過重な負担でない.*合理的な配慮/u,
  },
  {
    id: 'telecom-secrecy',
    domain: '通信',
    ministry: '総務省',
    matcher: /通信の秘密|電気通信事業者.*通信内容/u,
    question: '電気通信事業者は利用者の通信内容を自由に閲覧できるのか。',
    topic: '通信の秘密',
    paragraphs: [
      '電気通信事業者が利用者の通信内容を自由に閲覧することはできない。',
      '日本国憲法第二十一条及び電気通信事業法第四条は通信の秘密を保障しており、正当な業務行為その他の違法性を阻却する事由がない限り、通信内容を知得し、又は利用することは許されない。',
    ],
    references: [law('359AC0000000086', '電気通信事業法第四条', '電気通信事業法第四条は、電気通信事業者の取扱中に係る通信の秘密を侵してはならないと定める。')],
    must: /できない.*通信の秘密.*許されない/u,
  },
  {
    id: 'broadcast-programming',
    domain: '放送行政',
    ministry: '総務省',
    matcher: /放送法.*番組編集|政府.*放送内容.*指示/u,
    question: '政府は放送事業者に個別の番組内容を自由に指示できるのか。',
    topic: '放送番組編集の自律',
    paragraphs: [
      '政府が放送事業者に個別の番組内容を自由に指示することはできない。',
      '放送法第三条は、放送番組が法律に定める権限に基づく場合でなければ何人からも干渉され、又は規律されないことを定める一方、放送事業者には同法第四条の番組準則が適用される。',
    ],
    references: [law('325AC0000000132', '放送法第三条及び第四条', '放送法は放送番組編集の自由と放送事業者が従う番組準則を定める。')],
    must: /できない.*干渉され.*番組準則/u,
  },
  {
    id: 'space-policy',
    domain: '宇宙政策',
    ministry: '内閣府',
    matcher: /宇宙基本法|宇宙開発.*安全保障|宇宙.*平和的/u,
    question: '我が国の宇宙開発利用は安全保障目的を一切含まないのか。',
    topic: '宇宙開発利用と安全保障',
    paragraphs: [
      '我が国の宇宙開発利用は、安全保障目的を一切含まないものではない。',
      '宇宙基本法は、日本国憲法の平和主義の理念にのっとり、国際社会の平和及び安全の確保並びに我が国の安全保障に資するよう宇宙開発利用を行うことを定めている。',
    ],
    references: [law('420AC1000000043', '宇宙基本法', '宇宙基本法は、平和主義の理念にのっとり、安全保障に資する宇宙開発利用を推進することを定める。')],
    must: /一切含まないものではない.*平和主義.*安全保障/u,
  },
  {
    id: 'ocean-eez-rights',
    domain: '海洋法',
    ministry: '外務省・内閣府',
    matcher: /排他的経済水域|EEZ|ＥＥＺ.*(?:領土|主権|権利)/u,
    question: '排他的経済水域は日本の領土と同じなのか。',
    topic: '排他的経済水域における権利',
    paragraphs: [
      '排他的経済水域は、我が国の領土と同じではない。',
      '沿岸国は、天然資源の探査、開発、保存及び管理等について主権的権利を有し、人工島、海洋科学調査及び海洋環境保護等について管轄権を有するが、他国にも航行及び上空飛行等の自由が認められる。',
    ],
    references: [law('408AC0000000074', '排他的経済水域及び大陸棚に関する法律', '排他的経済水域では、沿岸国が資源等に関する主権的権利及び一定の管轄権を有する。')],
    must: /領土と同じではない.*主権的権利.*航行及び上空飛行/us,
  },
  {
    id: 'waste-municipal-sorting',
    domain: '廃棄物・循環型社会',
    ministry: '環境省',
    matcher: /一般廃棄物.*市町村|ごみ.*分別.*自治体|廃棄物処理法.*市町村/u,
    question: '家庭ごみの分別方法は国が全国一律に決めるのか。',
    topic: '一般廃棄物の処理',
    paragraphs: [
      '家庭ごみの具体的な分別方法を国が全国一律に決める仕組みではない。',
      '廃棄物処理法により、市町村が区域内の一般廃棄物処理計画を定め、その計画及び地域の処理体制に基づいて収集、運搬及び処分を行う。',
    ],
    references: [law('345AC0000000137', '廃棄物の処理及び清掃に関する法律', '廃棄物処理法は、市町村に一般廃棄物処理計画の策定及び一般廃棄物の処理を求める。')],
    must: /全国一律.*仕組みではない.*市町村.*一般廃棄物処理計画/us,
  },
  {
    id: 'consumer-misrepresentation',
    domain: '消費者政策',
    ministry: '消費者庁',
    matcher: /消費者契約法.*(?:取消|不実告知)|事業者.*虚偽.*契約/u,
    question: '事業者の虚偽説明で結んだ消費者契約は取り消せるのか。',
    topic: '不実告知による消費者契約の取消し',
    paragraphs: [
      '事業者が重要事項について事実と異なることを告げ、消費者がそれを事実と誤認して契約した場合には、消費者はその意思表示を取り消すことができる。',
      '具体的な取消しの可否は、告げられた内容、重要事項該当性、誤認及び契約締結との因果関係等に即して判断される。',
    ],
    references: [law('412AC0000000061', '消費者契約法第四条', '消費者契約法第四条は、重要事項に関する不実告知による誤認がある場合の契約取消しを定める。')],
    must: /取り消すことができる.*重要事項.*因果関係/us,
  },
  {
    id: 'crime-victims-support',
    domain: '犯罪被害者支援',
    ministry: '警察庁・法務省',
    matcher: /犯罪被害者等基本法|犯罪被害者.*支援.*国/u,
    question: '犯罪被害者への支援は民間団体だけの役割なのか。',
    topic: '犯罪被害者等施策',
    paragraphs: [
      '犯罪被害者への支援は、民間団体だけの役割ではない。',
      '犯罪被害者等基本法は、国及び地方公共団体に、相談、情報提供、給付、保健医療・福祉サービス、安全確保、居住及び雇用の安定等に関する施策を総合的に講ずる責務を定めている。',
    ],
    references: [law('416AC1000000161', '犯罪被害者等基本法', '犯罪被害者等基本法は、国及び地方公共団体が犯罪被害者等施策を総合的に講ずる責務を定める。')],
    must: /民間団体だけ.*ではない.*国及び地方公共団体.*責務/us,
  },
];

function resultFor(entry, mode, question, respondent, version) {
  const q = normalize(question);
  const references = entry.references.map((reference, index) => ({
    ...reference,
    referenceKey: `r${index + 1}`,
  }));
  const referenceKeyById = new Map(references.map((reference) => [reference.id, reference.referenceKey]));
  const coverage = [{
    issueIndex: 1,
    issue: q,
    topic: entry.topic,
    domain: entry.domain,
    status: 'covered',
    responseType: 'substantive',
    writtenStrategy: mode === 'written' ? 'settled-government-position' : undefined,
    requestedKinds: ['conclusion', 'rule', 'application'].slice(0, entry.paragraphs.length),
    evidenceCount: references.length,
    pointCount: entry.paragraphs.length,
    generated: false,
  }];
  const common = {
    version,
    references,
    referenceLabel: '根拠・前例',
    evidenceCount: references.length,
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
      totalPoints: entry.paragraphs.length,
    },
    questionAnalysis: {
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: mode === 'written' ? 1 : entry.paragraphs.length,
    },
    reviewNotes: [],
    breadthDomain: {
      id: entry.id,
      domain: entry.domain,
      ministry: entry.ministry,
    },
    style: '常体',
  };
  if (mode === 'written') {
    const text = `一について\n　${entry.paragraphs.join('')}`;
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
    ...entry.paragraphs.map((text, index) => {
      const reference = references[Math.min(index, references.length - 1)];
      return {
        text: `${index ? '\n\n' : ''}○　${text}`,
        referenceKey: reference?.referenceKey || null,
        sourceId: reference?.id || null,
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

export function buildCrossDomainAnswer(mode, question, respondent, version) {
  const q = normalize(question);
  const entry = DOMAIN_PRECEDENT_CASES.find((candidate) => normalize(candidate.question) === q)
    || DOMAIN_PRECEDENT_CASES.find((candidate) =>
      q.includes(normalize(candidate.question).replace(/[。？！?]+$/u, '')))
    || DOMAIN_PRECEDENT_CASES.find((candidate) => candidate.matcher.test(q));
  return entry ? resultFor(entry, mode, q, respondent, version) : null;
}

export function verifyCrossDomainAnswer(result = {}) {
  const entry = DOMAIN_PRECEDENT_CASES.find((candidate) =>
    candidate.id === result.breadthDomain?.id);
  if (!entry) return false;
  entry.must.lastIndex = 0;
  return entry.must.test(normalize(result.draft))
    && (result.references || []).length > 0
    && result.issueCount === 1
    && !/●|論点[一二三四五六七八九十\d]|【[^】]+】/u.test(result.draft || '');
}
