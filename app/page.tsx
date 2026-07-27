// Placeholder board. The dense post-list table, sort tabs, search and
// numbered pagination are built in the Board step. This confirms the layout,
// design tokens and Supabase clients are wired up.
export default function HomePage() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-3 text-base">
          <span className="font-bold text-accent">Latest</span>
          <span className="text-muted">Top (24h)</span>
          <span className="text-muted">Top (week)</span>
        </div>
        <a href="/write" className="btn btn-accent">
          Write
        </a>
      </div>

      <table className="board">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Title</th>
            <th className="w-40">Author</th>
            <th className="w-24">Date</th>
            <th className="w-14">Views</th>
            <th className="w-14">Votes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="py-6 text-center text-muted">
              No posts yet. The board renders here once the Board step is built.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
