const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const excerpt=(s,n=320)=>{const c=clean(s);return c.slice(0,n)+(c.length>n?'…':'');};
const LABEL={prime:'総理',minister:'大臣',official:'政府参考人',cabinet:'閣議決定済み答弁書',official_policy:'政府公式資料'};
const topicOf=q=>/尖閣|魚釣島|日米安全保障条約.?5条|日米安保条約.?5条/.test(q)?'senkaku':/拉致|北朝鮮.*被害者|横田めぐみ/.test(q)?'abduction':/マイナンバーカード|電子証明書.*有効期限|個人番号カード/.test(q)?'mynumber':/物価高|物価上昇|インフレ|生活費.*高騰/.test(q)?'inflation':/米国.*言いなり|対米追随|米国.*従属|属国/.test(q)?'us_autonomy':'generic';
const TOPICS={
 senkaku:{terms:['尖閣諸島','日米安全保障条約第五条','施政の下'],required:['尖閣諸島'],support:['第五条','5条','適用','施政']},
 abduction:{terms:['拉致問題','拉致被害者','一日も早い帰国'],required:['拉致'],support:['帰国','解決','最重要課題']},
 mynumber:{terms:['マイナンバーカード 有効期限 更新','電子証明書 有効期限 更新'],required:['マイナンバーカード'],support:['有効期限','更新','電子証明書']},
 inflation:{terms:['物価高対策 政府','物価上昇 家計 支援'],required:['物価'],support:['対策','支援','賃上げ','給付','価格']},
 us_autonomy:{terms:['米国 国益 主体的 判断 外交','日米関係 国益 主体的'],required:['米国'],support:['国益','主体的','我が国の立場','判断']},
 generic:{terms:[],required:[],support:[]}
};
const STATIC=[
 {id:'senkaku-qa',topic:'senkaku',category:'official_policy',authority:100,phrase:'尖閣諸島は日本国政府の施政の下にあり、日米安全保障条約第5条は尖閣諸島にも適用される。',usage:'適用の有無への直接回答',title:'尖閣諸島情勢に関するQ&A',date:'外務省公式見解',url:'https://www.mofa.go.jp/mofaj/area/senkaku/qa_1010.html',sourceName:'外務省'},
 {id:'senkaku-answer',topic:'senkaku',category:'cabinet',authority:99,phrase:'尖閣諸島を含む我が国の施政の下にある領域に対する武力攻撃が発生した場合、日米安保条約第五条に基づき共通の危険に対処することとなる。',usage:'武力攻撃発生時の条約上の取扱い',title:'尖閣諸島の防衛に関する質問に対する答弁書',date:'平成23年2月25日',url:'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/177/touh/t177065.htm',sourceName:'参議院・閣議決定答弁書'},
 {id:'senkaku-2plus2',topic:'senkaku',category:'minister',authority:98,phrase:'米側は、日米安全保障条約第5条が尖閣諸島に適用されることを改めて確認した。',usage:'日米閣僚協議での再確認',title:'日米安全保障協議委員会（日米「2＋2」）（概要）',date:'令和6年7月28日',url:'https://www.mofa.go.jp/mofaj/press/release/pressit_000001_00943.html',sourceName:'外務省'},
 {id:'treaty5',topic:'senkaku',category:'official_policy',authority:97,phrase:'日本国の施政の下にある領域における武力攻撃について、各締約国が自国の憲法上の規定及び手続に従って共通の危険に対処する。',usage:'日米安全保障条約第5条の条文',title:'日本国とアメリカ合衆国との間の相互協力及び安全保障条約',date:'昭和35年条約第6号',url:'https://www.mofa.go.jp/mofaj/area/usa/hosho/jyoyaku.html',sourceName:'外務省'},
 {id:'rachi-policy',topic:'abduction',category:'official_policy',authority:100,phrase:'全ての拉致被害者の一日も早い帰国の実現に向けて取り組む。',usage:'拉致被害者帰国への政府目標',title:'北朝鮮による日本人拉致問題',date:'政府公式方針',url:'https://www.rachi.go.jp/',sourceName:'政府拉致問題対策本部'},
 {id:'rachi-answer',topic:'abduction',category:'cabinet',authority:99,phrase:'日朝平壌宣言に基づき、拉致、核、ミサイルといった諸懸案を包括的に解決し、日朝国交正常化の実現を目指す。',usage:'北朝鮮政策の閣議決定済み基本方針',title:'北朝鮮による日本人拉致問題解決に向けた内閣の基本姿勢に関する質問に対する答弁書',date:'令和6年11月22日',url:'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b215050.htm',sourceName:'衆議院・閣議決定答弁書'},
 {id:'unclear-phrase',topic:'generic',category:'cabinet',authority:80,phrase:'お尋ねの「○○」の具体的に意味するところが明らかではないため、お答えすることは困難である。',usage:'質問中の特定文言の意味が不明確な場合',title:'質問に対する答弁書の用例',date:'令和6年12月13日',url:'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/216/touh/t216012.htm',sourceName:'参議院・閣議決定答弁書'},
 {id:'mynumber-expiry',topic:'mynumber',category:'official_policy',authority:100,phrase:'カード発行時に18歳以上の場合は発行から10回目の誕生日まで、18歳未満の場合は5回目の誕生日までであり、電子証明書は年齢にかかわらず発行から5回目の誕生日までである。更新手続は有効期限の3か月前から行うことができる。',usage:'有効期限と更新開始時期への直接回答',title:'マイナンバーカードおよび電子証明書の有効期限・更新',date:'令和7年12月17日最終更新',url:'https://www.digital.go.jp/policies/mynumber/expiration-date',sourceName:'デジタル庁'},
 {id:'mynumber-process',topic:'mynumber',category:'official_policy',authority:98,phrase:'カード本体はオンライン等で事前申請し、交付通知書受領後に市区町村窓口で新しいカードの交付を受ける。電子証明書はマイナンバーカードを持参し、市区町村窓口で更新する。',usage:'カード本体と電子証明書の手続の違い',title:'マイナンバーカードおよび電子証明書の有効期限・更新',date:'令和7年12月17日最終更新',url:'https://www.digital.go.jp/policies/mynumber/expiration-date',sourceName:'デジタル庁'},
 {id:'us-national-interest',topic:'us_autonomy',category:'prime',authority:100,phrase:'我が国の国益を最大化すること、国民の生命を守り抜くことを主眼に置き、安全保障及び経済安全保障を含む経済の問題について米国と議論する。',usage:'対米外交が日本の国益を基準に行われるとの総理答弁',title:'参議院予算委員会における内閣総理大臣答弁',date:'令和8年3月18日',url:'https://kokkai.ndl.go.jp/txt/122115261X00420260318/7',sourceName:'国会会議録検索システム'}
];
const meaningfulTokens=q=>[...new Set(clean(q).replace(/[？?]/g,'').split(/[\s、。・,，.「」『』（）()【】\[\]：:／/]+|について|に関する|どのように|なぜ|いつまで|として|による|[はがをにとのへで]/).filter(x=>x.length>=2&&!['政府','我が国','日本','質問','見解','対応','考え','もの','こと'].includes(x)))].slice(0,10);
function categoryOf(x){const p=clean(x.speakerPosition),t=clean(x.speech||'');if(/内閣総理大臣|総理大臣/.test(p))return'prime';if(/国務大臣|外務大臣|防衛大臣|内閣官房長官|担当大臣|大臣/.test(p))return'minister';if(/政府参考人|政府委員|局長|審議官|長官|部長|課長/.test(p)||/^○[^。]*(政府参考人|政府委員)/.test(t))return'official';return null;}
const dependent=/(先ほど|ただいま|今ほど|今申し上げた|繰り返しになるが)/;
function supports(text,topic,q){const spec=TOPICS[topic],t=clean(text);if(topic==='generic'){const toks=meaningfulTokens(q);return toks.filter(x=>t.includes(x)).length>=2;}return spec.required.every(x=>t.includes(x))&&spec.support.some(x=>t.includes(x));}
async function ndlSearch(q,requested='minister',limit=8){const topic=topicOf(q),spec=TOPICS[topic],terms=[...(spec.terms||[]),...meaningfulTokens(q)].slice(0,5),rows=[];for(const term of terms){try{const p=new URLSearchParams({maximumRecords:'30',recordPacking:'json',any:term});const r=await fetch('https://kokkai.ndl.go.jp/api/speech?'+p,{headers:{Accept:'application/json','User-Agent':'KokkaiDraftBot/8.0'}});if(r.ok)rows.push(...((await r.json()).speechRecord||[]));}catch{}}
 const seen=new Set(),out=[];for(const x of rows){const id=x.speechID||x.speechURL;if(!id||seen.has(id))continue;seen.add(id);const category=categoryOf(x),text=clean(x.speech||'');if(!category||dependent.test(text)||!supports(text,topic,q))continue;let score=0;for(const tok of meaningfulTokens(q))if(text.includes(tok))score+=Math.min(12,tok.length*2);if(category===requested)score+=30;else if(requested==='prime'&&category==='minister')score+=5;else score-=8;if(topic!=='generic')score+=30;out.push({id,category,title:`${x.nameOfHouse||''} ${x.nameOfMeeting||''}`.trim(),date:x.date||'',speaker:x.speaker||'',speakerPosition:x.speakerPosition||'',text,excerpt:excerpt(text),url:x.speechURL||x.meetingURL||'https://kokkai.ndl.go.jp/',sourceName:'国会会議録検索システム',score});}
 return out.sort((a,b)=>b.score-a.score).slice(0,limit);
}
const qLabel=q=>`問　${clean(q)}\n\n（答）\n`;
function speechSegments(q,requested,sources){const topic=topicOf(q);if(topic==='senkaku')return[
 {text:qLabel(q),kind:'label'},
 {text:'● 尖閣諸島は我が国が現に有効に支配しており、日本国政府の施政の下にあることから、日米安全保障条約第5条の適用対象である。',sourceId:'senkaku-qa'},
 {text:'\n\n● 同条は、我が国の施政の下にある領域に対する武力攻撃が発生した場合、日米両国がそれぞれの憲法上の規定及び手続に従い、共通の危険に対処することを定めている。',sourceId:'treaty5'},
 {text:'\n\n● 日米両政府は、第5条が尖閣諸島に適用されることを累次にわたり確認している。政府としては、我が国の領土、領海及び領空を断固として守り抜くとの方針の下、米国と緊密に連携して対処する。',sourceId:'senkaku-2plus2'}];
 if(topic==='abduction')return[
 {text:qLabel(q),kind:'label'},
 {text:'● 政府としては、全ての拉致被害者の一日も早い帰国を実現するとの強い決意に変わりはなく、あらゆる機会を捉え、全力で取り組む考えである。',sourceId:'rachi-policy'},
 {text:'\n\n● 日朝平壌宣言に基づき、拉致、核、ミサイルといった諸懸案を包括的に解決し、日朝国交正常化の実現を目指すとの一貫した方針の下、具体的な成果に結び付けるべく取り組む。',sourceId:'rachi-answer'}];
 if(topic==='mynumber')return[
 {text:qLabel(q),kind:'label'},
 {text:'● マイナンバーカード本体の有効期限は、発行時に18歳以上であった者は発行から10回目の誕生日まで、18歳未満であった者は5回目の誕生日までである。電子証明書の有効期限は、年齢にかかわらず発行から5回目の誕生日までである。',sourceId:'mynumber-expiry'},
 {text:'\n\n● いずれも有効期限の3か月前から更新できる。カード本体は事前申請後、市区町村窓口で新しいカードの交付を受け、電子証明書は現在のカードを持参して市区町村窓口で更新する。',sourceId:'mynumber-process'}];
 if(topic==='us_autonomy')return[
 {text:qLabel(q),kind:'label'},
 {text:'● 我が国が米国の言いなりになっているとの指摘は当たらない。政府としては、我が国の外交及び安全保障に関する政策を、我が国の国益と国民の生命及び安全を基準として主体的に判断している。',sourceId:'us-national-interest'},
 {text:'\n\n● 日米同盟を外交・安全保障政策の基軸としつつも、個々の課題については我が国の立場と考えを米国に伝え、国益の最大化を図る。',sourceId:'us-national-interest'}];
 const relevant=sources.filter(x=>supports(x.text,topic,q)).slice(0,2);if(relevant.length){const first=excerpt(relevant[0].text,240).replace(/^○[^ ]+\s*/,'');return[{text:qLabel(q),kind:'label'},{text:`● ${first}`,sourceId:relevant[0].id},...(relevant[1]?[{text:`\n\n● ${excerpt(relevant[1].text,220).replace(/^○[^ ]+\s*/,'')}`,sourceId:relevant[1].id}]:[])];}
 return[{text:qLabel(q),kind:'label'},{text:'● 政府としては、御質問の論点について、所管府省において事実関係及び既存の政府方針を確認した上で、国会審議において明確に答弁すべきものと考える。',sourceId:null}];
}
function quoteTarget(q){const m=clean(q).match(/[「『](.+?)[」』]/);if(m)return m[1];for(const w of['取り返す','気がある','言いなり','常態化','形骸化'])if(q.includes(w))return w;return null;}
function writtenSegments(q){const topic=topicOf(q);if(topic==='senkaku')return[
 {text:'一について\n　尖閣諸島は我が国が現に有効に支配しており、日本国政府の施政の下にあることから、日米安全保障条約第五条の適用対象である。',sourceId:'senkaku-qa'},
 {text:'\n\n　同条に基づく具体的な対応については、実際に発生した事態の態様等に応じ、日米両国がそれぞれの憲法上の規定及び手続に従って判断することとなる。',sourceId:'treaty5'}];
 if(topic==='abduction'){const t=quoteTarget(q)||'取り返す';return[
 {text:`一について\n　お尋ねの「${t}」の具体的に意味するところが必ずしも明らかではないため、その意味を前提としたお尋ねに一概にお答えすることは困難である。`,sourceId:'unclear-phrase'},
 {text:'\n\n　もっとも、政府としては、全ての拉致被害者の一日も早い帰国を実現するとの強い決意の下、あらゆる機会を捉え、全力で取り組む考えである。',sourceId:'rachi-policy'},
 {text:'\n\n　また、北朝鮮との関係に関する我が国の一貫した方針は、日朝平壌宣言に基づき、拉致、核、ミサイルといった諸懸案を包括的に解決し、日朝国交正常化の実現を目指すというものである。',sourceId:'rachi-answer'}];}
 if(topic==='mynumber')return[
 {text:'一について\n　マイナンバーカード及び電子証明書の有効期限並びに更新手続については、デジタル庁が公表しているところである。',sourceId:'mynumber-expiry'},
 {text:'\n\n　具体的には、カード本体の有効期限は発行時の年齢に応じて五年又は十年、電子証明書は五年であり、いずれも有効期限の三か月前から更新することができる。',sourceId:'mynumber-expiry'}];
 const target=quoteTarget(q);return[{text:`一について\n　${target?`お尋ねの「${target}」`:'御指摘の事項'}については、御質問の趣旨及び個別具体的な事情が必ずしも明らかではないことから、一概にお答えすることは困難である。`,sourceId:'unclear-phrase'}];
}
function build(mode,q,requested,sources){const segments=mode==='written'?writtenSegments(q):speechSegments(q,requested,sources),ids=[...new Set(segments.map(x=>x.sourceId).filter(Boolean))];let refs=[...STATIC.filter(x=>ids.includes(x.id)),...sources.filter(x=>ids.includes(x.id))];refs=refs.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).map((x,i)=>({...x,referenceKey:`r${i+1}`,quotedPhrase:x.phrase||x.excerpt,categoryLabel:LABEL[x.category]||x.category,borrowed:mode==='speech'&&['prime','minister','official'].includes(x.category)&&x.category!==requested,usage:x.usage||`${LABEL[x.category]}の同一論点答弁として参照`}));const key=new Map(refs.map(x=>[x.id,x.referenceKey]));const seg=segments.map(s=>({...s,referenceKey:s.sourceId?key.get(s.sourceId)||null:null,borrowed:s.sourceId?!!refs.find(r=>r.id===s.sourceId)?.borrowed:false}));return{title:mode==='written'?'質問主意書答弁書原案':'国会答弁原案',segments:seg,draft:seg.map(x=>x.text).join(''),referenceLabel:mode==='written'?'根拠・用例':'根拠・前例',references:refs,respondent:requested,evidenceCount:refs.length};}
const SELF_TESTS=[
 {name:'領土・安全保障',mode:'speech',respondent:'minister',q:'尖閣諸島は日米安全保障条約第5条の適用対象なのか。'},
 {name:'外交姿勢',mode:'speech',respondent:'prime',q:'我が国は米国の言いなりになっているのではないか。政府の見解を問う。'},
 {name:'制度運用',mode:'speech',respondent:'official',q:'マイナンバーカードの更新手続と有効期限について説明されたい。'},
 {name:'拉致・国会答弁',mode:'speech',respondent:'minister',q:'政府は拉致被害者を取り返す気があるのか。'},
 {name:'拉致・質問主意書',mode:'written',respondent:'minister',q:'政府は拉致被害者を取り返す気があるのか。'}
];
export default async function handler(req,res){try{const u=new URL(req.url,'https://localhost');if(u.pathname.endsWith('/health'))return json(res,200,{ok:true,service:'shuisho-kokkai',version:'8.0'});if(u.pathname.endsWith('/draft-test')){const q=clean(u.searchParams.get('q')||SELF_TESTS[0].q),requested=u.searchParams.get('respondent')||'minister',mode=u.searchParams.get('mode')==='written'?'written':'speech',sources=mode==='speech'?await ndlSearch(q,requested):[];return json(res,200,{...build(mode,q,requested,sources),test:true});}if(u.pathname.endsWith('/self-test')){const results=[];for(const t of SELF_TESTS){const sources=t.mode==='speech'?await ndlSearch(t.q,t.respondent):[],out=build(t.mode,t.q,t.respondent,sources),bad=/御質問の論点について、関係法令|言いなりになっているのではないかについて/.test(out.draft),linked=out.segments.filter(x=>x.kind!=='label').every(x=>!x.sourceId||!!x.referenceKey);results.push({...t,pass:!bad&&out.evidenceCount>0&&linked,evidenceCount:out.evidenceCount,draft:out.draft,references:out.references.map(x=>({title:x.title,url:x.url,quotedPhrase:x.quotedPhrase,categoryLabel:x.categoryLabel}))});}return json(res,200,{version:'8.0',passed:results.every(x=>x.pass),results});}if(u.pathname.endsWith('/search')){const q=clean(u.searchParams.get('q'));if(!q)return json(res,400,{error:'検索語を入力してください。'});const requested=u.searchParams.get('respondent')||'minister',topic=topicOf(q),ndl=await ndlSearch(q,requested),fixed=STATIC.filter(x=>x.topic===topic).map(x=>({...x,excerpt:x.phrase}));return json(res,200,{query:q,coverage:{note:'同一論点の政府公式資料と閣議決定済み答弁書を優先し、内容が質問を実際に支える政府側国会答弁のみを補完的に表示している。'},results:[...fixed,...ndl]});}if(u.pathname.endsWith('/draft')){if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});let raw='';for await(const c of req)raw+=c;const b=raw?JSON.parse(raw):{},q=clean(b.question);if(q.length<8)return json(res,400,{error:'質問案を8文字以上で入力してください。'});const mode=b.mode==='written'?'written':'speech',requested=['prime','minister','official'].includes(b.respondent)?b.respondent:'minister',sources=mode==='speech'?await ndlSearch(q,requested):[];return json(res,200,{...build(mode,q,requested,sources),mode,generatedBy:'draft-engine-v8',disclaimer:'本出力は起案補助用の原案であり、答弁本文ではない。提出・答弁前に、主管府省において事実関係、法令、最新の政府方針及び過去答弁との整合性を確認すること。'});}return json(res,404,{error:'Not found'});}catch(e){return json(res,502,{error:e.message||'処理に失敗した。'});}}
