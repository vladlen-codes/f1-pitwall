// Shapes mirror the public OpenF1 API (https://openf1.org) responses.
// Field names match the API exactly so raw JSON can be used without a mapping step.

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled?: boolean;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
  is_cancelled?: boolean;
}

export interface Driver {
  driver_number: number;
  session_key: number;
  meeting_key: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
}

export interface Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
  lap_duration: number | null;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
}

export interface Stint {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | string;
  tyre_age_at_start: number;
}

export interface PitStop {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date: string;
  pit_duration: number | null;
  stop_duration: number | null;
  lane_duration: number | null;
}

export interface Position {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  date: string;
  position: number;
}

export interface Interval {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  date: string;
  gap_to_leader: number | "+1 LAP" | null;
  interval: number | "+1 LAP" | null;
}

export interface Weather {
  meeting_key: number;
  session_key: number;
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_direction: number;
  wind_speed: number;
}

export interface RaceControlMessage {
  meeting_key: number;
  session_key: number;
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  lap_number: number | null;
  message: string;
}

export interface LocationPoint {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface Overtake {
  meeting_key: number;
  session_key: number;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  date: string;
  position: number;
}

export interface CarDataPoint {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  date: string;
  rpm: number;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number;
}
