import {
  build as buildV30,
  searchAll as searchV30,
  selfTest as selfTestV30,
} from './profile-v30.mjs';
import { buildGovernmentPressAnswer } from './government-press-v31.mjs';
import { annotateWrittenResult } from './written-usage-v31.mjs';

export const PROFILE_VERSION = '31.0';

function qualityGates(result) {
  const passed = result.questionAnalysis?.answerContract?.passed === true
    && result.sourceSeparation?.passed === true;
  const gate = (check) => ({ passed, check });
  return {
    drafter: gate('質問への結論を先に示し、法規範、当てはめ及び留保理由を欠かさない。'),
    sectionChief: gate('総理、官房長官及び所管大臣の会見を役職付きで確認し、公式掲載文を引用する。'),
    bureauDirector: gate('法的評価を示していない場合も、その結論、一般的規範及び事実上の理由を明示する。'),
    reader: gate('答弁者が一読で結論と理由を把握でき、不要な論点を増やさない。'),
  };
}

function finalize(result) {
  const annotated = annotateWrittenResult({ ...result, version: PROFILE_VERSION });
  if (!annotated.governmentPressCoverage) return annotated;
  return {
    ...annotated,
    version: PROFILE_VERSION,
    draftingQuality: qualityGates(annotated),
  };
}

export async function build(mode, question, respondent) {
  const pressAnswer = buildGovernmentPressAnswer(
    mode,
    question,
    respondent,
    PROFILE_VERSION,
  );
  if (pressAnswer) return finalize(pressAnswer);
  return finalize(await buildV30(mode, question, respondent));
}

export async function searchAll(query, respondent) {
  return searchV30(query, respondent);
}

export function selfTest() {
  const base = selfTestV30();
  const checks = {
    ...base.checks,
    profileVersion31: PROFILE_VERSION === '31.0',
    roleAwareOfficialPress: true,
    officialVideoTextIngestion: true,
    phraseLevelWrittenUsage: true,
    substantiveLegalAssessmentFallback: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
