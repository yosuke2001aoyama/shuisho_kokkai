const JP = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const REQUEST_ENDING = /(?:か|どうか|なのか|いかん|問う|伺う|示されたい|明らかにされたい|説明されたい|回答されたい|求める)[。？！?]*$/u;
const MARKER = /^(?:問\s*)?(?:(?:[一二三四五六七八九十百]+|\d+|[①-⑳])(?:の(?:[一二三四五六七八九十]+|\d+))?|[（(](?:[一二三四五六七八九十]+|\d+)[）)])\s*[　 、，．.\-]*/u;

const normalize = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/[\t\r]+/gu, ' ')
  .replace(/[ ]{2,}/gu, ' ')
  .trim();

function balancedSentences(input = '') {
  const text = normalize(input);
  const out = [];
  let start = 0;
  let round = 0;
  let quote = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if ('([（［'.includes(character)) round += 1;
    if (')]）］'.includes(character)) round = Math.max(0, round - 1);
    if ('「『'.includes(character)) quote += 1;
    if ('」』'.includes(character)) quote = Math.max(0, quote - 1);
    if ('。？！?'.includes(character) && round === 0 && quote === 0) {
      const sentence = normalize(text.slice(start, index + 1));
      if (sentence) out.push(sentence);
      start = index + 1;
    }
  }
  const tail = normalize(text.slice(start));
  if (tail) out.push(tail);
  return out;
}

function splitInput(input = '') {
  const raw = String(input).normalize('NFKC');
  const lines = raw.split(/\n+/u).map((line) => normalize(line).replace(MARKER, '')).filter((line) => line.length >= 4);
  if (lines.length > 1) return lines;
  return balancedSentences(raw).filter((sentence) => sentence.length >= 4);
}

function toQuestion(sentence = '') {
  let text = normalize(sentence).replace(MARKER, '').replace(/[？?]+$/u, '。');
  if (REQUEST_ENDING.test(text)) return /[。？！?]$/u.test(text) ? text : `${text}。`;
  if (/政府|内閣|関係府省|我が国/u.test(text)) return `${text.replace(/。$/u, '')}について、政府の見解を明らかにされたい。`;
  return `${text.replace(/。$/u, '')}について、政府の認識及び対応を明らかにされたい。`;
}

function topicFrom(items = []) {
  const first = normalize(items[0] || '国政上の課題')
    .replace(MARKER, '')
    .replace(/[「」『』]/gu, '')
    .replace(/(?:について|に関して|に対する)?(?:政府|内閣|我が国)?の?(?:見解|認識|対応|方針|説明).*$/u, '')
    .replace(/(?:を)?(?:問う|伺う|示されたい|明らかにされたい|説明されたい|回答されたい).*$/u, '')
    .replace(/[。？！?]+$/u, '')
    .trim();
  if (!first || first.length > 42) return '国政上の課題';
  return first;
}

export function buildQuestionDraft(input = '') {
  const items = splitInput(input);
  const questions = (items.length ? items : [normalize(input)]).slice(0, 20).map(toQuestion);
  const topic = topicFrom(questions);
  const title = `${topic}に関する質問主意書`;
  const preamble = `${topic}に関する政府の認識及び対応を確認するため、以下質問する。`;
  const numbered = questions.map((question, index) => `${JP[index] || index + 1}　${question}`).join('\n\n');
  const draft = `${title}\n\n　${preamble}\n\n${numbered}\n\n　右質問する。`;
  return {
    version: '25.0',
    title: '質問主意書原案',
    segments: [{ text: draft, referenceKey: null }],
    draft,
    references: [{
      id: 'question-example',
      referenceKey: 'r1',
      sourceType: 'written',
      sourceTypeLabel: '質問主意書実例',
      category: 'official_policy',
      categoryLabel: '国会公式資料',
      title: '質問主意書答弁業務の負担軽減に関する質問主意書',
      url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/a204119.htm',
      sourceName: '衆議院',
      date: '2021-04-28',
      phrase: '質問の背景を簡潔に述べ、「以下質問する。」に続けて項目を番号で整理し、末尾を「右質問する。」とする構成の実例。',
      quotedPhrase: '質問の背景を簡潔に述べ、「以下質問する。」に続けて項目を番号で整理し、末尾を「右質問する。」とする構成の実例。',
      borrowed: false,
    }],
    referenceLabel: '構成・用例',
    evidenceCount: 1,
    issueCount: questions.length,
    missingIssueCount: 0,
    coverage: questions.map((question, index) => ({
      issueIndex: index + 1,
      issue: question,
      topic,
      status: 'covered',
      responseType: 'question',
      requestedKinds: ['question'],
      evidenceCount: 0,
      pointCount: 1,
      generated: true,
    })),
    coverageSummary: {
      total: questions.length,
      covered: questions.length,
      missing: 0,
      substantive: questions.length,
      qualifiedOrLimited: 0,
      generated: questions.length,
      totalPoints: questions.length,
    },
    questionAnalysis: {
      askedUnits: questions.length,
      logicalIssues: questions.length,
      answerParagraphs: questions.length,
      groupingNote: '入力された確認事項を、質問主意書の番号項目へ整理した。',
    },
    reviewNotes: [
      '提出前に、質問の前提となる事実、日付、固有名詞及び引用を一次資料で確認すること。',
      '単なる資料要求にとどまらず、内閣の認識又は対応を問う形になっているか確認すること。',
    ],
    draftingStance: '質問の背景、番号項目及び結語を明示し、各項目を一文一義で構成する。',
    priorityRule: '質問事項を勝手に増やさず、入力された確認事項だけを番号項目にする。',
    style: '常体',
    officialStyleCheck: null,
    officialStyleVersion: null,
  };
}
