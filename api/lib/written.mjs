import { VERSION, clean, toPlainStyle, bestPassage, relevance } from './core.mjs';

const TTL = 30 * 60 * 1000;
const cache = globalThis.__shuishoCache || (globalThis.__shuishoCache = new Map());
const normalize = (s = '') => String(s).normalize('NFKC');

function decodeResponse(buffer, contentType = '') {
  const bytes = new Uint8Array(buffer);
  const probe = new TextDecoder('windows-1252').decode(bytes.slice(0, 8192));
  const declared = (
    contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i) ||
    probe.match(/charset\s*=\s*["']?([^;"'\s/>]+)/i) ||
    []
  )[1] || 'utf-8';
  const label = /shift.?jis|sjis/i.test(declared)
    ? 'shift_jis'
    : /euc.?jp/i.test(declared)
      ? 'euc-jp'
      : 'utf-8';
  try {
    return normalize(new TextDecoder(label).decode(bytes));
  } catch {
    return normalize(new TextDecoder('utf-8').decode(bytes));
  }
}

async function cachedFetch(url, ttl = TTL) {
  const key = `v${VERSION}:fetch:${url}`;
  const old = cache.get(key);
  if (old && Date.now() - old.at < ttl) return old.value;
  const r = await fetch(url, {
    headers: { 'User-Agent': `ShuishoKokkai/${VERSION}`, 'Accept-Language': 'ja,en;q=0.8' },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const value = decodeResponse(await r.arrayBuffer(), r.headers.get('content-type') || '');
  cache.set(key, { at: Date.now(), value });
  return value;
}

const absolute = (base, href) => {
  try {
    return new URL(href.replace(/&amp;/g, '&'), base).toString();
  } catch {
    return '';
  }
};

function titleFromRow(row, house) {
  const text = normalize(clean(row));
  if (house === 'shugiin') {
    return (text.match(/^\s*\d+\s+(.+?質問主意書)(?:\s|$)/) || text.match(/(.+?質問主意書)/) || [])[1]?.trim() || '';
  }
  return (text.match(/件名\s+(.+?質問主意書)(?:\s|$)/) || text.match(/(.+?質問主意書)/) || [])[1]?.trim() || '';
}

function extractRows(html, base, house) {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const row of rows) {
    const hrefs = [...row.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const answerHref = house === 'shugiin'
      ? hrefs.find((h) => /(?:^|\/)b\d{6}\.htm(?:$|[?#])/i.test(h))
      : hrefs.find((h) => /(?:^|\/)touh\/t\d+\.htm(?:$|[?#])/i.test(h));
    if (!answerHref) continue;
    const title = titleFromRow(row, house);
    if (title.length < 4) continue;
    out.push({ title, url: absolute(base, answerHref) });
  }
  return out;
}

async function writtenIndex() {
  const key = `written-index-v${VERSION}`;
  const old = cache.get(key);
  if (old && Date.now() - old.at < TTL) return old.value;
  const sessions = Array.from({ length: 16 }, (_, i) => 222 - i);
  const jobs = [];
  for (const n of sessions) {
    const s3 = String(n).padStart(3, '0');
    jobs.push((async () => {
      const url = `https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/kaiji${n}_l.htm`;
      try {
        return extractRows(await cachedFetch(url), url, 'shugiin').map((x) => ({ ...x, house: '衆議院', session: n }));
      } catch {
        return [];
      }
    })());
    jobs.push((async () => {
      const url = `https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/${s3}/syuisyo.htm`;
      try {
        return extractRows(await cachedFetch(url), url, 'sangiin').map((x) => ({ ...x, house: '参議院', session: n }));
      } catch {
        return [];
      }
    })());
  }
  const value = (await Promise.all(jobs)).flat().filter((x, i, a) => a.findIndex((y) => y.url === x.url) === i);
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function writtenSearch(issue) {
  const index = await writtenIndex();
  const ranked = index
    .map((x) => ({ ...x, titleScore: relevance(x.title, issue, x.title) }))
    .filter((x) => x.titleScore >= 45)
    .sort((a, b) => b.titleScore - a.titleScore)
    .slice(0, 8);
  const out = (await Promise.all(ranked.map(async (x) => {
    try {
      const html = await cachedFetch(x.url, 60 * 60 * 1000);
      const phrase = bestPassage(html, issue, x.title);
      if (!phrase) return null;
      return {
        id: `written:${x.url}`,
        sourceType: 'written',
        category: 'cabinet',
        phrase: normalize(toPlainStyle(phrase)),
        title: normalize(x.title),
        url: x.url,
        sourceName: `${x.house}・閣議決定答弁書`,
        date: '',
        score: relevance(phrase, issue, x.title) + 90,
      };
    } catch {
      return null;
    }
  }))).filter(Boolean);
  return out.sort((a, b) => b.score - a.score);
}

export async function writtenIndexStats() {
  const x = await writtenIndex();
  return { count: x.length, sample: x.slice(0, 3) };
}
