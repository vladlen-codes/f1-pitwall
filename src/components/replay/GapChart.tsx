"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, AXIS, GRID } from "@/components/replay/ChartCard";
import type { GapPoint } from "@/lib/replay";
import type { Driver } from "@/types/openf1";

const COLOR_GAP = "#9085e9"; // violet — distinct from TelemetryPanel's speed/throttle/brake/gear hues

interface GapChartProps {
  driver: Driver | null;
  series: GapPoint[];
}

export function GapChart({ driver, series }: GapChartProps) {
  const data = useMemo(() => series.map((p) => ({ t: p.t / 1000, gap: p.gap })), [series]);

  if (!driver) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-500">
        Select a driver to see their gap to the leader over the session.
      </div>
    );
  }

  return (
    <ChartCard title={`Gap to leader: ${driver.name_acronym}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis width={36} tick={{ fill: AXIS, fontSize: 10 }} stroke={AXIS} />
          <ReferenceLine y={0} stroke={AXIS} strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ background: "#1a1a19", border: "1px solid #383835", fontSize: 12 }}
            labelFormatter={() => ""}
            formatter={(value) => [`+${Number(value).toFixed(3)}s`, "Gap"]}
          />
          <Line type="monotone" dataKey="gap" stroke={COLOR_GAP} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
