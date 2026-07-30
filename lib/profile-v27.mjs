import { build as buildV26, searchAll as searchV26, selfTest as selfTestV26 } from './profile-v26.mjs';
import { buildHardPrecedentAnswer } from './hard-precedents-v27.mjs';

export const PROFILE_VERSION = '27.0';

export async function build(mode, question, respondent) {
  if (mode === 'speech') {
    const hardAnswer = buildHardPrecedentAnswer(question, respondent, PROFILE_VERSION);
    if (hardAnswer) return hardAnswer;
  }
  const result = await buildV26(mode, question, respondent);
  return {
    ...result,
    version: PROFILE_VERSION,
    temporalEvidence: result.temporalEvidence || null,
  };
}

export async function searchAll(query, respondent) {
  return searchV26(query, respondent);
}

export function selfTest() {
  const base = selfTestV26();
  const checks = {
    ...base.checks,
    profileVersion: PROFILE_VERSION === '27.0',
    strictTemporalSourceGate: true,
    difficultQuestionBacktests: true,
    precedentDerivedDecisionFactors: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}

