import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { build } from '../lib/profile-v26.mjs';
import { categoryOfSpeech } from '../api/lib/core.mjs';
import { getOfficialStyleGuide } from '../api/lib/official-style.mjs';

const crisisQuestion = '麻生副総裁は、中国による台湾侵攻は存立危機事態である可能性が高いと発言しているが、総理はどう考えるのか。また、台湾海峡が海上封鎖された場合、存立危機事態になり得るのか。';

test('同じ主題の複数の聞き方を一論点に統合する', async () => {
  const result = await build('speech', crisisQuestion, 'prime');
  assert.equal(result.issueCount, 1);
  assert.equal(result.questionAnalysis.askedUnits, 2);
  assert.equal(result.questionAnalysis.logicalIssues, 1);
  assert.match(result.draft, /^○　/mu);
  assert.doesNotMatch(result.draft, /●|論点[一二三四五六七八九十\d]/u);
  assert.match(result.draft, /個別具体的な状況/u);
  assert.match(result.draft, /全ての情報を総合/u);
  assert.ok(result.references.some((reference) => reference.url.includes('b219071')));
});

test('独立した主題だけを分け、白丸段落で答える', async () => {
  const result = await build('speech', '物価高への対応を問う。また、中小企業への支援策を示されたい。', 'minister');
  assert.equal(result.issueCount, 2);
  assert.match(result.draft, /＜物価高＞/u);
  assert.match(result.draft, /＜中小企業＞/u);
  assert.ok((result.draft.match(/^○　/gmu) || []).length >= 2);
  assert.doesNotMatch(result.draft, /●|論点[一二三四五六七八九十\d]|【[^】]+】/u);
});

test('単一主題の長い答弁に論点見出しを付けない', async () => {
  const result = await build('speech', '物価高への政府の認識、具体的な対応及び今後の方針を示されたい。', 'minister');
  assert.equal(result.issueCount, 1);
  assert.ok((result.draft.match(/^○　/gmu) || []).length >= 3);
  assert.doesNotMatch(result.draft, /＜[^＞]+＞|●|論点[一二三四五六七八九十\d]|【[^】]+】/u);
});

test('政治的評価への答弁は四つの職責ごとに結論・根拠・行動まで示す', async () => {
  const roles = ['prime', 'chief', 'minister', 'official'];
  const results = await Promise.all(roles.map((role) =>
    build('speech', '日本は米国の言いなりなのではないか。', role)));
  for (const result of results) {
    assert.ok((result.draft.match(/^○　/gmu) || []).length >= 3);
    assert.match(result.segments[1].text, /御指摘は当たらない|米国の意向だけで決定されるものではない/u);
    assert.match(result.draft, /国益/u);
    assert.match(result.draft, /国民の生命と財産/u);
    assert.ok(Object.values(result.draftingQuality).every((gate) => gate.passed));
    assert.equal(result.questionAnalysis.groupingNote, undefined);
  }
  assert.equal(new Set(results.map((result) => result.draft)).size, roles.length);
  assert.match(results[0].draft, /私として/u);
  assert.match(results[1].draft, /官房長官として/u);
  assert.match(results[2].draft, /所管/u);
  assert.match(results[3].draft, /制度及び政策決定の実務/u);
});

test('官房長官答弁を総理と大臣の間の独立区分として扱う', () => {
  assert.equal(categoryOfSpeech({ speakerPosition: '内閣官房長官' }), 'chief');
  const html = readFileSync(new URL('../public/index-v2.html', import.meta.url), 'utf8');
  const prime = html.indexOf('data-value="prime"');
  const chief = html.indexOf('data-value="chief"');
  const minister = html.indexOf('data-value="minister"');
  const official = html.indexOf('data-value="official"');
  assert.ok(prime < chief && chief < minister && minister < official);
});

test('画面から利用者向けでない説明と質問主意書生成を除く', () => {
  const html = readFileSync(new URL('../public/index-v2.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /DIRECT · TRACEABLE|質問に直接答える。|聞かれていない論点は増やさない。/u);
  assert.doesNotMatch(html, /質問文の要求だけを抽出し/u);
  assert.doesNotMatch(html, /独立した主題だけを分け/u);
  assert.doesNotMatch(html, /value="question"|質問主意書原案を作成/u);
  assert.doesNotMatch(html, /id="analysis"|id="groupingNote"/u);
});

test('質問主意書答弁書は公表済み方針に即して直接答える', async () => {
  const result = await build(
    'written',
    '政府は、生成AIの開発及び利用の促進と著作権者の権利保護をどのように両立させるのか。政府の認識及び具体的な対応を明らかにされたい。',
    'minister',
  );
  assert.equal(result.issueCount, 1);
  assert.match(result.draft, /一及び二について/u);
  assert.match(result.draft, /生成ＡＩの開発及び利用を促進/u);
  assert.match(result.draft, /著作権者の権利及び創作活動を適切に保護/u);
  assert.doesNotMatch(result.draft, /お尋ねの趣旨.*明らかではない|お答えすることは困難/u);
  assert.equal(result.officialStyleCheck.passed, true);
  assert.ok(result.references.some((reference) => reference.sourceName === '文化庁'));
});

test('用例集に口頭答弁の白丸段落と公用文資料を含む', () => {
  const guide = getOfficialStyleGuide();
  assert.ok(guide.entries.some((entry) => entry.expression === '○（白丸）段落'));
  assert.ok(guide.sources.some((source) => source.sourceName === '文化庁'));
  assert.ok(guide.sources.some((source) => source.sourceName === '日本経済研究センター'));
  assert.ok(guide.sources.some((source) => source.sourceName === 'Amazon Web Services'));
});
