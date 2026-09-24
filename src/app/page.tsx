"use client";

import dynamic from "next/dynamic";
import { Shapeshift } from "@/components/shapeshift/Shapeshift";

const ShrivardhanCosmos = dynamic(
  () => import("@/components/three/ShrivardhanCosmos").then((m) => m.ShrivardhanCosmos),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <ShrivardhanCosmos />
      <div className="relative z-10">
        <Shapeshift />
      </div>
    </>
  );
}
