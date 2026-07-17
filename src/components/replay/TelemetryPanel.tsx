"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, AXIS, GRID } from "@/components/replay/ChartCard";
import type { CarDataPoint, Driver } from "@/types/openf1";

// Fixed categorical slots from the dataviz palette (dark-surface steps) —
// one hue per channel, in a stable order, never reassigned per render.
const COLOR_SPEED = "#3987e5"; // slot 1 · blue
const COLOR_THROTTLE = "#008300"; // slot 4 · green
const COLOR_BRAKE = "#e66767"; // slot 6 · red
const COLOR_GEAR = "#c98500"; // slot 3 · yellow

interface TelemetryPanelProps {
  driver: Driver | null;
  latest: CarDataPoint | null;
  series: CarDataPoint[];
  windowStartMs: number;
}

export function TelemetryPanel({ driver, latest, series, windowStartMs }: TelemetryPanelProps) {
  const data = useMemo(
    () =>
      series
        .map((p) => ({
          t: (new Date(p.date).getTime() - windowStartMs) / 1000,
          speed: p.speed,
          throttle: p.throttle,
          brake: p.brake * 100,
          gear: p.n_gear,
        }))
        .sort((a, b) => a.t - b.t),
    [series, windowStartMs],
  );

  if (!driver) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-500">
        Select a driver on the track map or leaderboard to see live telemetry.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: `#${driver.team_colour}` }}
          />
          <span className="font-semibold">{driver.full_name}</span>
        </div>
        <div className="flex gap-4 font-mono text-sm">
          <span>
            <span className="text-neutral-500">SPD </span>
            {latest?.speed ?? "—"} km/h
          </span>
          <span>
            <span className="text-neutral-500">GEAR </span>
            {latest?.n_gear ?? "—"}
          </span>
          <span
            className={`rounded px-1.5 ${latest?.drs && latest.drs >= 10 ? "bg-green-700 text-white" : "text-neutral-500"}`}
          >
            DRS
          </span>
        </div>
      </div>

      <ChartCard title="Speed (km/h)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 360]} width={28} tick={{ fill: AXIS, fontSize: 10 }} stroke={AXIS} />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #383835", fontSize: 12 }}
              labelFormatter={() => ""}
            />
            <Line type="monotone" dataKey="speed" stroke={COLOR_SPEED} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Throttle / Brake (%)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 100]} width={28} tick={{ fill: AXIS, fontSize: 10 }} stroke={AXIS} />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #383835", fontSize: 12 }}
              labelFormatter={() => ""}
            />
            <Area
              type="monotone"
              dataKey="throttle"
              stroke={COLOR_THROTTLE}
              fill={COLOR_THROTTLE}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="brake"
              stroke={COLOR_BRAKE}
              fill={COLOR_BRAKE}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-1 flex gap-3 text-[10px] text-neutral-500">
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ backgroundColor: COLOR_THROTTLE }} />
            Throttle
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ backgroundColor: COLOR_BRAKE }} />
            Brake
          </span>
        </div>
      </ChartCard>

      <ChartCard title="Gear">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 8]} width={28} tick={{ fill: AXIS, fontSize: 10 }} stroke={AXIS} />
            <Tooltip
              contentStyle={{ background: "#1a1a19", border: "1px solid #383835", fontSize: 12 }}
              labelFormatter={() => ""}
            />
            <Line type="stepAfter" dataKey="gear" stroke={COLOR_GEAR} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
