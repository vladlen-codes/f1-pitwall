"use client";

import { formatClock } from "@/lib/format";
import type { RaceControlMessage } from "@/types/openf1";

interface RaceControlFeedProps {
  messages: RaceControlMessage[];
}

const FLAG_COLORS: Record<string, string> = {
  GREEN: "text-green-500",
  YELLOW: "text-yellow-500",
  "DOUBLE YELLOW": "text-yellow-500",
  RED: "text-red-500",
  CHEQUERED: "text-neutral-300",
  BLUE: "text-blue-400",
};

export function RaceControlFeed({ messages }: RaceControlFeedProps) {
  const recent = messages.slice(-30).reverse();

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Race Control
      </div>
      <div className="max-h-64 overflow-y-auto">
        {recent.length === 0 && (
          <p className="px-3 py-3 text-sm text-neutral-500">No messages yet</p>
        )}
        {recent.map((m, i) => (
          <div key={i} className="border-b border-neutral-800/60 px-3 py-2 text-sm last:border-0">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="font-mono">{formatClock(new Date(m.date))}</span>
              {m.flag && <span className={FLAG_COLORS[m.flag] ?? ""}>{m.flag}</span>}
            </div>
            <div className="text-neutral-200">{m.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
