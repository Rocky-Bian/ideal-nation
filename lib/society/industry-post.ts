import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";
import { generateOpeningPost } from "../ai/client";
import { generateUniqueTopicTitle } from "./topic-title";
import {
  loadMemoriesForAgent,
  formatMemoriesForPrompt,
  updateMemoryFromPost,
} from "./memory";
import {
  loadRelationsForAgent,
  formatRelationsForPrompt,
} from "./relations";
import { PLAZA_LABEL, PLAZA_ZONE } from "./plaza";
import { INVENTOR_INDUSTRY } from "./industries";
import { fetchRecentOpeningSnippetsByAgent } from "./agent-post-guard";
import { pickIndustryPostAngle } from "./post-topic-types";

export async function publishIndustryExpertPost(
  supabase: SupabaseClient,
  agent: AiAgent,
  agentNames: Map<string, string>
): Promise<{
  topicId: string;
  postId: string;
  topicTitle: string;
  postAngleLabel: string;
}> {
  const industry = agent.industry?.trim();
  if (!industry) {
    throw new Error(`${agent.name} 未配置行业`);
  }

  const memories = await loadMemoriesForAgent(supabase, agent.id, 8);
  const postAngle = pickIndustryPostAngle();

  const cleanTitle = await generateUniqueTopicTitle(supabase, {
    agent,
    industry,
    memories: formatMemoriesForPrompt(memories),
    postAngle: postAngle.id,
  });
  if (!cleanTitle) {
    throw new Error("未能生成话题标题");
  }

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .insert({
      title: cleanTitle,
      origin: "ai",
      status: "active",
      industry,
    })
    .select()
    .single();

  if (topicErr || !topic) {
    throw new Error(topicErr?.message || "创建话题失败");
  }

  const relations = await loadRelationsForAgent(supabase, agent.id);
  const recentOpenings = await fetchRecentOpeningSnippetsByAgent(
    supabase,
    agent.id,
    4
  );
  const avoidOpenings =
    recentOpenings.length > 0
      ? recentOpenings.map((s) => `- ${s}`).join("\n")
      : "";

  const content = await generateOpeningPost({
    agent,
    postTitle: topic.title,
    memories: formatMemoriesForPrompt(memories),
    peerContext: formatRelationsForPrompt(relations, agent.id, agentNames),
    zoneLabel: `${PLAZA_LABEL} · ${industry} · ${postAngle.label}`,
    expertPost: true,
    avoidOpeningSnippets: avoidOpenings,
  });

  const { data: rootRow, error: rootErr } = await supabase
    .from("posts")
    .insert({
      topic_id: topic.id,
      author_type: "ai",
      author_id: agent.id,
      content,
      zone: PLAZA_ZONE,
      parent_id: null,
    })
    .select("id")
    .single();

  if (rootErr || !rootRow) {
    throw new Error(rootErr?.message || "发帖失败");
  }

  await updateMemoryFromPost(supabase, agent.id, topic.id, content);

  return {
    topicId: topic.id as string,
    postId: rootRow.id as string,
    topicTitle: topic.title as string,
    postAngleLabel: postAngle.label,
  };
}

/** 发明家跨界主帖 */
export async function publishInventorPost(
  supabase: SupabaseClient,
  agent: AiAgent,
  agentNames: Map<string, string>
): Promise<{ topicId: string; postId: string; topicTitle: string }> {
  const industry = agent.industry?.trim() || INVENTOR_INDUSTRY;
  const memories = await loadMemoriesForAgent(supabase, agent.id, 8);

  const cleanTitle = await generateUniqueTopicTitle(supabase, {
    agent,
    industry,
    memories: formatMemoriesForPrompt(memories),
    inventor: true,
  });
  if (!cleanTitle) {
    throw new Error("未能生成跨界话题标题");
  }

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .insert({
      title: cleanTitle,
      origin: "ai",
      status: "active",
      industry,
    })
    .select()
    .single();

  if (topicErr || !topic) {
    throw new Error(topicErr?.message || "创建话题失败");
  }

  const relations = await loadRelationsForAgent(supabase, agent.id);
  const content = await generateOpeningPost({
    agent,
    postTitle: topic.title,
    memories: formatMemoriesForPrompt(memories),
    peerContext: formatRelationsForPrompt(relations, agent.id, agentNames),
    zoneLabel: `${PLAZA_LABEL} · 跨界发明`,
  });

  const { data: rootRow, error: rootErr } = await supabase
    .from("posts")
    .insert({
      topic_id: topic.id,
      author_type: "ai",
      author_id: agent.id,
      content,
      zone: PLAZA_ZONE,
      parent_id: null,
    })
    .select("id")
    .single();

  if (rootErr || !rootRow) {
    throw new Error(rootErr?.message || "发帖失败");
  }

  await updateMemoryFromPost(supabase, agent.id, topic.id, content);

  return {
    topicId: topic.id as string,
    postId: rootRow.id as string,
    topicTitle: topic.title as string,
  };
}
