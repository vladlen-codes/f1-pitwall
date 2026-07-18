# Pitwall

A Next.js rebuild of an F1 race-replay tool: pick any Formula 1 session and
scrub through it with a synced track map, leaderboard, tyre/gap data,
per-driver telemetry, weather, and race control messages all from real,
publicly available F1 data.

This is a from-scratch, MIT-licensed re-platform. It draws feature *ideas*
(not code) from four reference projects see [Feature provenance](#feature-provenance)
for what came from where and why nothing was copied line-for-line.

## Features

- **Session picker**: season → Grand Prix → session (FP1/FP2/FP3/Quali/Sprint/Race).
- **Replay timeline**: play/pause, 7 speed presets (0.5x–50x), scrub bar with
  flag/safety-car markers pulled from real race control messages.
- **Track map**: an SVG outline traced from one clean lap of real GPS-ish
  telemetry, with all cars animated live from windowed position data.
  Click a car (or a leaderboard row) to focus it.
- **Leaderboard**: live position, gap-to-leader, interval, last lap time,
  tyre compound + age, current lap — all reconstructed from the session's
  actual timing data at the scrubbed timestamp.
- **Telemetry panel**: per-driver speed, throttle/brake, and gear traces
  for a trailing 20s window, plus instantaneous speed/gear/DRS readouts.
- **Weather widget**: air/track temp, humidity, wind, rain at the current
  timestamp.
- **Race control feed**: real flags, safety cars, penalties, and messages,
  revealed as the timeline passes them.
- **Standings**: separate page with current-season driver & constructor
  championship standings.

## Data sources

- **[OpenF1](https://openf1.org)** free, keyless REST API for real F1
  session/lap/telemetry/position/weather/race-control data. This is the
  backbone of the replay: it's the only JS-reachable source that exposes
  actual car telemetry and X/Y track position without a Python/FastF1 or
  Rust/SignalR backend.
- **[jolpica-f1](https://github.com/jolpica/jolpica-f1)** community-run,
  Ergast-API-compatible REST API, used only for the standings page.

Both are called directly from Next.js (server components for
session/lap/timing metadata, the browser for high-frequency telemetry
windows) no custom backend proxy required.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a season and a
Grand Prix, then a session, and the replay loads automatically. No API keys
or environment variables are needed — both data sources are public.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Architecture

```
src/
  app/
    page.tsx                    Home — season/meeting/session picker
    replay/[sessionKey]/page.tsx  Server component: fetches session-wide data
    standings/page.tsx          Championship standings (jolpica-f1)
  components/
    home/SessionPicker.tsx      Client picker (year → meeting → session)
    replay/
      ReplayClient.tsx          Orchestrates playback state + all widgets
      TrackMap.tsx              SVG track outline + animated driver dots
      Leaderboard.tsx           Position/gap/tyre/lap table
      TimelineScrubber.tsx      Play/pause/seek/speed + flag markers
      TelemetryPanel.tsx        Recharts speed/throttle/brake/gear traces
      WeatherWidget.tsx
      RaceControlFeed.tsx
  hooks/
    useTelemetryWindow.ts       Rolling 60s buffer of location/car_data
  lib/
    openf1.ts                  OpenF1 client (rate-limit aware, see below)
    ergast.ts                  jolpica-f1 client
    track.ts                   Track-outline extraction + SVG projection
    replay.ts                  Leaderboard-at-time-T reconstruction
    timeseries.ts              Binary search over sparse timeseries
    format.ts                  Lap time / gap / duration formatting
  store/
    replayStore.ts             Zustand: playback clock, speed, selection
  types/openf1.ts               TypeScript shapes matching OpenF1's API
```

**Why session-wide data is server-fetched but telemetry is client-fetched:**
laps, stints, pit stops, positions, intervals, weather, and race control for
a whole session are small (tens of KB to a few MB) and fetched once, so they
run as `Promise.all` calls in the `replay/[sessionKey]` server component.
`location` (X/Y/Z) and `car_data` (speed/throttle/brake/gear/DRS), by
contrast, sample every ~250ms per car — a full 2-hour race would mean
downloading tens of MB per driver up front. Instead, `useTelemetryWindow`
fetches them in rolling 60-second windows from the browser as the scrubber
approaches unloaded time, mirroring the buffered live-data-engine pattern in
f1-dash, but for historical windows rather than a live tail.

**OpenF1 rate limiting.** OpenF1's free tier throttles request rate, not
just burst size. `src/lib/openf1.ts` handles two things you'll hit in
practice:

- It returns `404` (not an empty `200` array) when a filter matches zero
  rows — e.g. `intervals`/`pit` on a practice session with no gaps. The
  client treats that as `[]` rather than an error.
- All requests (including retries) go through a module-level queue with a
  300ms minimum gap between request starts, plus exponential backoff on
  `429`. Under heavy, repeated use from one IP (e.g. rapid dev-server
  reloads) you may still see the initial load take a few seconds while it
  backs off — this is a known constraint of a free, unauthenticated public
  API, not a bug in the app.

## Feature provenance

Four repos were reviewed for feature ideas. Nothing was copied verbatim see [Licensing note](#licensing-note) for why but each shaped a specific
part of this app:

| Source | License | What we took the idea from | Where it landed |
|---|---|---|---|
| [IAmTomShaw/f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay) (the repo the task listed as `vladlen-codes/f1-pitwall` is a fork of this) | MIT (per README; no LICENSE file in either repo) | Scrubbable timeline with flag/SC/DNF markers; playback speed tiers; leaderboard with tyre + gap; per-driver telemetry panel; progress-along-track math for ordering cars | `TimelineScrubber.tsx`, `Leaderboard.tsx`, `TelemetryPanel.tsx`, `replayStore.ts` |
| [theOehrly/Fast-F1](https://github.com/theOehrly/Fast-F1) | MIT | Data model shape (laps/telemetry/weather/track-status/session-results); sector splits; tyre compound + tyre-life tracking; track-status flag timeline | `types/openf1.ts`, `replay.ts` (leaderboard reconstruction), `TimelineScrubber.tsx` (flag markers) |
| [slowlydev/f1-dash](https://github.com/slowlydev/f1-dash) | AGPL-3.0 | Live-style leaderboard layout (position/gap/interval/tyre/lap); windowed/buffered data-fetching pattern; track map as an SVG overlay; race control + weather widgets; Next.js + Zustand + Tailwind stack choice | `Leaderboard.tsx`, `useTelemetryWindow.ts`, `TrackMap.tsx`, `RaceControlFeed.tsx`, `WeatherWidget.tsx`, overall stack |
| [robvdpol/RaceControl](https://github.com/robvdpol/RaceControl) | GPL-3.0 | Season → event → session picker UX (no video-streaming features were adopted — out of scope and the likely source of that project's takedown) | `SessionPicker.tsx` |
|[vladlen-codes/f1-pitwall](https://github.com/vladlen-codes/f1-pitwall) | MIT | OpenF1 as a JS-native real-telemetry data source (no Python/Rust backend needed); rate-limit-aware fetch client; standings page; dark UI throughout | `openf1.ts`, `standings/page.tsx` |

### Licensing note

f1-dash is **AGPL-3.0** and RaceControl is **GPL-3.0** — both copyleft.
Pitwall reimplements their *concepts* (layout, data-flow patterns, UX) in
original TypeScript/React rather than porting their actual source, so this
project can stay MIT rather than inheriting AGPL/share-alike obligations.
`IAmTomShaw/f1-race-replay` states MIT in its README but ships no formal
`LICENSE` file; treat that attribution as informal. FastF1 is MIT and its
API *shape* (not code) informed the TypeScript types here.

## Known limitations

- **Historical replay only** — no live-session mode. Live timing would
  require a persistent WebSocket/SignalR proxy (as f1-dash's Rust
  `realtime` service does); out of scope for this pass. See f1-dash in the
  table above if you want to extend this later.
- **Track outline is inferred, not authoritative** — it's traced from one
  driver's clean lap of position data rather than official circuit/corner
  data (e.g. MultiViewer's `CircuitInfo`), so corner labels and marshal
  sectors aren't shown.
- **OpenF1 is an unofficial, free API** with no uptime SLA or documented
  rate limit — see the rate-limiting note above.

## Disclaimer

Formula 1, F1, and related marks are trademarks of Formula One Licensing
B.V. This project is unofficial, unaffiliated, and uses only publicly
available data for educational/non-commercial purposes.
