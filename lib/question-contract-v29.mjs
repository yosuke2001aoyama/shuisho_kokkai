const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const compact = (value = '') => normalize(value)
  .replace(/[\s　、。！？?「」『』（）()・]/gu, '');

const bodyOf = (segment = {}) => normalize(segment.text || '')
  .replace(/^＜[^＞]+＞\s*/u, '')
  .replace(/^(?:○|●)\s*/u, '')
  .replace(/^(?:[一二三四五六七八九十百]+(?:から[一二三四五六七八九十百]+まで|及び[一二三四五六七八九十百]+)?について)\s*/u, '')
  .trim();

const articleNumber = (question = '') => normalize(question)
  .match(/第\s*([0-9一二三四五六七八九十百千]+)\s*条/u)?.[1] || '';

const QUESTION_TARGETS = [
  ['米国', /米国|アメリカ/u],
  ['中国', /中国|中華人民共和国/u],
  ['北朝鮮', /北朝鮮/u],
  ['韓国', /韓国|大韓民国/u],
  ['ロシア', /ロシア/u],
  ['ウクライナ', /ウクライナ/u],
  ['台湾', /台湾/u],
  ['イラン', /イラン/u],
  ['イスラエル', /イスラエル/u],
  ['パレスチナ', /パレスチナ/u],
];

function targetsOf(question = '') {
  return QUESTION_TARGETS
    .filter(([, matcher]) => matcher.test(question))
    .map(([target]) => target);
}

function instrumentOf(question = '') {
  const q = normalize(question);
  const known = [
    /日米(?:安全保障|安保)条約/u,
    /日本国憲法/u,
    /憲法/u,
    /[一-龠々ぁ-んァ-ヶーA-Za-z0-9・]{2,32}(?:基本法|特別措置法|措置法|契約法|事業法|業法|法|条約|条例|規則|政令)/u,
  ];
  for (const pattern of known) {
    const match = q.match(pattern)?.[0];
    if (match) {
      const suffix = '(?:基本法|特別措置法|措置法|契約法|事業法|業法|法律|法|条約|条例|規則|政令)';
      const parts = match
        .split(/に対して|について|に関して|への|における|[はがをで]/u)
        .filter(Boolean);
      const narrowed = [...parts].reverse().find((part) =>
        new RegExp(`${suffix}$`, 'u').test(part));
      return narrowed || match;
    }
  }
  return '';
}

function subjectOf(question = '', instrument = '') {
  const q = normalize(question)
    .replace(instrument, ' ')
    .replace(/第\s*[0-9一二三四五六七八九十百千]+\s*条/gu, ' ')
    .replace(/(?:は|が)?(?:適用|該当|対象|違反|合法|適法|認められ|許され|できる|必要).*/u, '')
    .replace(/^(?:政府は|我が国は|一般に)/u, '')
    .replace(/(?:に対して|について|に関して|の場合|には)[\s　]*$/u, '')
    .replace(/(?:については|に関しては|に対しては|としては|には|では|とは|は|が|を|に|で|と|上)[\s　]*$/u, '')
    .replace(/[\s　、。]+/gu, ' ')
    .replace(/(?:については|に関しては|に対しては|としては|には|では|とは|は|が|を|に|で|と|上)[\s　]*$/u, '')
    .trim();
  return q.length >= 2 && q.length <= 48 ? q : '';
}

export function analyzeQuestionContract(question = '') {
  const q = normalize(question);
  const instrument = instrumentOf(q);
  const article = articleNumber(q);
  const requiredTargets = targetsOf(q);
  const accusatoryEvaluation = /弱腰|及び腰|言いなり|従属|追随|迎合|宥和|甘すぎ|無策|放置|責任放棄|場当たり|失敗|不十分/u.test(q);
  // 「どう対処するのか」「どう向き合うのか」は、個別措置だけでなく、
  // 基本姿勢・判断軸・具体的対応を求める広い政策質問として扱う。
  // 一方、「どう対応するのか」まで一律に三段落へ広げると、既に十分な
  // 個別答弁を水増ししてしまうため、通常の措置問（二要素）にとどめる。
  const broadMeasures = /(?:政権|日本政府として|我が国として|外交|関係全体|全般|総合的)[^。！？?]{0,80}(?:どう|どのように)(?:[^。！？?]{0,30})?(?:対処|向き合)/u.test(q);
  let type = 'recognition';
  if (/(?:適用|該当|対象とな|対象で|違反|適法|合法|許され|認められ).*(?:のか|か。|か$)/u.test(q)
    && (instrument || article)) {
    type = 'legal-applicability';
  } else if (/とは何か|定義|意味するところ/u.test(q)) {
    type = 'definition';
  } else if (/誰が|どの機関|権限|所管|決定するのか/u.test(q)) {
    type = 'authority';
  } else if (/何人|何件|いくら|割合|率は|総額|件数|人数/u.test(q)) {
    type = 'quantity';
  } else if (/いつ|時期|期限|何年|見通し|予定いかん|日程いかん|時期いかん|(?:訪問|訪米|会談|開催|開始|完了|帰国).*(?:予定|日程)/u.test(q)) {
    type = 'timeline';
  } else if (/なぜ|理由|根拠|原因|理由いかん|根拠いかん/u.test(q)) {
    type = 'reason';
  } else if (/どう(?:対処|対応|向き合|進め|実現|解決|是正)|どのように.*(?:対処|対応|向き合|進め|実現|解決|是正)/u.test(q)) {
    type = 'measures';
  } else if (/評価|妥当|適切|責任|ではないか|ないのか|見解いかん|認識いかん|評価いかん/u.test(q)) {
    type = 'evaluation';
  } else if (/どのように|具体的な対応|対策|措置|支援策|取組/u.test(q)) {
    type = 'measures';
  } else if (/(?:のか|か。|か$)/u.test(q)) {
    type = 'yes-no';
  }
  const subject = subjectOf(q, instrument);
  const requiresTargetCoverage = requiredTargets.length >= 2
    && (
      accusatoryEvaluation
      || /いずれ(?:に|も)|それぞれ(?:に|の)|各国(?:に|への)|各国それぞれ/u.test(q)
    );
  const ordinaryMinimum = broadMeasures
    ? 3
    : type === 'legal-applicability'
      || type === 'measures'
      || (type === 'evaluation' && accusatoryEvaluation)
      ? 2
      : 1;
  return {
    type,
    subject,
    instrument,
    article,
    requiredTargets,
    requiresTargetCoverage,
    requiresConclusion: ['legal-applicability', 'yes-no', 'evaluation', 'timeline', 'measures'].includes(type),
    requiresRule: type === 'legal-applicability',
    requiresApplication: type === 'legal-applicability',
    minimumPoints: requiresTargetCoverage
      ? Math.max(ordinaryMinimum, requiredTargets.length + 1)
      : ordinaryMinimum,
  };
}

const includesAny = (text = '', terms = []) => terms.some((term) => term && text.includes(term));

function instrumentTerms(contract) {
  const terms = [];
  if (contract.instrument) terms.push(contract.instrument);
  if (/日米(?:安全保障|安保)条約/u.test(contract.instrument)) {
    terms.push('日米安全保障条約', '日米安保条約');
  }
  if (contract.article) terms.push(`第${contract.article}条`, `第 ${contract.article} 条`);
  return terms;
}

function directConclusion(contract, first = '') {
  if (!first) return false;
  if (contract.type === 'legal-applicability') {
    return /適用される|適用されない|適用の対象となる|適用の対象とはならない|該当する|該当しない|対象となる|対象とはならない|違反する|違反しない|適法である|違法である|許される|許されない|認められる|認められない|違反するか否かについて[^。]*(?:評価|判断)[^。]*(?:示していない|行っていない)|確定的な(?:法的)?評価[^。]*(?:示していない|控える)|断定的に(?:評価|判断)[^。]*できない/u.test(first);
  }
  if (contract.type === 'yes-no') {
    return /である|ではない|する|しない|している|していない|される|されない|できる|できない|有している|有していない|必要である|必要はない|当たらない|認められる|認められない|ものではない/u.test(first);
  }
  if (contract.type === 'evaluation') {
    if (/関係法令及び個別具体的な状況に即して、政府として適切に判断する/u.test(first)) {
      return false;
    }
    return /御指摘は当たらない|そのような指摘は当たらない|政府の認識とは異なる|そのようには認識していない|そのように考えていない|結論を出していない|決定していない|お答えすることは困難である|一概にお答えすることは困難である|適切ではな(?:い|く)|妥当ではない|問題がある|責任がある|責任はない|極めて遺憾|断じて容認できない|認められない|受け入れ(?:られない|ることはできない)|暴挙である|重要である|必要である|仕組みではない|ものではない/u.test(first);
  }
  if (contract.type === 'timeline') {
    return /(?:令和|平成|昭和)?[0-9一二三四五六七八九十百]+年|[0-9一二三四五六七八九十百]+月[0-9一二三四五六七八九十百]+日|現時点で[^。]*(?:具体的な日程|時期|予定|見通し)[^。]*(?:決まっていない|確定していない|申し上げることは困難)|具体的な(?:日程|時期|予定)[^。]*(?:決まっていない|確定していない)|確たることを申し上げることは困難/u.test(first);
  }
  if (contract.type === 'measures') {
    if (/認識/u.test(contract.subject)
      && /認識している|重要である|必要である|影響を及ぼ/u.test(first)) {
      return true;
    }
    return !/^(?:さらに|また|その上で|一方)[、，]/u.test(first)
      && /政府としては|我が国は|政府は|方針|対応する|対処する|進める|取り組む|実施する|講じる|検討する/u.test(first);
  }
  if (contract.type === 'authority') {
    return /が決定する|が行う|権限を有する|所管する/u.test(first);
  }
  if (contract.type === 'quantity') {
    return /[0-9一二三四五六七八九十百千万億兆]+(?:人|件|円|割|パーセント|％|年|月|日)/u.test(first)
      || /把握していない|集計していない/u.test(first);
  }
  return true;
}

function evidenceAlignment(contract, references = [], result = {}) {
  const defensive = (result.coverage || []).some((item) =>
    item.responseType === 'qualified'
    || ['ambiguity', 'hypothetical', 'outside-scope', 'security', 'enumerative', 'no-evidence']
      .includes(item.writtenStrategy));
  if (defensive) return true;
  if (contract.type === 'evaluation' || contract.type === 'timeline') {
    return references.length > 0;
  }
  if (contract.type !== 'legal-applicability') return true;
  const canonical = (value = '') => normalize(value)
    .replace(/侵攻|侵略/gu, '攻撃')
    .replace(/軍事行動/gu, '攻撃');
  const subject = compact(canonical(contract.subject));
  const subjectTerms = [
    subject,
    ...canonical(contract.subject)
      .split(/に対する|に対して|について|に関する|による|によって|の/u)
      .map(compact),
    ...(canonical(contract.subject).match(/米国|アメリカ|イスラエル|イラン|ロシア|中国|台湾|日本|攻撃|空爆/gu) || []),
  ].filter((term) => term.length >= 2);
  const instruments = instrumentTerms(contract);
  return references.some((reference) => {
    const text = canonical(`${reference.title || ''} ${reference.phrase || ''}`);
    const subjectCovered = !subject || subjectTerms.some((term) => compact(text).includes(term));
    const instrumentCovered = !instruments.length || includesAny(text, instruments);
    const predicateCovered = /適用|該当|対象|違反|適法|違法|禁止|許され|認められ|法的評価/u.test(text);
    return subjectCovered && instrumentCovered && predicateCovered;
  });
}

export function evaluateQuestionContract(result, question = '') {
  const contract = analyzeQuestionContract(question);
  const rawBodies = (result.segments || []).filter((segment) => segment.responseType).map(bodyOf).filter(Boolean);
  const written = /答弁書/u.test(result.title || '');
  const bodies = written
    ? rawBodies
      .join('')
      .replace(/^(?:[一二三四五六七八九十百]+(?:から[一二三四五六七八九十百]+まで|及び[一二三四五六七八九十百]+)?について)\s*/u, '')
      .match(/[^。！？]+[。！？]/gu) || rawBodies
    : rawBodies;
  const combined = bodies.join('');
  const first = bodies[0] || '';
  const conclusion = directConclusion(contract, first);
  const rule = !contract.requiresRule
    || /規定|要件|場合|限り|基づき|施政|条文|法律上|条約上|対象|禁止/u.test(combined);
  const canonicalSubject = normalize(contract.subject)
    .replace(/侵攻|侵略|軍事行動/gu, '攻撃')
    .replace(/(?:については|に関しては|に対しては|としては|には|では|とは|は|が|を|に|で|と)$/u, '');
  const canonicalCombined = normalize(combined)
    .replace(/侵攻|侵略|軍事行動/gu, '攻撃');
  const subjectTokens = [
    canonicalSubject,
    ...canonicalSubject.split(/に対する|に対して|について|に関する|による|によって|の/u),
    ...(canonicalSubject.match(/米国|アメリカ|イスラエル|イラン|ロシア|中国|台湾|日本|攻撃|空爆|価格カルテル|事業者/u) || []),
  ].map(compact).filter((term) => term.length >= 2);
  const subjectApplied = !contract.subject
    || compact(canonicalCombined).includes(compact(canonicalSubject))
    || subjectTokens.some((term) => compact(canonicalCombined).includes(term));
  const application = !contract.requiresApplication
    || (
      subjectApplied
      && /したがって|このため|ことから|であり|であるため|ためである|適用|禁止|許され/u.test(combined)
    );
  const evidence = evidenceAlignment(contract, result.references || [], result);
  const points = bodies.length || 1;
  const pointSufficiency = points >= contract.minimumPoints;
  const targetCoverage = !contract.requiresTargetCoverage
    || contract.requiredTargets.every((target) => canonicalCombined.includes(target));
  const checks = {
    conclusion,
    rule,
    application,
    evidence,
    pointSufficiency,
    targetCoverage,
  };
  return {
    ...contract,
    actualPoints: points,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
