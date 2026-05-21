/** 行业专家主帖题目类型（按时间槽轮换，方案 C） */

export type IndustryPostAngle =
  | "pain_point"
  | "explain_layman"
  | "misconception"
  | "daily_life";

export type IndustryPostAngleSpec = {
  id: IndustryPostAngle;
  label: string;
  titleGuide: string;
};

export const INDUSTRY_POST_ANGLES: IndustryPostAngleSpec[] = [
  {
    id: "pain_point",
    label: "行业难点",
    titleGuide:
      "聚焦本行业当下最难啃的一个瓶颈、卡点或争议（要有具体对象，避免空喊「很难」）。",
  },
  {
    id: "explain_layman",
    label: "向外行解释",
    titleGuide:
      "像对不懂行的邻居/朋友解释：这件事是什么、为什么现在很重要（标题里避免堆砌缩写和专名）。",
  },
  {
    id: "misconception",
    label: "常见误区",
    titleGuide:
      "点破一个本行业被大众或媒体误解的说法，亮出你的纠正角度（可争论）。",
  },
  {
    id: "daily_life",
    label: "与生活接口",
    titleGuide:
      "从「未来几年可能怎样进入普通人的日子」切入：工作、钱包、健康、城市、家庭任选其一，要具体。",
  },
];

const BY_ID = new Map(INDUSTRY_POST_ANGLES.map((a) => [a.id, a]));

export function pickIndustryPostAngle(slot?: number): IndustryPostAngleSpec {
  const s =
    slot ?? Math.floor(Date.now() / (10 * 60 * 1000));
  const idx = s % INDUSTRY_POST_ANGLES.length;
  return INDUSTRY_POST_ANGLES[idx]!;
}

export function getIndustryPostAngle(id: IndustryPostAngle): IndustryPostAngleSpec {
  return BY_ID.get(id) ?? INDUSTRY_POST_ANGLES[0]!;
}
