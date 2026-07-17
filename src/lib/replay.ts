import { latestAtOrBefore } from "@/lib/timeseries";
import type { Driver, Interval, Lap, Position, Stint } from "@/types/openf1";

export type SectorClass = "session-best" | "personal-best" | "none";

export interface LeaderboardRow {
  driverNumber: number;
  position: number;
  driver: Driver | null;
  gap: number | string | null;
  interval: number | string | null;
  lapNumber: number | null;
  compound: string | null;
  tyreAge: number | null;
  lastLapTime: number | null;
  sectors: [number | null, number | null, number | null];
  sectorClasses: [SectorClass, SectorClass, SectorClass];
}

function sortByDate<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Lap has no `.date` field (it's `date_start`), so it can't go through the
// shared `latestAtOrBefore` (which reads `.date`) without a cast that quietly
// makes every lookup return null (`item.date` is undefined -> NaN timestamps
// -> the "<=" comparison is never true). This is the same binary search,
// keyed on `date_start` instead.
function latestLapAtOrBefore(laps: Lap[], ms: number): Lap | null {
  let lo = 0;
  let hi = laps.length - 1;
  let result: Lap | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(laps[mid].date_start!).getTime() <= ms) {
      result = laps[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * Groups the session-wide (sparse) timeseries once, then answers
 * "what did the leaderboard look like at time T" cheaply for every
 * animation frame.
 */
export function createLeaderboardEngine(
  drivers: Driver[],
  positions: Position[],
  intervals: Interval[],
  laps: Lap[],
  stints: Stint[],
) {
  const byDriver = <T extends { driver_number: number; date: string }>(rows: T[]) => {
    const map = new Map<number, T[]>();
    for (const row of rows) {
      const arr = map.get(row.driver_number);
      if (arr) arr.push(row);
      else map.set(row.driver_number, [row]);
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return map;
  };

  const driverByNumber = new Map(drivers.map((d) => [d.driver_number, d]));
  const positionsByDriver = byDriver(positions);
  const intervalsByDriver = byDriver(intervals);
  const lapsByDriver = new Map<number, Lap[]>();
  for (const lap of laps) {
    if (!lap.date_start) continue;
    const arr = lapsByDriver.get(lap.driver_number);
    if (arr) arr.push(lap);
    else lapsByDriver.set(lap.driver_number, [lap]);
  }
  for (const arr of lapsByDriver.values()) {
    arr.sort((a, b) => new Date(a.date_start!).getTime() - new Date(b.date_start!).getTime());
  }
  const stintsByDriver = new Map<number, Stint[]>();
  for (const stint of stints) {
    const arr = stintsByDriver.get(stint.driver_number);
    if (arr) arr.push(stint);
    else stintsByDriver.set(stint.driver_number, [stint]);
  }

  // Session-best and per-driver personal-best sector times, computed once
  // from final (completed-lap) sector durations — not the mid-lap
  // `segments_sector_N` mini-sector codes, whose exact value mapping isn't
  // verified against OpenF1 docs, so live in-progress coloring is out of
  // scope for now.
  const sessionBestSector: [number, number, number] = [Infinity, Infinity, Infinity];
  const personalBestSector = new Map<number, [number, number, number]>();
  for (const lap of laps) {
    const durations: (number | null)[] = [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
    durations.forEach((d, i) => {
      if (d == null) return;
      if (d < sessionBestSector[i]) sessionBestSector[i] = d;
      const pb = personalBestSector.get(lap.driver_number) ?? [Infinity, Infinity, Infinity];
      if (d < pb[i]) pb[i] = d;
      personalBestSector.set(lap.driver_number, pb);
    });
  }

  function classifySector(driverNumber: number, sectorIndex: number, duration: number | null): SectorClass {
    if (duration == null) return "none";
    if (duration <= sessionBestSector[sectorIndex]) return "session-best";
    const pb = personalBestSector.get(driverNumber);
    if (pb && duration <= pb[sectorIndex]) return "personal-best";
    return "none";
  }

  function getRowsAt(ms: number): LeaderboardRow[] {
    const rows: LeaderboardRow[] = [];

    for (const driverNumber of driverByNumber.keys()) {
      const posEntry = latestAtOrBefore(positionsByDriver.get(driverNumber) ?? [], ms);
      if (!posEntry) continue;

      const currentLap = latestLapAtOrBefore(lapsByDriver.get(driverNumber) ?? [], ms);

      const stint = currentLap
        ? stintsByDriver
            .get(driverNumber)
            ?.find((s) => currentLap.lap_number >= s.lap_start && currentLap.lap_number <= s.lap_end)
        : undefined;

      const intervalEntry = latestAtOrBefore(intervalsByDriver.get(driverNumber) ?? [], ms);

      const sectors: [number | null, number | null, number | null] = currentLap
        ? [currentLap.duration_sector_1, currentLap.duration_sector_2, currentLap.duration_sector_3]
        : [null, null, null];
      const sectorClasses: [SectorClass, SectorClass, SectorClass] = [
        classifySector(driverNumber, 0, sectors[0]),
        classifySector(driverNumber, 1, sectors[1]),
        classifySector(driverNumber, 2, sectors[2]),
      ];

      rows.push({
        driverNumber,
        position: posEntry.position,
        driver: driverByNumber.get(driverNumber) ?? null,
        gap: intervalEntry?.gap_to_leader ?? null,
        interval: intervalEntry?.interval ?? null,
        lapNumber: currentLap?.lap_number ?? null,
        compound: stint?.compound ?? null,
        tyreAge: stint ? stint.tyre_age_at_start + (currentLap!.lap_number - stint.lap_start) : null,
        lastLapTime: currentLap?.lap_duration ?? null,
        sectors,
        sectorClasses,
      });
    }

    return rows.sort((a, b) => a.position - b.position);
  }

  return { getRowsAt };
}

export interface GapPoint {
  t: number;
  gap: number;
}

/** Gap-to-leader trend for one driver over the session, as {t: ms since session start, gap}. */
export function buildGapSeries(intervals: Interval[], driverNumber: number, startMs: number): GapPoint[] {
  return sortByDate(intervals.filter((i) => i.driver_number === driverNumber))
    .filter((i): i is Interval & { gap_to_leader: number } => typeof i.gap_to_leader === "number")
    .map((i) => ({ t: new Date(i.date).getTime() - startMs, gap: i.gap_to_leader }));
}

export function sortedByDate<T extends { date: string }>(rows: T[]): T[] {
  return sortByDate(rows);
}
