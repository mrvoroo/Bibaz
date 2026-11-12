"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Shell } from "@/components/Shell";
import { CakeStage } from "@/components/CakeStage";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { UpsellBlock } from "@/components/UpsellBlock";
import { useCart, useDb, useT } from "@/lib/store";
import { computeCart, offersForProduct } from "@/lib/engine";
import { FLAVORS } from "@/lib/flavors";
import type { SizeCm } from "@/lib/types";

function ProductView() {
  const slug = useSearchParams().get("slug");
  const { t, tx, money, lang } = useT();
  const data = useDb((s) => s.data);
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const product = data.products.find((p) => p.slug === slug && p.active);

  const [cm, setCm] = useState<SizeCm | null>(null);
  const [qty, setQty] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [view, setView] = useState<"3d" | "photo">("3d");
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!product) return;
    const first = product.sizes.find((s) => s.enabled && s.stock > 0);
    setCm((first?.cm as SizeCm) ?? null);
    setQty(1);
    setAddonIds([]);
    setText("");
    setView(product.image ? "photo" : "3d");
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const size = product?.sizes.find((s) => s.cm === cm);
  const addons = useMemo(() => data.addons.filter((a) => a.active && product?.addonIds.includes(a.id)), [data.addons, product]);
  const needsText = addonIds.some((id) => data.addons.find((a) => a.id === id)?.needsText);

  // live price preview using the real offers engine (without coupon)
  const preview = useMemo(() => {
    if (!product || !cm) return null;
    return computeCart([{ key: "x", productId: product.id, cm, qty, addonIds, text }], data.products, data.addons, data.offers, data.settings, "");
  }, [product, cm, qty, addonIds, text, data]);

  if (!product) {
    return (
      <div className="container-x py-32 text-center">
        <p className="mb-6 text-2xl font-bold">{t("not_found")}</p>
        <Link href="/shop/" className="btn btn-primary">{t("shop")}</Link>
      </div>
    );
  }

  const th = FLAVORS[product.flavor];
  const promos = offersForProduct(data.offers, product.id);
  const addonsSum = preview?.addonsTotal ?? 0;
  const lineTotal = preview ? preview.subtotal - preview.discount + addonsSum : 0;
  const related = data.products.filter((p) => p.active && p.id !== product.id).slice(0, 4);

  const toggleAddon = (id: string) => setAddonIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const textMissing = needsText && !text.trim();
  const handleAdd = () => {
    if (!cm || !size || textMissing) return;
    add({ productId: product.id, cm, qty, addonIds, text: needsText ? text.trim().slice(0, 40) : undefined });
    setJustAdded(true);
    setOpen(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div className="container-x pb-32 pt-6 md:pb-16 md:pt-10">
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:text-berry">{t("home")}</Link> / <Link href="/shop/" className="hover:text-berry">{t("shop")}</Link> /{" "}
        <span className="font-bold text-ink">{tx(product.name)}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Visual */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-line" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${th.glow})` }}>
            {view === "3d" ? (
              <CakeStage flavor={product.flavor} cm={cm ?? 20} className="aspect-square w-full" />
            ) : (
              <ProductArt product={product} alt={tx(product.name)} className="aspect-square w-full" />
            )}
            {cm && (
              <motion.div
                key={cm}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute end-4 top-4 rounded-full bg-choco px-4 py-1.5 text-sm font-extrabold text-cream"
              >
                {cm} {t("cm")}
              </motion.div>
            )}
            {product.badge && (
              <span className="absolute start-4 top-4 rounded-full bg-berry px-3 py-1 text-xs font-bold text-white">{tx(product.badge)}</span>
            )}
          </div>
          {product.image && (
            <div className="mt-3 flex justify-center gap-2">
              {(["photo", "3d"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${view === v ? "bg-choco text-cream" : "bg-sand/70"}`}
                >
                  {v === "3d" ? "3D" : "📷"}
                </button>
              ))}
            </div>
          )}
          {view === "3d" && <p className="mt-3 text-center text-xs text-muted">↻ {lang === "ar" ? "اسحب لتدوير الكيكة" : "Drag to rotate the cake"}</p>}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-4xl font-bold leading-tight text-choco md:text-5xl">{tx(product.name)}</h1>
          <p className="mt-3 text-lg text-muted">{tx(product.desc)}</p>

          {promos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {promos.map((o) => (
                <li key={o.id} className="flex items-center gap-2 rounded-2xl bg-blush px-4 py-2.5 text-sm font-bold text-berry-deep">
                  🏷 {tx(o.name)}
                </li>
              ))}
            </ul>
          )}

          <fieldset className="mt-7">
            <legend className="mb-3 text-lg font-extrabold">{t("choose_size")}</legend>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {product.sizes
                .filter((s) => s.enabled)
                .map((s, i) => {
                  const active = s.cm === cm;
                  const sold = s.stock <= 0;
                  return (
                    <button
                      key={s.cm}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={sold}
                      onClick={() => setCm(s.cm as SizeCm)}
                      className={`relative flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition ${
                        active ? "border-berry bg-blush/50 shadow-soft" : "border-line bg-white hover:border-berry/50"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center" aria-hidden>
                        <span
                          className="rounded-full"
                          style={{
                            width: 26 + i * 8,
                            height: 26 + i * 8,
                            background: `radial-gradient(circle at 35% 30%, #fff, ${th.top})`,
                            boxShadow: "inset 0 -3px 6px rgba(0,0,0,.15)",
                          }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xl font-extrabold leading-none">
                          {s.cm} <span className="text-sm">{t("cm")}</span>
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {t("serves")} {s.serves}
                        </span>
                        <span className="mt-0.5 block text-sm font-extrabold text-berry-deep">{sold ? t("sold_out") : money(s.price)}</span>
                      </span>
                      {active && <span className="absolute end-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-berry text-[11px] text-white">✓</span>}
                    </button>
                  );
                })}
            </div>
          </fieldset>

          {addons.length > 0 && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-lg font-extrabold">{t("extras")}</legend>
              <div className="flex flex-wrap gap-2">
                {addons.map((a) => {
                  const on = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleAddon(a.id)}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                        on ? "border-berry bg-berry text-white" : "border-line bg-white hover:border-berry/50"
                      }`}
                    >
                      {on ? "✓ " : "+ "}
                      {tx(a.name)} <span className="opacity-80">· {money(a.price)}</span>
                    </button>
                  );
                })}
              </div>
              {needsText && (
                <div className="mt-3">
                  <label htmlFor="cake-text" className="mb-1 block text-sm font-bold">{t("cake_text")}</label>
                  <input id="cake-text" className="input" maxLength={40} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("cake_text_ph")} />
                </div>
              )}
            </fieldset>
          )}

          <div className="mt-7">
            <UpsellBlock
              placement="product"
              contextProductIds={[product.id]}
              excludeAddonIds={addonIds}
              onAddon={(id) => addons.some((a) => a.id === id) && toggleAddon(id)}
            />
          </div>

          {/* Desktop buy box */}
          <div className="mt-7 hidden items-center gap-4 rounded-3xl border border-line bg-white p-4 shadow-card md:flex">
            <Qty qty={qty} setQty={setQty} label={t("qty")} />
            <div className="flex-1">
              {preview && preview.discount > 0 && <div className="text-sm text-muted line-through">{money(preview.subtotal + addonsSum)}</div>}
              <div className="text-2xl font-extrabold text-berry-deep">{money(lineTotal)}</div>
            </div>
            <button type="button" onClick={handleAdd} disabled={!cm || textMissing} className="btn btn-primary !min-h-14 text-lg">
              {justAdded ? `✓ ${t("added")}` : t("add_to_cart")}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Qty qty={qty} setQty={setQty} label={t("qty")} />
          <button type="button" onClick={handleAdd} disabled={!cm || textMissing} className="btn btn-primary flex-1 !min-h-12">
            {justAdded ? `✓ ${t("added")}` : `${t("add_to_cart")} · ${money(lineTotal)}`}
          </button>
        </div>
      </div>

      <section className="pt-16">
        <h2 className="mb-6 text-3xl font-bold">{t("you_may_like")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {related.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Qty({ qty, setQty, label }: { qty: number; setQty: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-full border-2 border-line bg-white" role="group" aria-label={label}>
      <button type="button" className="h-11 w-11 text-xl font-bold" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="-">−</button>
      <span className="w-8 text-center text-lg font-extrabold" aria-live="polite">{qty}</span>
      <button type="button" className="h-11 w-11 text-xl font-bold" onClick={() => setQty(Math.min(20, qty + 1))} aria-label="+">+</button>
    </div>
  );
}

export default function ProductPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="container-x py-32 text-center">…</div>}>
        <ProductView />
      </Suspense>
    </Shell>
  );
}
