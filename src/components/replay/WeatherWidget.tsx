"use client";

import type { Weather } from "@/types/openf1";

interface WeatherWidgetProps {
  weather: Weather | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-500">
        No weather data yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <Stat label="Air" value={`${weather.air_temperature.toFixed(1)}°C`} />
      <Stat label="Track" value={`${weather.track_temperature.toFixed(1)}°C`} />
      <Stat label="Humidity" value={`${weather.humidity.toFixed(0)}%`} />
      <Stat label="Wind" value={`${weather.wind_speed.toFixed(1)} m/s`} />
      <Stat label="Rain" value={weather.rainfall > 0 ? "Yes" : "No"} />
      <Stat label="Pressure" value={`${weather.pressure.toFixed(0)} hPa`} />
    </div>
  );
}
