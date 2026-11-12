"use client";

import { useUpsells } from "@/lib/hooks";
import { useCart, useT } from "@/lib/store";
import { ProductArt } from "./ProductArt";

/** Smart suggestions driven by the admin's upsell rules. */
export function UpsellBlock({
  placement,
  contextProductIds,
  title,
  onAddon,
  excludeAddonIds,
}: {
  placement: "product" | "cart" | "checkout";
  contextProductIds: string[];
  title?: string;
  onAddon?: (addonId: string) => void;
  excludeAddonIds?: string[];
}) {
  const { t, tx, money } = useT();
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const toggleAddon = useCart((s) => s.toggleAddon);
  const items = useUpsells(placement, contextProductIds, excludeAddonIds);
  if (!items.length) return null;

  return (
    <section aria-label={title ?? t("you_may_like")} className="rounded-2xl border border-dashed border-berry/40 bg-blush/40 p-3">
      <h4 className="mb-2 text-sm font-extrabold text-berry-deep">✨ {title ?? t("you_may_like")}</h4>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.rule.id} className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm">
            {s.product ? (
              <ProductArt product={s.product} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-cream text-2xl" aria-hidden>
                🎁
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{s.product ? tx(s.product.name) : tx(s.addon?.name)}</div>
              <div className="truncate text-xs text-muted">{tx(s.rule.message)}</div>
              <div className="text-sm font-extrabold text-berry-deep">
                {money(s.price)}
                {s.size ? <span className="text-xs font-medium text-muted"> · {s.size} {t("cm")}</span> : null}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary !min-h-10 !px-4 text-sm"
              onClick={() => {
                if (s.product && s.size) {
                  add({ productId: s.product.id, cm: s.size, qty: 1, addonIds: [] });
                } else if (s.addon) {
                  if (onAddon) onAddon(s.addon.id);
                  else {
                    const target = lines.find((l) => !l.addonIds.includes(s.addon!.id));
                    if (target) toggleAddon(target.key, s.addon.id);
                  }
                }
              }}
            >
              + {t("add")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
