"use client";

import { useMemo } from "react";
import { useCart, useDb } from "./store";
import { computeCart, type CartResult } from "./engine";
import type { Addon, Product, SizeCm, UpsellRule } from "./types";

export function useCartResult(opts: { cod?: boolean; district?: string } = {}): CartResult {
  const lines = useCart((s) => s.lines);
  const coupon = useCart((s) => s.coupon);
  const data = useDb((s) => s.data);
  return useMemo(
    () => computeCart(lines, data.products, data.addons, data.offers, data.settings, coupon, opts),
    [lines, coupon, data, opts.cod, opts.district], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

export interface Suggestion {
  rule: UpsellRule;
  product?: Product;
  addon?: Addon;
  size?: SizeCm;
  price: number;
}

export function useUpsells(
  placement: "product" | "cart" | "checkout",
  contextProductIds: string[],
  excludeAddonIds: string[] = [],
  limit = 3,
): Suggestion[] {
  const data = useDb((s) => s.data);
  const lines = useCart((s) => s.lines);
  const inCart = lines.map((l) => l.productId);
  return useMemo(() => {
    const out: Suggestion[] = [];
    for (const rule of data.upsells) {
      if (!rule.active || !rule.placements.includes(placement)) continue;
      if (rule.triggerProductId !== "any" && !contextProductIds.includes(rule.triggerProductId)) continue;
      if (rule.suggestKind === "product") {
        const product = data.products.find((p) => p.id === rule.suggestId && p.active);
        if (!product || contextProductIds.includes(product.id) || inCart.includes(product.id)) continue;
        const enabled = product.sizes.filter((s) => s.enabled && s.stock > 0);
        const size = enabled.find((s) => s.cm === rule.suggestSize) ?? enabled[0];
        if (!size) continue;
        out.push({ rule, product, size: size.cm, price: size.price });
      } else {
        const addon = data.addons.find((a) => a.id === rule.suggestId && a.active);
        if (!addon || addon.needsText || excludeAddonIds.includes(addon.id)) continue;
        if (placement !== "product" && lines.length && lines.every((l) => l.addonIds.includes(addon.id))) continue;
        out.push({ rule, addon, price: addon.price });
      }
      if (out.length >= limit) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, placement, contextProductIds.join(","), excludeAddonIds.join(","), lines.length, inCart.join(",")]);
}
