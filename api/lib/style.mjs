const PAST_EXACT=new Map([['行い','行った'],['用い','用いた'],['率い','率いた'],['思い','思った'],['あり','あった'],['なり','なった'],['でき','できた'],['い','いた'],['取り組み','取り組んだ']]);
function past(stem){if(PAST_EXACT.has(stem))return PAST_EXACT.get(stem);if(stem.endsWith('し'))return stem.slice(0,-1)+'した';if(stem.endsWith('き'))return stem.slice(0,-1)+'いた';if(stem.endsWith('ぎ'))return stem.slice(0,-1)+'いだ';if(/[みびに]$/.test(stem))return stem.slice(0,-1)+'んだ';if(/[りちい]$/.test(stem))return stem.slice(0,-1)+'った';return stem+'た'}
export function finalizeStyle(input=''){let s=String(input)
.replace(/行ってまいりました/g,'行ってきた').replace(/行ってまいります/g,'行っていく')
.replace(/してまいりました/g,'してきた').replace(/してまいります/g,'していく')
.replace(/でございました/g,'であった').replace(/でございます/g,'である').replace(/ではございません/g,'ではない')
.replace(/と考えております/g,'と考えている').replace(/と認識しております/g,'と認識している').replace(/としております/g,'としている')
.replace(/しております/g,'している').replace(/しておりません/g,'していない').replace(/であります/g,'である')
.replace(/いたしました/g,'した').replace(/いたします/g,'する').replace(/申し上げました/g,'述べた').replace(/申し上げます/g,'述べる')
.replace(/([一-龠々ぁ-んァ-ンー]+)ました/g,(_,stem)=>past(stem))
.replace(/ありません/g,'ない').replace(/ございません/g,'ない').replace(/ございます/g,'ある')
.replace(/考えます/g,'考える').replace(/認識します/g,'認識する').replace(/判断します/g,'判断する').replace(/対応します/g,'対応する')
.replace(/実施します/g,'実施する').replace(/推進します/g,'推進する').replace(/確保します/g,'確保する').replace(/検討します/g,'検討する')
.replace(/目指します/g,'目指す').replace(/取り組みます/g,'取り組む').replace(/努めます/g,'努める').replace(/進めます/g,'進める')
.replace(/図ります/g,'図る').replace(/講じます/g,'講じる').replace(/行います/g,'行う').replace(/なります/g,'なる').replace(/あります/g,'ある')
.replace(/必要です/g,'必要である').replace(/重要です/g,'重要である').replace(/ものです/g,'ものである').replace(/ないです/g,'ない')
.replace(/です(?=[。！？]|$)/g,'である').replace(/ません(?=[。！？]|$)/g,'ない');return s}
export const hasPoliteEnding=s=>/(?:です|ます|ました|ません|ございます|おります)(?:[。！？]|$)/.test(String(s));
