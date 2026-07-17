"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { TYRE_COLORS } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/replay";
import type { PitStop, Stint } from "@/types/openf1";

interface StintTimelineProps {
  rows: LeaderboardRow[];
  stints: Stint[];
  pitStops: PitStop[];
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
}

function groupByDriver<T extends { driver_number: number }>(rows: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const arr = map.get(row.driver_number);
    if (arr) arr.push(row);
    else map.set(row.driver_number, [row]);
  }
  return map;
}

export function StintTimeline({ rows, stints, pitStops, selectedDriver, onSelectDriver }: StintTimelineProps) {
  const stintsByDriver = useMemo(() => groupByDriver(stints), [stints]);
  const pitStopsByDriver = useMemo(() => groupByDriver(pitStops), [pitStops]);
  const maxLap = useMemo(() => Math.max(1, ...stints.map((s) => s.lap_end)), [stints]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-800">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Tyre Strategy
      </div>
      <div className="divide-y divide-neutral-800/60">
        {rows.map((row) => {
          const driverStints = stintsByDriver.get(row.driverNumber) ?? [];
          const driverPitStops = pitStopsByDriver.get(row.driverNumber) ?? [];
          const playheadPct = row.lapNumber != null ? Math.min(100, (row.lapNumber / maxLap) * 100) : null;

          return (
            <div
              key={row.driverNumber}
              onClick={() => onSelectDriver(row.driverNumber)}
              className={clsx(
                "flex cursor-pointer items-center gap-3 px-3 py-1.5 transition hover:bg-neutral-800/60",
                row.driverNumber === selectedDriver && "bg-neutral-800",
              )}
            >
              <span className="w-10 shrink-0 font-mono text-xs text-neutral-400">
                {row.driver?.name_acronym ?? row.driverNumber}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-neutral-800">
                {driverStints.map((stint) => (
                  <div
                    key={stint.stint_number}
                    className="absolute inset-y-0"
                    style={{
                      left: `${((stint.lap_start - 1) / maxLap) * 100}%`,
                      width: `${((stint.lap_end - stint.lap_start + 1) / maxLap) * 100}%`,
                      backgroundColor: TYRE_COLORS[stint.compound] ?? "#888",
                    }}
                    title={`${stint.compound} · laps ${stint.lap_start}-${stint.lap_end}`}
                  />
                ))}
                {driverPitStops.map((pit, i) => (
                  <div
                    key={i}
                    className="absolute inset-y-0 w-0.5 bg-neutral-950"
                    style={{ left: `${(pit.lap_number / maxLap) * 100}%` }}
                    title={`Pit stop, lap ${pit.lap_number}${pit.pit_duration ? ` · ${pit.pit_duration.toFixed(1)}s` : ""}`}
                  />
                ))}
                {playheadPct != null && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white"
                    style={{ left: `${playheadPct}%` }}
                    title={`Lap ${row.lapNumber}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
