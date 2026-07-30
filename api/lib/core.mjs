export const VERSION='15.2';
export const SOURCE_LABEL={answer:'国会答弁',written:'質問主意書答弁書',press:'会見・演説',interview:'インタビュー・寄稿',fact:'政府公式資料'};
export const CATEGORY_LABEL={prime:'総理',chief:'官房長官',minister:'大臣',official:'政府参考人',cabinet:'閣議決定済み答弁書',official_policy:'政府公式資料'};

export const decodeHtml=(s='')=>String(s)
.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
.replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
.replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));

export const clean=(s='')=>decodeHtml(String(s))
.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
.replace(/<[^>]+>/g,' ').replace(/^○[^\s　]+[\s　]*/,'').replace(/[\t\r\n]+/g,' ')
.replace(/\s+/g,' ').trim();

export const toPlainStyle=(s='')=>clean(s)
.replace(/ではございません/g,'ではない').replace(/でございます/g,'である').replace(/ございません/g,'ない').replace(/ございます/g,'ある')
.replace(/してまいります/g,'していく').replace(/してまいりました/g,'してきた')
.replace(/いたします/g,'する').replace(/いたしました/g,'した').replace(/しております/g,'している').replace(/しておりません/g,'していない')
.replace(/と考えております/g,'と考えている').replace(/と認識しております/g,'と認識している').replace(/であります/g,'である')
.replace(/と存じます/g,'と考える').replace(/申し上げます/g,'述べる').replace(/申し上げました/g,'述べた')
.replace(/考えます/g,'考える').replace(/認識します/g,'認識する').replace(/判断します/g,'判断する').replace(/対応します/g,'対応する')
.replace(/実施します/g,'実施する').replace(/推進します/g,'推進する').replace(/確保します/g,'確保する').replace(/検討します/g,'検討する')
.replace(/目指します/g,'目指す').replace(/取り組みます/g,'取り組む').replace(/努めます/g,'努める').replace(/進めます/g,'進める')
.replace(/図ります/g,'図る').replace(/講じます/g,'講じる').replace(/行います/g,'行う').replace(/ありません/g,'ない')
.replace(/必要です/g,'必要である').replace(/重要です/g,'重要である').replace(/ものです/g,'ものである').replace(/です。/g,'である。');

export const BAD=/アメリカで沖縄の未来を考える|人材育成|交流事業|留学|プログラム等を通じ|先ほど|ただいま|今申し上げた|御指摘のとおり|時間の関係|通告がない|お尋ねがありました|お尋ねがあっておりました|読み上げさせていただきます|質問者|委員のお尋ね/;
export const ANSWERISH=/である|ではない|認識している|考えている|方針|取り組む|推進する|確保する|重視する|堅持する|判断する|対処する|目指す|必要がある|位置付け|適切に対応|全力を尽くす|実施する|認められない|示している|定めている|予定している/;
const STOP=new Set(['政府','我が国','日本','見解','認識','基本認識','基本的な認識','基本姿勢','姿勢','質問','答弁','考え','対応','取組','取り組み','方針','政策','課題','問題','いかん','なのか','ではないか','どのように','について','に関する','対する','関する','する','ある','いる','もの','こと','ため','必要性','在り方','及び','また','その','この','いずれも','説明','問う','示す','当該','具体的','基本的','現状','今後']);
const GENERIC=/^(政府|我が国|日本|見解|認識|基本|基本的|基本姿勢|姿勢|政策|課題|問題|対応|取組|方針|必要性|在り方|現状|今後|国会|答弁)$/;
const SYNONYMS=new Map([
['アメリカ',['米国','日米','同盟']],['米国',['アメリカ','日米','同盟']],['言いなり',['主体的','自主的','国益','従属']],
['中国',['中華人民共和国','日中']],['ロシア',['露','日露']],['ウクライナ',['侵略','侵攻']],['台湾',['台湾海峡','平和と安定']],
['防衛費',['防衛力','安全保障']],['核兵器',['核軍縮','不拡散']],['拉致',['拉致被害者','帰国','日朝']],['物価',['賃金','経済']],
['少子化',['こども','子育て']],['気候変動',['脱炭素','温室効果ガス']],['原発',['原子力発電所','エネルギー']],
['移民',['外国人','在留']],['尖閣',['尖閣諸島']],['北方領土',['北方四島']],['暗号資産',['仮想通貨','金融商品取引法']]
]);
const CONCEPT_REQUIRED={
'us-autonomy':[['日米同盟','米国','アメリカ','日米']],senkaku:[['尖閣諸島','尖閣']],takeshima:[['竹島']],
'northern-territories':[['北方領土','北方四島']],abduction:[['拉致','拉致被害者']],
'nuclear-disarmament':[['核兵器','核軍縮','核不拡散','不拡散']]
};

export const CONCEPTS=[
{id:'us-autonomy',match:/アメリカ.*言いなり|米国.*言いなり|対米従属|外交自主|主体的外交/,anchors:['日米同盟','国益','主体的','自主的','外交'],queries:['日米同盟 主体的 外交 国益','米国 自主的 判断 外交'],draft:'我が国の外交・安全保障政策は、米国の意向に従属して決定するものではない。日米同盟を外交・安全保障政策の基軸としつつ、我が国自身の国益、地域の平和と安定及び国際社会全体の利益を踏まえ、政府として主体的に判断し実施する。',source:{id:'concept-us-autonomy',sourceType:'fact',category:'official_policy',phrase:'我が国は、日米同盟を外交・安全保障の基軸としつつ、我が国の国益を踏まえ、主体的な外交を展開する。',title:'外交青書・日米関係',url:'https://www.mofa.go.jp/mofaj/gaiko/bluebook/',sourceName:'外務省'}},
{id:'senkaku',match:/尖閣/,anchors:['尖閣諸島','固有の領土','有効に支配'],queries:['尖閣諸島 固有の領土 有効に支配'],draft:'尖閣諸島は、歴史的にも国際法上も疑いのない我が国固有の領土であり、現に我が国はこれを有効に支配している。',source:{id:'concept-senkaku',sourceType:'fact',category:'official_policy',phrase:'尖閣諸島は、歴史的にも国際法上も疑いのない我が国固有の領土であり、現に我が国はこれを有効に支配している。',title:'尖閣諸島に関する政府の基本的見解',url:'https://www.mofa.go.jp/mofaj/area/senkaku/',sourceName:'外務省'}},
{id:'takeshima',match:/竹島/,anchors:['竹島','固有の領土','不法占拠'],queries:['竹島 固有の領土 不法占拠'],draft:'竹島は、歴史的事実に照らしても、かつ国際法上も明らかに我が国固有の領土である。韓国による占拠は、国際法上何ら根拠のない不法占拠である。',source:{id:'concept-takeshima',sourceType:'fact',category:'official_policy',phrase:'竹島は、歴史的事実に照らしても、かつ国際法上も明らかに我が国固有の領土である。韓国による竹島の占拠は、国際法上何ら根拠がないまま行われている不法占拠である。',title:'竹島問題に関する政府の基本的立場',url:'https://www.mofa.go.jp/mofaj/area/takeshima/',sourceName:'外務省'}},
{id:'northern-territories',match:/北方領土|北方四島/,anchors:['北方四島','帰属','平和条約'],queries:['北方四島 帰属 平和条約'],draft:'北方四島は我が国固有の領土である。政府は、北方四島の帰属の問題を解決して平和条約を締結するとの基本方針を堅持する。',source:{id:'concept-north',sourceType:'fact',category:'official_policy',phrase:'北方四島は我が国固有の領土である。政府は、北方四島の帰属の問題を解決して平和条約を締結するとの基本方針を堅持している。',title:'北方領土問題に関する政府の基本的立場',url:'https://www.mofa.go.jp/mofaj/area/hoppo/',sourceName:'外務省'}},
{id:'abduction',match:/拉致/,anchors:['拉致被害者','帰国','日朝'],queries:['拉致被害者 帰国 政府 方針'],draft:'政府は、全ての拉致被害者の一日も早い帰国の実現を最重要課題の一つと位置付け、あらゆる機会を捉えて全力で取り組む。',source:{id:'concept-abduction',sourceType:'fact',category:'official_policy',phrase:'全ての拉致被害者の一日も早い帰国の実現に向け、あらゆる機会を捉え全力で取り組む。',title:'北朝鮮による日本人拉致問題',url:'https://www.rachi.go.jp/',sourceName:'政府拉致問題対策本部'}},
{id:'nuclear-disarmament',match:/核兵器なき世界|核兵器のない世界|核軍縮/,anchors:['核軍縮','核兵器のない世界','現実的','実践的'],queries:['核兵器のない世界 現実的 実践的'],draft:'唯一の戦争被爆国として、核兵器のない世界の実現に向け、核兵器国と非核兵器国の橋渡しに努めつつ、現実的かつ実践的な取組を進める。',source:{id:'concept-nuclear',sourceType:'fact',category:'official_policy',phrase:'核兵器国と非核兵器国の橋渡しに努め、核軍縮・不拡散を現実的かつ実践的に前進させる。',title:'日本の軍縮・不拡散外交',url:'https://www.mofa.go.jp/mofaj/gaiko/kaku/index.html',sourceName:'外務省'}}
];

const baseWords=s=>[...new Set(clean(s).replace(/[？?。、「」『』（）()・,，:：;；\/]/g,' ').split(/\s+|は|が|を|に対する|に関する|における|に|で|と|の|へ|から|まで|及び|並びに|又は|について|として|による|への|との|をめぐる|に係る/).map(x=>x.replace(/^(対する|関する)/,'').trim()).filter(x=>x.length>=2&&!STOP.has(x)&&!GENERIC.test(x)))];
const synonymsFor=w=>{const out=new Set([w]);for(const[k,v]of SYNONYMS)if(w.includes(k)||k.includes(w))v.forEach(x=>out.add(x));return[...out]};
const expandWords=words=>[...new Set(words.flatMap(synonymsFor))];
export const makeIssue=(label,concept=null)=>{const base=concept?concept.anchors:baseWords(label),anchors=concept?concept.anchors:expandWords(base).slice(0,12),required=concept?(CONCEPT_REQUIRED[concept.id]||[concept.anchors.slice(0,1)]):base.slice(0,2).map(synonymsFor),queries=concept?concept.queries:[anchors.slice(0,5).join(' '),clean(label),...anchors.slice(0,3)];return{label:clean(label),concept,anchors,required,queries:[...new Set(queries.filter(Boolean))]}};
export function splitIssues(question){const q=clean(question),concepts=CONCEPTS.filter(c=>c.match.test(q));if(concepts.length)return concepts.map(c=>makeIssue(c.id,c));const numbered=q.split(/(?=(?:^|\s)(?:[一二三四五六七八九十]+|\d+)[　\s、．.])/).map(clean).filter(x=>x.length>=4);if(numbered.length>1)return numbered.map(x=>makeIssue(x.replace(/^(?:[一二三四五六七八九十]+|\d+)[　\s、．.]*/,'')));const lines=String(question).split(/\n+/).map(clean).filter(x=>x.length>=4);return lines.length>1?lines.map(x=>makeIssue(x)):[makeIssue(q)]}
export function categoryOfSpeech(x){const p=clean(x.speakerPosition);if(/内閣総理大臣|総理大臣/.test(p))return'prime';if(/内閣官房長官|官房長官/.test(p))return'chief';if(/国務大臣|外務大臣|防衛大臣|財務大臣|担当大臣|厚生労働大臣|文部科学大臣|経済産業大臣|国土交通大臣|環境大臣|農林水産大臣|法務大臣|総務大臣/.test(p))return'minister';if(/政府参考人|政府委員|局長|審議官|長官|部長|統括官/.test(p))return'official';return null}
const sentences=t=>clean(t).split(/(?<=[。！？])/).map(clean).filter(s=>s.length>=18&&s.length<=420);
export function subjectMatches(text,issue,title='',allowTitle=true){const t=clean(text),ttl=allowTitle?clean(title):'';if(!issue.required?.length)return false;return issue.required.every(group=>group.some(a=>t.includes(a)||ttl.includes(a)))}
export function relevance(text,issue,title=''){const t=clean(text),ttl=clean(title);if(!t||BAD.test(t)||!subjectMatches(t,issue,ttl,true))return-1000;const anchors=issue.anchors.filter(a=>a.length>=2&&!GENERIC.test(a)),bodyHits=anchors.filter(a=>t.includes(a)),titleHits=anchors.filter(a=>ttl.includes(a));let score=bodyHits.reduce((n,a)=>n+Math.min(a.length,12)*12,0)+titleHits.reduce((n,a)=>n+Math.min(a.length,12)*18,0);score+=ANSWERISH.test(t)?28:0;score+=bodyHits.length>=2?28:0;score+=bodyHits.length>=3?20:0;const compact=issue.label.replace(/[\s　、。！？?]/g,'');if(compact.length>=4&&(t.replace(/\s/g,'').includes(compact)||ttl.replace(/\s/g,'').includes(compact)))score+=100;return score}
export function bestPassage(text,issue,title=''){const ss=sentences(text),ranked=ss.filter(s=>subjectMatches(s,issue,'',false)).map((s,i)=>({s,i,v:relevance(s,issue,title)})).sort((a,b)=>b.v-a.v),best=ranked[0];if(!best||best.v<45)return'';const idx=ss.indexOf(best.s),next=ss[idx+1];return next&&subjectMatches(next,issue,'',false)&&relevance(next,issue,title)>=45&&best.s.length+next.length<650?best.s+next:best.s}
export function sourceRank(source,mode,respondent){
if(mode==='written'){
if(source.sourceType==='written')return 0;
if(source.sourceType==='fact')return 1;
if(source.sourceType==='press')return 2;
if(source.sourceType==='interview')return 3;
if(source.sourceType==='answer')return 4;
return 5}
if(source.sourceType==='answer'&&source.category===respondent)return 0;
if(source.sourceType==='press'&&source.category===respondent)return 1;
if(source.sourceType==='answer')return 2;
if(source.sourceType==='press')return 3;
if(source.sourceType==='interview'&&source.category===respondent)return 4;
if(source.sourceType==='interview')return 5;
if(source.sourceType==='fact')return 6;
if(source.sourceType==='written')return 9;
return 10}
export function acceptable(source,issue){if(!source||BAD.test(source.phrase||'')||!subjectMatches(source.phrase,issue,'',false))return false;return relevance(source.phrase,issue,source.title)>=45&&(ANSWERISH.test(source.phrase)||source.sourceType==='fact')}
export const fallbackDraft=issue=>`${issue.label.length>80?'当該問題':issue.label}については、我が国の国益、国民の安全及び関係する法令・事実関係を踏まえ、政府として主体的かつ適切に判断し、必要な対応を行う。`;
