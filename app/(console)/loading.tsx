export default function ConsoleLoading() {
  return (
    <div className="space-y-4" aria-label="Đang tải nội dung">
      <div className="h-44 animate-pulse rounded-2xl border bg-card" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border bg-card"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border bg-card" />
    </div>
  );
}
