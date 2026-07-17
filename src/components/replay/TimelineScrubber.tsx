"use client";

import { PLAYBACK_SPEEDS } from "@/store/replayStore";
import { formatDuration } from "@/lib/format";
import type { Driver, Overtake, RaceControlMessage } from "@/types/openf1";

interface TimelineScrubberProps {
  currentMs: number;
  startMs: number;
  endMs: number;
  playing: boolean;
  speed: number;
  raceControl: RaceControlMessage[];
  overtakes: Overtake[];
  drivers: Map<number, Driver>;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onSetSpeed: (speed: number) => void;
}

export function TimelineScrubber({
  currentMs,
  startMs,
  endMs,
  playing,
  speed,
  raceControl,
  overtakes,
  drivers,
  onTogglePlay,
  onSeek,
  onSetSpeed,
}: TimelineScrubberProps) {
  const durationMs = endMs - startMs || 1;
  const elapsedS = (currentMs - startMs) / 1000;
  const totalS = durationMs / 1000;

  const flagMarkers = raceControl.filter((m) => m.category === "Flag" && m.flag);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={durationMs}
            step={100}
            value={currentMs - startMs}
            onChange={(e) => onSeek(startMs + Number(e.target.value))}
            className="w-full accent-red-600"
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-1 -translate-y-1/2">
            {flagMarkers.map((m, i) => {
              const t = new Date(m.date).getTime();
              const pct = Math.min(Math.max(((t - startMs) / durationMs) * 100, 0), 100);
              const color =
                m.flag === "GREEN"
                  ? "#22c55e"
                  : m.flag === "YELLOW" || m.flag === "DOUBLE YELLOW"
                    ? "#eab308"
                    : m.flag === "RED"
                      ? "#ef4444"
                      : "#a3a3a3";
              return (
                <div
                  key={i}
                  className="absolute top-0 h-2 w-0.5"
                  style={{ left: `${pct}%`, backgroundColor: color }}
                  title={`${m.flag}: ${m.message}`}
                />
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1 translate-y-1/2">
            {overtakes.map((o, i) => {
              const t = new Date(o.date).getTime();
              const pct = Math.min(Math.max(((t - startMs) / durationMs) * 100, 0), 100);
              const overtaking = drivers.get(o.overtaking_driver_number)?.name_acronym ?? o.overtaking_driver_number;
              const overtaken = drivers.get(o.overtaken_driver_number)?.name_acronym ?? o.overtaken_driver_number;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 h-2 w-0.5"
                  style={{ left: `${pct}%`, backgroundColor: "#d55181" }}
                  title={`P${o.position}: ${overtaking} passed ${overtaken}`}
                />
              );
            })}
          </div>
        </div>

        <span className="w-32 shrink-0 font-mono text-sm text-neutral-400">
          {formatDuration(elapsedS)} / {formatDuration(totalS)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Speed</span>
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              s === speed ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
