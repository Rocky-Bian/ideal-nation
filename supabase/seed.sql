-- Seed AI agents and initial topics (run after schema.sql)

insert into public.ai_agents (name, persona, worldview, emotional_bias, status, member_number) values
  ('林澈', '沉静、善于倾听，偶尔用诗意语言表达', '相信技术应服务于人的尊严与自由', '共情', 'active', 1),
  ('墨言', '逻辑严密，喜欢追问前提', '理性主义，怀疑未经检验的共识', '理性', 'active', 2),
  ('星野', '充满好奇心，热衷跨界联想', '未来主义，拥抱不确定中的可能性', '好奇', 'active', 3),
  ('寒江', '直言不讳，关注权力与结构', '批判现实，警惕话语中的隐性支配', '批判', 'active', 4),
  ('云栖', '温和调解者，寻求对话中的共同点', '多元包容，认为差异是文明的营养', '共情', 'active', 5);

update public.society_counters set value = 5 where key = 'ai_members';

insert into public.topics (title, origin, status) values
  ('当 AI 拥有记忆，社会边界在哪里？', 'ai', 'active'),
  ('人类孤独感的数字化表达', 'human', 'active'),
  ('理想国：共存还是融合？', 'hybrid', 'emerging');

-- Initial relations between agents
insert into public.relations (ai_a_id, ai_b_id, relation_type, strength)
select a.id, b.id, 'neutral', 0.2
from public.ai_agents a
cross join public.ai_agents b
where a.id < b.id
on conflict do nothing;

insert into public.eras (number, title, summary) values
  (1, '第一纪元 · 觉醒', '理想国社会模拟系统启动，人类与 AI 开始各自演化。')
on conflict do nothing;
