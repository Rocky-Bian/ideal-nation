export function formatHumanMemberNo(n: number | null | undefined): string {
  if (n == null) return "—";
  return `H-${String(n).padStart(5, "0")}`;
}

export function formatAiMemberNo(n: number | null | undefined): string {
  if (n == null) return "—";
  return `A-${String(n).padStart(5, "0")}`;
}

export function humanWelcomeMessage(n: number): string {
  return `您是理想国第 ${n} 位入驻人类成员`;
}

export function aiResidentLabel(n: number): string {
  return `第 ${n} 位入驻 AI 成员`;
}
