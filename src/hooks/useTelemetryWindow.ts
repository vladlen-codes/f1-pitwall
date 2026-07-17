"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openf1 } from "@/lib/openf1";
import type { CarDataPoint, LocationPoint } from "@/types/openf1";

const WINDOW_MS = 60_000;

type DriverSeries<T> = Map<number, T[]>;

interface WindowData {
  status: "loading" | "loaded" | "error";
  location: DriverSeries<LocationPoint>;
  carData: DriverSeries<CarDataPoint>;
}

function groupByDriver<T extends { driver_number: number; date: string }>(rows: T[]): DriverSeries<T> {
  const map: DriverSeries<T> = new Map();
  for (const row of rows) {
    const arr = map.get(row.driver_number);
    if (arr) arr.push(row);
    else map.set(row.driver_number, [row]);
  }
  return map;
}

/** Binary-search the last sample at or before `ms`, returning it plus the next one for lerp. */
function bracket<T extends { date: string }>(series: T[] | undefined, ms: number): [T | null, T | null] {
  if (!series || series.length === 0) return [null, null];
  let lo = 0;
  let hi = series.length - 1;
  if (ms < new Date(series[0].date).getTime()) return [null, series[0]];
  if (ms >= new Date(series[hi].date).getTime()) return [series[hi], null];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (new Date(series[mid].date).getTime() <= ms) lo = mid;
    else hi = mid - 1;
  }
  return [series[lo], series[lo + 1] ?? null];
}

/**
 * Streams OpenF1 `location` / `car_data` in rolling 60s windows so the
 * replay never has to download an entire session's high-frequency
 * telemetry up front. Mirrors the buffered-fetch pattern used by
 * f1-dash's live data engine, but pulls historical windows on demand
 * instead of tailing a live feed.
 */
export function useTelemetryWindow(sessionKey: number, currentMs: number) {
  const cache = useRef<Map<number, WindowData>>(new Map());
  const [, forceRender] = useState(0);

  const windowIndex = Math.floor(currentMs / WINDOW_MS);

  const ensureWindow = useCallback(
    (index: number) => {
      if (cache.current.has(index)) return;
      const placeholder: WindowData = { status: "loading", location: new Map(), carData: new Map() };
      cache.current.set(index, placeholder);

      const fromIso = new Date(index * WINDOW_MS).toISOString();
      const toIso = new Date((index + 1) * WINDOW_MS).toISOString();

      Promise.all([
        openf1.locationWindow(sessionKey, fromIso, toIso),
        openf1.carDataWindow(sessionKey, fromIso, toIso),
      ])
        .then(([location, carData]) => {
          cache.current.set(index, {
            status: "loaded",
            location: groupByDriver(location),
            carData: groupByDriver(carData),
          });
          forceRender((n) => n + 1);
        })
        .catch(() => {
          // Drop rather than poison the entry — a transient failure (e.g. a
          // connect timeout) shouldn't permanently blank out this window's
          // driver positions. Leaving the cache empty lets the retry loop
          // below pick it back up.
          cache.current.delete(index);
          forceRender((n) => n + 1);
        });
    },
    [sessionKey],
  );

  useEffect(() => {
    ensureWindow(windowIndex - 1);
    ensureWindow(windowIndex);
    ensureWindow(windowIndex + 1);
  }, [windowIndex, ensureWindow]);

  // Retry loop for windows a failed fetch dropped from the cache. A failure
  // doesn't necessarily change windowIndex (the player can sit inside the
  // still-missing window), so the effect above alone won't re-trigger it.
  // This runs on a fixed interval, independent of render rate, so retries
  // aren't starved by the ~60/s re-renders the rAF playback loop causes.
  const windowIndexRef = useRef(windowIndex);
  useEffect(() => {
    windowIndexRef.current = windowIndex;
  }, [windowIndex]);
  useEffect(() => {
    const id = setInterval(() => {
      const idx = windowIndexRef.current;
      ensureWindow(idx - 1);
      ensureWindow(idx);
      ensureWindow(idx + 1);
    }, 2000);
    return () => clearInterval(id);
  }, [ensureWindow]);

  const getLocationsAt = useCallback(
    (ms: number): Map<number, { x: number; y: number }> => {
      const result = new Map<number, { x: number; y: number }>();
      const win = cache.current.get(Math.floor(ms / WINDOW_MS));
      if (!win || win.status !== "loaded") return result;
      for (const [driverNumber, series] of win.location) {
        const [before, after] = bracket(series, ms);
        const point = before ?? after;
        if (!point) continue;
        if (before && after) {
          const t0 = new Date(before.date).getTime();
          const t1 = new Date(after.date).getTime();
          const frac = t1 > t0 ? (ms - t0) / (t1 - t0) : 0;
          result.set(driverNumber, {
            x: before.x + (after.x - before.x) * frac,
            y: before.y + (after.y - before.y) * frac,
          });
        } else {
          result.set(driverNumber, { x: point.x, y: point.y });
        }
      }
      return result;
    },
    [],
  );

  const getCarDataAt = useCallback((ms: number, driverNumber: number): CarDataPoint | null => {
    const win = cache.current.get(Math.floor(ms / WINDOW_MS));
    if (!win || win.status !== "loaded") return null;
    const [before, after] = bracket(win.carData.get(driverNumber), ms);
    return before ?? after;
  }, []);

  /** Trailing samples for one driver across [ms - spanMs, ms], for charting. */
  const getCarDataSeries = useCallback(
    (driverNumber: number, ms: number, spanMs: number): CarDataPoint[] => {
      const startIndex = Math.floor((ms - spanMs) / WINDOW_MS);
      const endIndex = Math.floor(ms / WINDOW_MS);
      const points: CarDataPoint[] = [];
      for (let i = startIndex; i <= endIndex; i++) {
        const win = cache.current.get(i);
        if (win?.status !== "loaded") continue;
        const series = win.carData.get(driverNumber);
        if (!series) continue;
        for (const point of series) {
          const t = new Date(point.date).getTime();
          if (t >= ms - spanMs && t <= ms) points.push(point);
        }
      }
      return points;
    },
    [],
  );

  return { getLocationsAt, getCarDataAt, getCarDataSeries };
}
