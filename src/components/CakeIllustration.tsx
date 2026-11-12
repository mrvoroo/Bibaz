import { useId } from "react";
import { FLAVORS } from "@/lib/flavors";
import type { FlavorKey } from "@/lib/types";

// Deterministic pseudo-random so SSR/CSR match
const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Illustrated cheesecake used as a placeholder until real photos are added. */
export function CakeIllustration({ flavor, className = "" }: { flavor: FlavorKey; className?: string }) {
  const th = FLAVORS[flavor];
  const id = useId().replace(/:/g, "");
  const cx = 200;
  const cy = 112;
  const rx = 148;
  const ry = 46;
  const h = 96;

  const drips = [-118, -92, -62, -30, 4, 36, 70, 102, 128].map((dx, i) => {
    const x = cx + dx;
    const rimY = cy + ry * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2));
    return { x, y: rimY - 2, len: 14 + rnd(i, 3) * 44, w: 13 + rnd(i, 5) * 7 };
  });

  const spots = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    const r = i === 8 ? 0 : 0.62 + rnd(i, 2) * 0.12;
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r, i };
  });

  const topping = (() => {
    switch (th.topping) {
      case "strawberry":
        return spots.map((s) => (
          <g key={s.i} transform={`translate(${s.x} ${s.y - 8})`}>
            <path d="M-11,-4 Q0,-14 11,-4 Q9,12 0,17 Q-9,12 -11,-4Z" fill={th.topColor} />
            <path d="M-6,-6 l6,-5 l6,5 l-6,2z" fill="#4C8A3E" />
            {[-4, 2, -1, 4].map((px, k) => (
              <circle key={k} cx={px} cy={2 + k * 3} r="1" fill="#FFE5A8" />
            ))}
          </g>
        ));
      case "blueberry":
        return spots.map((s) => (
          <g key={s.i} transform={`translate(${s.x} ${s.y - 4})`}>
            <circle r="9" fill={th.topColor} />
            <circle r="9" fill="url(#g-bb)" opacity=".5" />
            <circle cx="-3" cy="-3" r="2.2" fill="#fff" opacity=".55" />
          </g>
        ));
      case "lotus":
        return (
          <g>
            {spots.slice(0, 5).map((s) => (
              <rect key={s.i} x={s.x - 14} y={s.y - 10} width="28" height="13" rx="3" fill="#B8742E" transform={`rotate(${(s.i - 2) * 14} ${s.x} ${s.y})`} />
            ))}
            {spots.slice(5).map((s) => (
              <circle key={s.i} cx={s.x + 6} cy={s.y} r="3.4" fill="#8F5A25" />
            ))}
          </g>
        );
      case "pistachio":
        return spots.map((s) => (
          <g key={s.i}>
            <ellipse cx={s.x} cy={s.y - 3} rx="7" ry="4.5" fill={th.topColor} />
            <ellipse cx={s.x + 12} cy={s.y + 2} rx="4" ry="3" fill="#B9D07C" />
            <ellipse cx={s.x - 10} cy={s.y + 3} rx="3.4" ry="2.6" fill="#5F7F31" />
          </g>
        ));
      case "chocolate":
        return spots.slice(0, 6).map((s) => (
          <g key={s.i} transform={`translate(${s.x} ${s.y - 6}) rotate(${(s.i - 3) * 24})`}>
            <rect x="-13" y="-4" width="26" height="8" rx="4" fill="#6B3A25" />
            <rect x="-13" y="-4" width="26" height="3" rx="2" fill="#9B6045" opacity=".7" />
          </g>
        ));
      case "caramel":
        return spots.map((s) => (
          <g key={s.i}>
            <circle cx={s.x} cy={s.y - 3} r="6" fill={th.topColor} />
            <rect x={s.x + 8} y={s.y - 2} width="3" height="3" fill="#fff" opacity=".9" />
          </g>
        ));
      case "mango":
        return spots.map((s) => (
          <rect key={s.i} x={s.x - 8} y={s.y - 10} width="16" height="14" rx="3" fill={th.topColor} transform={`rotate(${s.i * 12} ${s.x} ${s.y})`} />
        ));
      default:
        return spots.slice(0, 7).map((s) => <circle key={s.i} cx={s.x} cy={s.y} r="2.2" fill="#fff" opacity=".8" />);
    }
  })();

  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`sh-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".16" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <radialGradient id="g-bb">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </radialGradient>
        <clipPath id={`body-${id}`}>
          <path d={`M${cx - rx},${cy} v${h} a${rx},${ry} 0 0 0 ${rx * 2},0 v-${h} Z`} />
        </clipPath>
      </defs>

      {/* plate + shadow */}
      <ellipse cx={cx} cy={cy + h + 14} rx={rx + 34} ry={ry + 14} fill="#2B1A14" opacity=".1" />
      <ellipse cx={cx} cy={cy + h + 8} rx={rx + 30} ry={ry + 12} fill="#fff" />
      <ellipse cx={cx} cy={cy + h + 6} rx={rx + 18} ry={ry + 6} fill="#F3E6D2" />

      {/* body */}
      <g clipPath={`url(#body-${id})`}>
        <rect x={cx - rx} y={cy} width={rx * 2} height={h + ry} fill={th.body} />
        <rect x={cx - rx} y={cy + h - 24} width={rx * 2} height="60" fill={th.crust} />
        {drips.map((d, i) => (
          <rect key={i} x={d.x - d.w / 2} y={d.y} width={d.w} height={d.len} rx={d.w / 2} fill={th.top} />
        ))}
        <rect x={cx - rx} y={cy} width={rx * 2} height={h + ry} fill={`url(#sh-${id})`} />
      </g>
      <ellipse cx={cx} cy={cy + h} rx={rx} ry={ry} fill={th.crust} clipPath={`url(#body-${id})`} opacity="0" />

      {/* top */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={th.top} />
      <ellipse cx={cx} cy={cy} rx={rx - 12} ry={ry - 5} fill={th.topDark} opacity=".18" />
      <ellipse cx={cx - 34} cy={cy - 14} rx="46" ry="8" fill="#fff" opacity=".28" />
      {topping}
    </svg>
  );
}
