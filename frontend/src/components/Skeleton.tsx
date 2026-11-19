export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/75 ${className}`} aria-hidden="true" />;
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="hs-card overflow-hidden" aria-busy="true" aria-label="Carregando dados">
      <div className="border-b border-stone-200 bg-stone-50/80 px-5 py-3.5">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, i) => (
            <SkeletonBlock key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="grid items-center gap-4 px-5 py-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }, (_, c) => (
              <SkeletonBlock
                key={c}
                className={`h-4 ${c === 0 ? "w-28" : c === cols - 1 ? "ml-auto w-16" : "w-24"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
