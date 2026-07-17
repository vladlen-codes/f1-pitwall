"use client";

import { useEffect, useRef, useState } from "react";
import { openf1 } from "@/lib/openf1";
import type { CarDataPoint, LocationPoint } from "@/types/openf1";

interface LapWindow {
  fromIso: string;
  toIso: string;
}

interface LapTrace {
  location: LocationPoint[];
  carData: CarDataPoint[];
}

/**
 * One-shot fetch of a single driver's location+car_data over one lap window
 * — used to build the gear/speed-colored track trace. Unlike
 * useTelemetryWindow's rolling 60s cache (built for the live scrubber),
 * this fetches exactly one lap on demand when the selection changes.
 */
export function useDriverLapTrace(
  sessionKey: number,
  driverNumber: number | null,
  lapWindow: LapWindow | null,
): LapTrace | null {
  const [trace, setTrace] = useState<LapTrace | null>(null);
  const requestId = useRef(0);

  const fromIso = lapWindow?.fromIso ?? null;
  const toIso = lapWindow?.toIso ?? null;
  const valid = driverNumber != null && fromIso != null && toIso != null;

  useEffect(() => {
    // Invalid params (no driver/lap selected) resolve to `null` via the
    // `valid` gate on the returned value below, without touching state here
    // — avoids a synchronous setState-in-effect for that branch.
    if (!valid) return;

    const id = ++requestId.current;

    Promise.all([
      openf1.driverLocationWindow(sessionKey, driverNumber, fromIso, toIso),
      openf1.driverCarDataWindow(sessionKey, driverNumber, fromIso, toIso),
    ])
      .then(([location, carData]) => {
        if (requestId.current === id) setTrace({ location, carData });
      })
      .catch(() => {
        if (requestId.current === id) setTrace(null);
      });
  }, [sessionKey, driverNumber, fromIso, toIso, valid]);

  return valid ? trace : null;
}
