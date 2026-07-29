import { VERSION, clean } from './lib/core.mjs';
import { build, searchAll, selfTest } from './lib/draft.mjs';
import { writtenIndexStats } from './lib/written.mjs';

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

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, 'https://local');

    if (u.pathname.endsWith('/health')) return json(res, 200, { ok: true, version: VERSION });
    if (u.pathname.endsWith('/self-test')) return json(res, 200, selfTest());

    if (u.pathname.endsWith('/smoke-test')) {
      const speech = await build('speech', '我が国はアメリカの言いなりなのか。', 'prime');
      const written = await build('written', '尖閣諸島、竹島及び北方領土はいずれも我が国固有の領土か。', 'minister');
      const precedent = await build('written', '暗号資産に対する基本的な認識を問う。', 'minister');
      const guard = await build('speech', '岸田外交の基本姿勢について、政府の認識を問う。', 'minister');
      const indexStats = await writtenIndexStats();
      const wsegs = written.segments.filter((x) => x.referenceKey);
      const checks = {
        speechIntent: speech.draft.includes('主体的') && !speech.draft.includes('沖縄の未来'),
        speechEvidence: speech.references.every((x) => /日米|米国|アメリカ/.test(`${x.title} ${x.phrase}`)),
        writtenNoRespondent: written.respondent === null,
        writtenMultiIssue: written.issueCount === 3,
        territoryEvidence:
          wsegs.length === 3 &&
          /尖閣/.test(refText(written, wsegs[0])) &&
          /竹島/.test(refText(written, wsegs[1])) &&
          /北方/.test(refText(written, wsegs[2])),
        plainStyle:
          [speech, written, precedent, guard].every((x) => x.style === '常体') &&
          !/(まいります|ございます|おります|ておる|ました。|ます。|です。)/.test(
            speech.draft + written.draft + precedent.draft + guard.draft,
          ),
        writtenIndex: indexStats.count > 0,
        writtenSource: precedent.references.some(
          (x) => x.sourceType === 'written' && /暗号資産/.test(`${x.title} ${x.phrase}`),
        ),
        topicGuard:
          !/(国家公務員|労働基本権|人事院勧告|著作権者|公的機関が利用)/.test(guard.draft) &&
          (guard.references.length === 0 ||
            guard.references.every((x) => /岸田|外交/.test(`${x.title} ${x.phrase}`))),
        alwaysDraft: Boolean(speech.draft && written.draft && precedent.draft && guard.draft),
      };
      return json(res, 200, {
        version: VERSION,
        passed: Object.values(checks).every(Boolean),
        checks,
        indexStats,
        samples: { speech, written, precedent, guard },
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
          d.references.length > 0 &&
          d.references.every((x) => c.terms.test(`${x.title} ${x.phrase}`));
        results.push({
          question: c.q,
          hasDraft: Boolean(d.draft),
          evidenceCount: d.evidenceCount,
          onTopic,
          style: d.style,
          formalStyle: !/(まいります|ございます|おります|ておる|おきまして|ました。|ます。|です。)/.test(d.draft),
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
        plainStyle: results.every((x) => x.style === '常体' && x.formalStyle),
        broadEvidence: results.filter((x) => x.evidenceCount > 0).length >= 3,
        onTopic: results.filter((x) => x.evidenceCount > 0).every((x) => x.onTopic),
      };
      return json(res, 200, {
        version: VERSION,
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
        version: VERSION,
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
        generatedBy: `draft-engine-v${VERSION}`,
        disclaimer: '起案補助用。正式使用前に主管府省で最新の事実関係及び政府方針を確認すること。',
      });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, 502, { error: e?.message || '処理に失敗した。', version: VERSION });
  }
}
