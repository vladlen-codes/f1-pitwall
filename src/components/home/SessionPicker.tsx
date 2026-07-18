"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openf1 } from "@/lib/openf1";
import type { Meeting, Session } from "@/types/openf1";

const YEARS = [2026, 2025, 2024, 2023];

function sortByDate<T extends { date_start: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
}

export function SessionPicker() {
  const router = useRouter();
  const [year, setYear] = useState<number>(YEARS[0]);
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [meetingsByYear, setMeetingsByYear] = useState<Record<number, Meeting[]>>({});
  const [sessionsByMeeting, setSessionsByMeeting] = useState<Record<number, Session[]>>({});
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    if (meetingsByYear[year]) return;
    let cancelled = false;
    setMeetingsError(null);
    openf1
      .meetings(year)
      .then((data) => {
        if (cancelled) return;
        setMeetingsByYear((prev) => ({
          ...prev,
          [year]: sortByDate(data.filter((m) => !m.is_cancelled)),
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMeetingsError(err instanceof Error ? err.message : "Failed to load meetings.");
      });
    return () => {
      cancelled = true;
    };
  }, [year, meetingsByYear]);

  useEffect(() => {
    if (meetingKey == null || sessionsByMeeting[meetingKey]) return;
    let cancelled = false;
    setSessionsError(null);
    openf1
      .sessions(meetingKey)
      .then((data) => {
        if (cancelled) return;
        setSessionsByMeeting((prev) => ({ ...prev, [meetingKey]: sortByDate(data) }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSessionsError(err instanceof Error ? err.message : "Failed to load sessions.");
      });
    return () => {
      cancelled = true;
    };
  }, [meetingKey, sessionsByMeeting]);

  const meetings = meetingsByYear[year];
  const sessions = meetingKey != null ? sessionsByMeeting[meetingKey] : undefined;

  function selectYear(y: number) {
    setYear(y);
    setMeetingKey(null);
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-400">Season</label>
        <div className="flex flex-wrap gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => selectYear(y)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                y === year
                  ? "bg-red-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-400">Grand Prix</label>
        {meetingsError ? (
          <p className="text-sm text-red-500">{meetingsError}</p>
        ) : !meetings ? (
          <p className="text-sm text-neutral-500">Loading meetings…</p>
        ) : (
          <select
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            value={meetingKey ?? ""}
            onChange={(e) => setMeetingKey(Number(e.target.value) || null)}
          >
            <option value="">Select a meeting…</option>
            {meetings.map((m) => (
              <option key={m.meeting_key} value={m.meeting_key}>
                {m.meeting_name}, {m.location}
              </option>
            ))}
          </select>
        )}
      </div>

      {meetingKey != null && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400">Session</label>
          {sessionsError ? (
            <p className="text-sm text-red-500">{sessionsError}</p>
          ) : !sessions ? (
            <p className="text-sm text-neutral-500">Loading sessions…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sessions.map((s) => (
                <button
                  key={s.session_key}
                  onClick={() => router.push(`/replay/${s.session_key}`)}
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm hover:border-red-600 hover:bg-neutral-800"
                >
                  <div className="font-medium">{s.session_name}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(s.date_start).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
