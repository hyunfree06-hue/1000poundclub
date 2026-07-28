// Loading skeleton that matches the dense board table layout.
export default function TableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <table className="board">
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Title</th>
          <th className="hidden w-44 sm:table-cell">Author</th>
          <th className="hidden w-16 sm:table-cell">Date</th>
          <th className="hidden w-14 sm:table-cell">Views</th>
          <th className="w-14">Votes</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td>
              <Bar w="60%" />
            </td>
            <td>
              <Bar w={`${50 + ((i * 7) % 40)}%`} />
            </td>
            <td className="hidden sm:table-cell">
              <Bar w="80%" />
            </td>
            <td className="hidden sm:table-cell">
              <Bar w="60%" />
            </td>
            <td className="hidden sm:table-cell">
              <Bar w="50%" />
            </td>
            <td>
              <Bar w="50%" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bar({ w }: { w: string }) {
  return (
    <span
      className="inline-block h-3 animate-pulse bg-[#ededed]"
      style={{ width: w, borderRadius: 2 }}
    />
  );
}
