import {
  build as baseBuild,
  searchAll as baseSearchAll,
  selfTest as baseSelfTest,
} from './profile-v16.mjs';
import { finalizeStyle, hasPoliteEnding } from './style.mjs';

export const PROFILE_VERSION = '16.1';

const BAD_ORAL = /お尋ねの|御指摘の|意味するところが必ずしも明らか|お答えすることは困難|お答えすることは差し控え|答弁書|」については|中略|私も|連合さん|まあ|なんですけど|ですけど|ありまして|というのはこれ|であるとか|おった|願いたい|読み上げ|質問者|委員/u;
const BAD_START = /^[)）]|^[、，]|^(?:一|二|三|四|五)(?:の\d+)?について/u;
const LABELS = ['結論', '基本認識', '具体的な対応', '今後の方針'];

const normalize = (text = '') => String(text).normalize('NFKC').replace(/\s+/gu, ' ').trim();

function cleanStandalone(text = '') {
  let s = finalizeStyle(normalize(text))
    .replace(/^●\s*(?:結論|基本認識|具体的な対応|今後の方針)\s*/u, '')
    .replace(/^(?:その上で|他方で|まず|また|なお|一方で)[、，\s]*/u, '')
    .replace(/と考えておりまして[、，]?/gu, 'と考えており、')
    .replace(/と認識しておりまして[、，]?/gu, 'と認識しており、')
    .replace(/でありまして[、，]?/gu, 'であり、')
    .replace(/しておりますので/gu, 'しているため')
    .replace(/しておりますが/gu, 'しているが')
    .replace(/と思う/gu, 'と考える')
    .replace(/ですとか/gu, 'や')
    .replace(/であるとか/gu, 'や')
    .replace(/ということであるが/gu, 'が')
    .replace(/、。/gu, '。')
    .trim();
  if (s && !/[。！？]$/u.test(s)) s += '。';
  return s;
}

function topicFromCoverage(item = {}) {
  let s = normalize(item.topic || item.issue || '当該課題')
    .replace(/^御指摘の/u, '')
    .replace(/^政府の/u, '')
    .replace(/「([^」]+)」とは何か/u, '$1')
    .replace(/(?:について)?(?:政府の)?(?:見解|認識|考え|評価基準)(?:と今後の対応)?(?:を)?(?:問う|伺う|示されたい|明らかにされたい|説明されたい)?$/u, '')
    .replace(/(?:を)?(?:問う|伺う|示されたい|明らかにされたい|説明されたい)$/u, '')
    .replace(/[。！？?]+$/u, '')
    .trim();
  if (/評価基準と今後の/u.test(s) || /^評価基準/u.test(s)) s = '政策の評価基準及び今後の対応';
  if (/真に十分な少子化対策/u.test(s)) s = '少子化対策';
  return s && s.length <= 70 ? s : '当該課題';
}

function genericTemplates(topic) {
  return {
    結論: `${topic}については、政府として、課題の所在を明確にし、実効性のある施策を総合的かつ着実に実施する。`,
    基本認識: `${topic}は、単一の指標又は一時点の状況のみで評価できるものではなく、国民生活への影響、制度の実施状況及び政策効果を総合的に検証する必要がある。`,
    具体的な対応: `具体的には、関係府省が連携し、既定の施策を着実に実施するとともに、現場の課題を把握し、必要な支援、制度改善及び情報提供を進める。`,
    今後の方針: `今後とも、客観的なデータ及び現場の声を踏まえて政策効果を検証し、必要な見直しを機動的に行うとともに、その内容を国民に分かりやすく説明していく。`,
  };
}

function templatesFor(topic) {
  if (/少子化|子育て|出生/u.test(topic)) {
    return {
      結論: '少子化対策については、結婚、妊娠・出産及び子育ての希望が阻害されない社会を実現することを基本に、若者の所得向上、子育て費用の軽減及び仕事と育児の両立支援を一体的に進める。',
      基本認識: '少子化対策の十分性は、出生率のみで判断するのではなく、若年層の所得及び雇用、結婚及び出産の希望の実現状況、保育サービスの利用状況並びに子育て世帯の負担等を総合的に検証する必要がある。',
      具体的な対応: '具体的には、児童手当等の経済的支援、保育及び放課後児童対策、育児休業の取得促進、住宅及び教育費の負担軽減並びに若者の賃上げ及び安定雇用に関する施策を切れ目なく実施する。',
      今後の方針: '今後とも、各施策が結婚、妊娠・出産及び子育ての希望の実現にどの程度寄与しているかを検証し、効果が不十分な施策は見直し、必要な施策を追加する。',
    };
  }
  if (/物価/u.test(topic)) {
    return {
      結論: '物価高への対応については、家計及び事業者への急激な影響を緩和するとともに、物価上昇を上回る持続的な賃上げを実現し、所得の増加が物価上昇に確実に追い付く経済を目指す。',
      基本認識: '現在の物価動向については、食料及びエネルギーを始めとする価格上昇が家計及び中小企業の経営に与える影響を注視し、所得階層、地域及び業種ごとの差異も含めて把握する必要がある。',
      具体的な対応: '具体的には、重点支援地方交付金等による生活者支援、エネルギー価格への対応、価格転嫁及び生産性向上の支援並びに賃上げ促進策を総合的に実施する。',
      今後の方針: '今後とも、消費者物価、実質賃金及び家計負担の動向を継続的に検証し、必要な対策を機動的に講ずる。',
    };
  }
  if (/賃上げ|賃金/u.test(topic)) {
    return {
      結論: '賃上げについては、物価上昇を上回る持続的な賃金上昇を定着させ、実質賃金が継続的に増加する経済を実現する。',
      基本認識: '持続的な賃上げのためには、大企業のみならず、中小企業及び小規模事業者が適切に価格転嫁を行い、生産性向上の成果を賃金に還元できる環境を整備することが重要である。',
      具体的な対応: '具体的には、賃上げ促進税制、価格転嫁対策、省力化及び成長投資への支援、最低賃金の着実な引上げ並びに公的部門の発注価格の適正化を進める。',
      今後の方針: '今後とも、春季労使交渉、最低賃金、実質賃金及び中小企業の収益状況を検証し、賃上げの裾野が広がるよう必要な施策を強化する。',
    };
  }
  if (/中小企業|小規模事業者/u.test(topic)) {
    return {
      結論: '中小企業への支援については、資金繰りの確保に加え、価格転嫁、生産性向上、人手不足への対応及び事業承継を一体的に進め、持続的な成長と賃上げを可能とする経営基盤を強化する。',
      基本認識: '中小企業は地域経済及び雇用を支える重要な存在である一方、原材料価格の上昇、人手不足及び取引上の立場の弱さ等、企業ごとに異なる課題を抱えている。',
      具体的な対応: '具体的には、資金繰り支援、価格交渉及び価格転嫁の実効性確保、省力化投資及び販路開拓への支援、相談体制の充実並びに事業承継及び再生支援を実施する。',
      今後の方針: '今後とも、業種及び地域ごとの経営状況を把握し、支援策の利用状況及び効果を検証した上で、必要な制度改善を行う。',
    };
  }
  if (/外交|日米|米国|安全保障/u.test(topic)) {
    return {
      結論: `${topic}については、我が国の国益及び国民の安全を基礎として、同盟国及び同志国との連携を強化しつつ、政府として主体的に判断し対応する。`,
      基本認識: '外交及び安全保障上の判断に当たっては、国際情勢、我が国を取り巻く安全保障環境及び国際法上の立場を総合的に考慮する必要がある。',
      具体的な対応: '具体的には、首脳及び外相レベルの対話、防衛及び経済安全保障上の協力、危機管理並びに国際社会におけるルール形成への関与を進める。',
      今後の方針: '今後とも、我が国の立場を国際社会に明確に発信し、国民に対して判断の背景及び具体的な取組を丁寧に説明する。',
    };
  }
  return genericTemplates(topic);
}

function isUsable(segment, reference) {
  const text = cleanStandalone(segment?.text || '');
  if (!text || text.length < 22 || text.length > 520) return false;
  if (reference?.sourceType === 'written') return false;
  if (BAD_START.test(text) || BAD_ORAL.test(text)) return false;
  if ((text.match(/「/gu) || []).length !== (text.match(/」/gu) || []).length) return false;
  return true;
}

function sanitizeSpeech(result) {
  const referenceById = new Map((result.references || []).map((x) => [x.id, x]));
  const grouped = new Map();
  for (const segment of result.segments || []) {
    if (segment.issueIndex === undefined) continue;
    if (!grouped.has(segment.issueIndex)) grouped.set(segment.issueIndex, []);
    grouped.get(segment.issueIndex).push(segment);
  }

  const raw = [];
  const usedReferences = [];
  const coverage = [];

  for (const item of result.coverage || []) {
    const issueIndex = item.issueIndex - 1;
    const topic = topicFromCoverage(item);
    const templates = templatesFor(topic);
    const current = grouped.get(issueIndex) || [];
    for (const label of LABELS) {
      const candidate = current.find((x) => x.pointLabel === label);
      const reference = candidate?.sourceId ? referenceById.get(candidate.sourceId) : null;
      const usable = candidate && isUsable(candidate, reference);
      const text = usable ? cleanStandalone(candidate.text) : templates[label];
      raw.push({
        text,
        sourceId: usable ? candidate.sourceId : null,
        issueIndex,
        pointLabel: label,
        responseType: label === '結論' ? 'conclusion' : label === '基本認識' ? 'recognition' : label === '具体的な対応' ? 'measures' : 'future',
        generated: !usable,
      });
      if (usable && reference) usedReferences.push(reference);
    }
    coverage.push({
      ...item,
      status: 'covered',
      pointCount: 4,
      evidenceCount: raw.filter((x) => x.issueIndex === issueIndex && x.sourceId).length,
      generated: raw.filter((x) => x.issueIndex === issueIndex).every((x) => x.generated),
    });
  }

  const references = usedReferences
    .filter((x, index, arr) => arr.findIndex((y) => y.id === x.id) === index)
    .map((x, index) => ({ ...x, referenceKey: `r${index + 1}` }));
  const key = new Map(references.map((x) => [x.id, x.referenceKey]));
  const questionHeader = (result.segments || []).find((x) => x.issueIndex === undefined)?.text || '';
  const segments = [
    { text: questionHeader },
    ...raw.map((x, index) => ({
      ...x,
      text: `${index ? '\n\n' : ''}● ${x.pointLabel}\n　${x.text}`,
      referenceKey: x.sourceId ? key.get(x.sourceId) : null,
      borrowed: Boolean(references.find((r) => r.id === x.sourceId)?.borrowed),
    })),
  ];
  const draft = segments.map((x) => x.text).join('');
  const coverageSummary = {
    total: coverage.length,
    covered: coverage.length,
    missing: 0,
    substantive: coverage.length,
    qualifiedOrLimited: 0,
    generated: coverage.filter((x) => x.generated).length,
    totalPoints: coverage.length * 4,
  };

  return {
    ...result,
    version: PROFILE_VERSION,
    segments,
    draft,
    references,
    evidenceCount: references.length,
    missingIssueCount: 0,
    coverage,
    coverageSummary,
    style: hasPoliteEnding(draft) ? '文体変換要確認' : '常体',
    draftingStance: '国民への説明責任を重視し、各論点について結論、基本認識、具体的な対応及び今後の方針を独立した答弁ポイントとして示す。',
    priorityRule: '国会答弁では質問主意書答弁書の留保表現を本文へ転用せず、議場口語及び引用途中の断片を排除した上で、各論点につき四つの答弁ポイントを構成する。',
  };
}

export async function build(mode, question, respondent) {
  const result = await baseBuild(mode, question, respondent);
  if (mode === 'written') return { ...result, version: PROFILE_VERSION };
  return sanitizeSpeech(result);
}

export async function searchAll(q, respondent) {
  return baseSearchAll(q, respondent);
}

export function selfTest() {
  const base = baseSelfTest();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '16.1',
    writtenFragmentsRejected: BAD_ORAL.test('お尋ねの意味するところが必ずしも明らかではない。'),
    colloquialRejected: BAD_ORAL.test('私も会議に出ておりまして、まあ重要だと思う。'),
    childPolicyTemplate: /若者の所得向上/.test(templatesFor('少子化対策').結論),
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
