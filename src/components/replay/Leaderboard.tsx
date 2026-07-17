"use client";

import clsx from "clsx";
import { formatGap, formatLapTime, SECTOR_COLORS, TYRE_COLORS } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/replay";

interface LeaderboardProps {
  rows: LeaderboardRow[];
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
}

export function Leaderboard({ rows, selectedDriver, onSelectDriver }: LeaderboardProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-neutral-900 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2 text-left">Pos</th>
            <th className="px-3 py-2 text-left">Driver</th>
            <th className="px-3 py-2 text-right">Gap</th>
            <th className="px-3 py-2 text-right">Interval</th>
            <th className="px-3 py-2 text-right">Last Lap</th>
            <th className="px-3 py-2 text-right">S1</th>
            <th className="px-3 py-2 text-right">S2</th>
            <th className="px-3 py-2 text-right">S3</th>
            <th className="px-3 py-2 text-center">Tyre</th>
            <th className="px-3 py-2 text-right">Lap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.driverNumber}
              onClick={() => onSelectDriver(row.driverNumber)}
              className={clsx(
                "cursor-pointer border-t border-neutral-800 transition hover:bg-neutral-800/60",
                row.driverNumber === selectedDriver && "bg-neutral-800",
              )}
            >
              <td className="px-3 py-2 font-mono text-neutral-400">{row.position}</td>
              <td className="px-3 py-2">
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ backgroundColor: row.driver ? `#${row.driver.team_colour}` : "#888" }}
                />
                <span className="font-medium">{row.driver?.name_acronym ?? row.driverNumber}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-neutral-400">{formatGap(row.gap)}</td>
              <td className="px-3 py-2 text-right font-mono text-neutral-400">
                {formatGap(row.interval)}
              </td>
              <td className="px-3 py-2 text-right font-mono">{formatLapTime(row.lastLapTime)}</td>
              {row.sectors.map((duration, i) => (
                <td
                  key={i}
                  className="px-3 py-2 text-right font-mono"
                  style={{ color: SECTOR_COLORS[row.sectorClasses[i]] }}
                >
                  {formatLapTime(duration)}
                </td>
              ))}
              <td className="px-3 py-2 text-center">
                {row.compound && (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-black"
                    style={{ backgroundColor: TYRE_COLORS[row.compound] ?? "#888" }}
                    title={`${row.compound} · ${row.tyreAge ?? "?"} laps`}
                  >
                    {row.compound[0]}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-neutral-400">{row.lapNumber ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
