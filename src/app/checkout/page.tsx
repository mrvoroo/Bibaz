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

const SLOTS = ["10:00 - 13:00", "13:00 - 16:00", "16:00 - 19:00", "19:00 - 22:00"];
const phoneOk = (p: string) => /^(\+?966|0)?5\d{8}$/.test(p.replace(/[\s-]/g, ""));

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

  const result = useCartResult({ cod: pay?.type === "cod" });
  const minDate = useMemo(() => dateStr(new Date(Date.now() + settings.prepHours * 3600_000)), [settings.prepHours]);

  const [f, setF] = useState({ name: "", phone: "", city: settings.cities[0] ?? "", address: "", date: "", time: SLOTS[0], notes: "" });
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
    if (!f.city.trim()) er.city = t("required");
    if (f.address.trim().length < 6) er.address = t("required");
    if (!f.date || f.date < minDate) er.date = t("required");
    if (settings.minOrder > 0 && result.subtotal < settings.minOrder) er.min = t("min_order", { n: money(settings.minOrder) });
    if (!pay) er.pay = t("no_payment");
    setErrs(er);
    if (Object.keys(er).length || !pay) return;
    setBusy(true);

    const order: Order = {
      id: `BZ-${uid("").slice(1, 7).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "new",
      payment: { type: pay.type, methodId: pay.type === "transfer" ? pay.id : undefined, methodName: pay.label },
      customer: {
        name: f.name.trim().slice(0, 80),
        phone: f.phone.replace(/[\s-]/g, "").slice(0, 16),
        city: f.city.trim().slice(0, 60),
        address: f.address.trim().slice(0, 300),
        date: f.date,
        time: f.time,
        notes: f.notes.trim().slice(0, 300),
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
      <form onSubmit={submit} noValidate className="container-x grid gap-8 py-8 md:grid-cols-[1.3fr_1fr] md:py-12">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-choco">{t("checkout")}</h1>

          <section className="card space-y-4 p-5 md:p-6">
            <h2 className="text-xl font-bold">{t("your_details")}</h2>
            {field("name", t("full_name"), { autoComplete: "name", maxLength: 80 })}
            {field("phone", t("phone"), { type: "tel", inputMode: "tel", dir: "ltr", placeholder: "05XXXXXXXX", autoComplete: "tel", maxLength: 16 })}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-city" className="mb-1 block text-sm font-bold">{t("city")}</label>
                <select id="f-city" className="input" value={f.city} onChange={set("city")}>
                  {settings.cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              {field("date", t("deliver_date"), { type: "date", min: minDate })}
            </div>
            <div>
              <label htmlFor="f-address" className="mb-1 block text-sm font-bold">{t("address")}</label>
              <textarea id="f-address" className="input" value={f.address} onChange={set("address")} aria-invalid={!!errs.address} maxLength={300} autoComplete="street-address" />
              {errs.address && <p className="mt-1 text-sm font-bold text-red-600">{errs.address}</p>}
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
            <p className="text-sm text-muted">{pay?.type === "cod" ? t("cod_note") : t("transfer_how")}</p>
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
          <p className="text-center text-xs text-muted">{lang === "ar" ? "🔒 بياناتك تُستخدم فقط لإتمام طلبك" : "🔒 Your details are only used to fulfil your order"}</p>
        </aside>
      </form>
    </Shell>
  );
}
