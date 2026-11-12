"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { ProductCard } from "@/components/ProductCard";
import { Drip } from "@/components/Drip";
import { useDb, useT } from "@/lib/store";
import { FLAVORS } from "@/lib/flavors";
import { isOfferLive } from "@/lib/engine";
import type { FlavorKey } from "@/lib/types";

export default function ShopPage() {
  const { t, tx, lang } = useT();
  const data = useDb((s) => s.data);
  const [filter, setFilter] = useState<FlavorKey | "all">("all");
  const products = useMemo(() => data.products.filter((p) => p.active).sort((a, b) => a.sort - b.sort), [data.products]);
  const flavors = Array.from(new Set(products.map((p) => p.flavor)));
  const shown = filter === "all" ? products : products.filter((p) => p.flavor === filter);
  const offers = data.offers.filter((o) => isOfferLive(o) && o.showBadge && !o.code);

  return (
    <Shell>
      <section className="relative bg-blush pb-10 pt-10 md:pt-14">
        <div className="container-x">
          <h1 className="text-4xl font-bold text-berry-deep md:text-6xl">{t("shop")}</h1>
          {offers.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {offers.map((o) => (
                <li key={o.id} className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-berry-deep shadow-sm">
                  🏷 {tx(o.name)}
                </li>
              ))}
            </ul>
          )}
          <div className="thin-scroll -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label={t("filter_flavor")}>
            {(["all", ...flavors] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  filter === f ? "border-berry bg-berry text-white" : "border-line bg-white hover:border-berry"
                }`}
              >
                {f === "all" ? t("all") : FLAVORS[f].label[lang]}
              </button>
            ))}
          </div>
        </div>
        <Drip fill="#fbdfe3" height={90} className="absolute inset-x-0 top-full -mt-1" />
      </section>

      <section className="container-x pb-8 pt-28">
        {shown.length === 0 ? (
          <p className="py-20 text-center text-lg text-muted">—</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {shown.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
