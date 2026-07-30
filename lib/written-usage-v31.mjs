const WRITTEN_EXAMPLE_A = {
  title: '高市内閣総理大臣の答弁の撤回に係る認識に関する質問に対する答弁書',
  sourceName: '参議院',
  url: 'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/219/touh/t219059.htm',
  date: '2025-12-12',
};

const WRITTEN_EXAMPLE_B = {
  title: 'ＮＨＫの報道等に関する質問に対する答弁書',
  sourceName: '参議院',
  url: 'https://www.sangiin.go.jp/japanese/joho1/kousei/syuisyo/213/touh/t213103.htm',
  date: '2024-04-19',
};

const WRITTEN_EXAMPLE_C = {
  title: '存立危機事態に関する質問に対する答弁書',
  sourceName: '衆議院',
  url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b219071.htm',
  date: '2025-11-25',
};

const entry = (id, phrase, category, use, example, source) => ({
  id,
  phrase,
  category,
  use,
  example,
  ...source,
});

export const WRITTEN_USAGE_LIBRARY = [
  entry('pointed-out', '御指摘の', '照応', '質問文に含まれる主張、評価、引用又は前提を受ける。', '御指摘の答弁については、令和七年十一月七日の衆議院予算委員会において答弁した内容の一部である。', WRITTEN_EXAMPLE_C),
  entry('questioned', 'お尋ねの', '照応', '回答を求められた語句又は事項を受ける。', 'お尋ねの「政府の見解とは異なる個人的な見解」の具体的に意味するところが必ずしも明らかではない。', WRITTEN_EXAMPLE_A),
  entry('topic-particle', 'について', '助詞', '取り上げる論題又は回答対象を示す。', '前段のお尋ねについては、捜査機関において必要と認める場合には、適切に対応するものと承知している。', WRITTEN_EXAMPLE_B),
  entry('relational-particle', 'に関する', '助詞', '対象との関係を簡潔に示す。', '個別の事件における捜査機関の報道機関への対応に関するものである。', WRITTEN_EXAMPLE_B),
  entry('conditional', 'であれば', '限定', '質問文の語が指す対象を特定した場合に限って答える。', '質問の対象が当該行為であれば、その具体的な事実関係に即して判断する。', WRITTEN_EXAMPLE_C),
  entry('government-position', '政府として', '主体', '政府の判断又は立場を、質問者の評価と区別して示す。直後の助詞「は」は別の用例として扱う。', '政府として把握する立場にないため、お尋ねについてお答えすることは困難である。', WRITTEN_EXAMPLE_B),
  entry('particle-wa', 'は', '助詞', '既に示した主題を取り立て、後続する説明又は判断の対象とする。', '御指摘の答弁については、令和七年十一月七日の衆議院予算委員会において答弁した内容の一部である。', WRITTEN_EXAMPLE_C),
  entry('particle-wo', 'を', '助詞', '動作、判断又は処理が直接及ぶ対象を示す。', '政府がその持ち得る全ての情報を総合して客観的かつ合理的に判断する。', WRITTEN_EXAMPLE_A),
  entry('particle-ni', 'に', '助詞', '判断が即する事情、動作の到達先又は時点を示す。', '事態の個別具体的な状況に即して判断する。', WRITTEN_EXAMPLE_A),
  entry('particle-de', 'で', '助詞', '判断が行われる範囲、手段又は状態を示す。', 'このような政府の見解であり、その旨を一貫して答弁してきている。', WRITTEN_EXAMPLE_A),
  entry('particle-to', 'と', '助詞', '引用、認識の内容又は相手方との関係を示す。', '各社の判断において記事にしているものと承知している。', WRITTEN_EXAMPLE_B),
  entry('particle-no', 'の', '助詞', '名詞相互の所属、対象又は内容の関係を示す。', '政府の見解については、お尋ねのように完全に維持している。', WRITTEN_EXAMPLE_C),
  entry('particle-ga', 'が', '助詞', '動作又は判断の主体を示し、又は前後の文を接続する。', '政府がその持ち得る全ての情報を総合して判断する。', WRITTEN_EXAMPLE_A),
  entry('particle-mo', 'も', '助詞', '同種の対象を追加し、又は当該対象を含むことを示す。', '御指摘の報道も含め、報道機関各社は取材活動に基づいて判断している。', WRITTEN_EXAMPLE_B),
  entry('present-time', '現時点で', '時点', '将来を拘束せず、回答時点の把握又は判断であることを示す。', '現時点で把握している事実関係に基づき判断する。', WRITTEN_EXAMPLE_B),
  entry('factual-link', 'ことから', '接続', '直前の事実又は理由を、結論に直接結び付ける。', 'その内容は捜査の内容に関わる事柄であることから、政府としてお答えすることは差し控えたい。', WRITTEN_EXAMPLE_B),
  entry('general-rule', '一般に', '射程', '個別事案の結論と区別して、確立した一般的な判断基準を示す。', '一般に、いかなる事態が存立危機事態に該当するかについては、個別具体的な状況に即して判断する。', WRITTEN_EXAMPLE_A),
  entry('contrast', '他方', '接続', '前文と対になる法規範、事情又は例外を示す。', '一方の要件を示した上で、他方の要件を区別して記載する。', WRITTEN_EXAMPLE_C),
  entry('and', '及び', '接続', '同じ階層にある語句を併合する。', '我が国及び国際社会の平和及び安全の確保に資する。', WRITTEN_EXAMPLE_A),
  entry('or', '又は', '接続', '主要な選択関係を示す。', '法令又は条約に定める要件に該当するかを判断する。', WRITTEN_EXAMPLE_C),
  entry('based-on-facts', 'に即して', '助詞', '個別具体的な状況に適合させて判断することを示す。', '事態の個別具体的な状況に即して、政府が全ての情報を総合して判断する。', WRITTEN_EXAMPLE_C),
  entry('determination', '判断される', '結論', '判断主体又は判断基準が文脈上明確な場合に、判断の帰結を示す。', '個別具体的な状況に即して判断されるものである。', WRITTEN_EXAMPLE_B),
  entry('government-view', 'と考えている', '結論', '政府の現時点の認識又は方針を常体で示す。', '事態の早期沈静化が重要であると考えている。', WRITTEN_EXAMPLE_C),
  entry('legal-assessment-reserve', '確定的な評価を示していない', '法的評価', '事実確認が不十分な個別行為について、評価していないという政府の結論を明示する。', '事実関係の十分な把握が困難である中、確定的な法的評価を申し上げることは控える。', {
    title: '岩屋外務大臣会見記録（イスラエル・イラン情勢）',
    sourceName: '外務省',
    url: 'https://www.mofa.go.jp/mofaj/press/kaiken/kaikenw_000001_00148.html',
    date: '2025-06-20',
  }),
];

function singleParticleMatchAllowed(text, usage, start) {
  if (!/^particle-/u.test(usage.id)) return true;
  const previous = text[start - 1] || '';
  const next = text[start + 1] || '';
  if (usage.phrase === 'が' && ((previous === '我' && next === '国')
    || (previous === 'な' && next === 'ら'))) return false;
  if (usage.phrase === 'と' && ['こ', 'も'].includes(previous)) return false;
  if (usage.phrase === 'で' && next === 'き') return false;
  if (usage.phrase === 'も' && ['の', 'と'].includes(next)) return false;
  return true;
}

function matchesFor(text, library) {
  const matches = [];
  for (const usage of library) {
    let from = 0;
    while (from < text.length) {
      const start = text.indexOf(usage.phrase, from);
      if (start < 0) break;
      if (singleParticleMatchAllowed(text, usage, start)) {
        matches.push({ start, end: start + usage.phrase.length, usage });
      }
      from = start + usage.phrase.length;
    }
  }
  return matches.sort((a, b) => a.start - b.start || b.end - a.end);
}

function nonOverlapping(matches) {
  const selected = [];
  let cursor = -1;
  for (const match of matches) {
    if (match.start < cursor) continue;
    selected.push(match);
    cursor = match.end;
  }
  return selected;
}

export function annotateWrittenResult(result = {}) {
  if (!/答弁書/u.test(result.title || '')) return result;
  const seen = new Map();
  const segments = (result.segments || []).map((segment, segmentIndex) => {
    if (!segment.responseType) return segment;
    const text = String(segment.text || '');
    const usageSpans = nonOverlapping(matchesFor(text, WRITTEN_USAGE_LIBRARY))
      .map((match, spanIndex) => {
        const usageKey = `u-${match.usage.id}`;
        if (!seen.has(usageKey)) {
          seen.set(usageKey, {
            usageKey,
            phrase: match.usage.phrase,
            category: match.usage.category,
            use: match.usage.use,
            example: match.usage.example,
            title: match.usage.title,
            sourceName: match.usage.sourceName,
            url: match.usage.url,
            date: match.usage.date,
          });
        }
        return {
          id: `${usageKey}-${segmentIndex + 1}-${spanIndex + 1}`,
          usageKey,
          start: match.start,
          end: match.end,
          phrase: match.usage.phrase,
          category: match.usage.category,
        };
      });
    return { ...segment, usageSpans };
  });
  return {
    ...result,
    segments,
    usageExamples: [...seen.values()],
    usageGranularity: '短句・助詞・接続語単位',
  };
}
