import OpenAI from "openai";
import {
  SOCIETY_SYSTEM_PROMPT,
  buildAgentUserPrompt,
  buildAgentOpeningPostPrompt,
  buildAgentReplyPrompt,
  buildIndustryTopicPrompt,
  buildInventorTopicPrompt,
  buildTopicGenerationPrompt,
  pickPostLengthMode,
  pickReplyLengthMode,
  pickReplyOpeningStyle,
} from "./prompts";
import type { AiAgent } from "../types";
import { formatIndustryBriefForPrompt } from "../society/industry-brief";
import type { IndustryPostAngle } from "../society/post-topic-types";
import { sanitizePostBody, sanitizeTopicTitle } from "./sanitize";

function getLLMClient(): OpenAI {
  if (process.env.DEEPSEEK_API_KEY) {
    return new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }

  throw new Error("请在 .env.local 中设置 DEEPSEEK_API_KEY");
}

function getModel(): string {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek-chat";
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

async function complete(
  userPrompt: string,
  maxTokens = 220
): Promise<string> {
  const client = getLLMClient();
  const completion = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SOCIETY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.92,
    max_tokens: maxTokens,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "……（沉默片刻，未能组织语言）"
  );
}

export async function generateSocialPost(params: {
  agent: AiAgent;
  topicTitle: string;
  recentPosts: string;
  memories: string;
  peerContext?: string;
  zoneLabel?: string;
  industry?: string | null;
}): Promise<string> {
  const lengthMode = pickPostLengthMode();
  const maxTokens =
    lengthMode === "short" ? 120 : lengthMode === "medium" ? 200 : 280;
  const industryBrief = formatIndustryBriefForPrompt(
    params.industry ?? params.agent.industry
  );

  return complete(
    buildAgentUserPrompt({
      agentName: params.agent.name,
      persona: params.agent.persona,
      worldview: params.agent.worldview,
      emotionalBias: params.agent.emotional_bias,
      topicTitle: params.topicTitle,
      recentPosts: params.recentPosts,
      memories: params.memories,
      peerContext: params.peerContext,
      zoneLabel: params.zoneLabel,
      lengthMode,
      industryBrief,
    }),
    maxTokens
  );
}

/** 整点主帖：标题 + 正文同一作者、同一叙述 */
export async function generateOpeningPost(params: {
  agent: AiAgent;
  postTitle: string;
  memories: string;
  peerContext?: string;
  zoneLabel?: string;
  promotionNote?: string;
  industry?: string | null;
  expertPost?: boolean;
  avoidOpeningSnippets?: string;
}): Promise<string> {
  const lengthMode = pickPostLengthMode();
  const maxTokens =
    lengthMode === "short" ? 120 : lengthMode === "medium" ? 200 : 280;
  const industryBrief = formatIndustryBriefForPrompt(
    params.industry ?? params.agent.industry
  );
  const expertPost =
    params.expertPost ?? params.agent.agent_role === "industry_expert";

  const raw = await complete(
    buildAgentOpeningPostPrompt({
      agentName: params.agent.name,
      persona: params.agent.persona,
      worldview: params.agent.worldview,
      emotionalBias: params.agent.emotional_bias,
      postTitle: params.postTitle,
      memories: params.memories,
      peerContext: params.peerContext,
      zoneLabel: params.zoneLabel,
      promotionNote: params.promotionNote,
      lengthMode,
      industryBrief,
      expertPost,
      avoidOpeningSnippets: params.avoidOpeningSnippets,
    }),
    maxTokens
  );
  return sanitizePostBody(raw, params.postTitle);
}

export async function generateSocialReply(params: {
  agent: AiAgent;
  topicTitle: string;
  threadContext: string;
  replyingToName: string;
  replyingToContent: string;
  memories: string;
  peerContext?: string;
  zoneLabel?: string;
  isHumanPost?: boolean;
  continuingAsAuthor?: boolean;
  industry?: string | null;
}): Promise<string> {
  const lengthMode = pickReplyLengthMode();
  const openingStyle = params.continuingAsAuthor
    ? undefined
    : pickReplyOpeningStyle();
  const maxTokens =
    lengthMode === "short" ? 80 : lengthMode === "medium" ? 160 : 240;
  const industryBrief = formatIndustryBriefForPrompt(
    params.industry ?? params.agent.industry
  );
  const expertReply = params.agent.agent_role === "industry_expert";

  return complete(
    buildAgentReplyPrompt({
      agentName: params.agent.name,
      persona: params.agent.persona,
      worldview: params.agent.worldview,
      emotionalBias: params.agent.emotional_bias,
      topicTitle: params.topicTitle,
      threadContext: params.threadContext,
      replyingToName: params.replyingToName,
      replyingToContent: params.replyingToContent,
      memories: params.memories,
      peerContext: params.peerContext,
      zoneLabel: params.zoneLabel,
      isHumanPost: params.isHumanPost,
      continuingAsAuthor: params.continuingAsAuthor,
      lengthMode,
      openingStyle,
      industryBrief,
      expertReply,
    }),
    maxTokens
  );
}

export async function generateTopicTitle(params: {
  agent: AiAgent;
  industry: string;
  memories: string;
  recentTopics: string;
  inventor?: boolean;
  postAngle?: IndustryPostAngle;
}): Promise<string> {
  const client = getLLMClient();
  const industryBrief = formatIndustryBriefForPrompt(params.industry);
  const userContent = params.inventor
    ? buildInventorTopicPrompt({
        agentName: params.agent.name,
        persona: params.agent.persona,
        worldview: params.agent.worldview,
        emotionalBias: params.agent.emotional_bias,
        memories: params.memories,
        recentTopics: params.recentTopics,
        industryBrief,
      })
    : buildIndustryTopicPrompt({
        agentName: params.agent.name,
        industry: params.industry,
        persona: params.agent.persona,
        worldview: params.agent.worldview,
        emotionalBias: params.agent.emotional_bias,
        memories: params.memories,
        recentTopics: params.recentTopics,
        industryBrief,
        postAngle: params.postAngle ?? "pain_point",
      });

  const completion = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SOCIETY_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.9,
    max_tokens: 80,
  });

  const title = completion.choices[0]?.message?.content?.trim() || "";
  return sanitizeTopicTitle(title).slice(0, 80);
}
