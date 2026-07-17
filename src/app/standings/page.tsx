import Link from "next/link";
import { ergast } from "@/lib/ergast";

const YEARS = [2026, 2025, 2024, 2023];

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || YEARS[0];

  const [drivers, constructors] = await Promise.all([
    ergast.driverStandings(year),
    ergast.constructorStandings(year),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
        ← Back
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{year} Championship Standings</h1>

      <div className="mb-6 flex gap-2">
        {YEARS.map((y) => (
          <Link
            key={y}
            href={`/standings?year=${y}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              y === year ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Drivers
          </h2>
          <table className="w-full overflow-hidden rounded-lg border border-neutral-800 text-sm">
            <tbody>
              {drivers.map((d) => (
                <tr key={d.Driver.driverId} className="border-t border-neutral-800 first:border-0">
                  <td className="w-8 px-3 py-2 font-mono text-neutral-500">{d.position}</td>
                  <td className="px-3 py-2">
                    {d.Driver.givenName} {d.Driver.familyName}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{d.Constructors[0]?.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{d.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Constructors
          </h2>
          <table className="w-full overflow-hidden rounded-lg border border-neutral-800 text-sm">
            <tbody>
              {constructors.map((c) => (
                <tr key={c.Constructor.constructorId} className="border-t border-neutral-800 first:border-0">
                  <td className="w-8 px-3 py-2 font-mono text-neutral-500">{c.position}</td>
                  <td className="px-3 py-2">{c.Constructor.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
