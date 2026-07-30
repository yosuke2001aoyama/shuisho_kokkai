import { clean } from './lib/core.mjs';
import { build, searchAll, selfTest, PROFILE_VERSION } from '../lib/profile-v31.mjs';
import { listTemporalBacktests, runTemporalBacktests } from '../lib/temporal-backtest-v30.mjs';
import { QUALITY_BACKTEST_CASES, runQualityBacktests } from '../lib/quality-backtest-v30.mjs';
import { listBreadthBacktests, runBreadthBacktests } from '../lib/breadth-backtest-v29.mjs';
import { listMegaBacktests, runMegaBacktests } from '../lib/mega-backtest-v30.mjs';
import { getOfficialStyleGuide } from './lib/official-style.mjs';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
};

const defensiveStrategy = (value) => [
  'ambiguity',
  'evaluation',
  'hypothetical',
  'outside-scope',
  'security',
  'enumerative',
  'no-evidence',
].includes(value);

const kindSet = (draft) => [...new Set((draft.coverage || []).flatMap((x) => x.requestedKinds || []))].sort();
const sameKinds = (draft, expected) => JSON.stringify(kindSet(draft)) === JSON.stringify([...expected].sort());

const SMOKE_CASES = {
  simple: '単純な事実質問に、聞かれていない認識・理由・具体策・将来方針を付加しない',
  policy: '認識・具体策・今後の方針を求める質問には、その三要素だけを答える',
  reason: '理由を求める質問に、聞かれていない具体策や将来方針を付加しない',
  multi: '複数の独立した主題を漏らさず、論点数以上に広げない',
  cohesion: '同じ法的・政策的主題に属する複数の聞き方を一論点にまとめ、白丸段落で答える',
  accountability: '政治的な評価を問う質問には、結論だけで終わらず、判断基準と政府の行動まで示す',
  vagueWritten: '曖昧な質問主意書には拒否理由だけを記載し、一般政策を付加しない',
  outsideWritten: '政府の所掌外事項には把握する立場にない旨だけを記載する',
  hypotheticalWritten: '仮定・網羅要求には限定答弁だけを記載する',
};

async function runSmokeCase(name) {
  if (name === 'simple') {
    const draft = await build('speech', '尖閣諸島は我が国固有の領土か。', 'minister');
    const checks = {
      onlyConclusion: sameKinds(draft, ['conclusion']),
      hasAnswerParagraph: /^○　/mu.test(draft.draft),
      noSyntheticHeadings: !/論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft),
      noDebateFragments: !/お尋ねの|御指摘|委員|議員|昨日は|私も|連合さん|まあ|おっしゃ|通告|時間の関係/.test(draft.draft),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'policy') {
    const draft = await build('speech', '物価高への認識と具体的な対応、今後の方針を問う。', 'minister');
    const futureText = draft.segments.find((segment) => segment.responseType === 'future')?.text || '';
    const bodyTexts = draft.segments.filter((segment) => segment.responseType).map((segment) => segment.text.replace(/^.*?\n　/us, '').trim());
    const checks = {
      onlyRequestedKinds: sameKinds(draft, ['conclusion', 'recognition', 'measures', 'future']),
      requestedParagraphsPresent: (draft.draft.match(/^○　/gmu) || []).length >= 3,
      noSyntheticHeadings: !/論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft),
      noDebateFragments: !/お尋ねの|御指摘|委員|議員|昨日は|私も|連合さん|まあ|おっしゃ|通告|時間の関係/.test(draft.draft),
      broadQuestionNotSectorOnly: !/医療機関|医療・介護|診療報酬|歯科|B型事業所|障害福祉/.test(draft.draft),
      noStandaloneDiscourseFragments: !/(?:^|\n　)(?:ですから|また|その上で|こうした中|ということを考えて)[、，]/mu.test(draft.draft),
      futureIsForwardLooking: /今後|引き続き|進めていく|取り組んでいく|講じていく|実施していく|目指|努め|方針|予定|見通し/.test(futureText),
      distinctSections: new Set(bodyTexts).size === bodyTexts.length,
      noContextDependentFuture: !/世論調査を拝見|御安心|総理が何度も|強い思いを持って|その辺は/.test(futureText),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'reason') {
    const draft = await build('speech', 'なぜ賃上げが必要なのか。その理由を問う。', 'minister');
    const checks = {
      singleCoherentIssue: draft.issueCount === 1,
      onlyConclusionAndReason: sameKinds(draft, ['conclusion', 'reason']),
      answerParagraphsPresent: (draft.draft.match(/^○　/gmu) || []).length >= 1,
      noSyntheticHeadings: !/論点[一二三四五六七八九十\d]|【[^】]+】/u.test(draft.draft),
      noDebateFragments: !/お尋ねの|御指摘|委員|議員|昨日は|私も|連合さん|まあ|おっしゃ|通告|時間の関係/.test(draft.draft),
      substantiveReason: /購買力|個人消費|成長と分配|物価上昇/.test(draft.draft),
      noOffTopicSources: !/再審|即時抗告|伝聞証拠|刑事訴訟|予定価格|総合評価落札|予算の編成/.test(draft.draft),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'multi') {
    const draft = await build('speech', '物価高への対応を問う。また、中小企業への支援策を示されたい。', 'minister');
    const checks = {
      allIssuesCovered: draft.coverageSummary.missing === 0,
      independentIssueCount: draft.issueCount === 2,
      usesWhiteCircles: (draft.draft.match(/^○　/gmu) || []).length >= draft.issueCount,
      noSyntheticHeadings: !/論点[一二三四五六七八九十\d]|●/u.test(draft.draft),
      onlyMeasuresAndConclusions: sameKinds(draft, ['conclusion', 'measures']),
      smallBusinessAnswerSubstantive: /価格転嫁|生産性向上|資金繰り|人材確保|事業承継/.test(draft.draft),
      noOffTopicOrPageChrome: !/イン・ローマ|日本らしい生活|外務省だけ|トップ\s*>|&emsp;|会議等一覧/.test(`${draft.draft} ${draft.references.map((x) => x.phrase).join(' ')}`),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'cohesion') {
    const draft = await build(
      'speech',
      '麻生副総裁は、中国による台湾侵攻は存立危機事態である可能性が高いと発言しているが、総理はどう考えるのか。また、台湾海峡が海上封鎖された場合、存立危機事態になり得るのか。',
      'prime',
    );
    const checks = {
      oneLogicalIssue: draft.issueCount === 1,
      twoAskedUnits: draft.questionAnalysis?.askedUnits === 2,
      whiteCircleParagraphs: (draft.draft.match(/^○　/gmu) || []).length >= 3,
      noBlackCircleOrIssueHeading: !/●|論点[一二三四五六七八九十\d]/u.test(draft.draft),
      answersLegalStandard: /個別具体的な状況|全ての情報を総合/u.test(draft.draft),
      citesOfficialPrecedent: draft.references.some((reference) => /衆議院|閣議決定/u.test(reference.sourceName || '')),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'accountability') {
    const roles = ['prime', 'chief', 'minister', 'official'];
    const samples = await Promise.all(roles.map((role) =>
      build('speech', '日本は米国の言いなりなのではないか。', role)));
    const checks = {
      everyRoleSubstantive: samples.every((draft) => (draft.draft.match(/^○　/gmu) || []).length >= 3),
      directAnswerFirst: samples.every((draft) => /御指摘は当たらない|米国の意向だけで決定されるものではない/u.test(draft.segments[1]?.text || '')),
      explainsDecisionBasis: samples.every((draft) => /国益|国民の生命と財産/u.test(draft.draft)),
      roleSpecific: /私として/u.test(samples[0].draft)
        && /官房長官として/u.test(samples[1].draft)
        && /所管/u.test(samples[2].draft)
        && /制度及び政策決定の実務/u.test(samples[3].draft),
      fourStageQualityGate: samples.every((draft) =>
        Object.values(draft.draftingQuality || {}).every((gate) => gate.passed)),
      noInternalGroupingNote: samples.every((draft) => !draft.questionAnalysis?.groupingNote),
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, samples };
  }
  if (name === 'vagueWritten') {
    const draft = await build('written', '御指摘の「真に十分な少子化対策」とは何か。政府の評価基準を示されたい。', 'minister');
    const checks = {
      defensive: draft.coverage.every((x) => defensiveStrategy(x.writtenStrategy)),
      refuses: /お答えすることは困難である|一概にお答えすることは困難である/.test(draft.draft),
      noPolicyAddendum: !/政府としては|いずれにせよ|今後とも|引き続き/.test(draft.draft),
      noReferences: draft.references.length === 0,
      officialStyle: draft.officialStyleCheck?.passed === true,
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'outsideWritten') {
    const draft = await build('written', '民間報道機関が個別の取材で得た情報を政府は全て把握しているか。', 'minister');
    const checks = {
      outsideScope: draft.coverage.every((x) => x.writtenStrategy === 'outside-scope'),
      correctFormula: /政府として把握する立場にない/.test(draft.draft),
      noPolicyAddendum: !/政府としては|いずれにせよ|今後とも|引き続き/.test(draft.draft),
      noReferences: draft.references.length === 0,
      officialStyle: draft.officialStyleCheck?.passed === true,
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  if (name === 'hypotheticalWritten') {
    const draft = await build('written', '仮に全ての原子力発電所を直ちに廃止した場合の影響を網羅的に示されたい。', 'minister');
    const checks = {
      defensive: draft.coverage.every((x) => defensiveStrategy(x.writtenStrategy)),
      hypotheticalFormula: /仮定を前提/.test(draft.draft) && /一概にお答えすることは困難である/.test(draft.draft),
      noPolicyAddendum: !/政府としては|いずれにせよ|今後とも|引き続き/.test(draft.draft),
      noReferences: draft.references.length === 0,
      officialStyle: draft.officialStyleCheck?.passed === true,
    };
    return { name, passed: Object.values(checks).every(Boolean), checks, sample: draft };
  }
  return null;
}

const REGRESSION_CASES = [
  { q: '物価高に対する政府の対応を問う。', terms: /物価高|物価/, expectedKinds: ['conclusion', 'measures'] },
  { q: '少子化対策をどのように強化するのか。', terms: /少子化|少子|子育て/, expectedKinds: ['conclusion', 'measures'] },
  { q: '台湾海峡の平和と安定に対する政府の認識を問う。', terms: /台湾海峡|台湾/, expectedKinds: ['recognition'] },
  { q: '生成AIと著作権の関係について政府の見解を問う。', terms: /(?:生成)?AI.*著作権|著作権.*(?:生成)?AI|人工知能/, expectedKinds: ['recognition'] },
  { q: 'なぜ防災対策の強化が必要なのか。', terms: /防災|災害/, expectedKinds: ['conclusion', 'reason'] },
];

async function runRegressionCase(index) {
  const c = REGRESSION_CASES[index];
  if (!c) return null;
  const draft = await build('speech', c.q, 'minister');
  const onTopic = draft.references.length === 0 || draft.references.every((x) => c.terms.test(`${x.title} ${x.phrase}`));
  const checks = {
    hasDraft: Boolean(draft.draft),
    allCovered: draft.coverageSummary.missing === 0,
    onlyRequestedKinds: sameKinds(draft, c.expectedKinds),
    noDebateFragments: !/お尋ねの|御指摘|委員|議員|昨日は|私も|連合さん|まあ|おっしゃ|通告|時間の関係/.test(draft.draft),
    plainStyle: draft.style === '常体' && !/(まいります|ございます|おります|ておる|おきまして|ました。|ます。|です。)/.test(draft.draft),
    onTopic,
    noUnaskedMeasuresForWhy: index !== 4 || !/【具体的な対応】/.test(draft.draft),
    currentTaiwanRecognition: index !== 2 || /国際社会の安全と繁栄|対話により平和的に解決/.test(draft.draft),
  };
  return {
    index,
    question: c.q,
    expectedKinds: [...c.expectedKinds].sort(),
    passed: Object.values(checks).every(Boolean),
    checks,
    sample: draft,
  };
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, 'https://local');

    if (u.pathname.endsWith('/health')) {
      return json(res, 200, {
        ok: true,
        version: PROFILE_VERSION,
        draftingProfile: 'thousand-case-diplomacy-security-source-separated-temporally-gated-role-aware-oral/written-cabinet-document',
      });
    }
    if (u.pathname.endsWith('/self-test')) return json(res, 200, selfTest());
    if (u.pathname.endsWith('/style-guide')) return json(res, 200, getOfficialStyleGuide());

    if (u.pathname.endsWith('/temporal-test')) {
      const caseId = clean(u.searchParams.get('case') || '');
      if (caseId === 'list') {
        return json(res, 200, { version: PROFILE_VERSION, cases: listTemporalBacktests() });
      }
      const report = await runTemporalBacktests(caseId);
      if (!report) {
        return json(res, 400, {
          error: 'Unknown temporal-test case',
          cases: listTemporalBacktests().map((testCase) => testCase.id),
        });
      }
      return json(res, 200, report);
    }

    if (u.pathname.endsWith('/quality-test')) {
      const caseId = clean(u.searchParams.get('case') || '');
      if (caseId === 'list') {
        return json(res, 200, {
          version: PROFILE_VERSION,
          cases: QUALITY_BACKTEST_CASES.map(({ id, title, mode, question }) => ({
            id,
            title,
            mode,
            question,
          })),
        });
      }
      const report = await runQualityBacktests(caseId);
      if (!report) {
        return json(res, 400, {
          error: 'Unknown quality-test case',
          cases: QUALITY_BACKTEST_CASES.map((testCase) => testCase.id),
        });
      }
      return json(res, 200, report);
    }

    if (u.pathname.endsWith('/breadth-test')) {
      const caseId = clean(u.searchParams.get('case') || '');
      if (caseId === 'list') {
        return json(res, 200, { version: PROFILE_VERSION, cases: listBreadthBacktests() });
      }
      const report = await runBreadthBacktests(caseId);
      if (!report) {
        return json(res, 400, {
          error: 'Unknown breadth-test case',
          cases: listBreadthBacktests().map((testCase) => testCase.id),
        });
      }
      return json(res, 200, report);
    }

    if (u.pathname.endsWith('/mega-test')) {
      const caseId = clean(u.searchParams.get('case') || '');
      if (caseId === 'list') {
        return json(res, 200, { version: PROFILE_VERSION, cases: listMegaBacktests() });
      }
      const report = await runMegaBacktests(caseId);
      if (!report) {
        return json(res, 400, {
          error: 'Unknown mega-test case',
          cases: listMegaBacktests().map((testCase) => testCase.id),
        });
      }
      return json(res, 200, report);
    }

    if (u.pathname.endsWith('/smoke-test')) {
      const name = clean(u.searchParams.get('case'));
      if (!name) return json(res, 200, { version: PROFILE_VERSION, cases: SMOKE_CASES });
      const result = await runSmokeCase(name);
      if (!result) return json(res, 400, { error: 'Unknown smoke-test case', cases: SMOKE_CASES });
      return json(res, 200, { version: PROFILE_VERSION, ...result });
    }

    if (u.pathname.endsWith('/regression-test')) {
      const rawCase = u.searchParams.get('case');
      if (rawCase === null) {
        return json(res, 200, {
          version: PROFILE_VERSION,
          cases: REGRESSION_CASES.map((x, index) => ({ index, question: x.q, expectedKinds: x.expectedKinds })),
        });
      }
      const index = Number(rawCase);
      const result = Number.isInteger(index) ? await runRegressionCase(index) : null;
      if (!result) return json(res, 400, { error: 'Unknown regression-test case' });
      return json(res, 200, { version: PROFILE_VERSION, ...result });
    }

    if (u.pathname.endsWith('/search')) {
      const q = clean(u.searchParams.get('q'));
      if (!q) return json(res, 400, { error: '検索語を入力してください。' });
      const respondent = ['prime', 'chief', 'minister', 'official'].includes(u.searchParams.get('respondent'))
        ? u.searchParams.get('respondent')
        : 'minister';
      const results = await searchAll(q, respondent);
      return json(res, 200, {
        query: q,
        version: PROFILE_VERSION,
        coverage: {
          note: '国会答弁、衆参両院の質問主意書答弁書、会見・演説、インタビュー・寄稿及び政府公式資料を横断し、質問意図との適合性で絞り込んでいる。',
        },
        results,
      });
    }

    if (u.pathname.endsWith('/draft')) {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      let raw = '';
      for await (const c of req) raw += c;
      const body = raw ? JSON.parse(raw) : {};
      const question = clean(body.question);
      const mode = ['speech', 'written'].includes(body.mode) ? body.mode : 'speech';
      const respondent = ['prime', 'chief', 'minister', 'official'].includes(body.respondent)
        ? body.respondent
        : 'minister';
      if (question.length < 8) return json(res, 400, { error: '質問を8文字以上で入力してください。' });
      return json(res, 200, {
        ...(await build(mode, question, respondent)),
        mode,
        generatedBy: `draft-engine-profile-${PROFILE_VERSION}`,
        disclaimer: '起案補助用。正式使用前に主管府省で最新の事実関係、政府方針、法令引用及び用例との整合性を確認すること。',
      });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, 502, { error: e?.message || '処理に失敗した。', version: PROFILE_VERSION });
  }
}
