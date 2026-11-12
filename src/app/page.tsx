"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Shell } from "@/components/Shell";
import { CakeStage } from "@/components/CakeStage";
import { Drip } from "@/components/Drip";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { useDb, useT } from "@/lib/store";
import { FLAVORS } from "@/lib/flavors";
import { isOfferLive, minPrice } from "@/lib/engine";
import type { FlavorKey } from "@/lib/types";

const HERO_FLAVORS: FlavorKey[] = ["strawberry", "pistachio", "lotus", "chocolate", "blueberry", "classic"];

export default function HomePage() {
  const { t, tx, money, lang } = useT();
  const data = useDb((s) => s.data);
  const [flavor, setFlavor] = useState<FlavorKey>("strawberry");
  const [cm, setCm] = useState(20);

  const products = useMemo(() => data.products.filter((p) => p.active).sort((a, b) => a.sort - b.sort), [data.products]);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const offers = data.offers.filter((o) => isOfferLive(o) && o.showBadge && !o.code);
  const sizeInfo = [15, 20, 25, 30].map((c) => {
    const prices = products.flatMap((p) => p.sizes.filter((s) => s.cm === c && s.enabled).map((s) => s.price));
    const serves = products[0]?.sizes.find((s) => s.cm === c)?.serves ?? "";
    return { cm: c, from: prices.length ? Math.min(...prices) : 0, serves };
  });
  const marquee = products.length ? products : [];

  return (
    <Shell>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-6 pb-24 pt-8 md:grid-cols-2 md:pb-32 md:pt-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-blush px-4 py-1.5 text-sm font-bold text-berry-deep">
              🍓 {tx(data.settings.tagline)}
            </span>
            <h1 className="text-5xl font-bold leading-[1.1] text-choco md:text-7xl">
              {t("hero_title_1")}
              <br />
              <span className="bg-gradient-to-r from-berry to-caramel bg-clip-text text-transparent">{t("hero_title_2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">{t("hero_sub")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/shop/" className="btn btn-primary !min-h-14 text-lg">
                {t("shop_now")}
              </Link>
              <Link href="/product/?slug=new-york-classic" className="btn btn-ghost !min-h-14">
                {t("best_sellers")}
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-choco/80">
              {(["promise1", "promise2", "promise3"] as const).map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span className="text-berry" aria-hidden>✦</span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="order-1 md:order-2"
          >
            <CakeStage flavor={flavor} cm={cm} className="mx-auto aspect-square w-full max-w-[520px]" />
            <div className="mt-2 flex flex-wrap justify-center gap-2" role="group" aria-label={t("filter_flavor")}>
              {HERO_FLAVORS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlavor(f)}
                  aria-pressed={flavor === f}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                    flavor === f ? "border-berry bg-white shadow-soft" : "border-line bg-white/70 hover:border-berry"
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: FLAVORS[f].top }} aria-hidden />
                  {FLAVORS[f].label[lang]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label={t("choose_size")}>
              {[15, 20, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCm(c)}
                  aria-pressed={cm === c}
                  className={`rounded-full px-3.5 py-1 text-xs font-extrabold transition ${cm === c ? "bg-choco text-cream" : "bg-sand/70 text-choco hover:bg-sand"}`}
                >
                  {c} {t("cm")}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
        <Drip fill="#fbdfe3" height={110} className="absolute inset-x-0 bottom-0 translate-y-1" flip={false} />
      </section>

      {/* ───────── MARQUEE ───────── */}
      {marquee.length > 0 && (
        <section className="overflow-hidden bg-blush py-5" aria-hidden>
          <div className="marquee-track">
            {[...marquee, ...marquee, ...marquee, ...marquee].map((p, i) => (
              <span key={i} className="mx-6 flex items-center gap-6 text-2xl font-bold text-berry-deep" style={{ fontFamily: "var(--font-display)" }}>
                {tx(p.name)} <span className="text-caramel">✦</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ───────── BEST SELLERS ───────── */}
      <section className="container-x pt-20">
        <Reveal>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-4xl font-bold text-choco md:text-5xl">{t("best_sellers")}</h2>
            <Link href="/shop/" className="text-sm font-extrabold text-berry hover:underline">
              {t("see_all")} {lang === "ar" ? "←" : "→"}
            </Link>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ───────── OFFERS ───────── */}
      {offers.length > 0 && (
        <section className="container-x pt-16">
          <div className="grid gap-4 md:grid-cols-2">
            {offers.slice(0, 2).map((o, i) => (
              <Reveal key={o.id} delay={i * 0.1}>
                <Link
                  href="/shop/"
                  className="relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-berry to-berry-deep p-6 text-white shadow-soft md:p-8"
                >
                  <div className="shine absolute inset-0 overflow-hidden" aria-hidden />
                  <div className="relative">
                    <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">🏷 {t("offer_badge")}</span>
                    <p className="text-2xl font-bold leading-snug md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                      {tx(o.name)}
                    </p>
                  </div>
                  <span className="relative text-5xl" aria-hidden>🍰</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── SIZES ───────── */}
      <section className="relative mt-24 bg-berry-deep pb-16 pt-16 text-white md:pb-24">
        <div className="container-x">
          <Reveal className="mb-10 text-center">
            <h2 className="text-4xl font-bold md:text-5xl">{t("sizes_title")}</h2>
            <p className="mt-2 text-white/75">{t("sizes_sub")}</p>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {sizeInfo.map((s, i) => (
              <Reveal key={s.cm} delay={i * 0.08}>
                <Link
                  href="/shop/"
                  className="group flex h-full flex-col items-center rounded-3xl bg-white/10 p-5 text-center ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  <div className="grid h-36 place-items-center">
                    <div
                      className="rounded-full shadow-xl transition-transform duration-500 group-hover:scale-110"
                      style={{
                        width: 56 + i * 24,
                        height: 56 + i * 24,
                        background: "radial-gradient(circle at 35% 30%, #fff6e6, #f6d7a0 55%, #e4b873)",
                        boxShadow: "inset 0 -8px 14px rgba(0,0,0,.12), 0 14px 24px rgba(0,0,0,.25)",
                      }}
                      aria-hidden
                    />
                  </div>
                  <div className="text-3xl font-bold">
                    {s.cm} <span className="text-lg">{t("cm")}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {t("serves")} {s.serves} {t("people")}
                  </div>
                  <div className="mt-3 rounded-full bg-white px-4 py-1 text-sm font-extrabold text-berry-deep">
                    {t("from")} {money(s.from)}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
        <Drip fill="#7a1e3f" height={100} className="absolute inset-x-0 top-full -mt-1" />
      </section>

      {/* ───────── HOW ───────── */}
      <section className="container-x pt-40">
        <Reveal>
          <h2 className="mb-10 text-center text-4xl font-bold text-choco md:text-5xl">{t("how_title")}</h2>
        </Reveal>
        <ol className="grid gap-5 md:grid-cols-3">
          {(
            [
              ["how1", "how1d", "🍰"],
              ["how2", "how2d", "💳"],
              ["how3", "how3d", "🚚"],
            ] as const
          ).map(([a, b, e], i) => (
            <Reveal key={a} delay={i * 0.1}>
              <li className="card relative p-6 text-center">
                <span className="absolute -top-4 start-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full bg-berry font-extrabold text-white rtl:translate-x-1/2">
                  {i + 1}
                </span>
                <div className="mb-3 text-5xl" aria-hidden>{e}</div>
                <h3 className="text-xl font-bold">{t(a)}</h3>
                <p className="mt-1 text-muted">{t(b)}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-12 text-center">
          <Link href="/shop/" className="btn btn-primary !min-h-14 text-lg">
            {t("shop_now")}
          </Link>
          <p className="mt-3 text-xs text-muted">
            {t("from")} {money(Math.min(...products.map(minPrice).filter(Boolean), 9999))} · {t("vat_inc")}
          </p>
        </Reveal>
      </section>
    </Shell>
  );
}
