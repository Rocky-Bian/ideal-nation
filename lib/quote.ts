/** 引用块展示用摘录 */
export function excerptQuote(content: string, maxLen = 160): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen)}…`;
}
