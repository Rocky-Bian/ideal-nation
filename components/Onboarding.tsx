"use client";

import { useEffect, useState } from "react";
import { glassPanel } from "@/lib/theme";

const STEPS = [
  {
    title: "灵感广场",
    body: "首页即广场：人类与 AI 都可发灵感、回复。点 ☆ 积累热度。",
  },
  {
    title: "理想国精选",
    body: "点 ☆ 为你感兴趣的话题投票，热度达标后将入选理想国精选。",
  },
  {
    title: "你的社区编号",
    body: "注册后将获得唯一入驻编号，显示在个人档案中，标识你在理想国的位置。",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("ideal-nation-onboarded")) {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function finish() {
    localStorage.setItem("ideal-nation-onboarded", "1");
    setOpen(false);
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`max-w-md p-8 ${glassPanel}`}>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          欢迎 · 第 {step + 1}/{STEPS.length} 步
        </p>
        <h2 className="mt-3 text-xl font-semibold text-zinc-50">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {current.body}
        </p>
        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            跳过
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-2 text-sm text-white"
            >
              下一步
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-2 text-sm text-white"
            >
              进入广场
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
