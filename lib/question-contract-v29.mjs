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
      const parts = match.split(/[はがをで]/u).filter(Boolean);
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
    .replace(/[はがをにでと上\s　]+$/u, '')
    .replace(/[\s　、。]+/gu, ' ')
    .trim();
  return q.length >= 2 && q.length <= 48 ? q : '';
}

export function analyzeQuestionContract(question = '') {
  const q = normalize(question);
  const instrument = instrumentOf(q);
  const article = articleNumber(q);
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
  } else if (/いつ|時期|期限|何年|見通し/u.test(q)) {
    type = 'timeline';
  } else if (/なぜ|理由|根拠|原因/u.test(q)) {
    type = 'reason';
  } else if (/どのように|具体的な対応|対策|措置|支援策|取組/u.test(q)) {
    type = 'measures';
  } else if (/評価|妥当|適切|責任|ではないか|ないのか/u.test(q)) {
    type = 'evaluation';
  } else if (/(?:のか|か。|か$)/u.test(q)) {
    type = 'yes-no';
  }
  const subject = subjectOf(q, instrument);
  return {
    type,
    subject,
    instrument,
    article,
    requiresConclusion: ['legal-applicability', 'yes-no', 'evaluation', 'timeline'].includes(type),
    requiresRule: type === 'legal-applicability',
    requiresApplication: type === 'legal-applicability',
    minimumPoints: type === 'legal-applicability' ? 2 : 1,
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
    return /適用される|適用されない|適用の対象となる|適用の対象とはならない|該当する|該当しない|対象となる|対象とはならない|違反する|違反しない|適法である|違法である|許される|許されない|認められる|認められない/u.test(first);
  }
  if (contract.type === 'yes-no') {
    return /である|ではない|する|しない|している|していない|される|されない|できる|できない|有している|有していない|必要である|必要はない|当たらない|認められる|認められない|ものではない/u.test(first);
  }
  if (contract.type === 'timeline') {
    return /時期|期限|現時点|見通し|確たる|予定/u.test(first);
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

function evidenceAlignment(contract, references = []) {
  if (contract.type !== 'legal-applicability') return true;
  const subject = compact(contract.subject);
  const subjectTerms = [
    subject,
    ...normalize(contract.subject).split(/に対する|に対して|について|に関する|の/u).map(compact),
  ].filter((term) => term.length >= 3);
  const instruments = instrumentTerms(contract);
  return references.some((reference) => {
    const text = normalize(`${reference.title || ''} ${reference.phrase || ''}`);
    const subjectCovered = !subject || subjectTerms.some((term) => compact(text).includes(term));
    const instrumentCovered = !instruments.length || includesAny(text, instruments);
    const predicateCovered = /適用|該当|対象|違反|適法|違法|禁止|許され|認められ/u.test(text);
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
  const application = !contract.requiresApplication
    || (
      (!contract.subject || compact(combined).includes(compact(contract.subject)))
      && /したがって|このため|ことから|であり|であるため|適用|禁止|許され/u.test(combined)
    );
  const evidence = evidenceAlignment(contract, result.references || []);
  const points = bodies.length || 1;
  const pointSufficiency = points >= contract.minimumPoints;
  const checks = { conclusion, rule, application, evidence, pointSufficiency };
  return {
    ...contract,
    actualPoints: points,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
