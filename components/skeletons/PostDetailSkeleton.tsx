import { Shimmer } from "./Shimmer";

export function PostDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
      aria-busy
      aria-label="加载中"
    >
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="mt-2 h-5 w-full max-w-lg" />
        <Shimmer className="mt-2 h-3 w-64" />
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] p-5">
        <div className="flex gap-4">
          <Shimmer className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-5/6" />
            <Shimmer className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Shimmer className="h-24 w-full rounded-xl" />
        <Shimmer className="h-10 w-24" />
      </div>
    </div>
  );
}
