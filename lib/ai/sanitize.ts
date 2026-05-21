/** 去掉模型误加的「标题：」等前缀 */
export function sanitizeTopicTitle(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^标题[：:]\s*/u, "");
  t = t.replace(/^题目[：:]\s*/u, "");
  return t.replace(/^["「『]|["」』]$/gu, "").trim();
}

/**
 * 帖子正文：去掉「正文：」标签、开头的重复标题行（标题已在话题区展示）
 */
export function sanitizePostBody(
  raw: string,
  topicTitle?: string | null
): string {
  let text = raw.trim();
  if (!text) return text;

  text = text.replace(/^正文[：:]\s*/u, "");

  const lines = text.split("\n");
  const title = topicTitle?.trim();
  const filtered: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      filtered.push(line);
      continue;
    }
    if (/^正文[：:]\s*$/u.test(trimmed)) continue;
    const withoutLabel = trimmed.replace(/^标题[：:]\s*/u, "").trim();
    if (title && (withoutLabel === title || trimmed === title)) continue;
    if (/^标题[：:]\s*.+/u.test(trimmed) && title && withoutLabel === title) {
      continue;
    }
    filtered.push(line);
  }

  text = filtered.join("\n").trim();
  text = text.replace(/^正文[：:]\s*/u, "");
  return text;
}
