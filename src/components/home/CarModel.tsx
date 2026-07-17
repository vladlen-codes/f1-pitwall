"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

// Draco/Meshopt-compressed, WebP-textured re-export of the original 54MB
// Sketchfab download (public/oracle_red_bull_f1_car_rb19_2023.glb) via
// `gltf-transform optimize` — same model, ~30x smaller so it's actually
// reasonable to ship on a landing page.
const MODEL_URL = "/rb19.glb";

function Car() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} />;
}

export default function CarModel() {
  return (
    <Canvas camera={{ position: [3, 1.4, 3.4], fov: 35 }} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.55} shadows={false}>
          <Car />
        </Stage>
      </Suspense>
      <OrbitControls autoRotate autoRotateSpeed={1.4} enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
