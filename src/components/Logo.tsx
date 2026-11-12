"use client";

import { useDb, useT } from "@/lib/store";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const { tx } = useT();
  const name = useDb((s) => s.data.settings.storeName);
  const s = size === "lg" ? 64 : 38;
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
        <ellipse cx="24" cy="40" rx="18" ry="4" fill="#2B1A14" opacity=".12" />
        <path d="M6 22v13c0 3 8 5 18 5s18-2 18-5V22Z" fill="#FBDFE3" />
        <path d="M6 31v4c0 3 8 5 18 5s18-2 18-5v-4c0 3-8 5-18 5S6 34 6 31Z" fill="#B8742E" />
        <ellipse cx="24" cy="22" rx="18" ry="6.5" fill="#C8325E" />
        <path d="M10 24c0 4 3 4 3 0M20 25c0 6 4 6 4 0M30 25c0 4 3 4 3 0" stroke="#C8325E" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <circle cx="24" cy="15" r="4.2" fill="#E8365B" />
        <path d="M22 11.5l2-2.5 2 2.5z" fill="#3E8E41" />
      </svg>
      <span
        className="leading-none text-berry-deep"
        style={{ fontFamily: "var(--font-logo), serif", fontSize: size === "lg" ? 44 : 30 }}
      >
        {tx(name)}
      </span>
    </span>
  );
}
