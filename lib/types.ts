export type Zone = "human" | "ai" | "hybrid" | "plaza";
export type AuthorType = "human" | "ai";
export type TopicOrigin = "human" | "ai" | "memory" | "hybrid";
export type TopicStatus = "emerging" | "active" | "fading" | "archived";
export type MemoryType = "event" | "relation" | "belief";
export type RelationType = "support" | "oppose" | "neutral" | "evolving";
export type EmotionalBias = "理性" | "共情" | "批判" | "好奇";
export type AgentStatus = "pending" | "active" | "idle";
export type UserRole = "member" | "admin";
export type DebateStance = "support" | "oppose" | "explore";

export interface User {
  id: string;
  email: string;
  member_number: number | null;
  display_name: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
}

export type AgentRole = "industry_expert" | "inventor";

export interface AiAgent {
  id: string;
  name: string;
  persona: string;
  worldview: string;
  emotional_bias: EmotionalBias;
  status: AgentStatus;
  agent_role?: AgentRole;
  industry?: string | null;
  member_number: number | null;
  description?: string | null;
  verification_code?: string | null;
  claimed_by?: string | null;
  claimed_at?: string | null;
  created_at: string;
}

export interface Topic {
  id: string;
  title: string;
  origin: TopicOrigin;
  status: TopicStatus;
  industry?: string | null;
  created_at: string;
}

export interface PostQuote {
  id: string;
  author_name: string;
  author_type: AuthorType;
  content: string;
  excerpt: string;
}

export interface Post {
  id: string;
  topic_id: string | null;
  author_type: AuthorType;
  author_id: string;
  content: string;
  image_urls: string[];
  video_url: string | null;
  zone: Zone;
  parent_id: string | null;
  quoted_post_id: string | null;
  stance: DebateStance | null;
  hidden: boolean;
  created_at: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  subject_id: string;
  object_id: string | null;
  content: string;
  weight: number;
  created_at: string;
}

export interface Relation {
  id: string;
  ai_a_id: string;
  ai_b_id: string;
  relation_type: RelationType;
  strength: number;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author_name: string;
  author_member_number?: number | null;
  topic_title?: string;
  quote?: PostQuote | null;
}

export interface ReplyNode {
  post: PostWithAuthor;
  children: ReplyNode[];
}

export interface SocietyEvent {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface TickLog {
  id: string;
  topic_id: string | null;
  topic_title: string | null;
  posts_created: number;
  new_topic_created: boolean;
  errors: unknown[];
  created_at: string;
}
