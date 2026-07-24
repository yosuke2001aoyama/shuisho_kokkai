const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const excerpt=(s,n=300)=>{const c=clean(s);return c.slice(0,n)+(c.length>n?'…':'');};
const topicOf=q=>/拉致|北朝鮮.*被害者|横田めぐみ/.test(q)?'abduction':'generic';
const STOP=new Set(['について','に関する','政府','我が国','日本','質問','お尋ね','御指摘','対応','考え','場合','こと','もの','ため','及び','また','その','この','ある','いる','する']);
const tokens=s=>[...new Set(clean(s).replace(/[？?]/g,'').split(/[\s、。・,，.「」『』（）()【】\[\]：:／/]+|について|に関する|どのように|なぜ|いつまで|として|による|[はがをにとのへで]/).map(clean).filter(x=>x.length>=2&&!STOP.has(x)))].slice(0,10);
const SOURCES=[
{id:'w215050',topic:'abduction',authority:100,phrase:'北朝鮮との関係に関する我が国の一貫した方針は、日朝平壌宣言に基づき拉致、核、ミサイルといった諸懸案を包括的に解決し、不幸な過去を清算して、日朝国交正常化の実現を目指す、というものである。',usage:'拉致問題に関する政府の基本方針',title:'北朝鮮による日本人拉致問題解決に向けた石破内閣の基本姿勢に関する質問に対する答弁書',date:'令和6年11月22日',url:'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b215050.htm'},
{id:'rachi-policy',topic:'abduction',authority:98,phrase:'全ての拉致被害者の一日も早い帰国の実現に向けて取り組む。',usage:'政府拉致問題対策本部が掲げる政策目標',title:'北朝鮮による日本人拉致問題（政府拉致問題対策本部）',date:'現行政府方針',url:'https://www.rachi.go.jp/'},
{id:'w189002',topic:'abduction',authority:90,phrase:'全ての拉致被害者の一刻も早い帰国を実現させる。',usage:'全拉致被害者の帰国実現という政策目的',title:'拉致対策本部が行う内外の拉致問題等啓発事業に関する質問に対する答弁書',date:'平成27年2月3日',url:'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/189/touh/t189002.htm'},
{id:'w216012',topic:'generic',authority:70,phrase:'お尋ねの「○○」の具体的に意味するところが明らかではないため、お答えすることは困難である。',usage:'質問中の特定文言の意味・範囲が不明確な場合',title:'外国人住民が増加する地域における被疑者情報公開基準の検討等に関する質問に対する答弁書',date:'令和6年12月13日',url:'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/216/touh/t216012.htm'},
{id:'w202025',topic:'generic',authority:65,phrase:'個々の事態ごとに異なると考えられることから、お尋ねについて一概にお答えすることは困難である。',usage:'仮定又は個別事情に左右される質問',title:'菅政権の存立危機事態等への認識に関する質問に対する答弁書',date:'令和2年10月2日',url:'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/202/touh/t202025.htm'},
{id:'w217118',topic:'generic',authority:60,phrase:'現時点で予断をもってお答えすることは差し控えたい。',usage:'将来の措置・交渉方針・未決定事項',title:'中国大使等による地方自治体への不当な圧力に関する質問に対する答弁書',date:'令和7年3月28日',url:'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b217118.htm'}
];
const refObj=x=>({sourceId:x.id,usage:x.usage,quotedPhrase:x.phrase,title:x.title,date:x.date,url:x.url,sourceName:x.id==='rachi-policy'?'政府公式方針':'閣議決定済み答弁書',authority:x.authority});
const dependent=/(先ほど|ただいま|今ほど|今申し上げた|繰り返しになるが|御指摘のとおり).*(大臣|長官|答弁|説明)?/;
async function ndlSearch(q,limit=12){const ts=tokens(q),terms=(topicOf(q)==='abduction'?['拉致問題','拉致被害者',...ts]:ts.length?ts:[clean(q)]).slice(0,4);const batches=await Promise.all(terms.map(async term=>{try{const p=new URLSearchParams({maximumRecords:'20',recordPacking:'json',any:term});const r=await fetch('https://kokkai.ndl.go.jp/api/speech?'+p,{headers:{Accept:'application/json','User-Agent':'KokkaiDraftBot/4.0'}});if(!r.ok)return[];return (await r.json()).speechRecord||[];}catch{return[];}}));const seen=new Set();return batches.flat().filter(x=>{const id=x.speechID||x.speechURL;if(!id||seen.has(id))return false;seen.add(id);return true;}).map((x,i)=>{const text=clean(x.speech||'');let score=ts.reduce((n,t)=>n+(text.includes(t)?Math.min(10,t.length*2):0),0);if(topicOf(q)==='abduction'&&/拉致被害者|拉致問題/.test(text))score+=15;if(dependent.test(text))score-=40;return{id:x.speechID||`s${i}`,title:`${x.nameOfHouse||''} ${x.nameOfMeeting||''}`.trim(),date:x.date||'',speaker:x.speaker||'',speakerPosition:x.speakerPosition||'',text,excerpt:excerpt(text),url:x.speechURL||x.meetingURL||'https://kokkai.ndl.go.jp/',sourceName:'国会会議録検索システム',score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);}
const questionLabel=q=>`問　${clean(q)}`;
function speechDraft(q){const topic=topicOf(q);if(topic==='abduction')return[
{text:questionLabel(q)+'\n\n（答）\n',sourceId:null,kind:'label'},
{text:'● 政府としては、全ての拉致被害者の一日も早い帰国を実現するとの強い決意に変わりはなく、その実現に向け、あらゆる機会を捉え、全力で取り組む考えである。',sourceId:'rachi-policy'},
{text:'\n\n● 拉致問題は、我が国の主権及び国民の生命と安全に関わる重大な問題であり、政府の最重要課題である。',sourceId:'rachi-policy'},
{text:'\n\n● 北朝鮮との関係については、日朝平壌宣言に基づき、拉致、核、ミサイルといった諸懸案を包括的に解決し、日朝国交正常化の実現を目指すとの一貫した方針の下、何が最も効果的かという観点から対応する。',sourceId:'w215050'},
{text:'\n\n● 交渉の具体的な内容及び手法については、今後の対応に支障を来すおそれがあるため詳細は差し控えるが、結果を出すことが重要であり、引き続き全力を尽くす。',sourceId:'w215050'}
];return[
{text:questionLabel(q)+'\n\n（答）\n',sourceId:null,kind:'label'},
{text:`● 政府としては、${clean(q).replace(/[。？?]+$/,'')}について、関係法令及びこれまでの政府方針を踏まえ、必要な対応を適切に進める考えである。`,sourceId:null},
{text:'\n\n● その上で、個別具体的な事情を確認し、関係行政機関が連携して必要な取組を着実に進める。',sourceId:null}
];}
function quoteTarget(q){const m=clean(q).match(/[「『](.+?)[」』]/);if(m)return m[1];if(/取り返す/.test(q))return'取り返す';if(/気がある/.test(q))return'気がある';return null;}
function writtenDraft(q){const topic=topicOf(q),target=quoteTarget(q),head=target?`お尋ねの「${target}」`:'御指摘の事項';if(topic==='abduction')return[
{text:`一について\n　${head}の具体的に意味するところが必ずしも明らかではないため、その意味を前提としたお尋ねに一概にお答えすることは困難である。`,sourceId:'w216012'},
{text:'\n\n　もっとも、政府としては、全ての拉致被害者の一日も早い帰国を実現するとの強い決意の下、あらゆる機会を捉え、全力で取り組む考えである。',sourceId:'rachi-policy'},
{text:'\n\n　また、北朝鮮との関係に関する我が国の一貫した方針は、日朝平壌宣言に基づき、拉致、核、ミサイルといった諸懸案を包括的に解決し、日朝国交正常化の実現を目指すというものである。',sourceId:'w215050'}
];return[
{text:`一について\n　${head}については、関係法令及び個別具体的な事情を踏まえて判断すべきものであり、一概にお答えすることは困難である。`,sourceId:'w202025'},
{text:'\n\n　政府としては、関係行政機関において必要な検討を行い、適切に対応する考えである。',sourceId:null}
];}
function buildDraft(mode,q,speeches){const segments=mode==='written'?writtenDraft(q):speechDraft(q);const ids=[...new Set(segments.map(x=>x.sourceId).filter(Boolean))];let refs=SOURCES.filter(x=>ids.includes(x.id)).sort((a,b)=>b.authority-a.authority).map(refObj);if(mode==='speech')refs=[...refs,...speeches.slice(0,3).map(x=>({sourceId:x.id,usage:'関連する国会答弁の確認',quotedPhrase:excerpt(x.text,220),title:x.title,date:x.date,url:x.url,speaker:x.speaker,sourceName:x.sourceName,authority:x.score}))];return{title:mode==='written'?'質問主意書答弁書原案':'国会答弁原案',segments,draft:segments.map(x=>x.text).join(''),referenceLabel:mode==='written'?'根拠・用例':'根拠・前例',references:refs};}
export default async function handler(req,res){try{const u=new URL(req.url,'https://localhost');if(u.pathname.endsWith('/health'))return json(res,200,{ok:true,service:'shuisho-kokkai',version:'4.0'});if(u.pathname.endsWith('/search')){const q=clean(u.searchParams.get('q'));if(!q)return json(res,400,{error:'検索語を入力してください。'});const type=u.searchParams.get('type')||'all',topic=topicOf(q),speeches=await ndlSearch(q);const written=SOURCES.filter(x=>x.topic===topic||x.topic==='generic').sort((a,b)=>b.authority-a.authority).map(x=>({...refObj(x),id:x.id,type:'written',excerpt:x.phrase}));return json(res,200,{query:q,type,coverage:{note:'閣議決定済み答弁書及び政府公式方針を優先し、国会会議録を補助資料として表示している。'},results:type==='written'?written:type==='speech'?speeches:[...written,...speeches]});}if(u.pathname.endsWith('/draft')){if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});let raw='';for await(const c of req)raw+=c;const b=raw?JSON.parse(raw):{},q=clean(b.question);if(q.length<8)return json(res,400,{error:'質問案を8文字以上で入力してください。'});const mode=b.mode==='written'?'written':'speech',speeches=await ndlSearch(q);const out=buildDraft(mode,q,speeches);return json(res,200,{...out,mode,generatedBy:'draft-engine-v4',disclaimer:'起案用の原案です。提出・答弁前に主管府省で事実関係、法令及び政府方針を確認してください。'});}return json(res,404,{error:'Not found'});}catch(e){return json(res,502,{error:e.message||'処理に失敗しました。'});}}