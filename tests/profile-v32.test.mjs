import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeQuestionContract } from '../lib/question-contract-v29.mjs';
import { build, PROFILE_VERSION } from '../lib/profile-v32.mjs';

test('対中弱腰問は明示的に否定し、政府方針を一次資料で説明する', async () => {
  for (const respondent of ['prime', 'chief', 'minister', 'official']) {
    const draft = await build(
      'speech',
      '我が国は中国に対して弱腰なのではないか。',
      respondent,
    );
    assert.equal(draft.publicationGate?.passed, true, respondent);
    assert.match(draft.segments[1]?.text || '', /御指摘は当たらない/u);
    assert.match(draft.draft, /主張すべきは主張.*責任ある行動を強く求め.*主体的に対応/us);
    assert.doesNotMatch(draft.draft, /関係法令及び個別具体的な状況|政策効果/u);
    assert.equal((draft.draft.match(/^○　/gmu) || []).length, 2);
    assert.ok(draft.references.some((reference) => /日中関係/u.test(reference.title || '')));
  }
});

test('予定いかんを日程問として扱い、訪米日程を直接答える', async () => {
  const question = '日米首脳会談及び高市総理の訪米の予定いかん。';
  assert.equal(analyzeQuestionContract(question).type, 'timeline');
  for (const mode of ['speech', 'written']) {
    const draft = await build(mode, question, 'prime');
    assert.equal(draft.publicationGate?.passed, true, mode);
    assert.match(draft.draft, /令和八年三月十八日から二十日まで/u);
    assert.match(draft.draft, /日米首脳会談/u);
    assert.match(draft.draft, /二十一日に帰国/u);
    assert.doesNotMatch(draft.draft, /関係法令及び個別具体的な状況|政策効果/u);
    assert.ok(draft.references.some((reference) =>
      /高市内閣総理大臣の米国訪問/u.test(reference.title || '')));
  }
});

test('国会特有のいかん表現を要求述語として分類する', () => {
  assert.equal(analyzeQuestionContract('政府の対中姿勢に関する見解いかん。').type, 'evaluation');
  assert.equal(analyzeQuestionContract('当該措置を採った理由いかん。').type, 'reason');
  assert.equal(analyzeQuestionContract('総理訪米の日程いかん。').type, 'timeline');
});

test('一次資料のない汎用逃げ答弁は公開不可とする', async () => {
  const draft = await build(
    'speech',
    '我が国は架空国に対して弱腰なのではないか。',
    'minister',
  );
  assert.equal(PROFILE_VERSION, '32.0');
  assert.equal(draft.publicationGate?.passed, false);
  assert.equal(draft.draft, '');
  assert.equal(draft.references.length, 0);
  assert.ok(draft.publicationGate?.reasons.length > 0);
});
