"use client";

import dynamic from "next/dynamic";

// `ssr: false` must be called from a Client Component in this Next.js
// version (see node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md)
// — WebGL/Canvas needs a browser anyway, so this is a hard requirement, not
// just an optimization.
const CarModel = dynamic(() => import("@/components/home/CarModel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-600">
      Loading 3D model…
    </div>
  ),
});

export function CarEmbed() {
  return (
    <div className="mb-10 w-full max-w-xl">
      <div className="aspect-[4/3] w-full">
        <CarModel />
      </div>
      <p className="px-3 py-2 text-[11px] text-neutral-500">
        <a
          href="https://sketchfab.com/3d-models/oracle-red-bull-f1-car-rb19-2023-e4afe46f3aab4b23a418da06fc163821"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-neutral-400 hover:text-neutral-300"
        >
          Oracle Red Bull F1 Car RB19 2023
        </a>{" "}
        by{" "}
        <a
          href="https://sketchfab.com/redgrund"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-neutral-400 hover:text-neutral-300"
        >
          Redgrund
        </a>{" "}
        on{" "}
        <a
          href="https://sketchfab.com"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-neutral-400 hover:text-neutral-300"
        >
          Sketchfab
        </a>
      </p>
    </div>
  );
}
