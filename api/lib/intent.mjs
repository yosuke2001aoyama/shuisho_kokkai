const INTENT_GROUPS = [
  { match: /強化|拡充|充実/u, terms: ['強化', '拡充', '充実', '推進'] },
  { match: /対応|対策|措置/u, terms: ['対応', '対策', '措置', '支援'] },
  { match: /実現|達成/u, terms: ['実現', '達成', '目指す'] },
  { match: /確保|維持/u, terms: ['確保', '維持', '守る'] },
  { match: /改善|解決|是正/u, terms: ['改善', '解決', '是正', '見直し'] },
  { match: /認識|見解|考え|評価/u, terms: ['認識', '見解', '考え', '評価'] },
  { match: /理由|根拠/u, terms: ['理由', '根拠', 'ため'] },
  { match: /影響|効果/u, terms: ['影響', '効果', '結果'] },
  { match: /必要|妥当|適切/u, terms: ['必要', '妥当', '適切'] },
  { match: /違反|適法|合法/u, terms: ['違反', '適法', '合法', '法的'] },
];

export function enrichIssueIntent(issue) {
  const label = String(issue.label || '').normalize('NFKC');
  const intents = [...new Set(INTENT_GROUPS.filter((x) => x.match.test(label)).flatMap((x) => x.terms))];
  if (!intents.length) return issue;
  const topic = issue.topic || issue.label;
  return {
    ...issue,
    intents,
    anchors: [...new Set([...(issue.anchors || []), ...intents])],
    queries: [...new Set([
      `${topic} ${intents.slice(0, 3).join(' ')}`,
      ...(issue.queries || []),
    ].filter(Boolean))],
  };
}
