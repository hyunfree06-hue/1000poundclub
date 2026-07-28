import TableSkeleton from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-block h-4 w-40 animate-pulse bg-[#ededed]" style={{ borderRadius: 2 }} />
        <span className="inline-block h-6 w-16 animate-pulse bg-[#ededed]" style={{ borderRadius: 2 }} />
      </div>
      <TableSkeleton rows={14} />
    </div>
  );
}
