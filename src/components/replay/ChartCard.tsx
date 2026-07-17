export const GRID = "#2c2c2a";
export const AXIS = "#898781";

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="h-20">{children}</div>
    </div>
  );
}
