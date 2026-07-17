import Link from "next/link";
import { SessionPicker } from "@/components/home/SessionPicker";
import { CarEmbed } from "@/components/home/CarEmbed";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Pit<span className="text-red-600">wall</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Replay any Formula 1 session lap by lap, with real telemetry, real
          track positions, and real timing, right in your browser.
        </p>
        <Link href="/standings" className="mt-3 inline-block text-sm text-red-500 hover:text-red-400">
          View championship standings →
        </Link>
      </div>
      <CarEmbed />
      <SessionPicker />
    </div>
  );
}
