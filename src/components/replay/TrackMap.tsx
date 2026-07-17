"use client";

import clsx from "clsx";
import type { TraceMode, TraceSegment, TrackProjection } from "@/lib/track";
import type { Driver } from "@/types/openf1";

interface TrackMapProps {
  projection: TrackProjection | null;
  positions: Map<number, { x: number; y: number }>;
  drivers: Map<number, Driver>;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
  traceMode: "off" | TraceMode;
  onTraceModeChange: (mode: "off" | TraceMode) => void;
  coloredTrace: TraceSegment[] | null;
  drsAvailable: boolean;
  drsOn: boolean;
  onToggleDrs: () => void;
  drsSegments: TraceSegment[];
  drsUnavailableReason: string | null;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded px-2 py-0.5 text-xs font-medium transition",
        active ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700",
      )}
    >
      {children}
    </button>
  );
}

export function TrackMap({
  projection,
  positions,
  drivers,
  selectedDriver,
  onSelectDriver,
  traceMode,
  onTraceModeChange,
  coloredTrace,
  drsAvailable,
  drsOn,
  onToggleDrs,
  drsSegments,
  drsUnavailableReason,
}: TrackMapProps) {
  if (!projection) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-sm text-neutral-500">
        Track outline unavailable for this session
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {selectedDriver != null && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Trace</span>
            <Pill active={traceMode === "off"} onClick={() => onTraceModeChange("off")}>
              Off
            </Pill>
            <Pill active={traceMode === "gear"} onClick={() => onTraceModeChange("gear")}>
              Gear
            </Pill>
            <Pill active={traceMode === "speed"} onClick={() => onTraceModeChange("speed")}>
              Speed
            </Pill>
          </div>
        )}
        {drsAvailable ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">DRS</span>
            <Pill active={drsOn} onClick={onToggleDrs}>
              Zones
            </Pill>
          </div>
        ) : (
          drsUnavailableReason && <span className="text-[10px] text-neutral-600">{drsUnavailableReason}</span>
        )}
      </div>

      <svg viewBox={projection.viewBox} className="aspect-square w-full rounded-lg border border-neutral-800 bg-neutral-900">
        <path d={projection.path} fill="none" stroke="#404040" strokeWidth={10} strokeLinejoin="round" />
        {drsOn &&
          drsSegments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={seg.color}
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
        {coloredTrace?.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={seg.color}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ))}
        {[...positions.entries()].map(([driverNumber, { x, y }]) => {
          const driver = drivers.get(driverNumber);
          const p = projection.project(x, y);
          const isSelected = driverNumber === selectedDriver;
          return (
            <g
              key={driverNumber}
              transform={`translate(${p.x}, ${p.y})`}
              onClick={() => onSelectDriver(driverNumber)}
              className="cursor-pointer"
            >
              <circle
                r={isSelected ? 12 : 9}
                fill={driver ? `#${driver.team_colour}` : "#888"}
                stroke={isSelected ? "#fff" : "none"}
                strokeWidth={2}
              />
              <text
                y={-14}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isSelected ? 700 : 500}
                fill="#e5e5e5"
              >
                {driver?.name_acronym ?? driverNumber}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
