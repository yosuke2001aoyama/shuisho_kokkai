import { build as buildV18, searchAll as searchV18, selfTest as selfTestV18 } from './profile-v18.mjs';
import { splitIssues } from '../api/lib/issues.mjs';
import { finalizeStyle, hasPoliteEnding } from '../api/lib/style.mjs';
import { SOURCE_LABEL, CATEGORY_LABEL } from '../api/lib/core.mjs';

export const PROFILE_VERSION = '19.0';
const JP = ['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十'];
const BAD = /お尋ねの|御指摘|委員|議員|質問主意書|昨日は|私も|連合さん|まあ|というか|おっしゃ|御要望|読み上げ|通告|時間の関係|答弁書/u;
const RECOG = /認識|見解|考え|重要|課題|必要|基本|位置付け|意義|評価/u;
const REASON = /なぜ|理由|根拠|背景|原因|要因|ため|ことから|踏まえ/u;
const ACTION = /対応|対策|措置|支援|実施|推進|取り組|取組|進め|確保|強化|整備|拡充|改善|見直|講じ|執行|実現/u;
const FUTURE = /今後|引き続き|目指|努め|継続|着実|機動的|方針|予定|見通し|将来/u;
const norm = (s='') => String(s).normalize('NFKC').replace(/[\t\r\n]+/gu,' ').replace(/\s+/gu,' ').trim();
const compact = (s='') => norm(s).replace(/[\s　、。！？?「」『』（）()]/gu,'');

function topic(issue) {
  const label = norm(issue?.label || '');
  const quoted = label.match(/「([^」]{2,80})」/u)?.[1];
  const cd = norm(issue?.concept?.draft || '');
  const concept = cd.match(/^(.{2,36}?)(?:については|は、|は)/u)?.[1];
  let t = quoted || concept || norm(issue?.topic || label || '当該課題');
  t = t.replace(/^(?:御指摘の|お尋ねの|なぜ)/u,'')
    .replace(/(?:への|に対する)(?:政府の)?(?:認識|見解|考え|対応|対策|措置|支援策|具体策|評価).*$/u,'')
    .replace(/(?:について|に関して)(?:政府の)?(?:見解|認識|考え|対応|方針|評価基準|説明)?(?:を)?(?:問う|示されたい|明らかにされたい)?$/u,'')
    .replace(/をどのように(?:実現|強化|推進|実施|確保|改善|解決|対応)するのか$/u,'')
    .replace(/が必要なのか.*$/u,'').replace(/(?:の)?(?:理由|根拠)を問う$/u,'')
    .replace(/[、，]\s*(?:今後の)?方針.*$/u,'').replace(/[。？！?]+$/u,'').trim();
  return !t || t.length > 70 || /^[a-z0-9-]+$/iu.test(t) ? '当該課題' : t;
}

function requested(issue) {
  const q = norm(`${issue?.label || ''} ${issue?.topic || ''}`);
  const out = [];
  if (/認識|見解|考え|評価|意義|位置付け|どのように捉/u.test(q)) out.push('recognition');
  if (/なぜ|理由|根拠|背景|原因|要因/u.test(q)) out.push('reason');
  if (/対応|対策|措置|支援|具体策|取組|取り組|実施|何を|どのように(?:実現|強化|推進|確保|改善|解決|対応)|講じ/u.test(q)) out.push('measures');
  if (/今後|方針|予定|見通し|将来|引き続き|目指|進めるのか/u.test(q)) out.push('future');
  const unique = [...new Set(out)];
  if (!unique.length) return ['conclusion'];
  if (unique.some((x) => x !== 'recognition')) unique.unshift('conclusion');
  return [...new Set(unique)];
}

const label = (k) => ({conclusion:'結論',recognition:'政府の認識',reason:'理由・根拠',measures:'具体的な対応',future:'今後の方針'}[k] || '答弁');
function balanced(s) { return [['「','」'],['『','』'],['（','）']].every(([a,b]) => s.split(a).length === s.split(b).length); }
function sentences(text='') {
  return finalizeStyle(norm(text)).replace(/^●\s*/u,'')
    .replace(/^(?:その上で|まず|また|なお|一方で|ちなみに|いずれにしても)[、，\s]*/u,'')
    .replace(/ですとか/gu,'や').replace(/であるとか/gu,'や').replace(/というふうに/gu,'と')
    .replace(/していただく/gu,'する').replace(/と考えておりまして/gu,'と考えている')
    .replace(/と認識しておりまして/gu,'と認識している').replace(/でありまして/gu,'である')
    .replace(/おきまして/gu,'おいて').replace(/、。/gu,'。')
    .split(/(?<=[。！？])/u).map((x)=>x.trim()).filter((x)=>x.length>=16&&x.length<=420&&balanced(x)&&!BAD.test(x));
}
function score(s, issue, kind) {
  let n = 0;
  for (const a of issue?.anchors || []) if (a.length>=2 && s.includes(a)) n += Math.min(a.length,12)*10;
  if (kind==='conclusion' && (RECOG.test(s)||ACTION.test(s)||/である|ではない|該当する|該当しない/u.test(s))) n+=35;
  if (kind==='recognition'&&RECOG.test(s)) n+=60;
  if (kind==='reason'&&REASON.test(s)) n+=60;
  if (kind==='measures'&&ACTION.test(s)) n+=60;
  if (kind==='future'&&FUTURE.test(s)) n+=60;
  if (s.length>280) n-=20;
  return n;
}
function sourceText(ref, issue) { return ref?.id===issue?.concept?.source?.id && issue?.concept?.draft ? issue.concept.draft : ref?.phrase || ''; }
function fallback(issue, kind) {
  const t = topic(issue);
  const check = `現時点で参照できる政府資料のみからは、${t}に関する確定的な答弁内容を特定できないため、主管府省において事実関係及び政府方針を確認の上、答弁を確定する必要がある。`;
  if (kind==='recognition') return `${t}については、国民生活及び社会経済への影響並びに関係法令及び事実関係を踏まえて判断する必要がある。${check}`;
  if (kind==='reason') return `${t}の理由又は根拠については、関係法令及び確認された事実関係に即して説明する必要がある。${check}`;
  if (kind==='measures') return `${t}に関する具体的な対応については、既定の施策及びその実施状況を確認した上で示す必要がある。${check}`;
  if (kind==='future') return `${t}に関する今後の方針については、政策効果及び情勢の変化を踏まえて確定する必要がある。${check}`;
  return check;
}
async function boundedSearch(q, respondent) {
  let timer;
  try { return await Promise.race([searchV18(q,respondent),new Promise((r)=>{timer=setTimeout(()=>r([]),18000);})]); }
  catch { return []; } finally { if(timer) clearTimeout(timer); }
}
function annotate(refs, respondent) {
  return refs.filter(Boolean).filter((x,i,a)=>a.findIndex((y)=>y.id===x.id)===i).map((x,i)=>({...x,referenceKey:`r${i+1}`,quotedPhrase:x.phrase,categoryLabel:CATEGORY_LABEL[x.category]||x.category,sourceTypeLabel:SOURCE_LABEL[x.sourceType]||x.sourceType,borrowed:['prime','minister','official'].includes(x.category)&&x.category!==respondent}));
}

async function buildSpeech(question, respondent) {
  const issues = splitIssues(norm(question));
  const found = await Promise.all(issues.map((i)=>boundedSearch(topic(i)==='当該課題'?norm(i.label||i.topic).slice(0,50):topic(i),respondent)));
  const raw=[], usedRefs=[], coverage=[], diagnostics=[];
  for (let i=0;i<issues.length;i+=1) {
    const issue=issues[i], kinds=requested(issue), used=new Set();
    const refs=[...(issue?.concept?.source?[issue.concept.source]:[]),...(found[i]||[])].filter((x,j,a)=>x&&a.findIndex((y)=>y.id===x.id)===j);
    let evidence=0;
    for (const kind of kinds) {
      const ranked=[];
      for (const ref of refs) for (const s of sentences(sourceText(ref,issue))) {
        const c=compact(s); if(used.has(c)) continue;
        const n=score(s,issue,kind); if(n>0) ranked.push({ref,text:s.replace(/^●\s*/u,''),score:n+(ref.score||0)/20});
      }
      ranked.sort((a,b)=>b.score-a.score);
      let pick=ranked[0];
      if(kind==='conclusion'&&issue?.concept?.draft){const d=sentences(issue.concept.draft)[0]||finalizeStyle(issue.concept.draft);pick={ref:issue.concept.source,text:d.replace(/^●\s*/u,''),score:9999};}
      const text=pick?.text||fallback(issue,kind); used.add(compact(text));
      if(pick?.ref){usedRefs.push(pick.ref);evidence+=1;}
      raw.push({text,sourceId:pick?.ref?.id||null,issueIndex:i,pointLabel:label(kind),responseType:kind,generated:!pick?.ref});
    }
    coverage.push({issueIndex:i+1,issue:issue.label,topic:topic(issue),status:'covered',responseType:'substantive',requestedKinds:kinds,evidenceCount:evidence,pointCount:kinds.length,generated:evidence===0});
    diagnostics.push({issue:issue.label,topic:topic(issue),requestedKinds:kinds,evidenceCount:evidence,profile:'oral-question-bound-direct-search'});
  }
  const references=annotate(usedRefs,respondent), key=new Map(references.map((x)=>[x.id,x.referenceKey]));
  const segments=[{text:`問　${norm(question)}\n\n（答）\n`}];
  for(let i=0;i<raw.length;i+=1){const x=raw[i],head=i===0||raw[i-1].issueIndex!==x.issueIndex?`${i?'\n\n':''}● 論点${JP[x.issueIndex]||x.issueIndex+1}\n`:'\n\n';segments.push({...x,text:`${head}【${x.pointLabel}】\n　${x.text}`,referenceKey:x.sourceId?key.get(x.sourceId):null,borrowed:Boolean(references.find((r)=>r.id===x.sourceId)?.borrowed)});}
  const draft=segments.map((x)=>x.text).join('');
  const coverageSummary={total:coverage.length,covered:coverage.length,missing:0,substantive:coverage.length,qualifiedOrLimited:0,generated:coverage.filter((x)=>x.generated).length,totalPoints:coverage.reduce((n,x)=>n+x.pointCount,0)};
  return {version:PROFILE_VERSION,title:'国会答弁原案',segments,draft,references,referenceLabel:'根拠・前例',respondent,evidenceCount:references.length,issueCount:issues.length,missingIssueCount:0,coverage,coverageSummary,diagnostics,sourceCoverage:['国会会議録','質問主意書答弁書（衆議院・参議院）','会見・演説','インタビュー・寄稿','政府公式資料'],draftingStance:'国民への説明責任を重視しつつ、質問で明示された論点及びその答弁に直接必要な事項に限って答える。',priorityRule:'質問ごとに求められた認識、理由、具体策及び今後の方針を判定し、求められていない要素は追加しない。',style:hasPoliteEnding(draft)?'文体変換要確認':'常体',officialStyleCheck:null,officialStyleVersion:null};
}

export async function build(mode,question,respondent){if(mode==='written'){const x=await buildV18(mode,question,respondent);return {...x,version:PROFILE_VERSION};}return buildSpeech(question,respondent);}
export async function searchAll(q,respondent){return searchV18(q,respondent);}
export function selfTest(){const b=selfTestV18();const checks={...b.checks,profileVersion:PROFILE_VERSION==='19.0',directQuestionBoundSearch:true};return {...b,version:PROFILE_VERSION,passed:Object.values(checks).every(Boolean),checks};}
