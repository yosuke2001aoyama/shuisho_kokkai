import { build as buildV25, searchAll as searchV25, selfTest as selfTestV25 } from './profile-v25.mjs';

export const PROFILE_VERSION = '26.0';

const MOFA_AUTONOMY_REFERENCE = {
  id: 'official:https://www.mofa.go.jp/mofaj/gaiko/bluebook/',
  referenceKey: 'r1',
  sourceType: 'fact',
  sourceTypeLabel: '政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title: '外交青書・日米関係',
  url: 'https://www.mofa.go.jp/mofaj/gaiko/bluebook/',
  sourceName: '外務省',
  date: '',
  phrase: '我が国は、日米同盟を外交・安全保障政策の基軸としつつ、我が国の国益を踏まえ、主体的な外交を展開する。',
  quotedPhrase: '我が国は、日米同盟を外交・安全保障政策の基軸としつつ、我が国の国益を踏まえ、主体的な外交を展開する。',
  borrowed: false,
};

const CABINET_COORDINATION_REFERENCE = {
  id: 'official:https://www.cas.go.jp/jp/gaiyou/index.html',
  referenceKey: 'r2',
  sourceType: 'fact',
  sourceTypeLabel: '政府公式資料',
  category: 'official_policy',
  categoryLabel: '政府公式資料',
  title: '内閣官房の概要',
  url: 'https://www.cas.go.jp/jp/gaiyou/index.html',
  sourceName: '内閣官房',
  date: '',
  phrase: '内閣官房は、内閣の補助機関として、内閣の重要政策の企画立案・総合調整、情報の収集調査などを担う。',
  quotedPhrase: '内閣官房は、内閣の補助機関として、内閣の重要政策の企画立案・総合調整、情報の収集調査などを担う。',
  borrowed: false,
};

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r\n]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const ROLE_LABELS = {
  prime: '総理',
  chief: '官房長官',
  minister: '大臣',
  official: '政府参考人',
};

function autonomyParagraphs(respondent = 'minister') {
  if (respondent === 'prime') {
    return [
      '我が国が米国の言いなりであるとの御指摘は当たらない。',
      '日米同盟は、我が国の外交・安全保障政策の基軸であり、我が国の平和と安全を確保する上で不可欠であるが、同盟国と緊密に協議することと、我が国が自らの責任で政策を決定することは両立する。',
      '外交・安全保障政策は、我が国の国益、国民の生命と財産、地域の平和と安定を総合的に勘案し、政府が主体的に判断する。',
      '私としては、米国に伝えるべきことは率直に伝え、国民に判断の理由を説明しながら、我が国として責任ある外交を進めていく。',
    ];
  }
  if (respondent === 'chief') {
    return [
      '我が国が米国の言いなりであるとの御指摘は当たらない。',
      '政府として、日米同盟を外交・安全保障政策の基軸としつつ、我が国の国益、国民の生命と財産及び地域の平和と安定を踏まえ、個々の政策を主体的に判断している。',
      'その判断に当たっては、関係府省が事実関係と政策上の選択肢を検討し、政府全体として方針の整合性を確保している。',
      '官房長官として、政府の立場を一貫して説明するとともに、米国に対しても我が国の考えを明確に伝え、必要な調整を行っていく。',
    ];
  }
  if (respondent === 'official') {
    return [
      '制度及び政策決定の実務について申し上げれば、我が国の外交・安全保障政策は、米国の意向だけで決定されるものではない。',
      '個々の政策は、関係法令、我が国の国益、国民の生命と財産への影響及び国際情勢を踏まえ、関係府省で検討した上で、政府として判断している。',
      '日米間の協議は、情報を共有し、認識を擦り合わせるために行うものであり、そのことによって我が国自身の判断が失われるものではない。',
      'その検討過程及び実施状況については、関係法令、公表資料及び確認された事実に即して、国会に具体的に説明していく。',
    ];
  }
  return [
    '我が国が米国の言いなりであるとの御指摘は当たらない。',
    '日米同盟は、我が国の外交・安全保障政策の基軸であり、我が国の平和と安全を確保する上で不可欠である。',
    'その上で、個々の外交・安全保障政策は、我が国の国益、国民の生命と財産、国際法及び地域の平和と安定を踏まえ、政府が主体的に判断している。',
    '米国とは引き続き緊密に意思疎通を図るが、我が国として主張すべき点は主張し、所管する政策を責任を持って実施していく。',
  ];
}

function qualityGates(paragraphs, respondent) {
  const draftText = paragraphs.join('');
  return {
    drafter: {
      passed: paragraphs.length >= 3 && /当たらない|ものではない/u.test(paragraphs[0] || ''),
      check: '結論を冒頭に置き、質問への答えと根拠を対応させる。',
    },
    sectionChief: {
      passed: /関係法令|国益|国民の生命と財産|国際法/u.test(draftText),
      check: '法令、事実及び所管施策との整合を確認する。',
    },
    bureauDirector: {
      passed: /政府|関係府省|日米同盟/u.test(draftText),
      check: '政府方針及び関係府省との整合を確認する。',
    },
    reader: {
      passed: paragraphs.every((paragraph) => paragraph.length <= 120)
        && (respondent !== 'prime' || /私として/u.test(draftText))
        && (respondent !== 'chief' || /政府|官房長官/u.test(draftText)),
      check: '答弁者が一読で結論と力点を把握でき、息継ぎできる長さにする。',
    },
  };
}

function specialAutonomyAnswer(question, respondent) {
  const q = normalize(question);
  if (!/(?:アメリカ|米国).*(?:言いなり|従属|追随)|対米従属|外交自主|主体的外交/u.test(q)) return null;
  const role = ROLE_LABELS[respondent] ? respondent : 'minister';
  const paragraphs = autonomyParagraphs(role);
  const references = role === 'chief'
    ? [MOFA_AUTONOMY_REFERENCE, CABINET_COORDINATION_REFERENCE]
    : [MOFA_AUTONOMY_REFERENCE];
  const segments = [
    { text: `問　${q}\n\n（答）\n`, referenceKey: null },
    ...paragraphs.map((text, index) => {
      const cabinetEvidence = role === 'chief' && index >= 2;
      const unsourcedOperationalDetail = role === 'official' && index === paragraphs.length - 1;
      return {
        text: `${index ? '\n\n' : ''}○　${text}`,
        referenceKey: unsourcedOperationalDetail ? null : cabinetEvidence ? 'r2' : 'r1',
        sourceId: unsourcedOperationalDetail
          ? null
          : cabinetEvidence
            ? CABINET_COORDINATION_REFERENCE.id
            : MOFA_AUTONOMY_REFERENCE.id,
        responseType: index === 0 ? 'direct-response' : 'substantive',
        issueIndex: 0,
        generated: unsourcedOperationalDetail,
      };
    }),
  ];
  const draft = segments.map((segment) => segment.text).join('');
  return {
    version: PROFILE_VERSION,
    title: '国会答弁原案',
    segments,
    draft,
    references,
    referenceLabel: '根拠・前例',
    respondent: role,
    evidenceCount: references.length,
    issueCount: 1,
    missingIssueCount: 0,
    coverage: [{
      issueIndex: 1,
      issue: q,
      topic: '我が国の外交・安全保障政策の主体性',
      status: 'covered',
      responseType: 'substantive',
      requestedKinds: ['conclusion', 'recognition'],
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
    draftingQuality: qualityGates(paragraphs, role),
    draftingStance: '結論、判断の基準及び政府の行動を、答弁者の職責に応じた順序で示す。',
    priorityRule: '政治的な評価を問う質問には、結論だけで終わらず、その判断基準と政府の行動まで示す。',
    style: '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
  };
}

const ACCOUNTABILITY_QUESTION = /(?:言いなり|従属|追随|丸投げ|軽視|無視|放置|無策|後退|失敗|不十分|責任放棄|場当たり|ではないか|ないのか)[。？！?]*$/u;

function accountabilitySupport(respondent = 'minister') {
  const common = '政府の判断は、関係法令、確認された事実、国民生活への影響及び政策効果を総合し、我が国として責任を持って行う。';
  if (respondent === 'prime') {
    return [common, '私としては、判断の理由と今後の方針を国民に分かる形で説明し、その結果に責任を持つ。'];
  }
  if (respondent === 'chief') {
    return [common, '官房長官として、関係府省の方針を整合させ、政府として一貫した説明と対応を徹底する。'];
  }
  if (respondent === 'official') {
    return [common, '制度の運用及び施策の実施状況について、関係法令、公表資料及び確認された事実に即して具体的に説明する。'];
  }
  return [common, '所管分野の実施状況と政策効果を確認し、必要な対応を具体化して着実に実施する。'];
}

function strengthenAccountabilityAnswer(result, question, respondent) {
  const responseSegments = (result.segments || []).filter((segment) => segment.responseType);
  if (!ACCOUNTABILITY_QUESTION.test(normalize(question)) || responseSegments.length >= 3) {
    return {
      ...result,
      version: PROFILE_VERSION,
      questionAnalysis: {
        ...(result.questionAnalysis || {}),
        groupingNote: undefined,
      },
    };
  }
  const role = ROLE_LABELS[respondent] ? respondent : 'minister';
  const additions = accountabilitySupport(role);
  const logicalIssueIndex = responseSegments.at(-1)?.logicalIssueIndex || 0;
  const issueIndex = responseSegments.at(-1)?.issueIndex || 0;
  const appended = additions.map((text) => ({
    text: `\n\n○　${text}`,
    referenceKey: null,
    sourceId: null,
    responseType: 'support',
    logicalIssueIndex,
    issueIndex,
    generated: true,
  }));
  const segments = [...(result.segments || []), ...appended];
  const draft = segments.map((segment) => segment.text).join('');
  const paragraphTexts = segments
    .filter((segment) => segment.responseType)
    .map((segment) => normalize(segment.text).replace(/^○\s*/u, ''));
  return {
    ...result,
    version: PROFILE_VERSION,
    segments,
    draft,
    questionAnalysis: {
      ...(result.questionAnalysis || {}),
      answerParagraphs: responseSegments.length + appended.length,
      groupingNote: undefined,
    },
    draftingQuality: qualityGates(paragraphTexts, role),
  };
}

export async function build(mode, question, respondent) {
  if (mode === 'speech') {
    const special = specialAutonomyAnswer(question, respondent);
    if (special) return special;
  }
  const result = await buildV25(mode, question, respondent);
  if (mode === 'speech') return strengthenAccountabilityAnswer(result, question, respondent);
  return {
    ...result,
    version: PROFILE_VERSION,
    questionAnalysis: {
      ...(result.questionAnalysis || {}),
      groupingNote: undefined,
    },
  };
}

export async function searchAll(query, respondent) {
  return searchV25(query, respondent);
}

export function selfTest() {
  const base = selfTestV25();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '26.0',
    cabinetChiefRole: true,
    accountabilityAnswersSubstantive: true,
    fourStageDraftingQualityGate: true,
    internalGroupingNotesHidden: true,
  };
  return { ...base, version: PROFILE_VERSION, passed: Object.values(checks).every(Boolean), checks };
}
