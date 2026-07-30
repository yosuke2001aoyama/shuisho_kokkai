import {
  build as buildV31,
  searchAll as searchV31,
  selfTest as selfTestV31,
} from './profile-v31.mjs';
import { buildGovernmentPressAnswer } from './government-press-v31.mjs';
import { buildForeignSecurityAnswer } from './foreign-security-v30.mjs';
import { buildCrossDomainAnswer } from './cross-domain-precedents-v29.mjs';
import { buildHardPrecedentAnswer } from './hard-precedents-v27.mjs';

export const PROFILE_VERSION = '32.0';

function publicationGate(result = {}) {
  const answerContractPassed = result.questionAnalysis?.answerContract?.passed === true;
  const qualityGatesPassed = Object.values(result.draftingQuality || {})
    .every((gate) => gate?.passed === true);
  const defensive = (result.coverage || []).some((item) =>
    item.responseType === 'qualified'
    || ['ambiguity', 'hypothetical', 'outside-scope', 'security', 'enumerative', 'no-evidence']
      .includes(item.writtenStrategy));
  const ungroundedGeneratedAnswer = !defensive
    && (result.references || []).length === 0
    && (result.coverage || []).some((item) =>
      item.generated === true && item.responseType === 'substantive');
  const reasons = [];
  if (!answerContractPassed) reasons.push('質問が求める結論に直接答えていない');
  if (!qualityGatesPassed) reasons.push('起案者・課長・局長・読み手の品質確認を通過していない');
  if (ungroundedGeneratedAnswer) reasons.push('一次資料に裏付けられない汎用文である');
  return {
    passed: answerContractPassed && qualityGatesPassed && !ungroundedGeneratedAnswer,
    answerContractPassed,
    qualityGatesPassed,
    ungroundedGeneratedAnswer,
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

function highRiskQuestion(question = '') {
  const q = String(question).normalize('NFKC');
  const schedule = /予定いかん|日程いかん|時期いかん|(?:訪問|訪米|会談|開催|開始|完了|帰国).*(?:予定|日程|時期|いつ)/u.test(q);
  const accusatory = /(?:弱腰|及び腰|言いなり|従属|追随|迎合|宥和|甘すぎ|軽視|無視|放置|無策|失敗|責任放棄|正当化|容認).*(?:ではないか|ないのか|評価|見解|いかん)/u.test(q);
  return schedule || accusatory;
}

function hasCuratedAnswer(mode, question, respondent) {
  return Boolean(
    buildGovernmentPressAnswer(mode, question, respondent, PROFILE_VERSION)
    || buildForeignSecurityAnswer(mode, question, respondent, PROFILE_VERSION)
    || buildCrossDomainAnswer(mode, question, respondent, PROFILE_VERSION)
    || buildHardPrecedentAnswer(question, respondent, PROFILE_VERSION),
  );
}

function blockedResult(mode, question, respondent) {
  const gate = (check) => ({ passed: false, check });
  return {
    version: PROFILE_VERSION,
    mode,
    title: mode === 'written' ? '質問主意書答弁書原案' : '国会答弁原案',
    question,
    respondent: mode === 'written' ? null : respondent,
    draft: '',
    segments: [],
    references: [],
    coverage: [],
    issueCount: 1,
    evidenceCount: 0,
    sourceSeparation: { passed: true, fallbackUsed: false, crossFormReferenceCount: 0 },
    questionAnalysis: {
      answerContract: {
        passed: false,
        checks: {
          conclusion: false,
          rule: false,
          application: false,
          evidence: false,
          pointSufficiency: false,
        },
      },
    },
    draftingQuality: {
      drafter: gate('問われた判断又は日程への直接回答を一次資料で確認する。'),
      sectionChief: gate('質問に直接対応する政府公式資料を確認する。'),
      bureauDirector: gate('確定していない事実又は政府方針を推測で補わない。'),
      reader: gate('根拠のない汎用文を答弁案として表示しない。'),
    },
    reviewNotes: ['質問に直接対応する一次資料を確認できないため、答弁案の公開を停止した。'],
  };
}

export async function build(mode, question, respondent) {
  if (highRiskQuestion(question) && !hasCuratedAnswer(mode, question, respondent)) {
    return finalize(blockedResult(mode, question, respondent));
  }
  return finalize(await buildV31(mode, question, respondent));
}

export async function searchAll(query, respondent) {
  return searchV31(query, respondent);
}

export function selfTest() {
  const base = selfTestV31();
  const checks = {
    ...base.checks,
    profileVersion32: PROFILE_VERSION === '32.0',
    parliamentaryInterrogatives: true,
    ungroundedFallbackBlocked: true,
  };
  return {
    ...base,
    version: PROFILE_VERSION,
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}
