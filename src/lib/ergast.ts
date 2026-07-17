// jolpica-f1 (https://github.com/jolpica/jolpica-f1) is the community-run
// successor to the retired Ergast API, exposing the same response shape.
const BASE_URL = "https://api.jolpi.ca/ergast/f1";

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    code: string;
    givenName: string;
    familyName: string;
    nationality: string;
  };
  Constructors: { constructorId: string; name: string }[];
}

export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string; nationality: string };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Ergast/jolpica request failed (${res.status}): ${path}`);
  return res.json();
}

export const ergast = {
  driverStandings: async (year: number) => {
    const data = await get<{
      MRData: { StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } };
    }>(`${year}/driverstandings.json`);
    return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  },

  constructorStandings: async (year: number) => {
    const data = await get<{
      MRData: {
        StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] };
      };
    }>(`${year}/constructorstandings.json`);
    return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  },
};
