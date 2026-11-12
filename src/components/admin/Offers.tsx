"use client";

import { useState } from "react";
import { uid, useDb } from "@/lib/store";
import { isOfferLive } from "@/lib/engine";
import { SIZES, type Offer, type OfferType } from "@/lib/types";
import { Badge, Chip, Field, L10nInput, NInput, Panel, TInput, Toggle, toggleIn, useL } from "./ui";

const TYPE_LABEL: Record<OfferType, [string, string]> = {
  percent: ["خصم نسبة %", "Percent off"],
  fixed: ["خصم مبلغ ثابت", "Fixed amount off"],
  buyXgetY: ["اشترِ X واحصل على Y", "Buy X get Y"],
  nthPercent: ["القطعة رقم N بخصم %", "Nth item % off"],
  tiered: ["خصم متدرج بالكمية", "Tiered quantity discount"],
  bundle: ["باقة بسعر ثابت", "Bundle fixed price"],
  freeShipping: ["شحن مجاني", "Free delivery"],
  freeGift: ["هدية مجانية", "Free gift"],
};

function blank(type: OfferType): Offer {
  const base: Offer = {
    id: uid("o"),
    name: { ar: "عرض جديد", en: "New offer" },
    type,
    active: false,
    priority: 20,
    stackable: false,
    productIds: [],
    sizes: [],
    showBadge: true,
  };
  switch (type) {
    case "percent": return { ...base, percent: 10 };
    case "fixed": return { ...base, amount: 20 };
    case "buyXgetY": return { ...base, buy: 2, get: 1, percent: 100, name: { ar: "اشترِ 2 والثالثة مجانًا", en: "Buy 2 get 1 free" } };
    case "nthPercent": return { ...base, nth: 2, percent: 50, name: { ar: "الثانية بنصف السعر", en: "Second one half price" } };
    case "tiered": return { ...base, tiers: [{ qty: 2, percent: 5 }, { qty: 3, percent: 10 }] };
    case "bundle": return { ...base, bundleProductIds: [], bundlePrice: 0 };
    case "freeShipping": return { ...base, minSubtotal: 300, showBadge: false };
    case "freeGift": return { ...base, minSubtotal: 250, showBadge: false };
  }
}

function summary(o: Offer, L: (a: string, b: string) => string): string {
  switch (o.type) {
    case "percent": return `${o.percent}%`;
    case "fixed": return `${o.amount} ${L("ر.س", "SAR")}`;
    case "buyXgetY": return `${o.buy}+${o.get} (${o.percent ?? 100}%)`;
    case "nthPercent": return `#${o.nth} → ${o.percent}%`;
    case "tiered": return (o.tiers ?? []).map((t) => `${t.qty}+: ${t.percent}%`).join(" · ");
    case "bundle": return `${o.bundlePrice} ${L("ر.س", "SAR")}`;
    case "freeShipping": return o.minSubtotal ? `≥ ${o.minSubtotal}` : "—";
    case "freeGift": return `≥ ${o.minSubtotal ?? 0}`;
  }
}

function OfferEditor({ id }: { id: string }) {
  const L = useL();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const o = data.offers.find((x) => x.id === id);
  if (!o) return null;
  const patch = (fn: (o: Offer) => void) => update((d) => { const t = d.offers.find((x) => x.id === id); if (t) fn(t); });
  const dt = (v?: string) => (v ? v.slice(0, 16) : "");

  return (
    <div className="mt-4 space-y-4 rounded-2xl bg-cream p-4">
      <L10nInput label={L("اسم العرض (يظهر للعميل)", "Offer name (shown to customers)")} value={o.name} onChange={(v) => patch((t) => (t.name = v))} />

      <div className="grid gap-3 sm:grid-cols-3">
        {(o.type === "percent" || o.type === "buyXgetY" || o.type === "nthPercent") && (
          <Field label={L("نسبة الخصم %", "Discount %")}><NInput value={o.percent} onChange={(v) => patch((t) => (t.percent = Math.min(100, v)))} /></Field>
        )}
        {o.type === "fixed" && <Field label={L("المبلغ (ر.س)", "Amount (SAR)")}><NInput value={o.amount} onChange={(v) => patch((t) => (t.amount = v))} /></Field>}
        {o.type === "buyXgetY" && (
          <>
            <Field label={L("اشترِ (X)", "Buy (X)")}><NInput value={o.buy} onChange={(v) => patch((t) => (t.buy = Math.max(1, v)))} /></Field>
            <Field label={L("واحصل (Y)", "Get (Y)")}><NInput value={o.get} onChange={(v) => patch((t) => (t.get = Math.max(1, v)))} /></Field>
          </>
        )}
        {o.type === "nthPercent" && <Field label={L("القطعة رقم (N)", "Nth item")}><NInput value={o.nth} onChange={(v) => patch((t) => (t.nth = Math.max(2, v)))} /></Field>}
        {(o.type === "freeShipping" || o.type === "freeGift" || o.type === "percent" || o.type === "fixed") && (
          <Field label={L("حد أدنى للسلة (0 = بدون)", "Min. cart (0 = none)")}><NInput value={o.minSubtotal} onChange={(v) => patch((t) => (t.minSubtotal = v || undefined))} /></Field>
        )}
        {o.type === "freeGift" && (
          <Field label={L("الهدية (من الإضافات)", "Gift (an add-on)")}>
            <select className="input !min-h-11" value={o.giftAddonId ?? ""} onChange={(e) => patch((t) => (t.giftAddonId = e.target.value))}>
              <option value="">—</option>
              {data.addons.map((a) => <option key={a.id} value={a.id}>{a.name.ar}</option>)}
            </select>
          </Field>
        )}
        {o.type === "bundle" && <Field label={L("سعر الباقة", "Bundle price")}><NInput value={o.bundlePrice} onChange={(v) => patch((t) => (t.bundlePrice = v))} /></Field>}
      </div>

      {o.type === "tiered" && (
        <div>
          <span className="mb-2 block text-sm font-bold">{L("الشرائح (الكمية ← الخصم %)", "Tiers (qty → discount %)")}</span>
          <div className="space-y-2">
            {(o.tiers ?? []).map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={L("الكمية من", "Qty from")}><NInput value={t.qty} onChange={(v) => patch((x) => (x.tiers![i].qty = Math.max(1, v)))} /></Field>
                <Field label="%"><NInput value={t.percent} onChange={(v) => patch((x) => (x.tiers![i].percent = Math.min(100, v)))} /></Field>
                <button type="button" className="btn btn-ghost !min-h-11 text-red-600" onClick={() => patch((x) => (x.tiers = x.tiers!.filter((_, k) => k !== i)))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => patch((x) => x.tiers!.push({ qty: (x.tiers!.at(-1)?.qty ?? 1) + 1, percent: 5 }))}>+ {L("شريحة", "Tier")}</button>
          </div>
        </div>
      )}

      {o.type === "bundle" && (
        <div>
          <span className="mb-2 block text-sm font-bold">{L("منتجات الباقة (كل المنتجات المختارة مطلوبة)", "Bundle products (all required)")}</span>
          <div className="flex flex-wrap gap-2">
            {data.products.map((p) => <Chip key={p.id} on={!!o.bundleProductIds?.includes(p.id)} onClick={() => patch((t) => (t.bundleProductIds = toggleIn(t.bundleProductIds ?? [], p.id)))}>{p.name.ar}</Chip>)}
          </div>
        </div>
      )}

      {o.type !== "bundle" && o.type !== "freeShipping" && o.type !== "freeGift" && (
        <>
          <div>
            <span className="mb-2 block text-sm font-bold">{L("ينطبق على منتجات (فارغ = الكل)", "Applies to products (empty = all)")}</span>
            <div className="flex flex-wrap gap-2">
              {data.products.map((p) => <Chip key={p.id} on={o.productIds.includes(p.id)} onClick={() => patch((t) => (t.productIds = toggleIn(t.productIds, p.id)))}>{p.name.ar}</Chip>)}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-bold">{L("ينطبق على مقاسات (فارغ = الكل)", "Applies to sizes (empty = all)")}</span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => <Chip key={s} on={o.sizes.includes(s)} onClick={() => patch((t) => (t.sizes = toggleIn(t.sizes, s)))}>{s} {L("سم", "cm")}</Chip>)}
            </div>
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={L("كود الكوبون (اختياري)", "Coupon code (optional)")} hint={L("إن وُجد لا يعمل العرض إلا بإدخاله", "If set, offer applies only when entered")}>
          <TInput dir="ltr" value={o.code ?? ""} onChange={(v) => patch((t) => (t.code = v.trim().toUpperCase() || undefined))} />
        </Field>
        <Field label={L("يبدأ", "Starts")}><input type="datetime-local" className="input !min-h-11" value={dt(o.startsAt)} onChange={(e) => patch((t) => (t.startsAt = e.target.value ? new Date(e.target.value).toISOString() : undefined))} /></Field>
        <Field label={L("ينتهي", "Ends")}><input type="datetime-local" className="input !min-h-11" value={dt(o.endsAt)} onChange={(e) => patch((t) => (t.endsAt = e.target.value ? new Date(e.target.value).toISOString() : undefined))} /></Field>
        <Field label={L("الأولوية (الأعلى أولًا)", "Priority (higher first)")}><NInput value={o.priority} onChange={(v) => patch((t) => (t.priority = v))} /></Field>
      </div>

      <div className="flex flex-wrap gap-5">
        <Toggle checked={o.stackable} onChange={(v) => patch((t) => (t.stackable = v))} label={L("يجتمع مع عروض أخرى", "Stackable with other offers")} />
        <Toggle checked={o.showBadge} onChange={(v) => patch((t) => (t.showBadge = v))} label={L("إظهار شارة العرض في المتجر", "Show badge in store")} />
      </div>
    </div>
  );
}

export function Offers() {
  const L = useL();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Panel
      title={L("العروض والخصومات", "Offers & discounts")}
      actions={
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as OfferType[]).map((t) => (
            <button key={t} type="button" className="btn btn-ghost !min-h-10 text-xs" onClick={() => { const o = blank(t); update((d) => void d.offers.push(o)); setOpen(o.id); }}>
              + {L(...TYPE_LABEL[t])}
            </button>
          ))}
        </div>
      }
    >
      <ul className="divide-y divide-line">
        {[...data.offers].sort((a, b) => b.priority - a.priority).map((o) => {
          const live = isOfferLive(o);
          return (
            <li key={o.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{o.name.ar}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge tone="pink">{L(...TYPE_LABEL[o.type])}</Badge>
                    <Badge tone={live ? "green" : o.active ? "amber" : "gray"}>{live ? L("يعمل الآن", "Live") : o.active ? L("خارج الجدول", "Off schedule") : L("متوقف", "Off")}</Badge>
                    {o.code && <Badge tone="amber">🎟 {o.code}</Badge>}
                    <span className="text-muted">{summary(o, L)}</span>
                  </div>
                </div>
                <Toggle checked={o.active} onChange={(v) => update((d) => void (d.offers.find((x) => x.id === o.id)!.active = v))} label={L("فعّال", "Active")} />
                <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? L("إغلاق", "Close") : L("تعديل", "Edit")}</button>
                <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف العرض؟", "Delete offer?")) && update((d) => void (d.offers = d.offers.filter((x) => x.id !== o.id)))}>{L("حذف", "Delete")}</button>
              </div>
              {open === o.id && <OfferEditor id={o.id} />}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
