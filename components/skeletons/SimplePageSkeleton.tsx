import { Shimmer } from "./Shimmer";

export function SimplePageSkeleton({
  titleWidth = "w-40",
  rows = 6,
}: {
  titleWidth?: string;
  rows?: number;
}) {
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-12 sm:max-w-3xl"
      aria-busy
      aria-label="加载中"
    >
      <Shimmer className={`h-8 ${titleWidth}`} />
      <Shimmer className="mt-2 h-4 w-56" />
      <ul className="mt-8 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
          >
            <Shimmer className="h-3 w-32" />
            <Shimmer className="mt-3 h-4 w-4/5" />
            <Shimmer className="mt-2 h-4 w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ObservePageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy aria-label="加载中">
      <Shimmer className="h-8 w-36" />
      <Shimmer className="mt-2 h-4 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.08] p-5"
          >
            <Shimmer className="h-8 w-12" />
            <Shimmer className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] p-5">
          <Shimmer className="h-5 w-24" />
          <Shimmer className="mt-4 h-48 w-full" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.08] p-5"
            >
              <Shimmer className="h-4 w-full" />
              <Shimmer className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12" aria-busy aria-label="加载中">
      <Shimmer className="h-8 w-32" />
      <Shimmer className="mt-2 h-4 w-48" />
      <div className="mt-8 space-y-4 rounded-2xl border border-white/[0.08] p-6">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-10 w-full" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-24 w-full" />
        <Shimmer className="h-9 w-24" />
      </div>
    </div>
  );
}
