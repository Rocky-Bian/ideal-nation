"use client";

import type { AiAgent, Relation } from "@/lib/types";

export function RelationGraph({
  relations,
  agents,
}: {
  relations: Relation[];
  agents: AiAgent[];
}) {
  const names = new Map(agents.map((a) => [a.id, a.name]));
  const nodes = agents.slice(0, 8);
  const cx = 160;
  const cy = 120;
  const r = 80;

  if (!nodes.length) {
    return <p className="text-sm text-zinc-500">暂无关系数据</p>;
  }

  return (
    <svg viewBox="0 0 320 240" className="w-full max-w-sm text-zinc-400">
      {relations.slice(0, 12).map((rel, i) => {
        const ai = nodes.findIndex((n) => n.id === rel.ai_a_id);
        const bi = nodes.findIndex((n) => n.id === rel.ai_b_id);
        if (ai < 0 || bi < 0) return null;
        const a1 = (ai / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const a2 = (bi / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        const color =
          rel.relation_type === "support"
            ? "#34d399"
            : rel.relation_type === "oppose"
              ? "#f87171"
              : "#a78bfa";
        return (
          <line
            key={rel.id || i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={Math.max(1, Math.abs(rel.strength) * 3)}
            strokeOpacity={0.6}
          />
        );
      })}
      {nodes.map((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r={14} fill="#1e1b4b" stroke="#8b5cf6" />
            <text
              x={x}
              y={y + 28}
              textAnchor="middle"
              className="fill-zinc-400 text-[9px]"
            >
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
