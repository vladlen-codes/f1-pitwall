import type {
  CarDataPoint,
  Driver,
  Interval,
  Lap,
  LocationPoint,
  Meeting,
  Overtake,
  PitStop,
  Position,
  RaceControlMessage,
  Session,
  Stint,
  Weather,
} from "@/types/openf1";

const BASE_URL = "https://api.openf1.org/v1";

/**
 * OpenF1 (https://openf1.org) is a free, keyless REST API for real F1 timing,
 * telemetry and position data. Query params double as filters, e.g.
 * `date>=...` and `date<...` for time-windowed requests.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenF1's free tier rate-limits by request rate, not just burst size, so
// retries alone aren't enough — a replay page load fires ~9 requests that
// need to be spaced out. This module-level queue serializes every call
// (including retries) with a minimum gap between request starts.
const MIN_INTERVAL_MS = 300;
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestStart = 0;

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const scheduled = requestQueue.then(async () => {
    const wait = Math.max(0, lastRequestStart + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestStart = Date.now();
  });
  requestQueue = scheduled;
  return scheduled.then(fn);
}

async function get<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  init?: RequestInit,
): Promise<T[]> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const url = `${BASE_URL}/${path}${search.size ? `?${search}` : ""}`;

  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await throttled(() => fetch(url, init));
    if (res.status === 404) {
      // OpenF1 returns 404 (not an empty 200 array) when a filter matches no
      // rows — e.g. `intervals`/`pit` on a practice session with no gaps.
      return [];
    }
    if (res.status === 429 && attempt < maxAttempts - 1) {
      await sleep(600 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      throw new Error(`OpenF1 request failed (${res.status}): ${url}`);
    }
    return res.json();
  }
  throw new Error(`OpenF1 request failed (429, rate-limited): ${url}`);
}

// Static-ish reference/session data. Cached for a while since it never
// changes once a session has finished.
const CACHE = { next: { revalidate: 3600 } } as const;

export const openf1 = {
  meetings: (year: number) => get<Meeting>("meetings", { year }, CACHE),

  sessions: (meetingKey: number) =>
    get<Session>("sessions", { meeting_key: meetingKey }, CACHE),

  session: async (sessionKey: number) => {
    const rows = await get<Session>("sessions", { session_key: sessionKey }, CACHE);
    return rows[0];
  },

  meeting: async (meetingKey: number) => {
    const rows = await get<Meeting>("meetings", { meeting_key: meetingKey }, CACHE);
    return rows[0];
  },

  drivers: (sessionKey: number) =>
    get<Driver>("drivers", { session_key: sessionKey }, CACHE),

  // laps/pit/position/intervals can run into the tens of thousands of rows
  // (multiple MB) for a full race, which exceeds Next.js's per-entry Data
  // Cache limit — fetch these uncached rather than let caching fail noisily.
  laps: (sessionKey: number) => get<Lap>("laps", { session_key: sessionKey }),

  stints: (sessionKey: number) =>
    get<Stint>("stints", { session_key: sessionKey }, CACHE),

  pitStops: (sessionKey: number) => get<PitStop>("pit", { session_key: sessionKey }),

  positions: (sessionKey: number) => get<Position>("position", { session_key: sessionKey }),

  intervals: (sessionKey: number) => get<Interval>("intervals", { session_key: sessionKey }),

  weather: (sessionKey: number) =>
    get<Weather>("weather", { session_key: sessionKey }, CACHE),

  raceControl: (sessionKey: number) =>
    get<RaceControlMessage>("race_control", { session_key: sessionKey }, CACHE),

  // High-frequency channels: normally fetched in short time windows,
  // client-side, as the replay scrubber approaches unloaded data. `init`
  // lets server callers (e.g. the one-off track-outline lookup) opt into
  // Next.js's fetch cache instead.
  locationWindow: (sessionKey: number, fromIso: string, toIso: string, init?: RequestInit) =>
    get<LocationPoint>(
      "location",
      { session_key: sessionKey, "date>": fromIso, "date<": toIso },
      init,
    ),

  carDataWindow: (sessionKey: number, fromIso: string, toIso: string, init?: RequestInit) =>
    get<CarDataPoint>(
      "car_data",
      { session_key: sessionKey, "date>": fromIso, "date<": toIso },
      init,
    ),

  // Single-driver variants of the windows above — used for one-off per-lap
  // traces (gear/speed-colored track line, DRS zone detection) rather than
  // the all-drivers rolling window the live scrubber uses.
  driverLocationWindow: (
    sessionKey: number,
    driverNumber: number,
    fromIso: string,
    toIso: string,
    init?: RequestInit,
  ) =>
    get<LocationPoint>(
      "location",
      { session_key: sessionKey, driver_number: driverNumber, "date>": fromIso, "date<": toIso },
      init,
    ),

  driverCarDataWindow: (
    sessionKey: number,
    driverNumber: number,
    fromIso: string,
    toIso: string,
    init?: RequestInit,
  ) =>
    get<CarDataPoint>(
      "car_data",
      { session_key: sessionKey, driver_number: driverNumber, "date>": fromIso, "date<": toIso },
      init,
    ),

  overtakes: (sessionKey: number) => get<Overtake>("overtakes", { session_key: sessionKey }, CACHE),
};
