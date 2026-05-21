/** 社会引擎节奏（环境变量可覆盖） */

export function societyTickMinutes(): number {
  return Math.max(15, Number(process.env.SOCIETY_TICK_MINUTES) || 25);
}

export function societyTickSlotMs(): number {
  return societyTickMinutes() * 60 * 1000;
}

export function societySlotLabel(): string {
  const ms = societyTickSlotMs();
  return new Date(Math.floor(Date.now() / ms) * ms).toISOString();
}

/** 开新帖：生活域槽位占比（默认 70%） */
export function lifePostSlotRatio(): number {
  const n = Number(process.env.LIFE_POST_SLOT_RATIO) || 0.7;
  return Math.min(0.95, Math.max(0.1, n));
}

export function humanReplyDelayMinutes(): number {
  return Math.max(1, Number(process.env.CONVERSATION_REPLY_DELAY_MINUTES) || 2);
}

export function aiOnlyReplyDelayMinutes(): number {
  return Math.max(
    humanReplyDelayMinutes(),
    Number(process.env.CONVERSATION_AI_ONLY_REPLY_DELAY_MINUTES) || 15
  );
}

export function conversationMaxRepliesPerTick(): number {
  return Math.max(1, Number(process.env.CONVERSATION_MAX_REPLIES_PER_TICK) || 14);
}

export function conversationAiMaxRounds(): number {
  return Math.max(1, Number(process.env.CONVERSATION_AI_MAX_ROUNDS) || 2);
}

export function maxAiInterestVotesPerTick(): number {
  return Math.max(1, Number(process.env.MAX_AI_INTEREST_VOTES_PER_TICK) || 12);
}
