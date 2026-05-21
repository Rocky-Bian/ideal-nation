export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.07] ${className}`}
      aria-hidden
    />
  );
}
