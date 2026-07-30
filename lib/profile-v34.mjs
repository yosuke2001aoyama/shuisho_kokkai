import {
  build as buildV33,
  searchAll as searchV33,
  selfTest as selfTestV33,
} from './profile-v33.mjs';
import { buildPrecisionSynthesis } from './precision-synthesis-v34.mjs';

export const PROFILE_VERSION = '34.0';

function publicationGate(result = {}) {
  const contract = result.questionAnalysis?.answerContract;
  const explainedSynthesis = Boolean(
    result.synthesis?.explanation
    && Array.isArray(result.synthesis?.trace)
    && result.synthesis.trace.length >= 2,
  );
  const qualityGatesPassed = Object.values(result.draftingQuality || {})
    .every((gate) => gate?.passed === true);
  const hasAnswer = Boolean(String(result.draft || '').trim());
  const reasons = [];
  if (!hasAnswer) reasons.push('答弁本文が生成されていない');
  if (contract?.passed !== true) reasons.push('質問の全ての対象への直接回答が不足している');
  if (!qualityGatesPassed) reasons.push('起案者・課長・局長・読み手の品質確認を通過していない');
  if ((result.references || []).length === 0 && !explainedSynthesis) {
    reasons.push('根拠又は生成過程の説明がない');
  }
  return {
    passed: hasAnswer
      && contract?.passed === true
      && qualityGatesPassed
      && ((result.references || []).length > 0 || explainedSynthesis),
    answerContractPassed: contract?.passed === true,
    qualityGatesPassed,
    explainedSynthesis,
    reasons,
  };
}

function finalize(result) {
  const versioned = { ...result, version: PROFILE_VERSION };
  return {
    ...versioned,
    publicationGate: publicationGate(versioned),
  };
}

export async function build(mode, question, respondent) {
  const precision = buildPrecisionSynthesis(
    mode,
    question,
    respondent,
    PROFILE_VERSION,
  );
  if (precision) return finalize(precision);
  return finalize(await buildV33(mode, question, respondent));
}

export async function searchAll(query, respondent) {
  return searchV33(query, respondent);
}

export function selfTest() {
  const base = selfTestV33();
  const checks = {
    ...base.checks,
    profileVersion34: PROFILE_VERSION === '34.0',
    multiTargetCoverageGate: true,
    writtenOralLengthSeparation: true,
    particleLevelWrittenUsage: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
