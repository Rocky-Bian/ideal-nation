/** 安全解析 fetch 响应体，避免空响应导致 JSON.parse 报错 */
export async function parseApiJson<T extends { error?: string }>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`请求失败 (${res.status})`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "服务器返回了无效数据"
        : `请求失败 (${res.status})`
    );
  }
}
