import { clean } from './lib/core.mjs';
import { build, searchAll, selfTest, PROFILE_VERSION } from './lib/profile-v17.mjs';
import { writtenIndexStats } from './lib/written.mjs';
import { getOfficialStyleGuide } from './lib/official-style.mjs';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
};

const refText = (draft, segment) => {
  const ref = draft.references.find((x) => x.referenceKey === segment.referenceKey);
  return `${ref?.title || ''} ${ref?.phrase || ''}`;
};

const defensiveStrategy = (value) => [
  'ambiguity',
  'evaluation',
  'hypothetical',
  'outside-scope',
  'security',
  'enumerative',
  'no-evidence',
].includes(value);

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, 'https://local');

    if (u.pathname.endsWith('/health')) {
      return json(res, 200, {
        ok: true,
        version: PROFILE_VERSION,
        draftingProfile: 'oral-coherent-full-answer/written-strict-cabinet-document',
      });
    }
    if (u.pathname.endsWith('/self-test')) return json(res, 200, selfTest());
    if (u.pathname.endsWith('/style-guide')) return json(res, 200, getOfficialStyleGuide());

    if (u.pathname.endsWith('/smoke-test')) {
      const speech = await build(
        'speech',
        '物価高への対応を問う。また、賃上げをどのように実現するのか。さらに、中小企業への支援策を示されたい。',
        'minister',
      );
      const written = await build(
        'written',
        '尖閣諸島、竹島及び北方領土はいずれも我が国固有の領土か。',
        'minister',
      );
      const vagueSpeech = await build(
        'speech',
        '御指摘の「真に十分な少子化対策」とは何か。政府の評価基準と今後の対応を示されたい。',
        'minister',
      );
      const vagueWritten = await build(
        'written',
        '御指摘の「真に十分な少子化対策」とは何か。政府の評価基準と今後の対応を示されたい。',
        'minister',
      );
      const privateWritten = await build(
        'written',
        '民間報道機関が個別の取材で得た情報を政府は全て把握しているか。',
        'minister',
      );
      const hypotheticalWritten = await build(
        'written',
        '仮に全ての原子力発電所を直ちに廃止した場合の影響を網羅的に示されたい。',
        'minister',
      );
      const indexStats = await writtenIndexStats();
      const wsegs = written.segments.filter((x) => x.referenceKey);
      const checks = {
        speechMinimumPoints:
          speech.coverageSummary.missing === 0 &&
          speech.coverage.every((x) => x.pointCount === 4) &&
          speech.coverageSummary.totalPoints === speech.issueCount * 4,
        speechStructured:
          /● 論点一/.test(speech.draft) &&
          /【結論】/.test(speech.draft) &&
          /【基本認識】/.test(speech.draft) &&
          /【具体的な対応】/.test(speech.draft) &&
          /【今後の方針】/.test(speech.draft),
        speechNoOneBullet: (speech.draft.match(/^● 論点/gmu) || []).length === speech.issueCount,
        speechNoDebateFragments:
          !/お尋ねの|御指摘|委員|議員|昨日は|私も|連合さん|まあ|おっしゃ|通告|時間の関係/.test(speech.draft),
        vagueSpeechExplains:
          vagueSpeech.coverage.every((x) => x.pointCount === 4) &&
          /【結論】/.test(vagueSpeech.draft) &&
          !/お答えすることは困難である/.test(vagueSpeech.draft),
        writtenNoRespondent: written.respondent === null && vagueWritten.respondent === null,
        writtenMultiIssue: written.issueCount >= 3 && written.missingIssueCount === 0,
        writtenHeadings:
          /^一について/mu.test(written.draft) &&
          /^二について/mu.test(written.draft) &&
          /^三について/mu.test(written.draft),
        territoryEvidence:
          wsegs.length >= 3 &&
          wsegs.some((x) => /尖閣/.test(refText(written, x))) &&
          wsegs.some((x) => /竹島/.test(refText(written, x))) &&
          wsegs.some((x) => /北方/.test(refText(written, x))),
        vagueWrittenRefuses:
          vagueWritten.coverage.every((x) => defensiveStrategy(x.writtenStrategy)) &&
          /具体的に意味するところが必ずしも明らかではない/.test(vagueWritten.draft) &&
          /お答えすることは困難である|一概にお答えすることは困難である/.test(vagueWritten.draft) &&
          vagueWritten.references.length === 0,
        outsideScopeRefuses:
          privateWritten.coverage.every((x) => x.writtenStrategy === 'outside-scope') &&
          /政府として把握する立場にない/.test(privateWritten.draft) &&
          privateWritten.references.length === 0,
        hypotheticalRefuses:
          hypotheticalWritten.coverage.every((x) => x.writtenStrategy === 'hypothetical') &&
          /仮定を前提/.test(hypotheticalWritten.draft) &&
          /一概にお答えすることは困難である/.test(hypotheticalWritten.draft) &&
          hypotheticalWritten.references.length === 0,
        profileDifference:
          /【結論】/.test(vagueSpeech.draft) &&
          !/【結論】/.test(vagueWritten.draft) &&
          vagueWritten.coverageSummary.qualifiedOrLimited >= 1,
        plainStyle:
          [speech, written, vagueSpeech, vagueWritten, privateWritten, hypotheticalWritten].every((x) => x.style === '常体'),
        writtenOfficialStyle:
          [written, vagueWritten, privateWritten, hypotheticalWritten].every((x) => x.officialStyleCheck?.passed),
        writtenIndex: indexStats.count > 0,
        alwaysDraft:
          [speech, written, vagueSpeech, vagueWritten, privateWritten, hypotheticalWritten].every((x) => Boolean(x.draft)),
      };
      return json(res, 200, {
        version: PROFILE_VERSION,
        passed: Object.values(checks).every(Boolean),
        checks,
        indexStats,
        samples: { speech, written, vagueSpeech, vagueWritten, privateWritten, hypotheticalWritten },
      });
    }

    if (u.pathname.endsWith('/regression-test')) {
      const cases = [
        { q: '物価高に対する政府の対応を問う。', terms: /物価高|物価/ },
        { q: '少子化対策をどのように強化するのか。', terms: /少子化|少子|子育て/ },
        { q: '台湾海峡の平和と安定に対する政府の認識を問う。', terms: /台湾海峡|台湾/ },
        { q: '生成ＡＩと著作権の関係について政府の見解を問う。', terms: /(?:生成)?AI.*著作権|著作権.*(?:生成)?AI|人工知能/ },
      ];
      const results = [];
      for (const c of cases) {
        const d = await build('speech', c.q, 'minister');
        const onTopic =
          d.references.length === 0 ||
          d.references.every((x) => c.terms.test(`${x.title} ${x.phrase}`));
        results.push({
          question: c.q,
          hasDraft: Boolean(d.draft),
          evidenceCount: d.evidenceCount,
          onTopic,
          style: d.style,
          coverage: d.coverageSummary,
          pointCounts: d.coverage.map((x) => x.pointCount),
          formalStyle: !/(まいります|ございます|おります|ておる|おきまして|ました。|ます。|です。)/.test(d.draft),
          coherentStructure:
            /● 論点一/.test(d.draft) &&
            /【結論】/.test(d.draft) &&
            /【基本認識】/.test(d.draft) &&
            /【具体的な対応】/.test(d.draft) &&
            /【今後の方針】/.test(d.draft),
          draft: d.draft,
          references: d.references.map((x) => ({
            sourceType: x.sourceType,
            title: x.title,
            phrase: x.phrase,
            url: x.url,
          })),
        });
      }
      const checks = {
        allDraft: results.every((x) => x.hasDraft),
        allCovered: results.every((x) => x.coverage.missing === 0),
        fourPoints: results.every((x) => x.pointCounts.every((n) => n === 4)),
        coherentStructure: results.every((x) => x.coherentStructure),
        plainStyle: results.every((x) => x.style === '常体' && x.formalStyle),
        broadEvidence: results.filter((x) => x.evidenceCount > 0).length >= 3,
        onTopic: results.every((x) => x.onTopic),
      };
      return json(res, 200, {
        version: PROFILE_VERSION,
        passed: Object.values(checks).every(Boolean),
        checks,
        results,
      });
    }

    if (u.pathname.endsWith('/search')) {
      const q = clean(u.searchParams.get('q'));
      if (!q) return json(res, 400, { error: '検索語を入力してください。' });
      const respondent = ['prime', 'minister', 'official'].includes(u.searchParams.get('respondent'))
        ? u.searchParams.get('respondent')
        : 'minister';
      const results = await searchAll(q, respondent);
      return json(res, 200, {
        query: q,
        version: PROFILE_VERSION,
        coverage: {
          note: '国会答弁、衆参両院の質問主意書答弁書、会見・演説、インタビュー・寄稿及び政府公式資料を横断し、質問意図との適合性で絞り込んでいる。',
        },
        results,
      });
    }

    if (u.pathname.endsWith('/draft')) {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      let raw = '';
      for await (const c of req) raw += c;
      const body = raw ? JSON.parse(raw) : {};
      const question = clean(body.question);
      const mode = body.mode === 'written' ? 'written' : 'speech';
      const respondent = ['prime', 'minister', 'official'].includes(body.respondent)
        ? body.respondent
        : 'minister';
      if (question.length < 8) return json(res, 400, { error: '質問を8文字以上で入力してください。' });
      return json(res, 200, {
        ...(await build(mode, question, respondent)),
        mode,
        generatedBy: `draft-engine-profile-${PROFILE_VERSION}`,
        disclaimer: '起案補助用。正式使用前に主管府省で最新の事実関係、政府方針、法令引用及び用例との整合性を確認すること。',
      });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, 502, { error: e?.message || '処理に失敗した。', version: PROFILE_VERSION });
  }
}
