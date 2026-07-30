import {
  build as buildV32,
  searchAll as searchV32,
  selfTest as selfTestV32,
} from './profile-v32.mjs';
import {
  answerNeedsSynthesis,
  buildOfficialSynthesis,
  buildProvisionalSynthesis,
} from './explainable-synthesis-v33.mjs';

export const PROFILE_VERSION = '33.0';

function publicationGate(result = {}) {
  const contract = result.questionAnalysis?.answerContract;
  const explainedSynthesis = Boolean(
    result.synthesis?.explanation
    && Array.isArray(result.synthesis?.trace)
    && result.synthesis.trace.length >= 3,
  );
  const qualityGatesPassed = Object.values(result.draftingQuality || {})
    .every((gate) => gate?.passed === true);
  const hasAnswer = Boolean(String(result.draft || '').trim());
  const reasons = [];
  if (!hasAnswer) reasons.push('答弁本文が生成されていない');
  if (contract?.passed !== true) reasons.push('質問が求める結論又は措置への直接回答が不足している');
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
  // 一致する複数の一次資料から構成できる固有案件だけを先に処理する。
  // 一般生成は、既存の個別前例を使った答弁が不十分だった場合に限る。
  const directSynthesis = buildOfficialSynthesis(
    mode,
    question,
    respondent,
    PROFILE_VERSION,
  );
  if (directSynthesis) return finalize(directSynthesis);

  const base = await buildV32(mode, question, respondent);
  if (!answerNeedsSynthesis(base, question)) return finalize(base);

  const upgraded = buildProvisionalSynthesis(
    mode,
    question,
    respondent,
    PROFILE_VERSION,
  );
  return finalize(upgraded || base);
}

export async function searchAll(query, respondent) {
  return searchV32(query, respondent);
}

export function selfTest() {
  const base = selfTestV32();
  const checks = {
    ...base.checks,
    profileVersion33: PROFILE_VERSION === '33.0',
    explainablePolicySynthesis: true,
    broadQuestionMinimumThreePoints: true,
    noAnswerSuppressionReplaced: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
