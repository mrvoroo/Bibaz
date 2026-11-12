"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FLAVORS } from "@/lib/flavors";
import type { FlavorKey } from "@/lib/types";
import { CakeIllustration } from "./CakeIllustration";

const Cake3D = dynamic(() => import("./Cake3D"), { ssr: false });

function canRun3D(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    if ((navigator.hardwareConcurrency ?? 4) <= 2) return false;
    return true;
  } catch {
    return false;
  }
}

/** 3D cheesecake with a soft glow; falls back to the illustration on weak devices. */
export function CakeStage({
  flavor,
  cm = 20,
  className = "",
  interactive = true,
}: {
  flavor: FlavorKey;
  cm?: number;
  className?: string;
  interactive?: boolean;
}) {
  const [ok, setOk] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOk(canRun3D());
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const th = FLAVORS[flavor];
  return (
    <div ref={box} className={`relative ${className}`}>
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full blur-3xl transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${th.glow}, transparent 70%)` }}
      />
      {ok ? (
        <div className="absolute inset-0">
          <Cake3D flavor={flavor} cm={cm} interactive={interactive} reduceMotion={reduce} paused={!visible} />
        </div>
      ) : (
        <CakeIllustration flavor={flavor} className="relative h-full w-full floaty" />
      )}
    </div>
  );
}
