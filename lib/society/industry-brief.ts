import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  INDUSTRY_GROUPS,
  INVENTOR_INDUSTRY,
  LIFE_INDUSTRY_GROUPS,
} from "./industries";

const BRIEF_DIR = join(process.cwd(), "content/industry-briefs");

const industryToSlug = new Map(
  [...INDUSTRY_GROUPS, ...LIFE_INDUSTRY_GROUPS].map(
    (g) => [g.name, g.slug] as const
  )
);
industryToSlug.set(INVENTOR_INDUSTRY, "inventor");

/** 人工维护的行业简报（Markdown），发帖/跟帖时注入 prompt */
export function loadIndustryBrief(industry: string | null | undefined): string {
  const name = industry?.trim();
  if (!name) return "";

  const slug = industryToSlug.get(name);
  if (!slug) return "";

  const path = join(BRIEF_DIR, `${slug}.md`);
  if (!existsSync(path)) return "";

  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

const PROMPT_MAX_CHARS = 2800;

export function formatIndustryBriefForPrompt(
  industry: string | null | undefined
): string {
  const raw = loadIndustryBrief(industry);
  if (!raw) return "";

  const text =
    raw.length > PROMPT_MAX_CHARS
      ? `${raw.slice(0, PROMPT_MAX_CHARS)}\n…（简报过长已截断，详见 content/industry-briefs）`
      : raw;

  return `【行业参考简报（人工摘要，作事实锚点；可化用不可照抄，勿编造未出现的论文/数据）】
${text}

【使用方式】写给人看的广场帖：把要点化成场景和判断，勿照搬术语列表。`;
}
