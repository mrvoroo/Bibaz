"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useDb, useT } from "@/lib/store";
import { minPrice, offersForProduct } from "@/lib/engine";
import type { Product } from "@/lib/types";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { t, tx, money } = useT();
  const offers = useDb((s) => s.data.offers);
  const promo = offersForProduct(offers, product.id)[0];
  const sold = product.sizes.every((s) => !s.enabled || s.stock <= 0);
  const name = tx(product.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 4) * 0.07 }}
    >
      <Link
        href={`/product/?slug=${product.slug}`}
        className="card group block overflow-hidden transition-transform duration-300 hover:-translate-y-1.5"
        aria-label={name}
      >
        <div className="relative aspect-[5/4]">
          <ProductArt product={product} alt={name} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]" />
          <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
            {product.badge && (
              <span className="rounded-full bg-berry px-3 py-1 text-xs font-bold text-white shadow">{tx(product.badge)}</span>
            )}
            {promo && (
              <span className="rounded-full bg-choco px-3 py-1 text-xs font-bold text-cream">🏷 {tx(promo.name)}</span>
            )}
          </div>
          {sold && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-lg font-bold">{t("sold_out")}</div>
          )}
        </div>
        <div className="p-4 md:p-5">
          <h3 className="text-xl font-bold leading-tight">{name}</h3>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-muted">{t("from")}</div>
              <div className="text-lg font-extrabold text-berry-deep">{money(minPrice(product))}</div>
            </div>
            <div className="flex gap-1" aria-hidden>
              {product.sizes
                .filter((s) => s.enabled)
                .map((s) => (
                  <span key={s.cm} className="rounded-full border border-line bg-cream px-2 py-0.5 text-[11px] font-bold text-muted">
                    {s.cm}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
