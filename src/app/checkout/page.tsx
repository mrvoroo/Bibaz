"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { CouponBox, FreeShipBar, Totals } from "@/components/CartDrawer";
import { ProductArt } from "@/components/ProductArt";
import { UpsellBlock } from "@/components/UpsellBlock";
import { useCartResult } from "@/lib/hooks";
import { uid, useCart, useDb, useOrders, useT } from "@/lib/store";
import type { Order } from "@/lib/types";
import { buildOrderMessage, whatsappUrl } from "@/lib/orderMessage";

const SLOTS = ["10:00 - 13:00", "13:00 - 16:00", "16:00 - 19:00", "19:00 - 22:00"];
// strip control characters / newlines so free text cannot forge extra lines in the WhatsApp message
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
const phoneOk =(p: string) => /^(\+?966|0)?5\d{8}$/.test(p.replace(/[\s-]/g, ""));

function dateStr(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function CheckoutPage() {
  const { t, tx, money, lang } = useT();
  const router = useRouter();
  const settings = useDb((s) => s.data.settings);
  const addons = useDb((s) => s.data.addons);
  const lines = useCart((s) => s.lines);
  const coupon = useCart((s) => s.coupon);
  const clear = useCart((s) => s.clear);
  const addOrder = useOrders((s) => s.addOrder);

  const transfer = settings.transfer.filter((m) => m.enabled);
  const options = [
    ...transfer.map((m) => ({ id: m.id, type: "transfer" as const, label: tx(m.name) })),
    ...(settings.cod.enabled ? [{ id: "cod", type: "cod" as const, label: t("pay_cod") }] : []),
  ];
  const [payId, setPayId] = useState<string>("");
  useEffect(() => {
    if (!options.find((o) => o.id === payId)) setPayId(options[0]?.id ?? "");
  }, [options.map((o) => o.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const pay = options.find((o) => o.id === payId);

  const [f, setF] = useState({ name: "", phone: "", district: "", address: "", date: "", time: SLOTS[0], notes: "" });
  const [gift, setGift] = useState({ on: false, name: "", phone: "", msg: "" });
  const result = useCartResult({ cod: pay?.type === "cod", district: f.district });
  const minDate = useMemo(() => dateStr(new Date(Date.now() + settings.prepHours * 3600_000)), [settings.prepHours]);
  const [loc, setLoc] = useState("");
  const [locState, setLocState] = useState<"" | "busy" | "ok" | "fail">("");
  const getLocation = () => {
    if (!navigator.geolocation) return setLocState("fail");
    setLocState("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc(`https://maps.google.com/?q=${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`);
        setLocState("ok");
      },
      () => setLocState("fail"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  if (lines.length === 0) {
    return (
      <Shell>
        <div className="container-x py-28 text-center">
          <div className="mb-3 text-6xl" aria-hidden>🍰</div>
          <p className="mb-6 text-2xl font-bold">{t("empty_cart")}</p>
          <Link href="/shop/" className="btn btn-primary">{t("shop_now")}</Link>
        </div>
      </Shell>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = t("required");
    if (!phoneOk(f.phone)) er.phone = t("bad_phone");
    if (!f.district) er.district = t("required");
    if (f.address.trim().length < 6) er.address = t("required");
    if (!f.date || f.date < minDate) er.date = t("date_min", { d: minDate });
    if (gift.on && gift.name.trim().length < 2) er.gname = t("required");
    if (gift.on && !phoneOk(gift.phone)) er.gphone = t("bad_phone");
    if (settings.minOrder > 0 && result.subtotal < settings.minOrder) er.min = t("min_order", { n: money(settings.minOrder) });
    if (!pay) er.pay = t("no_payment");
    setErrs(er);
    if (Object.keys(er).length || !pay) {
      const order = ["name", "phone", "district", "date", "address", "gname", "gphone"];
      const first = order.find((k) => er[k]);
      const el = first ? document.getElementById(first === "gname" ? "g-name" : first === "gphone" ? "g-phone" : `f-${first}`) : null;
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); (el as HTMLElement).focus({ preventScroll: true }); }
      return;
    }
    setBusy(true);

    const order: Order = {
      id: `BZ-${uid("").slice(1, 7).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "new",
      payment: { type: pay.type, methodId: pay.type === "transfer" ? pay.id : undefined, methodName: pay.label },
      customer: {
        name: f.name.trim().slice(0, 80),
        phone: f.phone.replace(/[\s-]/g, "").slice(0, 16),
        city: `الرياض - ${f.district}`.slice(0, 60),
        address: f.address.trim().slice(0, 300),
        date: f.date,
        time: f.time,
        map: loc || undefined,
        notes: [
          gift.on ? `🎁 هدية إلى ${clean(gift.name, 60)} (${gift.phone.replace(/[^\d+]/g, "").slice(0, 16)})${clean(gift.msg, 120) ? ` «${clean(gift.msg, 120)}»` : ""} - بدون ذكر الأسعار` : "",
          clean(f.notes, 300),
        ].filter(Boolean).join(" | ").slice(0, 300),
      },
      lines: result.lines.map((l) => ({
        name: l.product.name.ar,
        cm: l.line.cm,
        qty: l.line.qty,
        unit: l.unit,
        addons: l.line.addonIds.map((id) => addons.find((a) => a.id === id)?.name.ar ?? id),
        text: l.line.text,
      })),
      totals: {
        subtotal: result.subtotal,
        addons: result.addonsTotal,
        discount: result.discount,
        shipping: result.shipping,
        total: result.total,
      },
      coupon: result.couponState === "valid" ? coupon.trim().toUpperCase() : undefined,
    };
    addOrder(order);
    // Open WhatsApp right away with the full order details (runs inside the click handler, so it is not popup-blocked)
    const wa = whatsappUrl(settings.whatsapp, buildOrderMessage(order, "بيباز"));
    if (wa) window.open(wa, "_blank", "noopener");
    clear();
    router.push(`/order/?id=${order.id}`);
  };

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-bold">{label}</label>
      <input
        id={`f-${k}`}
        className="input"
        value={f[k]}
        onChange={set(k)}
        aria-invalid={!!errs[k]}
        aria-describedby={errs[k] ? `e-${k}` : undefined}
        {...props}
      />
      {errs[k] && <p id={`e-${k}`} className="mt-1 text-sm font-bold text-red-600">{errs[k]}</p>}
    </div>
  );

  return (
    <Shell>
      <form id="checkout-form" onSubmit={submit} noValidate className="container-x grid gap-8 py-8 pb-28 md:grid-cols-[1.3fr_1fr] md:py-12 md:pb-12">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-choco">{t("checkout")}</h1>
          {Object.keys(errs).length > 0 && (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700">
              {t("fix_errors")}
              {errs.min && <div>{errs.min}</div>}
              {errs.pay && <div>{errs.pay}</div>}
            </div>
          )}

          <section className="card space-y-4 p-5 md:p-6">
            <h2 className="text-xl font-bold">{t("your_details")}</h2>
            {field("name", t("full_name"), { autoComplete: "name", maxLength: 80 })}
            {field("phone", t("phone"), { type: "tel", inputMode: "tel", dir: "ltr", placeholder: "05XXXXXXXX", autoComplete: "tel", maxLength: 16 })}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-district" className="mb-1 block text-sm font-bold">{t("district")} <span className="font-normal text-muted">({t("riyadh_only")})</span></label>
                <select id="f-district" className="input" value={f.district} onChange={set("district")} aria-invalid={!!errs.district} aria-describedby="district-fee">
                  <option value="">{t("choose_district")}</option>
                  {settings.districts.map((d) => (
                    <option key={d.name} value={d.name}>{d.name} — {money(d.fee)}</option>
                  ))}
                </select>
                {errs.district && <p className="mt-1 text-sm font-bold text-red-600">{errs.district}</p>}
                <p id="district-fee" className="mt-1 text-xs text-muted">
                  {f.district ? <>{t("delivery_fee_city")}: <b>{money(settings.districts.find((d) => d.name === f.district)?.fee ?? settings.shippingFee)}</b></> : t("choose_district")}
                </p>
              </div>
              {field("date", t("deliver_date"), { type: "date", min: minDate })}
            </div>
            <div>
              <label htmlFor="f-address" className="mb-1 block text-sm font-bold">{t("address")}</label>
              <textarea id="f-address" className="input" value={f.address} onChange={set("address")} aria-invalid={!!errs.address} aria-describedby={errs.address ? "e-address" : undefined} maxLength={300} autoComplete="street-address" />
              {errs.address && <p id="e-address" className="mt-1 text-sm font-bold text-red-600">{errs.address}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={getLocation} disabled={locState === "busy"}>
                  📍 {t("share_location")}
                </button>
                <span role="status" aria-live="polite" className={`text-sm font-bold ${locState === "ok" ? "text-green-700" : "text-red-600"}`}>
                  {locState === "ok" ? t("location_added") : locState === "fail" ? t("location_fail") : ""}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-cream p-3">
              <label className="flex cursor-pointer items-center gap-3 font-bold">
                <input type="checkbox" className="h-5 w-5 accent-[#c8325e]" checked={gift.on} onChange={(e) => setGift((g) => ({ ...g, on: e.target.checked }))} />
                🎁 {t("gift_toggle")}
              </label>
              {gift.on && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="g-name" className="mb-1 block text-sm font-bold">{t("gift_name")}</label>
                    <input id="g-name" className="input" value={gift.name} maxLength={60} onChange={(e) => setGift((g) => ({ ...g, name: e.target.value }))} aria-invalid={!!errs.gname} />
                    {errs.gname && <p className="mt-1 text-sm font-bold text-red-600">{errs.gname}</p>}
                  </div>
                  <div>
                    <label htmlFor="g-phone" className="mb-1 block text-sm font-bold">{t("gift_phone")}</label>
                    <input id="g-phone" className="input" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" value={gift.phone} maxLength={16} onChange={(e) => setGift((g) => ({ ...g, phone: e.target.value }))} aria-invalid={!!errs.gphone} />
                    {errs.gphone && <p className="mt-1 text-sm font-bold text-red-600">{errs.gphone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="g-msg" className="mb-1 block text-sm font-bold">{t("gift_msg")}</label>
                    <textarea id="g-msg" className="input" maxLength={120} value={gift.msg} onChange={(e) => setGift((g) => ({ ...g, msg: e.target.value }))} />
                    <p className="mt-1 text-xs text-muted">{t("gift_hide")}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="f-time" className="mb-1 block text-sm font-bold">{t("deliver_time")}</label>
              <select id="f-time" className="input" value={f.time} onChange={set("time")} dir="ltr">
                {SLOTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-notes" className="mb-1 block text-sm font-bold">{t("notes")}</label>
              <textarea id="f-notes" className="input" value={f.notes} onChange={set("notes")} maxLength={300} />
            </div>
          </section>

          <section className="card space-y-3 p-5 md:p-6">
            <h2 className="text-xl font-bold">{t("payment")}</h2>
            {options.length === 0 ? (
              <p className="font-bold text-red-600">{t("no_payment")}</p>
            ) : (
              <div className="space-y-2" role="radiogroup" aria-label={t("payment")}>
                {options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 font-bold transition ${
                      payId === o.id ? "border-berry bg-blush/50" : "border-line hover:border-berry/50"
                    }`}
                  >
                    <input type="radio" name="pay" className="h-5 w-5 accent-[#c8325e]" checked={payId === o.id} onChange={() => setPayId(o.id)} />
                    <span>{o.type === "transfer" ? "🏦" : "💵"}</span>
                    <span className="flex-1">{o.label}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-sm text-muted">{pay?.type === "cod" ? t("cod_note") : `${t("pay_secure")} ${t("transfer_how")}`}</p>
            <Link href="/policies/" className="text-sm font-bold text-berry underline" target="_blank">{t("policies")}</Link>
            {errs.pay && <p className="text-sm font-bold text-red-600">{errs.pay}</p>}
          </section>
        </div>

        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <section className="card space-y-4 p-5">
            <h2 className="text-xl font-bold">{t("order_summary")}</h2>
            <ul className="space-y-3">
              {result.lines.map(({ line, product, unit, discount }) => (
                <li key={line.key} className="flex items-center gap-3">
                  <ProductArt product={product} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{tx(product.name)}</p>
                    <p className="text-xs text-muted">
                      {line.cm} {t("cm")} × {line.qty}
                    </p>
                  </div>
                  <span className="font-extrabold">{money(unit * line.qty - discount)}</span>
                </li>
              ))}
            </ul>
            <FreeShipBar result={result} />
            <CouponBox />
            <Totals result={result} />
            {errs.min && <p className="text-sm font-bold text-red-600">{errs.min}</p>}
            <button type="submit" disabled={busy || !pay} className="btn btn-primary w-full !min-h-14 text-lg">
              {t("place_order")} · {money(result.total)}
            </button>
          </section>
          <UpsellBlock placement="checkout" contextProductIds={lines.map((l) => l.productId)} />
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
            <button type="submit" form="checkout-form" disabled={busy || !pay} className="btn btn-primary w-full !min-h-12">
              {t("place_order")} · {money(result.total)}
            </button>
          </div>
          <p className="text-center text-xs text-muted">{lang === "ar" ? "🔒 بياناتك تُستخدم فقط لإتمام طلبك" : "🔒 Your details are only used to fulfil your order"}</p>
        </aside>
      </form>
    </Shell>
  );
}
