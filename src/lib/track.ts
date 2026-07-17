import type { CarDataPoint, Driver, Lap, LocationPoint } from "@/types/openf1";

/** Picks one clean, non-pit lap to sample the circuit's shape from. */
export function pickReferenceLap(
  laps: Lap[],
  drivers: Driver[],
): { driverNumber: number; fromIso: string; toIso: string } | null {
  const candidates = laps
    .filter(
      (l) =>
        !l.is_pit_out_lap &&
        l.date_start &&
        l.lap_duration != null &&
        l.lap_duration > 30 &&
        l.lap_duration < 150,
    )
    .sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0));

  // Take the single fastest valid lap, not a "mid-pack" one. A median pick
  // can still land on a Safety Car / VSC / pit-entry lap (those are slower
  // outliers, but not reliably excluded by the duration filter alone), and
  // that noisy, looping path is what made the track render as a filled
  // blob instead of a clean outline. The fastest lap of a session is
  // essentially guaranteed to be a full-speed, green-flag, non-pit lap.
  const fastest = candidates[0];
  if (!fastest || !fastest.date_start || fastest.lap_duration == null) return null;

  const driverExists = drivers.some((d) => d.driver_number === fastest.driver_number);
  if (!driverExists) return null;

  const from = new Date(fastest.date_start);
  const to = new Date(from.getTime() + fastest.lap_duration * 1000 + 500);

  return {
    driverNumber: fastest.driver_number,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

/**
 * Picks the selected driver's current lap at `atMs` (latest clean lap that
 * started at or before that time), falling back to their fastest valid lap
 * if none has started yet — e.g. right at session start.
 */
export function pickDriverLap(
  laps: Lap[],
  driverNumber: number,
  atMs: number,
): { lapNumber: number; fromIso: string; toIso: string } | null {
  const candidates = laps.filter(
    (l) =>
      l.driver_number === driverNumber &&
      !l.is_pit_out_lap &&
      l.date_start &&
      l.lap_duration != null &&
      l.lap_duration > 30 &&
      l.lap_duration < 150,
  );
  if (candidates.length === 0) return null;

  const started = candidates
    .filter((l) => new Date(l.date_start!).getTime() <= atMs)
    .sort((a, b) => new Date(b.date_start!).getTime() - new Date(a.date_start!).getTime());

  const chosen = started[0] ?? [...candidates].sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0))[0];
  if (!chosen.date_start || chosen.lap_duration == null) return null;

  const from = new Date(chosen.date_start);
  const to = new Date(from.getTime() + chosen.lap_duration * 1000 + 500);
  return { lapNumber: chosen.lap_number, fromIso: from.toISOString(), toIso: to.toISOString() };
}

export interface Point {
  x: number;
  y: number;
}

export interface TrackProjection {
  path: string;
  project: (x: number, y: number) => Point;
  viewBox: string;
}

/**
 * Builds an SVG path from raw OpenF1 (x, y) samples and returns a
 * projector so driver positions can be mapped into the same space.
 * OpenF1 coordinates are in 1/10 metre units with y growing "north";
 * SVG grows down, so y is flipped.
 */
export function buildTrackProjection(rawPoints: Point[], padding = 40, size = 1000): TrackProjection {
  // Drop near-duplicate consecutive samples (a car sitting on the grid or
  // crawling through pit lane emits many almost-identical points) — left
  // in, these pile up into a dense tangle that reads as a filled blob
  // rather than a thin line once projected.
  const MIN_STEP = 3; // 1/10 metre units — ~0.3m
  const points = rawPoints.filter((p, i) => {
    if (i === 0) return true;
    const prev = rawPoints[i - 1];
    return Math.hypot(p.x - prev.x, p.y - prev.y) >= MIN_STEP;
  });

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const available = size - padding * 2;
  const scale = available / Math.max(width, height);
  // Center the shorter axis instead of anchoring both axes to `padding` —
  // otherwise a non-square track (nearly every real circuit) hugs one
  // corner of the square viewBox with empty space on the other side.
  const offsetX = padding + (available - width * scale) / 2;
  const offsetY = padding + (available - height * scale) / 2;

  const project = (x: number, y: number): Point => ({
    x: (x - minX) * scale + offsetX,
    y: size - ((y - minY) * scale + offsetY), // flip vertically
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${project(p.x, p.y).x.toFixed(1)},${project(p.x, p.y).y.toFixed(1)}`)
    .join(" ");

  return { path: `${path} Z`, project, viewBox: `0 0 ${size} ${size}` };
}

export interface TraceSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export type TraceMode = "gear" | "speed";

/**
 * Sequential blue ramp, light->dark, kept within the dark-surface
 * ordinal-safe band (steps 100-600 — darker steps read as blended into a
 * dark background). Used for both the gear (discrete, index 0-7 = gear
 * 1-8) and speed (continuous, bucketed into the same 8 steps) track trace.
 */
const BLUE_RAMP = ["#cde2fb", "#b7d3f6", "#86b6ef", "#6da7ec", "#3987e5", "#2a78d6", "#1c5cab", "#184f95"];

function rampColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const index = Math.min(BLUE_RAMP.length - 1, Math.floor(clamped * BLUE_RAMP.length));
  return BLUE_RAMP[index];
}

/** Nearest-in-time join of location samples to car_data samples (both sorted by date). */
export function matchCarDataToLocations(
  locations: LocationPoint[],
  carData: CarDataPoint[],
): Array<{ x: number; y: number; carData: CarDataPoint }> {
  if (carData.length === 0) return [];
  const sortedCarData = [...carData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const times = sortedCarData.map((c) => new Date(c.date).getTime());

  const nearest = (ms: number): CarDataPoint => {
    let lo = 0;
    let hi = times.length - 1;
    if (ms <= times[0]) return sortedCarData[0];
    if (ms >= times[hi]) return sortedCarData[hi];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (times[mid] <= ms) lo = mid;
      else hi = mid - 1;
    }
    const next = sortedCarData[lo + 1];
    return next && Math.abs(times[lo + 1] - ms) < Math.abs(times[lo] - ms) ? next : sortedCarData[lo];
  };

  return [...locations]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((loc) => ({ x: loc.x, y: loc.y, carData: nearest(new Date(loc.date).getTime()) }));
}

/** Colors consecutive matched points by gear or speed, projected into the track's SVG space. */
export function buildColoredTrace(
  matched: Array<{ x: number; y: number; carData: CarDataPoint }>,
  mode: TraceMode,
  project: (x: number, y: number) => Point,
): TraceSegment[] {
  if (matched.length < 2) return [];

  const colorFor = (() => {
    if (mode === "gear") {
      return (c: CarDataPoint) => rampColor((c.n_gear - 1) / 7);
    }
    const speeds = matched.map((m) => m.carData.speed);
    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    const span = max - min || 1;
    return (c: CarDataPoint) => rampColor((c.speed - min) / span);
  })();

  const segments: TraceSegment[] = [];
  for (let i = 0; i < matched.length - 1; i++) {
    const a = project(matched[i].x, matched[i].y);
    const b = project(matched[i + 1].x, matched[i + 1].y);
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: colorFor(matched[i].carData) });
  }
  return segments;
}

/** True when this session's car_data actually populates `drs` (false for 2026+, where
 * traditional DRS was replaced by the Manual Override active-aero system). */
export function hasDrsData(carData: CarDataPoint[]): boolean {
  return carData.some((c) => c.drs != null);
}

// Same "DRS active" threshold TelemetryPanel.tsx already uses for its badge —
// reused here rather than reinvented so the two views agree on what counts.
const DRS_ACTIVE_THRESHOLD = 10;

/** Contiguous track segments where DRS was active, for highlighting DRS zones. */
export function buildDrsSegments(
  matched: Array<{ x: number; y: number; carData: CarDataPoint }>,
  project: (x: number, y: number) => Point,
): TraceSegment[] {
  const segments: TraceSegment[] = [];
  for (let i = 0; i < matched.length - 1; i++) {
    const drs = matched[i].carData.drs;
    if (drs == null || drs < DRS_ACTIVE_THRESHOLD) continue;
    const a = project(matched[i].x, matched[i].y);
    const b = project(matched[i + 1].x, matched[i + 1].y);
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: "#d95926" });
  }
  return segments;
}
