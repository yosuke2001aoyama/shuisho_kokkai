import{VERSION,clean,toPlainStyle,bestPassage,relevance}from'./core.mjs';
const TTL=30*60*1000,cache=globalThis.__shuishoCache||(globalThis.__shuishoCache=new Map());
function decodeResponse(buffer,contentType=''){const bytes=new Uint8Array(buffer),probe=new TextDecoder('windows-1252').decode(bytes.slice(0,8192)),declared=(contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)||probe.match(/charset\s*=\s*["']?([^;"'\s/>]+)/i)||[])[1]||'utf-8',label=/shift.?jis|sjis/i.test(declared)?'shift_jis':/euc.?jp/i.test(declared)?'euc-jp':'utf-8';try{return new TextDecoder(label).decode(bytes)}catch{return new TextDecoder('utf-8').decode(bytes)}}
async function cachedFetch(url,ttl=TTL){const key=`v${VERSION}:official:${url}`,old=cache.get(key);if(old&&Date.now()-old.at<ttl)return old.value;const r=await fetch(url,{headers:{'User-Agent':`ShuishoKokkai/${VERSION}`,'Accept-Language':'ja,en;q=0.8'},signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(`${r.status} ${url}`);const value=decodeResponse(await r.arrayBuffer(),r.headers.get('content-type')||'');cache.set(key,{at:Date.now(),value});return value}
const absolute=(base,href)=>{try{return new URL(href.replace(/&amp;/g,'&'),base).toString()}catch{return''}};
const INDEXES=[
{url:'https://www.mofa.go.jp/mofaj/press/iken/index.html',type:'interview',sourceName:'外務省・インタビュー等'},
{url:'https://www.mofa.go.jp/mofaj/press/index.html',type:'press',sourceName:'外務省'},
{url:'https://www.mofa.go.jp/mofaj/press/kaiken/',type:'press',sourceName:'外務省・記者会見'},
{url:'https://www.mofa.go.jp/mofaj/press/kaiken/gaisho/index.html',type:'press',sourceName:'外務省・外務大臣会見',category:'minister',speakerPosition:'外務大臣'},
{url:'https://www.mod.go.jp/j/press/kisha/',type:'press',sourceName:'防衛省・防衛大臣会見',category:'minister',speakerPosition:'防衛大臣'},
{url:'https://www.kantei.go.jp/jp/105/statement/2026/index.html',type:'press',sourceName:'首相官邸・総理会見',category:'prime',speakerPosition:'内閣総理大臣'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202607/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202606/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202605/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202604/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202603/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202602/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/tyoukanpress/202601/index.html',type:'press',sourceName:'首相官邸・官房長官会見',category:'chief',speakerPosition:'内閣官房長官'},
{url:'https://www.kantei.go.jp/jp/105/discourse/',type:'press',sourceName:'首相官邸'},
{url:'https://www.kantei.go.jp/jp/104/discourse/',type:'press',sourceName:'首相官邸'},
{url:'https://www.kantei.go.jp/jp/kakugikettei/',type:'fact',sourceName:'首相官邸・閣議決定'},
{url:'https://www.mofa.go.jp/mofaj/gaiko/bluebook/',type:'fact',sourceName:'外務省・外交青書'},
{url:'https://www.mofa.go.jp/mofaj/gaiko/treaty/',type:'fact',sourceName:'外務省・条約'},
{url:'https://www.mod.go.jp/j/press/wp/',type:'fact',sourceName:'防衛省・防衛白書'},
{url:'https://www.env.go.jp/policy/hakusyo/',type:'fact',sourceName:'環境省・環境白書'},
{url:'https://www5.cao.go.jp/keizai3/whitepaper.html',type:'fact',sourceName:'内閣府・経済財政白書'},
{url:'https://www.cas.go.jp/jp/seisaku/',type:'fact',sourceName:'内閣官房'},
{url:'https://www.gov-online.go.jp/info/',type:'fact',sourceName:'政府広報オンライン'}];
function extractLinks(html,base,src){const links=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const title=clean(m[2]),url=absolute(base,m[1]);if(title.length<4||!/^https?:/.test(url)||/\.(?:pdf|zip)(?:$|[?#])/i.test(url))continue;links.push({title,url,sourceType:src.type,sourceName:src.sourceName,category:src.category||'',speakerPosition:src.speakerPosition||''})}return links}
export async function officialSearch(issue){const links=[];await Promise.all(INDEXES.map(async src=>{try{links.push(...extractLinks(await cachedFetch(src.url),src.url,src))}catch{}}));const ranked=links.filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i).map(x=>({...x,score:relevance(x.title,issue,x.title)})).filter(x=>x.score>=45).sort((a,b)=>b.score-a.score).slice(0,12);const out=(await Promise.all(ranked.map(async x=>{try{const html=await cachedFetch(x.url,60*60*1000),phrase=bestPassage(html,issue,x.title);if(!phrase)return null;const category=x.category||(/\/tyoukanpress\//u.test(x.url)?'chief':/\/statement\//u.test(x.url)?'prime':/mofa\.go\.jp\/mofaj\/press\/kaiken|mod\.go\.jp\/j\/press\/kisha/u.test(x.url)?'minister':'official_policy');const speakerPosition=x.speakerPosition||(category==='prime'?'内閣総理大臣':category==='chief'?'内閣官房長官':category==='minister'?(x.sourceName.includes('防衛')?'防衛大臣':'外務大臣'):'');return{id:`official:${x.url}`,sourceType:x.sourceType,category,phrase:toPlainStyle(phrase),title:x.title,url:x.url,sourceName:x.sourceName,speakerPosition,date:'',mediaType:x.sourceType==='press'?'video-with-official-text':'',transcriptBasis:x.sourceType==='press'?'公式ページ掲載文':'',score:relevance(phrase,issue,x.title)+40}}catch{return null}}))).filter(Boolean);return out.sort((a,b)=>b.score-a.score)}
export const officialAdapterCount=()=>INDEXES.length;
