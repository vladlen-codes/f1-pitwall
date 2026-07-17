import { notFound } from "next/navigation";
import { openf1 } from "@/lib/openf1";
import { pickReferenceLap } from "@/lib/track";
import { ReplayClient } from "@/components/replay/ReplayClient";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ sessionKey: string }>;
}) {
  const { sessionKey: sessionKeyParam } = await params;
  const sessionKey = Number(sessionKeyParam);
  if (!Number.isFinite(sessionKey)) notFound();

  const session = await openf1.session(sessionKey);
  if (!session) notFound();

  // Split across two waves rather than firing all nine requests at once —
  // OpenF1's free tier rate-limits large bursts from a single client.
  const [meeting, drivers, laps, stints] = await Promise.all([
    openf1.meeting(session.meeting_key),
    openf1.drivers(sessionKey),
    openf1.laps(sessionKey),
    openf1.stints(sessionKey),
  ]);
  const [pitStops, positions, intervals, weather, raceControl, overtakes] = await Promise.all([
    openf1.pitStops(sessionKey),
    openf1.positions(sessionKey),
    openf1.intervals(sessionKey),
    openf1.weather(sessionKey),
    openf1.raceControl(sessionKey),
    openf1.overtakes(sessionKey),
  ]);

  // Driver-scoped to referenceLap.driverNumber, not just the time window —
  // `location` with no driver_number filter returns every car's position
  // during that window, and connecting all of them in date order zigzags
  // across the whole track instead of tracing one clean lap (this is what
  // was rendering the track outline as a filled blob). Also doubles as the
  // source for DRS zone detection, so one fetch now covers both.
  const referenceLap = pickReferenceLap(laps, drivers);
  const [referenceLocation, referenceCarData] = referenceLap
    ? await Promise.all([
        openf1.driverLocationWindow(sessionKey, referenceLap.driverNumber, referenceLap.fromIso, referenceLap.toIso, {
          next: { revalidate: 86_400 },
        }),
        openf1.driverCarDataWindow(sessionKey, referenceLap.driverNumber, referenceLap.fromIso, referenceLap.toIso, {
          next: { revalidate: 86_400 },
        }),
      ])
    : [[], []];

  return (
    <ReplayClient
      session={session}
      meeting={meeting}
      drivers={drivers}
      laps={laps}
      stints={stints}
      pitStops={pitStops}
      positions={positions}
      intervals={intervals}
      weather={weather}
      raceControl={raceControl}
      overtakes={overtakes}
      trackPoints={referenceLocation.map((p) => ({ x: p.x, y: p.y }))}
      referenceLocation={referenceLocation}
      referenceCarData={referenceCarData}
    />
  );
}
