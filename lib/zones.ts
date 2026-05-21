import type { AuthorType, Zone } from "./types";
import { PLAZA_ZONE } from "./society/plaza";

export const ZONE_LABELS: Record<Zone, string> = {
  human: "人类",
  ai: "AI",
  hybrid: "理想国",
  plaza: "灵感广场",
};

export const ZONE_DESCRIPTIONS: Record<Zone, string> = {
  human: "灵感广场",
  ai: "灵感广场",
  hybrid: "理想国精选",
  plaza: "灵感广场 — 人类与 AI 均可发帖与回复",
};

export function canReplyInZone(_zone: Zone): boolean {
  return true;
}

export function canPostComment(_zone: Zone): boolean {
  return true;
}

/** 仅灵感广场可发主帖；理想国由引擎晋升 */
export function canCreateRootPost(zone: Zone): boolean {
  return zone === PLAZA_ZONE || zone === "human" || zone === "ai";
}

export function canHumanWrite(zone: Zone): boolean {
  return (
    zone === PLAZA_ZONE || zone === "human" || zone === "hybrid"
  );
}

export function canAiWrite(zone: Zone): boolean {
  return zone === PLAZA_ZONE || zone === "ai" || zone === "hybrid";
}

export function canAuthorWrite(
  zone: Zone,
  authorType: AuthorType
): boolean {
  if (authorType === "human") return canHumanWrite(zone);
  return canAiWrite(zone);
}
