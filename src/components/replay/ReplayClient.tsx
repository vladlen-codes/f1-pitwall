"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReplayStore } from "@/store/replayStore";
import { useTelemetryWindow } from "@/hooks/useTelemetryWindow";
import { useDriverLapTrace } from "@/hooks/useDriverLapTrace";
import { buildGapSeries, createLeaderboardEngine } from "@/lib/replay";
import { latestAtOrBefore } from "@/lib/timeseries";
import {
  buildColoredTrace,
  buildDrsSegments,
  buildTrackProjection,
  hasDrsData,
  matchCarDataToLocations,
  pickDriverLap,
  type TraceMode,
} from "@/lib/track";
import { TrackMap } from "@/components/replay/TrackMap";
import { Leaderboard } from "@/components/replay/Leaderboard";
import { TimelineScrubber } from "@/components/replay/TimelineScrubber";
import { TelemetryPanel } from "@/components/replay/TelemetryPanel";
import { GapChart } from "@/components/replay/GapChart";
import { StintTimeline } from "@/components/replay/StintTimeline";
import { WeatherWidget } from "@/components/replay/WeatherWidget";
import { RaceControlFeed } from "@/components/replay/RaceControlFeed";
import { OvertakeFeed } from "@/components/replay/OvertakeFeed";
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
import type { Point } from "@/lib/track";

interface ReplayClientProps {
  session: Session;
  meeting: Meeting;
  drivers: Driver[];
  laps: Lap[];
  stints: Stint[];
  pitStops: PitStop[];
  positions: Position[];
  intervals: Interval[];
  weather: Weather[];
  raceControl: RaceControlMessage[];
  overtakes: Overtake[];
  trackPoints: Point[];
  referenceLocation: LocationPoint[];
  referenceCarData: CarDataPoint[];
}

const TELEMETRY_SPAN_MS = 20_000;

export function ReplayClient({
  session,
  meeting,
  drivers,
  laps,
  stints,
  pitStops,
  positions,
  intervals,
  weather,
  raceControl,
  overtakes,
  trackPoints,
  referenceLocation,
  referenceCarData,
}: ReplayClientProps) {
  const startMs = useMemo(() => new Date(session.date_start).getTime(), [session]);
  const endMs = useMemo(() => new Date(session.date_end).getTime(), [session]);

  const currentMs = useReplayStore((s) => s.currentMs);
  const playing = useReplayStore((s) => s.playing);
  const speed = useReplayStore((s) => s.speed);
  const selectedDriver = useReplayStore((s) => s.selectedDriver);
  const init = useReplayStore((s) => s.init);
  const toggle = useReplayStore((s) => s.toggle);
  const seek = useReplayStore((s) => s.seek);
  const tick = useReplayStore((s) => s.tick);
  const setSpeed = useReplayStore((s) => s.setSpeed);
  const selectDriver = useReplayStore((s) => s.selectDriver);

  useEffect(() => {
    init(startMs, endMs);
  }, [init, startMs, endMs]);

  // rAF playback loop — ticks the shared store forward at wall-clock pace,
  // scaled by the selected replay speed.
  const lastFrame = useRef<number | null>(null);
  useEffect(() => {
    let raf: number;
    const step = (now: number) => {
      if (lastFrame.current != null) {
        tick(now - lastFrame.current);
      }
      lastFrame.current = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      lastFrame.current = null;
    };
  }, [tick]);

  const { getLocationsAt, getCarDataAt, getCarDataSeries } = useTelemetryWindow(
    session.session_key,
    currentMs,
  );

  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.driver_number, d])), [drivers]);

  const projection = useMemo(() => {
    if (trackPoints.length < 2) return null;
    return buildTrackProjection(trackPoints);
  }, [trackPoints]);

  const [traceMode, setTraceMode] = useState<"off" | TraceMode>("off");
  const driverLap = useMemo(
    () => (selectedDriver != null ? pickDriverLap(laps, selectedDriver, currentMs) : null),
    [laps, selectedDriver, currentMs],
  );
  const lapTrace = useDriverLapTrace(session.session_key, selectedDriver, driverLap);
  const coloredTrace = useMemo(() => {
    if (traceMode === "off" || !lapTrace || !projection) return null;
    const matched = matchCarDataToLocations(lapTrace.location, lapTrace.carData);
    return buildColoredTrace(matched, traceMode, projection.project);
  }, [traceMode, lapTrace, projection]);

  const drsAvailable = useMemo(() => hasDrsData(referenceCarData), [referenceCarData]);
  const [drsOn, setDrsOn] = useState(false);
  const drsSegments = useMemo(() => {
    if (!drsAvailable || !projection) return [];
    const matched = matchCarDataToLocations(referenceLocation, referenceCarData);
    return buildDrsSegments(matched, projection.project);
  }, [drsAvailable, projection, referenceLocation, referenceCarData]);
  const drsUnavailableReason = drsAvailable
    ? null
    : session.year >= 2026
      ? "DRS zones unavailable: 2026 Manual Override aero system replaces traditional DRS"
      : "DRS data unavailable for this session";

  const visibleOvertakes = useMemo(
    () => overtakes.filter((o) => new Date(o.date).getTime() <= currentMs),
    [overtakes, currentMs],
  );

  const leaderboardEngine = useMemo(
    () => createLeaderboardEngine(drivers, positions, intervals, laps, stints),
    [drivers, positions, intervals, laps, stints],
  );

  const rows = useMemo(() => leaderboardEngine.getRowsAt(currentMs), [leaderboardEngine, currentMs]);
  const currentLocations = useMemo(() => getLocationsAt(currentMs), [getLocationsAt, currentMs]);
  const currentWeather = useMemo(() => latestAtOrBefore(weather, currentMs), [weather, currentMs]);
  const visibleRaceControl = useMemo(
    () => raceControl.filter((m) => new Date(m.date).getTime() <= currentMs),
    [raceControl, currentMs],
  );

  const selectedDriverInfo = selectedDriver != null ? (driverMap.get(selectedDriver) ?? null) : null;
  const selectedCarData = selectedDriver != null ? getCarDataAt(currentMs, selectedDriver) : null;
  const selectedSeries = useMemo(
    () => (selectedDriver != null ? getCarDataSeries(selectedDriver, currentMs, TELEMETRY_SPAN_MS) : []),
    [selectedDriver, currentMs, getCarDataSeries],
  );
  const gapSeries = useMemo(
    () => (selectedDriver != null ? buildGapSeries(intervals, selectedDriver, startMs) : []),
    [intervals, selectedDriver, startMs],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">
            {meeting?.meeting_name}: {session.session_name}
          </h1>
        </div>
      </div>

      <div className="mb-4">
        <TimelineScrubber
          currentMs={currentMs}
          startMs={startMs}
          endMs={endMs}
          playing={playing}
          speed={speed}
          raceControl={raceControl}
          overtakes={overtakes}
          drivers={driverMap}
          onTogglePlay={toggle}
          onSeek={seek}
          onSetSpeed={setSpeed}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <TrackMap
            projection={projection}
            positions={currentLocations}
            drivers={driverMap}
            selectedDriver={selectedDriver}
            onSelectDriver={selectDriver}
            traceMode={traceMode}
            onTraceModeChange={setTraceMode}
            coloredTrace={coloredTrace}
            drsAvailable={drsAvailable}
            drsOn={drsOn}
            onToggleDrs={() => setDrsOn((v) => !v)}
            drsSegments={drsSegments}
            drsUnavailableReason={drsUnavailableReason}
          />
          <WeatherWidget weather={currentWeather} />
          <TelemetryPanel
            driver={selectedDriverInfo}
            latest={selectedCarData}
            series={selectedSeries}
            windowStartMs={currentMs - TELEMETRY_SPAN_MS}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Leaderboard rows={rows} selectedDriver={selectedDriver} onSelectDriver={selectDriver} />
          <GapChart driver={selectedDriverInfo} series={gapSeries} />
          <RaceControlFeed messages={visibleRaceControl} />
          <OvertakeFeed overtakes={visibleOvertakes} drivers={driverMap} />
        </div>
      </div>

      <div className="mt-4">
        <StintTimeline
          rows={rows}
          stints={stints}
          pitStops={pitStops}
          selectedDriver={selectedDriver}
          onSelectDriver={selectDriver}
        />
      </div>
    </div>
  );
}
