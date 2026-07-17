export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export function formatGap(value: number | string | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "string") return value; // e.g. "+1 LAP"
  return `+${value.toFixed(3)}`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export const TYRE_COLORS: Record<string, string> = {
  SOFT: "#e8433f",
  MEDIUM: "#f0c419",
  HARD: "#f4f4f4",
  INTERMEDIATE: "#3fa34d",
  WET: "#3f7ce8",
};

export const SECTOR_COLORS: Record<"session-best" | "personal-best" | "none", string> = {
  "session-best": "#9085e9",
  "personal-best": "#22c55e",
  none: "#e5e5e5",
};
