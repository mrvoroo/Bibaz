"use client";

import { useId } from "react";

/**
 * Gooey cream/sauce band with drips hanging down.
 * Place it at the bottom of a coloured section: `fill` = that section's colour.
 */
const DRIPS = [
  { x: 60, w: 34, l: 64 },
  { x: 170, w: 26, l: 40 },
  { x: 255, w: 38, l: 88 },
  { x: 380, w: 24, l: 46 },
  { x: 470, w: 32, l: 70 },
  { x: 600, w: 40, l: 56 },
  { x: 700, w: 26, l: 92 },
  { x: 810, w: 34, l: 48 },
  { x: 925, w: 28, l: 78 },
  { x: 1030, w: 38, l: 52 },
  { x: 1140, w: 26, l: 84 },
  { x: 1250, w: 34, l: 58 },
  { x: 1360, w: 28, l: 72 },
];

export function Drip({
  fill = "#c8325e",
  className = "",
  flip = false,
  height = 96,
}: {
  fill?: string;
  className?: string;
  flip?: boolean;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1440 140"
      preserveAspectRatio="xMidYMin slice"
      className={`block w-full ${className}`}
      style={{ height, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <defs>
        <filter id={`goo-${id}`} x="-5%" y="-5%" width="110%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </defs>
      <g filter={`url(#goo-${id})`} fill={fill}>
        <rect x="-20" y="-10" width="1480" height="44" />
        {DRIPS.map((d, i) => (
          <rect
            key={i}
            className="drip-anim"
            style={{ animationDelay: `${(i % 5) * -0.9}s`, animationDuration: `${4 + (i % 4)}s` }}
            x={d.x - d.w / 2}
            y="20"
            width={d.w}
            height={d.l}
            rx={d.w / 2}
          />
        ))}
      </g>
    </svg>
  );
}
