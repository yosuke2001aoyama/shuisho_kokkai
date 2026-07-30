import test from 'node:test';
import assert from 'node:assert/strict';

import { build, PROFILE_VERSION } from '../lib/profile-v33.mjs';

const RESPONDENTS = ['prime', 'chief', 'minister', 'official'];
const MODES = ['speech', 'written'];

test('トランプ政権への対応は国益・協力・相違時の協議・分野別行動まで答える', async () => {
  const question = '米国のトランプ政権に日本政府としてどう対処するのか。';
  for (const respondent of RESPONDENTS) {
    for (const mode of MODES) {
      const draft = await build(mode, question, respondent);
      assert.equal(draft.version, PROFILE_VERSION);
      assert.equal(draft.publicationGate?.passed, true, `${mode}/${respondent}`);
      assert.equal(draft.questionAnalysis?.answerContract?.type, 'measures', `${mode}/${respondent}`);
      assert.ok(draft.questionAnalysis.answerContract.actualPoints >= 5, `${mode}/${respondent}`);
      assert.match(draft.draft, /国益を最大化/u, `${mode}/${respondent}`);
      assert.match(draft.draft, /一方的に追随するのではなく/u, `${mode}/${respondent}`);
      assert.match(draft.draft, /安全保障面では/u, `${mode}/${respondent}`);
      assert.match(draft.draft, /経済面では/u, `${mode}/${respondent}`);
      assert.match(draft.draft, /関税/u, `${mode}/${respondent}`);
      assert.equal(draft.references.length, 4, `${mode}/${respondent}`);
      assert.equal(draft.synthesis?.mode, 'official-source-synthesis', `${mode}/${respondent}`);
      assert.equal(draft.synthesis?.trace?.length, 5, `${mode}/${respondent}`);
      assert.ok(draft.references.every((reference) =>
        !/質問主意書|答弁書/u.test(`${reference.sourceType} ${reference.title}`)),
      `${mode}/${respondent}`);
      if (mode === 'written') {
        assert.doesNotMatch(draft.draft, /私としては/u, respondent);
        assert.doesNotMatch(draft.draft, /^○　/mu, respondent);
      } else {
        assert.equal((draft.draft.match(/^○　/gmu) || []).length, 5, respondent);
        assert.doesNotMatch(draft.segments[1]?.text || '', /^○　(?:さらに|また)[、，]/u, respondent);
      }
    }
  }
});

test('一致前例がなくても空欄にせず、生成根拠と確認境界を付ける', async () => {
  const questions = [
    '月面資源採掘の国際許可制度の開始予定いかん。',
    '海底データセンターの耐災害認証制度を放置しているのは政府が無策だからではないか。',
  ];
  for (const question of questions) {
    for (const respondent of RESPONDENTS) {
      for (const mode of MODES) {
        const draft = await build(mode, question, respondent);
        assert.equal(draft.publicationGate?.passed, true, `${mode}/${respondent}/${question}`);
        assert.ok(draft.draft.trim(), `${mode}/${respondent}/${question}`);
        assert.equal(draft.references.length, 0, `${mode}/${respondent}/${question}`);
        assert.equal(draft.synthesis?.mode, 'reasoned-policy-generation', `${mode}/${respondent}/${question}`);
        assert.ok((draft.synthesis?.trace || []).length >= 3, `${mode}/${respondent}/${question}`);
        assert.ok((draft.reviewNotes || []).some((note) => /主管府省/u.test(note)),
          `${mode}/${respondent}/${question}`);
        assert.equal(draft.questionAnalysis?.answerContract?.passed, true,
          `${mode}/${respondent}/${question}`);
      }
    }
  }
});

test('既存の精密な外交・安保答弁を一般生成で上書きしない', async () => {
  const question = '尖閣諸島周辺で中国海警船による領海侵入があった場合、政府はどう対応するのか。';
  const draft = await build('speech', question, 'prime');
  assert.equal(draft.publicationGate?.passed, true);
  assert.equal(draft.foreignSecurityDomain?.id, 'china-coast-guard');
  assert.ok(draft.references.length > 0);
  assert.match(draft.draft, /海上保安庁が警告及び退去要求/u);
  assert.notEqual(draft.synthesis?.mode, 'reasoned-policy-generation');
});

test('外交以外の主要政策分野でも説明付き原案を生成する', async () => {
  const questions = [
    '量子暗号通信の輸出審査基準の開始予定いかん。',
    '新たな地域通貨の金融監督制度の開始予定いかん。',
    '遠隔手術設備の安全認証制度の開始予定いかん。',
    '複合災害時の広域避難認証制度の開始予定いかん。',
    '仮想教室の学習評価制度の開始予定いかん。',
    '海洋炭素回収設備の環境認証制度の開始予定いかん。',
    '生成AI監査人の登録制度の開始予定いかん。',
    '培養肉の学校給食導入基準の開始予定いかん。',
    '地方移住者向け共助基金の開始予定いかん。',
    '省庁横断申請の共通審査制度の開始予定いかん。',
  ];
  for (const question of questions) {
    const oral = await build('speech', question, 'minister');
    const written = await build('written', question, 'minister');
    for (const draft of [oral, written]) {
      assert.equal(draft.publicationGate?.passed, true, question);
      assert.equal(draft.synthesis?.mode, 'reasoned-policy-generation', question);
      assert.ok((draft.synthesis?.trace || []).length >= 3, question);
      assert.match(draft.draft, /現時点で/u, question);
      assert.match(draft.draft, /決まっていない/u, question);
    }
  }
});

test('法適用・諾否・権限・数量・定義・理由・認識の未知問も空欄にしない', async () => {
  const cases = [
    ['架空島に対して架空条約第九条は適用されるのか。', 'legal-applicability'],
    ['海底都市は政府の正式な首都なのか。', 'yes-no'],
    ['月面調停制度はどの機関が決定するのか。', 'authority'],
    ['深海観光船の安全審査は何件か。', 'quantity'],
    ['量子公共財とは何か。', 'definition'],
    ['なぜ空中農地の監督制度が必要なのか。', 'reason'],
    ['火星通信遅延に対する政府の認識を問う。', 'recognition'],
  ];
  for (const [question, expectedType] of cases) {
    const draft = await build('speech', question, 'minister');
    assert.equal(draft.questionAnalysis?.answerContract?.type, expectedType, question);
    assert.equal(draft.questionAnalysis?.answerContract?.passed, true, question);
    assert.equal(draft.publicationGate?.passed, true, question);
    assert.ok(draft.draft.trim(), question);
    assert.equal(draft.synthesis?.mode, 'reasoned-policy-generation', question);
    assert.ok((draft.synthesis?.trace || []).length >= 3, question);
  }
});
