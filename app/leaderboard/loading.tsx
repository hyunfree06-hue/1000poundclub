import TableSkeleton from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div>
      <span className="mb-3 inline-block h-4 w-40 animate-pulse bg-[#ededed]" style={{ borderRadius: 2 }} />
      <TableSkeleton rows={12} />
    </div>
  );
}
