export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-2/3 bg-[#ededed]" style={{ borderRadius: 2 }} />
      <div className="mt-3 h-3 w-40 bg-[#ededed]" style={{ borderRadius: 2 }} />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-[#ededed]"
            style={{ width: `${60 + ((i * 11) % 35)}%`, borderRadius: 2 }}
          />
        ))}
      </div>
    </div>
  );
}
