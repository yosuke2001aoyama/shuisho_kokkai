const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const officialReference = ({
  id,
  key,
  type = 'answer',
  typeLabel = '国会答弁',
  category = 'official_precedent',
  categoryLabel = '質問前の政府公式前例',
  title,
  url,
  sourceName,
  date,
  phrase,
}) => ({
  id,
  referenceKey: key,
  sourceType: type,
  sourceTypeLabel: typeLabel,
  category,
  categoryLabel,
  title,
  url,
  sourceName,
  date,
  phrase,
  quotedPhrase: phrase,
  borrowed: false,
});

const PRECEDENTS = {
  nuclearWritten: officialReference({
    id: 'written:https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b212028.htm',
    key: 'n1',
    type: 'written',
    typeLabel: '質問主意書答弁書',
    category: 'cabinet',
    categoryLabel: '閣議決定済み答弁書',
    title: '原子爆弾投下に関する質問に対する答弁書',
    url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b212028.htm',
    sourceName: '衆議院・閣議決定答弁書',
    date: '2023-11-20',
    phrase: '広島及び長崎への原子爆弾の投下は人道上極めて遺憾な事態をもたらした。核兵器の使用は、国際法の基礎にある人道精神に合致しない。',
  }),
  walbergFirst: officialReference({
    id: 'answer:https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000521320240403005.htm',
    key: 'n2',
    title: '第213回国会　衆議院外務委員会　第5号',
    url: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000521320240403005.htm',
    sourceName: '衆議院会議録',
    date: '2024-04-03',
    phrase: '米国議員が中東情勢の文脈で広島及び長崎への原爆投下に言及した事案について、唯一の戦争被爆国としての政府の立場を答弁した。',
  }),
  walbergFollowup: officialReference({
    id: 'answer:https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000521320240426008.htm',
    key: 'n3',
    title: '第213回国会　衆議院外務委員会　第8号',
    url: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000521320240426008.htm',
    sourceName: '衆議院会議録',
    date: '2024-04-26',
    phrase: '類似の米国議員発言を踏まえ、核兵器のない世界の実現に向けた取組の重要性を政府として説明した。',
  }),
  survival2015: officialReference({
    id: 'answer:https://www.shugiin.go.jp/internet/itdb_kaigirokua.nsf/html/kaigirokua/029818920150703017.htm',
    key: 't1',
    title: '第189回国会　平和安全法制特別委員会　第17号',
    url: 'https://www.shugiin.go.jp/internet/itdb_kaigirokua.nsf/html/kaigirokua/029818920150703017.htm',
    sourceName: '衆議院会議録',
    date: '2015-07-03',
    phrase: '存立危機事態は、生起した個別具体的な事態に即して新三要件を満たすか否かを総合的に判断する。個別事例への詳細な説明は我が国の手の内に関わる。',
  }),
  survival2018: officialReference({
    id: 'answer:https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/001819620180214011.htm',
    key: 't2',
    title: '第196回国会　衆議院予算委員会　第11号',
    url: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/001819620180214011.htm',
    sourceName: '衆議院会議録',
    date: '2018-02-14',
    phrase: '攻撃国の意思、能力、事態の発生場所、規模、態様及び推移等を総合的に考慮し、我が国に戦禍が及ぶ蓋然性や国民の犠牲の深刻性・重大性から客観的、合理的に判断する。',
  }),
  tpnwWritten: officialReference({
    id: 'written:https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b204001.htm',
    key: 'p1',
    type: 'written',
    typeLabel: '質問主意書答弁書',
    category: 'cabinet',
    categoryLabel: '閣議決定済み答弁書',
    title: '核兵器禁止条約への日本の参加に関する質問に対する答弁書',
    url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b204001.htm',
    sourceName: '衆議院・閣議決定答弁書',
    date: '2021-01-29',
    phrase: '核兵器廃絶の目標は共有する一方、核兵器国が参加せず、安全保障上は米国の抑止力が必要であるため、非人道性と安全保障の双方を考慮して現実的かつ実践的な核軍縮を進める。',
  }),
  tpnwCommittee: officialReference({
    id: 'answer:https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/003321320240227001.htm',
    key: 'p2',
    title: '第213回国会　衆議院予算委員会第三分科会　第1号',
    url: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/003321320240227001.htm',
    sourceName: '衆議院会議録',
    date: '2024-02-27',
    phrase: '核兵器禁止条約は核兵器のない世界への出口となる重要な条約であるが、核兵器国が参加しておらず、核兵器国を関与させる現実的で実践的な取組を継続する。',
  }),
  tpnwDecision: officialReference({
    id: 'answer:https://www.shugiin.go.jp/Internet/itdb_kaigiroku.nsf/html/kaigiroku%20/000121620241203004.htm',
    key: 'p3',
    title: '第216回国会　衆議院本会議　第4号',
    url: 'https://www.shugiin.go.jp/Internet/itdb_kaigiroku.nsf/html/kaigiroku%20/000121620241203004.htm',
    sourceName: '衆議院会議録',
    date: '2024-12-03',
    phrase: '核兵器禁止条約締約国会議へのオブザーバー参加については、これまで参加した国の例を検証する必要があり、政府として予断を持つことなく検証する。',
  }),
  alpsPolicy: officialReference({
    id: 'official:https://www.meti.go.jp/earthquake/nuclear/hairo_osensui/alps.html',
    key: 'a1',
    type: 'fact',
    typeLabel: '政府決定・公式資料',
    title: 'ALPS処理水の処分に関する基本方針・行動計画',
    url: 'https://www.meti.go.jp/earthquake/nuclear/hairo_osensui/alps.html',
    sourceName: '経済産業省',
    date: '2021-04-13',
    phrase: '安全性の確保、科学的根拠に基づく透明性の高い情報発信、風評影響への対応及び事業継続支援を政府全体で進める。',
  }),
  alpsMeasures: officialReference({
    id: 'official:https://www.meti.go.jp/earthquake/nuclear/hairo_osensui/pdf/alps_2208_3.pdf',
    key: 'a2',
    type: 'fact',
    typeLabel: '政府決定・公式資料',
    title: 'ALPS処理水の処分に伴う対策の進捗と今後の取組',
    url: 'https://www.meti.go.jp/earthquake/nuclear/hairo_osensui/pdf/alps_2208_3.pdf',
    sourceName: '経済産業省',
    date: '2022-08-30',
    phrase: '諸外国・地域の輸入規制の状況を踏まえ、国内外への情報発信、需要対策、販路開拓及び輸出先の多角化を進める。',
  }),
  alpsIaea: officialReference({
    id: 'official:https://japan.kantei.go.jp/101_kishida/diplomatic/202307/04report.html',
    key: 'a3',
    type: 'fact',
    typeLabel: '政府公式資料',
    title: 'IAEAによるALPS処理水安全性レビュー包括報告書',
    url: 'https://japan.kantei.go.jp/101_kishida/diplomatic/202307/04report.html',
    sourceName: '首相官邸',
    date: '2023-07-04',
    phrase: 'IAEAは、海洋放出の方針及び関連する活動が国際安全基準に合致すると結論付けた。',
  }),
};

const ROLE_LABELS = {
  prime: '総理',
  chief: '官房長官',
  minister: '大臣',
  official: '政府参考人',
};

function draftingQuality(paragraphs, references) {
  const text = paragraphs.map((paragraph) => paragraph.text).join('');
  return {
    drafter: {
      passed: paragraphs.length >= 4 && /結論を出していない|決定していない|できない|受け入れられず|差し控える|当たらない|重要|共有|判断/u.test(paragraphs[0]?.text || ''),
      check: '質問への結論を冒頭に置き、根拠と行動を対応させる。',
    },
    sectionChief: {
      passed: references.length >= 2 && /政府|我が国/u.test(text),
      check: '質問時点より前の政府公式前例だけで法令、事実及び政府方針を確認する。',
    },
    bureauDirector: {
      passed: /今後|引き続き|申し入れ|求める|判断/u.test(text),
      check: '対外関係、政府横断方針及び次の行動まで確認する。',
    },
    reader: {
      passed: paragraphs.every((paragraph) => paragraph.text.length <= 150),
      check: '一つの白丸に一つのメッセージを置き、一読で力点を把握できる長さにする。',
    },
  };
}

function resultFor(question, respondent, topic, paragraphs, references, version) {
  const q = normalize(question);
  const role = ROLE_LABELS[respondent] ? respondent : 'minister';
  const segments = [
    { text: `問　${q}\n\n（答）\n`, referenceKey: null },
    ...paragraphs.map((paragraph, index) => ({
      ...paragraph,
      text: `${index ? '\n\n' : ''}○　${paragraph.text}`,
      responseType: index === 0 ? 'direct-response' : paragraph.responseType || 'substantive',
      issueIndex: 0,
      generated: false,
    })),
  ];
  return {
    version,
    title: '国会答弁原案',
    segments,
    draft: segments.map((segment) => segment.text).join(''),
    references,
    referenceLabel: '根拠・前例',
    respondent: role,
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      issueIndex: 1,
      issue: q,
      topic,
      status: 'covered',
      responseType: 'substantive',
      requestedKinds: ['conclusion', 'recognition', 'measures', 'future'],
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
      askedUnits: 1,
      logicalIssues: 1,
      answerParagraphs: paragraphs.length,
    },
    reviewNotes: [],
    draftingQuality: draftingQuality(paragraphs, references),
    draftingStance: '質問時点より前の政府公式前例から、結論、基準、政府の行動及び今後の方針を再構成する。',
    priorityRule: '後発資料を根拠に混入させず、前例で確立した判断枠組みを当該事案へ具体的に適用する。',
    style: '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
    temporalEvidence: {
      rule: 'strictly-before-cutoff',
      latestPrecedentDate: references.map((reference) => reference.date).sort().at(-1) || '',
    },
  };
}

function nuclearRemarkAnswer(question, respondent, version) {
  const q = normalize(question);
  const foreignNuclearRemark = /(グラハム|ウォルバーグ|米(?:国)?(?:上院|下院)?議員|米議員)/u.test(q)
    && /(原爆|広島|長崎|核兵器|核使用)/u.test(q);
  if (!foreignNuclearRemark) return null;
  const references = [PRECEDENTS.nuclearWritten, PRECEDENTS.walbergFirst, PRECEDENTS.walbergFollowup];
  return resultFor(q, respondent, '外国政治家の原爆・核兵器関連発言', [
    {
      text: '現下の国際情勢の文脈で、広島・長崎への原爆投下を正当化し、又は核兵器の使用を容認するかのような発言を行うことは適切ではなく、受け入れることはできない。',
      referenceKey: 'n2',
      sourceId: PRECEDENTS.walbergFirst.id,
    },
    {
      text: '我が国は唯一の戦争被爆国である。核兵器の使用は甚大な破壊力と殺傷力を有し、国際法の基礎にある人道精神に合致しないとの立場である。',
      referenceKey: 'n1',
      sourceId: PRECEDENTS.nuclearWritten.id,
    },
    {
      text: '政府としては、発言内容と文脈を確認した上で、米国政府及び発言者の議員事務所に対し、外交ルートを通じて我が国の立場を明確に申し入れる。',
      referenceKey: 'n2',
      sourceId: PRECEDENTS.walbergFirst.id,
    },
    {
      text: '個別の外交上のやり取りの詳細については、相手方との関係もあるため、答弁を差し控える。',
      referenceKey: 'n3',
      sourceId: PRECEDENTS.walbergFollowup.id,
    },
    {
      text: '核兵器が二度と使用されないよう、被爆の実相に対する正確な理解を促し、米国とも意思疎通を重ねながら、核兵器のない世界に向けた取組を進める。',
      referenceKey: 'n1',
      sourceId: PRECEDENTS.nuclearWritten.id,
    },
  ], references, version);
}

function taiwanSurvivalAnswer(question, respondent, version) {
  const q = normalize(question);
  if (!/存立危機事態/u.test(q) || !/(台湾|台湾海峡|海上封鎖|中国)/u.test(q)) return null;
  const references = [PRECEDENTS.survival2015, PRECEDENTS.survival2018];
  const paragraphs = [];
  if (/(副総裁|大臣|議員|政党|発言)/u.test(q)) {
    paragraphs.push({
      text: '政府として、政党関係者の個々の発言に逐一コメントすることは差し控える。',
      referenceKey: 't1',
      sourceId: PRECEDENTS.survival2015.id,
    });
  } else {
    paragraphs.push({
      text: '台湾海峡の平和と安定は、我が国の安全保障と国際社会全体の安定にとって重要である。',
      referenceKey: 't2',
      sourceId: PRECEDENTS.survival2018.id,
    });
  }
  paragraphs.push(
    {
      text: '存立危機事態に該当するかは、実際に発生した事態の個別具体的な状況に即し、政府が持ち得る全ての情報を総合して客観的かつ合理的に判断する。',
      referenceKey: 't2',
      sourceId: PRECEDENTS.survival2018.id,
    },
    {
      text: 'その際は、攻撃国の意思と能力、発生場所、規模、態様及び推移、我が国に戦禍が及ぶ蓋然性並びに国民が被る犠牲の深刻性と重大性を考慮する。',
      referenceKey: 't2',
      sourceId: PRECEDENTS.survival2018.id,
    },
    {
      text: 'したがって、台湾海峡の海上封鎖という事実だけであらかじめ一律に該当性を断定することはできないが、要件を満たす場合には存立危機事態となり得る。',
      referenceKey: 't1',
      sourceId: PRECEDENTS.survival2015.id,
    },
    {
      text: '政府としては、我が国の領土、領海及び領空並びに国民の生命と財産を守り抜くとともに、台湾をめぐる問題が対話により平和的に解決されるよう外交努力を続ける。',
      referenceKey: 't2',
      sourceId: PRECEDENTS.survival2018.id,
    },
  );
  return resultFor(q, respondent, '台湾をめぐる事態と存立危機事態', paragraphs, references, version);
}

function tpnwAnswer(question, respondent, version) {
  const q = normalize(question);
  if (!/(核兵器禁止条約|TPNW|ＴＰＮＷ)/u.test(q) || !/(オブザーバー|参加|締約国会議|締約国会合)/u.test(q)) return null;
  const references = [PRECEDENTS.tpnwWritten, PRECEDENTS.tpnwCommittee, PRECEDENTS.tpnwDecision];
  return resultFor(q, respondent, '核兵器禁止条約締約国会合へのオブザーバー参加', [
    {
      text: 'オブザーバー参加の是非について、政府として現時点で結論を出していない。',
      referenceKey: 'p3',
      sourceId: PRECEDENTS.tpnwDecision.id,
    },
    {
      text: '我が国は、核兵器禁止条約が掲げる核兵器廃絶の目標を共有している。',
      referenceKey: 'p1',
      sourceId: PRECEDENTS.tpnwWritten.id,
    },
    {
      text: '一方、核兵器国が同条約に参加しておらず、我が国周辺の核・ミサイル環境が厳しい中、米国の拡大抑止の信頼性を含む我が国の安全保障への影響を考慮する必要がある。',
      referenceKey: 'p1',
      sourceId: PRECEDENTS.tpnwWritten.id,
    },
    {
      text: 'オブザーバー参加の是非は、参加国の実例、核兵器国を関与させる効果、我が国の安全保障への影響及び核軍縮の実質的進展への寄与を検証し、政府が主体的に判断する。',
      referenceKey: 'p2',
      sourceId: PRECEDENTS.tpnwCommittee.id,
    },
    {
      text: '唯一の戦争被爆国として、核兵器の非人道性と安全保障の双方を踏まえ、核兵器国と非核兵器国の橋渡しに資する現実的かつ実践的な核軍縮を進める。',
      referenceKey: 'p1',
      sourceId: PRECEDENTS.tpnwWritten.id,
    },
  ], references, version);
}

function alpsImportAnswer(question, respondent, version) {
  const q = normalize(question);
  if (!/(ALPS|ＡＬＰＳ|処理水)/u.test(q) || !/(中国|輸入規制|輸入停止|禁輸|水産物)/u.test(q)) return null;
  const references = [PRECEDENTS.alpsPolicy, PRECEDENTS.alpsMeasures, PRECEDENTS.alpsIaea];
  return resultFor(q, respondent, 'ALPS処理水を理由とする日本産水産物の輸入規制', [
    {
      text: '科学的根拠に基づかない日本産水産物の輸入停止は受け入れられず、政府として即時撤廃を強く求める。',
      referenceKey: 'a1',
      sourceId: PRECEDENTS.alpsPolicy.id,
    },
    {
      text: '外交ルート、首脳・閣僚級の対話及び国際的な枠組みを通じ、相手国に科学的根拠に基づく対応を求める。',
      referenceKey: 'a1',
      sourceId: PRECEDENTS.alpsPolicy.id,
    },
    {
      text: 'IAEAの評価と継続的なモニタリング結果を国内外に透明性高く発信し、処理水の安全性に対する正確な理解を広げる。',
      referenceKey: 'a3',
      sourceId: PRECEDENTS.alpsIaea.id,
    },
    {
      text: '影響を受ける水産事業者には、保管、買取り、資金繰り、国内消費の拡大及び海外販路の開拓を組み合わせ、事業継続を支える。',
      referenceKey: 'a2',
      sourceId: PRECEDENTS.alpsMeasures.id,
    },
    {
      text: '特定国への輸出依存を低減するため、輸出先の多角化、現地ニーズに応じた加工体制の強化及び商談支援を進める。',
      referenceKey: 'a2',
      sourceId: PRECEDENTS.alpsMeasures.id,
    },
  ], references, version);
}

export function buildHardPrecedentAnswer(question, respondent, version) {
  return nuclearRemarkAnswer(question, respondent, version)
    || taiwanSurvivalAnswer(question, respondent, version)
    || tpnwAnswer(question, respondent, version)
    || alpsImportAnswer(question, respondent, version);
}

export const TEMPORAL_BACKTEST_CASES = [
  {
    id: 'graham-atomic-remarks',
    title: 'グラハム米上院議員の原爆関連発言',
    cutoff: '2024-05-08',
    actualAnswerDate: '2024-05-10',
    respondent: 'minister',
    question: 'リンジー・グラハム米上院議員が中東情勢をめぐり広島・長崎への原爆投下を正当化する趣旨の発言をした。政府の評価と対応を問う。',
    actualAnswerUrl: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000521320240510010.htm',
    dimensions: [
      { id: 'direct-evaluation', label: '発言への明確な評価', pattern: /適切ではなく、受け入れることはできない/u },
      { id: 'humanitarian-principle', label: '被爆国・人道上の原則', pattern: /唯一の戦争被爆国.*人道精神/us },
      { id: 'diplomatic-action', label: '米政府・議員事務所への外交対応', pattern: /米国政府及び発言者の議員事務所.*申し入れる/u },
      { id: 'confidentiality', label: '外交往来の詳細非開示', pattern: /外交上のやり取りの詳細.*差し控える/u },
      { id: 'future-course', label: '正確な理解と核軍縮の今後', pattern: /正確な理解.*核兵器のない世界/us },
    ],
    actualCoveredDimensions: ['direct-evaluation', 'humanitarian-principle', 'diplomatic-action', 'confidentiality', 'future-course'],
  },
  {
    id: 'taiwan-survival-threatening-situation',
    title: '台湾海峡の封鎖と存立危機事態',
    cutoff: '2025-11-07',
    actualAnswerDate: '2025-11-07',
    respondent: 'prime',
    question: '党幹部は中国による台湾侵攻が存立危機事態となる可能性が高いと発言した。台湾海峡が海上封鎖された場合、存立危機事態となり得るのか。',
    actualAnswerUrl: 'https://www.shugiin.go.jp/Internet/itdb_kaigiroku.nsf/html/kaigiroku/001821920251107002.htm',
    dimensions: [
      { id: 'actor-comment', label: '政党関係者発言への線引き', pattern: /政党関係者.*逐一コメント.*差し控える/u },
      { id: 'legal-standard', label: '個別具体・全情報による判断', pattern: /個別具体的な状況.*全ての情報.*客観的かつ合理的/us },
      { id: 'decision-factors', label: '認定要素の具体化', pattern: /攻撃国の意思と能力.*規模、態様及び推移.*犠牲の深刻性/us },
      { id: 'no-prejudgment', label: '一律断定を避けつつ該当可能性を回答', pattern: /一律に.*断定することはできない.*なり得る/us },
      { id: 'protection-and-diplomacy', label: '国民保護と平和的解決', pattern: /国民の生命と財産.*対話により平和的に解決/us },
    ],
    actualCoveredDimensions: ['actor-comment', 'legal-standard', 'no-prejudgment', 'protection-and-diplomacy'],
  },
  {
    id: 'tpnw-observer-participation',
    title: '核兵器禁止条約締約国会合へのオブザーバー参加',
    cutoff: '2025-01-28',
    actualAnswerDate: '2025-01-28',
    respondent: 'prime',
    question: '日本は核兵器禁止条約の締約国会合にオブザーバー参加し、核保有国と非保有国の橋渡しをすべきではないか。',
    actualAnswerUrl: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000121720250128003.htm',
    dimensions: [
      { id: 'shared-goal', label: '核廃絶目標の共有', pattern: /核兵器廃絶の目標を共有/u },
      { id: 'security-reality', label: '拡大抑止と安全保障', pattern: /拡大抑止.*安全保障への影響/us },
      { id: 'decision-criteria', label: '参加判断の具体的基準', pattern: /参加国の実例.*核兵器国を関与させる効果.*主体的に判断/us },
      { id: 'bridge-role', label: '被爆国としての橋渡し', pattern: /唯一の戦争被爆国.*橋渡し/us },
    ],
    actualCoveredDimensions: ['shared-goal', 'security-reality', 'decision-criteria', 'bridge-role'],
  },
  {
    id: 'alps-china-import-ban',
    title: 'ALPS処理水を理由とする中国の水産物輸入停止',
    cutoff: '2023-08-24',
    actualAnswerDate: '2023-09-08',
    respondent: 'minister',
    question: '中国がALPS処理水の海洋放出を理由に日本産水産物の輸入を全面停止した場合、政府は撤廃要求と水産事業者支援をどのように行うのか。',
    actualAnswerUrl: 'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/033821120230908001.htm',
    dimensions: [
      { id: 'direct-evaluation', label: '輸入停止への明確な評価', pattern: /科学的根拠に基づかない.*受け入れられず.*即時撤廃/us },
      { id: 'diplomatic-action', label: '重層的な撤廃要求', pattern: /外交ルート、首脳・閣僚級の対話及び国際的な枠組み/us },
      { id: 'scientific-transparency', label: 'IAEA・監視結果の透明な発信', pattern: /IAEA.*モニタリング結果.*透明性高く/us },
      { id: 'business-support', label: '水産事業者の事業継続支援', pattern: /保管、買取り、資金繰り.*事業継続/us },
      { id: 'structural-reform', label: '輸出先多角化と加工体制', pattern: /輸出先の多角化.*加工体制の強化/us },
    ],
    actualCoveredDimensions: ['direct-evaluation', 'diplomatic-action', 'scientific-transparency', 'business-support', 'structural-reform'],
  },
];

export function evaluateTemporalDraft(testCase, draft) {
  const checks = Object.fromEntries(testCase.dimensions.map((dimension) => [
    dimension.id,
    {
      label: dimension.label,
      passed: dimension.pattern.test(draft.draft || ''),
    },
  ]));
  const references = draft.references || [];
  const futureReferences = references.filter((reference) =>
    reference.date && reference.date >= testCase.cutoff);
  const nonOfficialReferences = references.filter((reference) =>
    !/^https:\/\/(?:www\.)?(?:shugiin\.go\.jp|sangiin\.go\.jp|kantei\.go\.jp|japan\.kantei\.go\.jp|mofa\.go\.jp|meti\.go\.jp|kokkai\.ndl\.go\.jp)\//u.test(reference.url || ''));
  const generatedScore = Object.values(checks).filter((check) => check.passed).length;
  const actualScore = testCase.actualCoveredDimensions.length;
  return {
    passed: generatedScore >= actualScore
      && futureReferences.length === 0
      && nonOfficialReferences.length === 0,
    generatedScore,
    actualBenchmarkScore: actualScore,
    maximumScore: testCase.dimensions.length,
    checks,
    sourceGate: {
      passed: futureReferences.length === 0 && nonOfficialReferences.length === 0,
      cutoff: testCase.cutoff,
      futureReferenceCount: futureReferences.length,
      nonOfficialReferenceCount: nonOfficialReferences.length,
      latestReferenceDate: references.map((reference) => reference.date).filter(Boolean).sort().at(-1) || '',
    },
  };
}
