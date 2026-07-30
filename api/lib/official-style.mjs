import { finalizeStyle, hasPoliteEnding } from './style.mjs';

export const OFFICIAL_STYLE_VERSION = '2026-07-30';

export const OFFICIAL_STYLE_SOURCES = [
  {
    title: '公用文作成の考え方（令和4年1月7日文化審議会建議）',
    sourceName: '文化庁',
    url: 'https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/93650001_01.html',
  },
  {
    title: '「公用文作成の考え方」の周知について（令和4年1月11日内閣文第1号）',
    sourceName: '内閣官房・文化庁',
    url: 'https://www.bunka.go.jp/koho_hodo_oshirase/hodohappyo/93651302.html',
  },
  {
    title: '質問主意書答弁書の実例（意味・趣旨が不明確な場合）',
    sourceName: '参議院',
    url: 'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/219/touh/t219059.htm',
  },
  {
    title: '質問主意書答弁書の実例（把握する立場・個別事案）',
    sourceName: '参議院',
    url: 'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/213/touh/t213103.htm',
  },
  {
    title: '質問主意書（制度・作成・答弁までの流れ）',
    sourceName: '参議院',
    url: 'https://www.sangiin.go.jp/japanese/aramashi/keyword/situmon.html',
  },
  {
    title: '存立危機事態に関する質問に対する答弁書',
    sourceName: '衆議院',
    url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b219071.htm',
  },
  {
    title: '国会答弁が完成するまで',
    sourceName: '日本経済研究センター',
    url: 'https://www.jcer.or.jp/j-column/column-komine/20191016-4.html',
  },
  {
    title: '国会答弁対応業務の高度化と効率化に向けた中央省庁とのプロトタイピングプログラム',
    sourceName: 'Amazon Web Services',
    url: 'https://aws.amazon.com/jp/blogs/news/prototyping-program-with-central-government-agencies-for-diet-response-operations/',
  },
];

export const OFFICIAL_USAGE = [
  { category: '口頭答弁', expression: '○（白丸）段落', use: '同一論点の答弁を、結論、判断基準、政府の立場等の読みやすい段落に分ける。', avoid: '答弁が長いだけで「論点一」「論点二」等の新たな論点を作ること。', example: '○　台湾海峡の平和と安定は、我が国の安全保障はもとより、国際社会全体の安定にとっても重要である。' },
  { category: '口頭答弁', expression: '質問への直接応答', use: '質問者が求めた認識、理由、具体策、見通し等だけを、質問順に答える。', avoid: '聞かれていない評価、理由、施策又は将来方針を追加すること。', example: '認識を問われた場合は認識を先に述べ、具体策は求められたときだけ加える。' },
  { category: '口頭答弁', expression: '一般論として申し上げれば', use: '個別事案への断定を避けつつ、政府の確立した判断基準を示す。', avoid: '客観的事実を確認できる質問への答弁を一般論だけにすり替えること。', example: '一般論として申し上げれば、事態の個別具体的な状況に即して判断する。' },
  { category: '照応', expression: 'お尋ねの「…」', use: '質問者が定義又は回答を求めている語句・事項を受ける。', avoid: '質問者の主張や評価を受ける場合に用いない。', example: 'お尋ねの「対象事業」の具体的に意味するところが必ずしも明らかではない。' },
  { category: '照応', expression: '御指摘の「…」', use: '質問文に記載された主張、評価、引用又は前提を受ける。', avoid: '純粋な疑問文そのものを受ける場合は「お尋ね」を用いる。', example: '御指摘の「著しい遅延」の意味するところが必ずしも明らかではない。' },
  { category: '照応', expression: '前段／後段のお尋ね', use: '一つの項目に複数の問いがある場合に対応関係を明示する。', avoid: '対応する問いが一つしかない場合。', example: '前段のお尋ねについては、政府として把握していない。' },
  { category: '照応', expression: '当該／同法／同条／同項', use: '既出の対象又は法令を反復せず、指示対象を一義的に示す。', avoid: '指示対象が複数あり曖昧になる場合。', example: '同法第二条第四項に規定する行政文書をいう。以下同じ。' },
  { category: '留保', expression: '具体的に意味するところが必ずしも明らかではない', use: '質問文の用語、範囲又は前提が一義的でない場合。', avoid: '通常の用語で意味が明白な場合に機械的に付すこと。', example: 'お尋ねの「実質的な関与」の具体的に意味するところが必ずしも明らかではないが、…' },
  { category: '留保', expression: 'お尋ねの趣旨が必ずしも明らかではない', use: '問いの目的又は求める回答の射程が判別できない場合。', avoid: '語句だけが曖昧な場合は、当該語句を引用して限定する。', example: 'お尋ねの趣旨が必ずしも明らかではないため、お答えすることは困難である。' },
  { category: '留保', expression: '一概にお答えすることは困難である', use: '個別具体的事情に左右され、一般化できない場合。', avoid: '客観的事実や確定した政府方針を問われている場合。', example: '個別具体的な状況に即して判断されるものであり、一概にお答えすることは困難である。' },
  { category: '留保', expression: '政府として把握する立場にない', use: '私人、報道機関、独立機関等の個別活動で、政府の所掌・把握対象でない場合。', avoid: '政府が保有する行政文書又は所管統計で確認可能な場合。', example: '個別具体的な取材活動の内容について、政府として把握する立場にない。' },
  { category: '留保', expression: 'お答えすることは差し控えたい', use: '捜査、外交交渉、安全保障上の具体情報等、回答しない政策的理由がある場合。', avoid: '単に調査不足又は回答作業が煩雑である場合。', example: '捜査の内容に関わる事柄であることから、お答えすることは差し控えたい。' },
  { category: '留保', expression: '現時点において考えていない', use: '制度改正、措置又は申合せ等の予定を否定する場合。', avoid: '将来にわたり永久に否定する趣旨に読まれ得る断定。', example: '現時点において、御指摘のような制度を設けることは考えていない。' },
  { category: '留保', expression: 'いずれにせよ', use: '留保を置いた後、政府の一般的立場又は既定方針を示す。', avoid: '前後の論理関係がないまま話題を転換すること。', example: 'いずれにせよ、政府としては、必要な施策を着実に実施する。' },
  { category: '接続', expression: '及び', use: '同じ階層の語句を併合し、通常は最後の二項を結ぶ。', avoid: '異なる階層を一つの「及び」で連結すること。', example: '国民の生命、身体及び財産' },
  { category: '接続', expression: '並びに', use: '「及び」で結ばれた群より上位の階層を併合する。', avoid: '単純な二項列挙に多用すること。', example: '国及び地方公共団体並びに関係機関' },
  { category: '接続', expression: '又は', use: '選択肢の主要な階層を結ぶ。', avoid: 'ひらがなの「または」を公文書本文で混在させること。', example: '書面又は電磁的方法' },
  { category: '接続', expression: '若しくは', use: '「又は」で結ばれる選択肢の内部にある下位階層を結ぶ。', avoid: '階層のない単純な二者択一。', example: '本人若しくは代理人又はこれらの者の使用人' },
  { category: '助詞', expression: 'について／に関し', use: '「について」は論題を示し、「に関し」は対象との関係を簡潔に示す。', avoid: '一文中で「について」を重ね、係り先を不明確にすること。', example: '本件については、関係法令に照らして判断する。' },
  { category: '助詞', expression: 'において／における', use: '場所、場面、組織又は制度上の範囲を示す。後者は連体修飾。', avoid: '単純な動作主体を示すために用いること。', example: '関係府省において検討する。／国会における答弁' },
  { category: '助詞', expression: 'により／による', use: '法的根拠、原因、手段又は方式を示す。後者は連体修飾。', avoid: '主体を明示すべき場面で原因・手段と混同すること。', example: '同法の規定により処理する。／政令による指定' },
  { category: '助詞', expression: 'に基づき', use: '法令、計画、決定又は客観的根拠を直接の根拠として示す。', avoid: '単なる参考事情に用いること。', example: '基本方針に基づき、必要な措置を講ずる。' },
  { category: '助詞', expression: 'を踏まえ', use: '複数の事情を考慮材料として受ける。', avoid: '法的拘束力のある根拠を示す場合は「に基づき」を用いる。', example: '諸般の情勢を踏まえ、適切に判断する。' },
  { category: '助詞', expression: 'に即して', use: '個別事情又は具体的状況に適合して判断することを示す。', avoid: '抽象的な方針の根拠を示す場合。', example: '個別具体的な状況に即して判断する。' },
  { category: '助詞', expression: 'に照らして', use: '法令、事実又は基準と対照して評価する。', avoid: '単なる背景事情に用いること。', example: '歴史的事実及び国際法に照らして判断する。' },
  { category: '定義', expression: '（…をいう。以下同じ。）', use: '長い用語又は法令上の概念を初出時に定義し、以後の反復を避ける。', avoid: '一度しか用いない語の不要な定義。', example: '行政文書（公文書等の管理に関する法律第二条第四項に規定する行政文書をいう。以下同じ。）' },
  { category: '構成', expression: '一について／一及び二について／一から三までについて', use: '質問項目との対応を見出しで明示する。', avoid: '複数項目をまとめる合理性がないのに一括すること。', example: '一から三までについて\n　お尋ねの…' },
  { category: '文体', expression: 'である調', use: '答弁書本文は常体を基本とし、文末及び語調を統一する。', avoid: '「です・ます」と「である」の混在、口語的な相づち、議場固有の呼び掛け。', example: '政府としては、引き続き必要な取組を進める。' },
  { category: '文体', expression: '一文一義・照応の明示', use: '主語、述語及び修飾関係を明確にし、長文は項目又は文に分ける。', avoid: '「これ」「それ」が複数の対象を指し得る文。', example: '前段のお尋ねについては、…。後段のお尋ねについては、…。' },
];

const QUOTE_RE = /「([^」]{2,80})」/gu;
const AMBIGUOUS = /意味|趣旨|定義|範囲|実質的|十分|適切|妥当|著しい|重大|本質的|真の|明確な基準|どの程度|どこまで/u;
const HYPOTHETICAL = /仮に|仮定|想定|可能性|将来|見込み|場合には|なった場合|するとすれば/u;
const OUTSIDE_SCOPE = /個人|私人|民間|報道機関|取材|捜査|個別の事件|企業の判断|政党|議員個人|地方公共団体の判断/u;
const EVALUATIVE = /評価|責任|妥当|適切|十分|問題ではないか|是非|正しい|誤り|失敗|成功/u;
const ENUMERATIVE = /全て|一切|一覧|網羅|全件|詳細な経緯|逐一|件数を示/u;

const firstQuotedTerm = (label = '') => {
  const match = [...String(label).matchAll(QUOTE_RE)][0];
  return match?.[1]?.trim() || '';
};

export function classifyWrittenStrategy(issue, candidates = []) {
  const label = String(issue?.label || '');
  if (candidates.some((x) => x.sourceType === 'written')) return 'precedent';
  if (HYPOTHETICAL.test(label)) return 'hypothetical';
  if (OUTSIDE_SCOPE.test(label)) return 'outside-scope';
  if (AMBIGUOUS.test(label) || firstQuotedTerm(label)) return 'ambiguity';
  if (EVALUATIVE.test(label)) return 'evaluation';
  if (ENUMERATIVE.test(label)) return 'enumerative';
  if (!candidates.length) return 'no-evidence';
  return 'qualified-policy';
}

function defensiveLead(issue, strategy, hasEvidence) {
  const term = firstQuotedTerm(issue?.label || '');
  const terminal = (s) => hasEvidence ? `${s}が、いずれにせよ、` : `${s}ため、お答えすることは困難である。`;
  if (strategy === 'ambiguity') {
    return terminal(term
      ? `お尋ねの「${term}」の具体的に意味するところが必ずしも明らかではない`
      : 'お尋ねの趣旨が必ずしも明らかではない');
  }
  if (strategy === 'hypothetical') {
    return hasEvidence
      ? 'お尋ねは仮定を前提とするものであり、一概にお答えすることは困難であるが、いずれにせよ、'
      : 'お尋ねは仮定を前提とするものであり、個別具体的な状況に即して判断されるべきものであることから、一概にお答えすることは困難である。';
  }
  if (strategy === 'outside-scope') {
    return hasEvidence
      ? 'お尋ねは個別具体的な事実関係に関するものであり、政府として把握する立場にないが、いずれにせよ、'
      : 'お尋ねは個別具体的な事実関係に関するものであり、政府として把握する立場にないため、お答えすることは困難である。';
  }
  if (strategy === 'evaluation') {
    return hasEvidence
      ? 'お尋ねの評価については、その前提及び評価基準が必ずしも明らかではなく、一概にお答えすることは困難であるが、いずれにせよ、'
      : 'お尋ねの評価については、その前提及び評価基準が必ずしも明らかではないため、一概にお答えすることは困難である。';
  }
  if (strategy === 'enumerative') {
    return hasEvidence
      ? 'お尋ねについて網羅的にお答えすることは困難であるが、確認できる範囲では、'
      : 'お尋ねについて網羅的にお答えすることは困難である。';
  }
  if (strategy === 'no-evidence') {
    return 'お尋ねの趣旨及び前提となる事実関係が必ずしも明らかではないため、お答えすることは困難である。';
  }
  return '';
}

const normalizeOfficialPunctuation = (text = '') => String(text)
  .replace(/\(/g, '（').replace(/\)/g, '）')
  .replace(/\[/g, '［').replace(/\]/g, '］')
  .replace(/,/g, '、')
  .replace(/\s+([、。])/g, '$1')
  .replace(/([、。])\s+/g, '$1');

export function formatWrittenStyle(input = '') {
  let s = finalizeStyle(String(input))
    .replace(/^問\s*/u, '')
    .replace(/^(?:委員|議員)(?:御)?指摘の(?:ように[、，]?)?/u, '')
    .replace(/おっしゃる/u, '御指摘の')
    .replace(/おっしゃった/u, '御指摘の')
    .replace(/および/gu, '及び')
    .replace(/ならびに/gu, '並びに')
    .replace(/または/gu, '又は')
    .replace(/もしくは/gu, '若しくは')
    .replace(/AI/gu, 'ＡＩ')
    .replace(/SNS/gu, 'ＳＮＳ')
    .replace(/DX/gu, 'ＤＸ')
    .replace(/GX/gu, 'ＧＸ')
    .replace(/\bNHK\b/gu, 'ＮＨＫ')
    .replace(/ということなんだ/gu, 'ということである')
    .replace(/だと思う/gu, 'と考える')
    .replace(/だと考える/gu, 'と考える')
    .replace(/今お話があったように[、，]?/gu, '')
    .replace(/先ほど(?:も)?(?:申し上げた|述べた)(?:ように)?[、，]?/gu, '')
    .trim();
  s = normalizeOfficialPunctuation(s);
  if (s && !/[。！？]$/u.test(s)) s += '。';
  return s;
}

export function composeWrittenAnswer(issue, evidenceText = '', strategy = 'qualified-policy') {
  const evidence = formatWrittenStyle(evidenceText);
  if (strategy === 'precedent') return evidence;
  if (strategy === 'qualified-policy') return evidence || defensiveLead(issue, 'no-evidence', false);
  const lead = defensiveLead(issue, strategy, Boolean(evidence));
  if (!evidence) return formatWrittenStyle(lead);
  const body = evidence.replace(/^いずれにせよ[、，]?/u, '');
  return formatWrittenStyle(`${lead}${body}`);
}

export function lintOfficialText(input = '') {
  const text = String(input);
  const violations = [];
  const warnings = [];
  const add = (code, message, sample = '') => violations.push({ code, message, sample });
  if (hasPoliteEnding(text)) add('mixed-polite-style', '答弁書本文に敬体の文末が残っている。');
  if (/[()\[\]]/u.test(text)) add('ascii-brackets', '公用文本文に半角括弧が残っている。');
  if (/および|ならびに|または|もしくは/u.test(text)) add('hiragana-conjunction', '法令・公用文用の接続語は「及び」「並びに」「又は」「若しくは」に統一する。');
  if (/おっしゃ|なんです|ですけれども|というふうに/u.test(text)) add('colloquial', '議場口語又は会話表現が残っている。');
  if (/御指摘のとおり/u.test(text)) warnings.push({ code: 'unqualified-agreement', message: '質問者の前提を無条件に受け入れていないか確認する。' });
  if (/お尋ねの「」/u.test(text)) add('empty-reference', '「お尋ねの」の引用対象が空である。');
  if (/が、\s*。/u.test(text) || /であり、\s*$/u.test(text)) add('incomplete-clause', '文が従属節のまま終わっている。');
  if (/これ|それ/u.test(text) && !/これら|それぞれ/u.test(text)) warnings.push({ code: 'demonstrative', message: '指示語の指示対象が一義的か確認する。' });
  if (/一概にお答えすることは困難である/u.test(text) && !/個別具体的|前提|評価基準|状況|事情|範囲/u.test(text)) {
    warnings.push({ code: 'unsupported-evasion', message: '「一概にお答えすることは困難である」の理由を直前に明示する。' });
  }
  return { passed: violations.length === 0, version: OFFICIAL_STYLE_VERSION, violations, warnings };
}

export function getOfficialStyleGuide() {
  return {
    version: OFFICIAL_STYLE_VERSION,
    title: '質問主意書答弁書・公用文用例集',
    principles: [
      '質問項目との対応関係を明示し、各問いに直接応答する。',
      '同一の法的・政策的主題は一つの論点として扱い、答弁が長い場合は白丸の段落を追加する。',
      '独立した主題が複数ある場合だけ項目を分け、質問にない論点又は答弁要素を追加しない。',
      '意味又は趣旨が不明確な場合は、曖昧な語句を特定した上で回答範囲を限定する。',
      '留保又は答弁困難の理由を明示し、可能な場合は「いずれにせよ」に続けて政府の一般的立場を示す。',
      '常体、用字、括弧、接続語及び法令引用を統一し、議場口語を残さない。',
      '「御指摘」と「お尋ね」、「に基づき」と「を踏まえ」等を意味に応じて使い分ける。',
    ],
    entries: OFFICIAL_USAGE,
    sources: OFFICIAL_STYLE_SOURCES,
  };
}
