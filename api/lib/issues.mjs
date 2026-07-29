import { CONCEPTS, clean } from './core.mjs';

const SYNONYMS = new Map([
  ['アメリカ', ['米国', '日米', '同盟']],
  ['米国', ['アメリカ', '日米', '同盟']],
  ['言いなり', ['主体的', '自主的', '国益', '従属']],
  ['物価高', ['物価上昇', 'インフレ', '価格高騰', '賃金']],
  ['少子化対策', ['少子化', '子育て', 'こども政策', '出生率']],
  ['少子化', ['少子化対策', '子育て', 'こども政策', '出生率']],
  ['台湾海峡', ['台湾', '両岸関係']],
  ['生成AI', ['生成型AI', '人工知能', 'AI']],
  ['著作権', ['著作物', '権利者', '著作権法']],
  ['防衛費', ['防衛力', '安全保障']],
  ['核兵器', ['核軍縮', '不拡散']],
  ['拉致', ['拉致被害者', '帰国', '日朝']],
  ['気候変動', ['脱炭素', '温室効果ガス']],
  ['原発', ['原子力発電所', 'エネルギー']],
  ['尖閣', ['尖閣諸島']],
  ['北方領土', ['北方四島']],
  ['暗号資産', ['仮想通貨', '金融商品取引法']],
]);

const CONCEPT_REQUIRED = {
  'us-autonomy': [['日米同盟', '米国', 'アメリカ', '日米']],
  senkaku: [['尖閣諸島', '尖閣']],
  takeshima: [['竹島']],
  'northern-territories': [['北方領土', '北方四島']],
  abduction: [['拉致', '拉致被害者']],
  'nuclear-disarmament': [['核兵器', '核軍縮', '核不拡散', '不拡散']],
};

const STOP = new Set([
  '政府', '我が国', '日本', '見解', '認識', '基本的な認識', '基本姿勢', '姿勢', '質問', '答弁',
  '考え', '対応', '取組', '取り組み', '方針', '政策', '課題', '問題', '説明', '評価', '現状', '今後',
  '問う', '伺う', '示す', '明らかにする', 'どのように', 'なぜ', 'いかん', '必要性', '在り方',
]);

const normalize = (s = '') => clean(String(s).normalize('NFKC'));

export function topicFromQuestion(input = '') {
  let s = normalize(input)
    .replace(/^(?:問\s*)?(?:[一二三四五六七八九十]+|\d+)[　\s、．.]*/, '')
    .replace(/[。?？]+$/, '')
    .replace(/(?:について|に関して)?(?:政府|我が国)?(?:の)?(?:見解|認識|考え|対応|方針|評価|説明)(?:を)?(?:問う|伺う|求める|示されたい|明らかにされたい|説明されたい)$/u, '')
    .replace(/(?:について|に関して)(?:問う|伺う|説明を求める)$/u, '')
    .replace(/をどのように(?:強化|実施|推進|実現|確保|改善|解決|検討|対応)するのか$/u, '')
    .replace(/を(?:強化|実施|推進|実現|確保|改善|解決|検討|対応)するのか$/u, '')
    .replace(/はどのように(?:ある|なる|する)べきか$/u, '')
    .replace(/は(?:妥当|適切|必要|十分)なのか$/u, '')
    .replace(/について$/u, '')
    .trim();
  return s || normalize(input);
}

const variants = (term) => {
  const t = normalize(term);
  const out = new Set([t]);
  for (const [key, values] of SYNONYMS) {
    if (t.includes(key) || key.includes(t)) values.forEach((x) => out.add(x));
  }
  if (t.endsWith('対策') && t.length > 2) out.add(t.slice(0, -2));
  if (t.endsWith('問題') && t.length > 2) out.add(t.slice(0, -2));
  return [...out].filter((x) => x.length >= 2);
};

const relationTerms = (topic) => {
  const m = topic.match(/^(.+?)と(.+?)(?:との)?(?:関係|関連|両立|整合性)$/u);
  if (!m) return null;
  return [m[1], m[2]].map((x) => x.replace(/^(?:政府|我が国)の/u, '').trim()).filter(Boolean);
};

const subjectTerms = (topic) => {
  const relation = relationTerms(topic);
  if (relation) return relation;
  const cleanTopic = topic
    .replace(/^(?:政府|我が国)の/u, '')
    .replace(/に対する(?:政府の)?(?:対応|認識|見解)$/u, '')
    .replace(/(?:への|に対する)(?:政府の)?(?:対応|対策)$/u, '')
    .trim();
  const parts = cleanTopic
    .split(/、|,|及び|並びに|ならびに/u)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && !STOP.has(x));
  return parts.length > 1 ? parts : [cleanTopic];
};

export function makeIssue(label, concept = null) {
  const normalizedLabel = normalize(label);
  if (concept) {
    return {
      label: normalizedLabel,
      topic: concept.id,
      concept,
      anchors: concept.anchors,
      required: CONCEPT_REQUIRED[concept.id] || [concept.anchors.slice(0, 1)],
      queries: [...new Set(concept.queries.filter(Boolean))],
    };
  }
  const topic = topicFromQuestion(normalizedLabel);
  const terms = subjectTerms(topic);
  const required = terms.slice(0, 3).map(variants);
  const anchors = [...new Set([topic, ...terms, ...required.flat()])].filter((x) => x.length >= 2 && !STOP.has(x));
  const queries = [...new Set([
    terms.join(' '),
    anchors.slice(0, 5).join(' '),
    topic,
    normalizedLabel,
    ...terms,
  ].filter(Boolean))];
  return { label: normalizedLabel, topic, concept: null, anchors, required, queries };
}

export function splitIssues(question) {
  const normalized = normalize(question);
  const concepts = CONCEPTS.filter((c) => c.match.test(normalized));
  if (concepts.length) return concepts.map((c) => makeIssue(c.id, c));

  const numbered = String(question)
    .normalize('NFKC')
    .split(/(?=(?:^|\n)\s*(?:[一二三四五六七八九十]+|\d+)[　\s、．.])/u)
    .map(normalize)
    .filter((x) => x.length >= 4);
  if (numbered.length > 1) return numbered.map((x) => makeIssue(x));

  const lines = String(question).split(/\n+/).map(normalize).filter((x) => x.length >= 4);
  return lines.length > 1 ? lines.map((x) => makeIssue(x)) : [makeIssue(normalized)];
}
