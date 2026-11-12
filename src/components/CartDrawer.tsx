"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart, useDb, useT } from "@/lib/store";
import { useCartResult } from "./../lib/hooks";
import { ProductArt } from "./ProductArt";
import { UpsellBlock } from "./UpsellBlock";
import { isOfferLive, type CartResult } from "@/lib/engine";
import type { SizeCm } from "@/lib/types";

export function FreeShipBar({ result }: { result: CartResult }) {
  const { t, money } = useT();
  const free = useDb((s) => s.data.settings);
  if (!result.lines.length || result.freeShippingGap === null) return null;
  const done = result.freeShippingGap === 0;
  const target = free.freeShippingOver || 0;
  const pct = done ? 100 : target ? Math.max(6, Math.min(100, ((target - result.freeShippingGap) / target) * 100)) : 40;
  return (
    <div className="rounded-2xl bg-cream p-3" role="status">
      <p className="mb-2 text-sm font-bold">
        {done ? t("free_ship_ok") : t("free_ship_gap", { n: money(result.freeShippingGap) })}
      </p>
      <div className="h-2.5 overflow-hidden rounded-full bg-sand">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-caramel to-berry"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function CouponBox() {
  const { t } = useT();
  const coupon = useCart((s) => s.coupon);
  const setCoupon = useCart((s) => s.setCoupon);
  const result = useCartResult();
  const offers = useDb((s) => s.data.offers);
  const hint = offers.find((o) => o.code && o.showBadge && isOfferLive(o));
  const [v, setV] = useState(coupon);
  return (
    <div>
      <label htmlFor="coupon" className="mb-1 block text-sm font-bold">
        {t("coupon")}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          className="input !min-h-11 uppercase"
          dir="ltr"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // never submit the checkout form from the coupon box
              setCoupon(v.trim());
            }
          }}
          maxLength={24}
          autoComplete="off"
        />
        <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setCoupon(v.trim())}>
          {t("apply")}
        </button>
      </div>
      {hint && result.couponState !== "valid" && (
        <button type="button" className="mt-1 text-xs font-bold text-berry underline" onClick={() => { setV(hint.code!); setCoupon(hint.code!); }}>
          {t("coupon_try")}: {hint.code}
        </button>
      )}
      <div role="status" aria-live="polite">
        {result.couponState === "valid" && <p className="mt-1 text-sm font-bold text-green-700">✓ {t("coupon_ok")}</p>}
        {result.couponState === "invalid" && <p className="mt-1 text-sm font-bold text-red-600">{t("coupon_bad")}</p>}
      </div>
    </div>
  );
}

export function Totals({ result, codFee = false }: { result: CartResult; codFee?: boolean }) {
  const { t, tx, money } = useT();
  const offers = useDb((s) => s.data.offers);
  const addons = useDb((s) => s.data.addons);
  void codFee;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">{t("subtotal")}</dt>
        <dd className="font-bold">{money(result.subtotal)}</dd>
      </div>
      {result.addonsTotal > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted">{t("extras_total")}</dt>
          <dd className="font-bold">{money(result.addonsTotal)}</dd>
        </div>
      )}
      {result.applied
        .filter((a) => a.amount > 0)
        .map((a) => (
          <div key={a.offerId} className="flex justify-between text-green-700">
            <dt className="truncate pe-2">🏷 {tx(offers.find((o) => o.id === a.offerId)?.name)}</dt>
            <dd className="shrink-0 font-bold">−{money(a.amount)}</dd>
          </div>
        ))}
      {result.freeGifts.map((g) => (
        <div key={g} className="flex justify-between text-green-700">
          <dt>🎁 {t("gift_free")}: {tx(addons.find((a) => a.id === g)?.name)}</dt>
          <dd className="font-bold">{t("free")}</dd>
        </div>
      ))}
      <div className="flex justify-between">
        <dt className="text-muted">{t("shipping")}</dt>
        <dd className="font-bold">{result.shipping === 0 ? t("free") : money(result.shipping)}</dd>
      </div>
      <div className="flex items-end justify-between border-t border-line pt-2 text-base">
        <dt className="font-extrabold">{t("total")}</dt>
        <dd className="text-xl font-extrabold text-berry-deep">{money(result.total)}</dd>
      </div>
    </dl>
  );
}

export function CartDrawer() {
  const { t, tx, money, dir } = useT();
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const changeSize = useCart((s) => s.changeSize);
  const lines = useCart((s) => s.lines);
  const data = useDb((s) => s.data);
  const result = useCartResult();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      // simple focus trap inside the dialog
      const box = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const items = box?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open, setOpen]);

  const offset = dir === "rtl" ? "-100%" : "100%";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-choco/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("cart")}
            className="fixed inset-y-0 end-0 z-[61] flex w-full max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between border-b border-line p-4">
              <h2 className="text-xl font-bold">
                {t("cart")} {result.itemCount > 0 && <span className="text-berry">({result.itemCount})</span>}
              </h2>
              <button ref={closeRef} type="button" className="btn btn-ghost !min-h-10 !px-3" onClick={() => setOpen(false)} aria-label={t("close")}>
                ✕
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mb-3 text-6xl" aria-hidden>🍰</div>
                  <p className="text-lg font-bold">{t("empty_cart")}</p>
                  <p className="mb-5 text-muted">{t("empty_cart_sub")}</p>
                  <Link href="/shop/" onClick={() => setOpen(false)} className="btn btn-primary">
                    {t("shop_now")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
                  {result.lines.map(({ line, product, unit, discount }) => {
                    const sizes = product.sizes.filter((s) => s.enabled);
                    const next = sizes.find((s) => s.cm > line.cm);
                    const diff = next ? next.price - unit : 0;
                    return (
                      <motion.article layout key={line.key} className="rounded-2xl border border-line p-3">
                        <div className="flex gap-3">
                          <ProductArt product={product} alt="" className="h-20 w-20 shrink-0 rounded-xl" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base font-bold leading-tight">{tx(product.name)}</h3>
                              <button type="button" onClick={() => remove(line.key)} className="text-xs font-bold text-muted hover:text-berry" aria-label={`${t("remove")} ${tx(product.name)}`}>
                                {t("remove")}
                              </button>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={t("choose_size")}>
                              {sizes.map((s) => (
                                <button
                                  key={s.cm}
                                  type="button"
                                  disabled={s.stock <= 0}
                                  onClick={() => changeSize(line.key, s.cm as SizeCm)}
                                  aria-pressed={s.cm === line.cm}
                                  className={`min-h-9 rounded-full border px-3 py-1 text-xs font-bold transition ${
                                    s.cm === line.cm ? "border-berry bg-berry text-white" : "border-line bg-cream text-muted hover:border-berry"
                                  } disabled:opacity-40`}
                                >
                                  {s.cm} {t("cm")}
                                </button>
                              ))}
                            </div>
                            {line.text && <p className="mt-1 truncate text-xs text-muted">“{line.text}”</p>}
                            {line.addonIds.length > 0 && (
                              <p className="mt-1 truncate text-xs text-muted">
                                + {line.addonIds.map((id) => tx(data.addons.find((a) => a.id === id)?.name)).join("، ")}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center rounded-full border border-line" role="group" aria-label={t("qty")}>
                                <button type="button" className="h-11 w-11 text-lg font-bold" onClick={() => setQty(line.key, line.qty - 1)} aria-label={`${t("qty")} −`}>−</button>
                                <span className="w-7 text-center font-bold" aria-live="polite">{line.qty}</span>
                                <button type="button" className="h-11 w-11 text-lg font-bold" onClick={() => setQty(line.key, line.qty + 1)} aria-label={`${t("qty")} +`}>+</button>
                              </div>
                              <div className="text-end">
                                {discount > 0 && <div className="text-xs text-muted line-through">{money(unit * line.qty)}</div>}
                                <div className="font-extrabold text-berry-deep">{money(unit * line.qty - discount)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {data.settings.sizeUpgradeNudge && next && next.stock > 0 && (
                          <button
                            type="button"
                            onClick={() => changeSize(line.key, next.cm as SizeCm)}
                            className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-blush/60 px-3 py-2 text-start text-xs font-bold text-berry-deep transition hover:bg-blush"
                          >
                            <span>⬆ {t("upgrade", { cm: next.cm, n: money(diff) })}</span>
                            <span className="rounded-full bg-berry px-2.5 py-1 text-white">{t("upgrade_btn")}</span>
                          </button>
                        )}
                      </motion.article>
                    );
                  })}
                  <UpsellBlock placement="cart" contextProductIds={lines.map((l) => l.productId)} />
                </div>

                <footer className="space-y-3 border-t border-line bg-cream/60 p-4">
                  <FreeShipBar result={result} />
                  <CouponBox />
                  <Totals result={result} />
                  <Link href="/checkout/" onClick={() => setOpen(false)} className="btn btn-primary w-full !min-h-14 text-lg">
                    {t("checkout")} · {money(result.total)}
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
