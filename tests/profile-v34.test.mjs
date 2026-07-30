import test from 'node:test';
import assert from 'node:assert/strict';

import { build, PROFILE_VERSION } from '../lib/profile-v34.mjs';

const ROLES = ['prime', 'chief', 'minister', 'official'];

test('複数国への弱腰問は結論に続けて全対象へ一段落ずつ答える', async () => {
  const question = '日本政府は中国、北朝鮮、ロシアいずれに対しても弱腰なのではないか。';
  for (const role of ROLES) {
    const draft = await build('speech', question, role);
    assert.equal(PROFILE_VERSION, '34.0');
    assert.equal(draft.publicationGate?.passed, true, role);
    assert.equal(draft.questionAnalysis?.answerContract?.checks?.targetCoverage, true, role);
    assert.deepEqual(draft.questionAnalysis?.answerContract?.requiredTargets,
      ['中国', '北朝鮮', 'ロシア']);
    assert.equal((draft.draft.match(/^○　/gmu) || []).length, 4, role);
    assert.match(draft.segments[1].text, /御指摘は当たらない/u, role);
    for (const target of ['中国', '北朝鮮', 'ロシア']) {
      assert.ok(draft.coverage.some((item) => item.topic.includes(target)), `${role}/${target}`);
      assert.match(draft.draft, new RegExp(`${target}に対しては`, 'u'), role);
    }
    assert.equal(draft.references.length, 3, role);
  }
});

test('複数対象を一部しか答えた原案は質問契約を通らない', async () => {
  const question = '日本政府は中国、北朝鮮、ロシアいずれに対しても弱腰なのではないか。';
  const draft = await build('speech', question, 'prime');
  const omitted = {
    ...draft,
    draft: draft.draft.replace(/○　北朝鮮[^○]+/u, ''),
    segments: draft.segments.filter((segment) => !/北朝鮮に対しては/u.test(segment.text || '')),
  };
  const { evaluateQuestionContract } = await import('../lib/question-contract-v29.mjs');
  const contract = evaluateQuestionContract(omitted, question);
  assert.equal(contract.checks.targetCoverage, false);
  assert.equal(contract.passed, false);
});

test('主意書のトランプ政権対応は二文に圧縮し、口頭答弁の詳細を持ち込まない', async () => {
  for (const role of ROLES) {
    const draft = await build('written', 'トランプ政権への対応方針いかん。', role);
    assert.equal(draft.publicationGate?.passed, true, role);
    assert.ok(draft.draft.length <= 180, `${role}/${draft.draft.length}`);
    assert.equal((draft.draft.match(/。/gu) || []).length, 2, role);
    assert.match(draft.draft, /日米同盟/u, role);
    assert.match(draft.draft, /国益/u, role);
    assert.match(draft.draft, /我が国の立場/u, role);
    assert.match(draft.draft, /必要な協議/u, role);
    assert.doesNotMatch(draft.draft, /指揮・統制|訓練|拡大抑止|関税|直接意思疎通/u, role);
    assert.equal(draft.references.length, 2, role);
  }
});

test('答弁書用例は長句に加えて単独助詞まで全て移動先を持つ', async () => {
  const draft = await build('written', 'トランプ政権への対応方針いかん。', 'prime');
  const phrases = new Set(draft.usageExamples.map((item) => item.phrase));
  for (const particle of ['は', 'を', 'に', 'で', 'と', 'の']) {
    assert.ok(phrases.has(particle), particle);
  }
  const exampleKeys = new Set(draft.usageExamples.map((item) => item.usageKey));
  for (const span of draft.segments[0].usageSpans) {
    assert.ok(exampleKeys.has(span.usageKey), span.usageKey);
    assert.ok(span.end > span.start, span.id);
  }
  assert.equal(draft.usageGranularity, '短句・助詞・接続語単位');
});
