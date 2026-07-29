import { VERSION, toPlainStyle, categoryOfSpeech, bestPassage, relevance } from './core.mjs';

const normalize = (s = '') => String(s).normalize('NFKC');

export async function dietSearch(issue, respondent) {
  const all = [];
  for (const term of issue.queries.slice(0, 6)) {
    try {
      const p = new URLSearchParams({
        maximumRecords: '80',
        recordPacking: 'json',
        any: normalize(term),
      });
      const r = await fetch(`https://kokkai.ndl.go.jp/api/speech?${p}`, {
        headers: { Accept: 'application/json', 'User-Agent': `ShuishoKokkai/${VERSION}` },
        signal: AbortSignal.timeout(7000),
      });
      if (r.ok) all.push(...((await r.json()).speechRecord || []));
    } catch {}
  }

  const seen = new Set();
  const out = [];
  for (const x of all) {
    const id = x.speechID || x.speechURL;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const category = categoryOfSpeech(x);
    if (!category) continue;
    const title = normalize(`${x.nameOfHouse || ''} ${x.nameOfMeeting || ''}`.trim());
    const speech = normalize(x.speech || '');
    const phrase = bestPassage(speech, issue, title);
    if (!phrase) continue;
    const rawScore = relevance(phrase, issue, title);
    if (rawScore < 45) continue;
    const year = Number(String(x.date || '').slice(0, 4));
    const recencyBoost = Number.isFinite(year) ? Math.max(0, year - 2000) * 2 : 0;
    out.push({
      id,
      sourceType: 'answer',
      category,
      phrase: normalize(toPlainStyle(phrase)),
      title,
      url: x.speechURL || x.meetingURL || 'https://kokkai.ndl.go.jp/',
      sourceName: '国会会議録検索システム',
      date: x.date || '',
      speaker: normalize(x.speaker || ''),
      speakerPosition: normalize(x.speakerPosition || ''),
      score: rawScore + (category === respondent ? 90 : 0) + recencyBoost,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 14);
}
