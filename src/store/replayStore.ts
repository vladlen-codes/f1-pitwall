import { create } from "zustand";

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 20, 50] as const;

interface ReplayState {
  sessionStartMs: number;
  sessionEndMs: number;
  currentMs: number;
  playing: boolean;
  speed: number;
  selectedDriver: number | null;

  init: (startMs: number, endMs: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  tick: (deltaMs: number) => void;
  setSpeed: (speed: number) => void;
  selectDriver: (driverNumber: number | null) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  sessionStartMs: 0,
  sessionEndMs: 0,
  currentMs: 0,
  playing: false,
  speed: 1,
  selectedDriver: null,

  init: (startMs, endMs) =>
    set({ sessionStartMs: startMs, sessionEndMs: endMs, currentMs: startMs, playing: false }),

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set({ playing: !get().playing }),

  seek: (ms) =>
    set({
      currentMs: Math.min(Math.max(ms, get().sessionStartMs), get().sessionEndMs),
    }),

  tick: (deltaMs) => {
    const { currentMs, speed, sessionEndMs, playing } = get();
    if (!playing) return;
    const next = currentMs + deltaMs * speed;
    if (next >= sessionEndMs) {
      set({ currentMs: sessionEndMs, playing: false });
    } else {
      set({ currentMs: next });
    }
  },

  setSpeed: (speed) => set({ speed }),
  selectDriver: (driverNumber) => set({ selectedDriver: driverNumber }),
}));
