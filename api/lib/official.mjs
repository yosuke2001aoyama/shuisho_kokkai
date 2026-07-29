import{VERSION,clean,toPlainStyle,bestPassage,relevance}from'./core.mjs';
const TTL=30*60*1000,cache=globalThis.__shuishoCache||(globalThis.__shuishoCache=new Map());
async function cachedFetch(url,ttl=TTL){const key=`fetch:${url}`,old=cache.get(key);if(old&&Date.now()-old.at<ttl)return old.value;const r=await fetch(url,{headers:{'User-Agent':`ShuishoKokkai/${VERSION}`},signal:AbortSignal.timeout(7000)});if(!r.ok)throw new Error(`${r.status} ${url}`);const value=await r.text();cache.set(key,{at:Date.now(),value});return value}
const absolute=(base,href)=>{try{return new URL(href,base).toString()}catch{return''}};
const INDEXES=[
{url:'https://www.mofa.go.jp/mofaj/press/iken/index.html',type:'interview',sourceName:'外務省'},
{url:'https://www.mofa.go.jp/mofaj/press/index.html',type:'press',sourceName:'外務省'},
{url:'https://www.mofa.go.jp/mofaj/press/kaiken/',type:'press',sourceName:'外務省'},
{url:'https://www.kantei.go.jp/jp/105/discourse/',type:'press',sourceName:'首相官邸'},
{url:'https://www.kantei.go.jp/jp/104/discourse/',type:'press',sourceName:'首相官邸'},
{url:'https://www.gov-online.go.jp/info/',type:'fact',sourceName:'政府広報オンライン'}];
function extractLinks(html,base,src){const links=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const title=clean(m[2]),url=absolute(base,m[1]);if(title.length<4||!/^https?:/.test(url)||/pdf$/i.test(url))continue;links.push({title,url,sourceType:src.type,sourceName:src.sourceName})}return links}
export async function officialSearch(issue){const links=[];await Promise.all(INDEXES.map(async src=>{try{links.push(...extractLinks(await cachedFetch(src.url),src.url,src))}catch{}}));const ranked=links.map(x=>({...x,score:relevance(x.title,issue,x.title)})).filter(x=>x.score>=28).sort((a,b)=>b.score-a.score).slice(0,5);const out=(await Promise.all(ranked.map(async x=>{try{const html=await cachedFetch(x.url,60*60*1000),phrase=bestPassage(html,issue,x.title);if(!phrase)return null;return{id:`official:${x.url}`,sourceType:x.sourceType,category:'official_policy',phrase:toPlainStyle(phrase),title:x.title,url:x.url,sourceName:x.sourceName,date:'',score:relevance(phrase,issue,x.title)+30}}catch{return null}}))).filter(Boolean);return out.sort((a,b)=>b.score-a.score)}
export const officialAdapterCount=()=>INDEXES.length;
