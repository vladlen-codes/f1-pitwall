"use client";

import { formatClock } from "@/lib/format";
import type { Driver, Overtake } from "@/types/openf1";

interface OvertakeFeedProps {
  overtakes: Overtake[];
  drivers: Map<number, Driver>;
}

export function OvertakeFeed({ overtakes, drivers }: OvertakeFeedProps) {
  const recent = overtakes.slice(-30).reverse();

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Overtakes
      </div>
      <div className="max-h-64 overflow-y-auto">
        {recent.length === 0 && <p className="px-3 py-3 text-sm text-neutral-500">No overtakes yet</p>}
        {recent.map((o, i) => {
          const overtaking = drivers.get(o.overtaking_driver_number);
          const overtaken = drivers.get(o.overtaken_driver_number);
          return (
            <div key={i} className="border-b border-neutral-800/60 px-3 py-2 text-sm last:border-0">
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span className="font-mono">{formatClock(new Date(o.date))}</span>
                <span>P{o.position}</span>
              </div>
              <div className="text-neutral-200">
                <span style={{ color: overtaking ? `#${overtaking.team_colour}` : undefined }}>
                  {overtaking?.name_acronym ?? o.overtaking_driver_number}
                </span>{" "}
                passed{" "}
                <span style={{ color: overtaken ? `#${overtaken.team_colour}` : undefined }}>
                  {overtaken?.name_acronym ?? o.overtaken_driver_number}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
