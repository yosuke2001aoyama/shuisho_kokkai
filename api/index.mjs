const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const excerpt=(s,n=360)=>clean(s).slice(0,n)+(clean(s).length>n?'…':'');
const tokens=s=>[...new Set(clean(s).split(/[\s、。・,，.「」『』（）()【】]/).filter(x=>x.length>=2))].slice(0,5);

async function ndlSearch(q,limit=12){
  const p=new URLSearchParams({maximumRecords:String(Math.min(30,limit)),recordPacking:'json'});
  const ts=tokens(q); if(ts.length)p.set('any',ts.join(' '));
  const r=await fetch('https://kokkai.ndl.go.jp/api/speech?'+p,{headers:{Accept:'application/json','User-Agent':'KokkaiDraftBot/1.0'}});
  if(!r.ok)throw new Error('国会会議録APIが応答しませんでした。');
  const d=await r.json();
  return (d.speechRecord||[]).map((x,i)=>({
    id:x.speechID||`speech-${i}`,
    type:'speech',
    title:`${x.nameOfHouse||''} ${x.nameOfMeeting||''}`.trim(),
    date:x.date||'',speaker:x.speaker||'',
    excerpt:excerpt(x.speech||''),text:clean(x.speech||''),
    url:x.speechURL||x.meetingURL||'https://kokkai.ndl.go.jp/',
    sourceName:'国会会議録検索システム'
  }));
}

function splitQuestion(q){return String(q).split(/\n+|(?=（?[一二三四五六七八九十]+）)|(?=\d+[\.．、])/).map(clean).filter(Boolean).slice(0,10);}
function skeleton(mode,q,sources){
  const refs=sources.slice(0,8);
  if(!refs.length)return {title:'答弁案（資料不足）',draft:'参照可能な一次資料を確認できなかったため、本文は生成していません。検索語や対象範囲を見直してください。',referenceLabel:mode==='written'?'用例集':'参考',references:[],verificationItems:['一次資料の追加検索','現行の政府方針・事実関係の確認','主管府省との協議'],confidence:'低'};
  const parts=splitQuestion(q);
  const body=parts.map((p,i)=>`${mode==='written'?`${i+1}について`:`【答弁ポイント${i+1}】`}\n${p}\n\n［現状認識・事実関係を主管府省で確認］\n［政府の基本的立場を記載］\n［必要に応じ、今後の対応を記載］\n\n根拠候補：${refs[i%refs.length].title}`).join('\n\n');
  return {title:mode==='written'?'質問主意書答弁書案（起案骨子）':'国会答弁案（起案骨子）',draft:`${mode==='written'?'以下、御質問の各項目について、過去の答弁書及び国会会議録を踏まえた起案骨子を示す。':'お尋ねについて、過去の国会答弁を踏まえ、次のとおりお答え申し上げます。'}\n\n${body}`,referenceLabel:mode==='written'?'用例集':'参考',references:refs.map(x=>({sourceId:x.id,usage:'政府の基本的立場、答弁構造又は定型表現の確認に使用',quotedPhrase:excerpt(x.text||x.excerpt,90)})),verificationItems:['最新の政府方針・閣議決定・法令改正の有無','固有名詞、数値、時点、引用の正確性','主管府省及び関係府省の所管整理','過去答弁との整合性と事情変更の有無'],confidence:'中'};
}

export default async function handler(req,res){
  try{
    const u=new URL(req.url,'https://localhost');
    if(u.pathname.endsWith('/health'))return json(res,200,{ok:true,service:'shuisho-kokkai',timestamp:new Date().toISOString()});
    if(u.pathname.endsWith('/search')){
      const q=clean(u.searchParams.get('q')); if(!q)return json(res,400,{error:'検索語を入力してください。'});
      const results=await ndlSearch(q,Number(u.searchParams.get('limit')||12));
      return json(res,200,{query:q,type:u.searchParams.get('type')||'all',coverage:{speech:results.length,written:0,note:'現在は国会会議録APIをリアルタイム検索しています。質問主意書専用索引は段階的に追加します。'},results});
    }
    if(u.pathname.endsWith('/draft')){
      if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
      let raw='';for await(const c of req){raw+=c;if(raw.length>100000)throw new Error('入力が長すぎます。');}
      const b=raw?JSON.parse(raw):{};const q=clean(b.question);if(q.length<8)return json(res,400,{error:'質問案を8文字以上で入力してください。'});
      const mode=b.mode==='written'?'written':'speech';const sources=await ndlSearch(q,12);const out=skeleton(mode,q,sources);
      return json(res,200,{...out,mode,generatedBy:'citation-skeleton',sources,disclaimer:'AI生成物又は起案骨子です。正式な政府見解ではなく、主管府省による事実確認・法令審査・決裁が必要です。'});
    }
    return json(res,404,{error:'Not found'});
  }catch(e){return json(res,502,{error:e.message||'処理に失敗しました。'});}
}
