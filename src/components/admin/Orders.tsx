"use client";

import { useState } from "react";
import { useDb, useOrders, useT } from "@/lib/store";
import { codeToOrder } from "@/lib/orderCode";
import type { OrderStatus } from "@/lib/types";
import { Badge, Panel, useL } from "./ui";

export const STATUSES: { k: OrderStatus; ar: string; en: string; tone: "gray" | "green" | "red" | "amber" | "pink" }[] = [
  { k: "new", ar: "جديد (بانتظار التحويل)", en: "New (awaiting transfer)", tone: "amber" },
  { k: "paid", ar: "تم التحويل / مؤكد", en: "Paid / confirmed", tone: "green" },
  { k: "preparing", ar: "قيد التحضير", en: "Preparing", tone: "pink" },
  { k: "out", ar: "خرج للتوصيل", en: "Out for delivery", tone: "pink" },
  { k: "delivered", ar: "تم التسليم", en: "Delivered", tone: "green" },
  { k: "cancelled", ar: "ملغي", en: "Cancelled", tone: "red" },
];

export function Orders() {
  const L = useL();
  const { money } = useT();
  const orders = useOrders((s) => s.orders);
  const addOrder = useOrders((s) => s.addOrder);
  const setStatus = useOrders((s) => s.setStatus);
  const removeOrder = useOrders((s) => s.removeOrder);
  const catalog = useDb((s) => s.data);
  const settings = catalog.settings;
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <Panel title={L("استيراد طلب من رسالة واتساب", "Import an order from WhatsApp")}>
        <p className="mb-3 text-sm text-muted">{L("كل رسالة طلب تصلك على واتساب فيها «رمز الطلب». الصقه هنا لتسجيل الطلب ومتابعة حالته.", "Each WhatsApp order message contains an “order code”. Paste it here to register and track the order.")}</p>
        <div className="flex flex-wrap gap-2">
          <input className="input !min-h-11 flex-1" dir="ltr" value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} placeholder={L("الصق رمز الطلب", "Paste order code")} />
          <button
            type="button"
            className="btn btn-primary !min-h-11"
            onClick={() => {
              const m = code.match(/[A-Za-z0-9+/=]{40,}/);
              const o = m ? codeToOrder(m[0]) : null;
              if (!o) return setErr(true);
              addOrder(o);
              setCode("");
            }}
          >
            {L("استيراد", "Import")}
          </button>
        </div>
        {err && <p className="mt-2 text-sm font-bold text-red-600">{L("الرمز غير صالح", "Invalid code")}</p>}
      </Panel>

      <Panel title={`${L("الطلبات", "Orders")} (${orders.length})`}>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-muted">{L("لا توجد طلبات بعد", "No orders yet")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => {
              const st = STATUSES.find((s) => s.k === o.status)!;
              // Price-tampering check: recompute from the current catalog (the order code is not signed)
              const expected = o.lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
              const priceMismatch = o.lines.some((l) => {
                const p = catalog.products.find((x) => x.name.ar === l.name);
                const s = p?.sizes.find((x) => x.cm === l.cm);
                return !p || !s || s.price !== l.unit;
              }) || Math.abs(expected - o.totals.subtotal) > 0.01;
              const wa = `https://wa.me/${o.customer.phone.replace(/\D/g, "").replace(/^0/, "966")}?text=${encodeURIComponent(`${L("طلبك", "Your order")} ${o.id}: ${L(st.ar, st.en)}`)}`;
              return (
                <li key={o.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold" dir="ltr">{o.id}</div>
                      <div className="text-sm text-muted">{o.customer.name} · {o.customer.city} · {o.customer.date}</div>
                    </div>
                    {priceMismatch && <Badge tone="red">⚠ {L("الأسعار لا تطابق الكتالوج، راجع الإجمالي", "Prices differ from catalog — verify total")}</Badge>}
                    <Badge tone={o.payment.type === "cod" ? "amber" : "pink"}>{o.payment.methodName}</Badge>
                    <span className="font-extrabold text-berry-deep">{money(o.totals.total)}</span>
                    <select className="input !min-h-10 !w-auto" value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)} aria-label={L("الحالة", "Status")}>
                      {STATUSES.map((s) => <option key={s.k} value={s.k}>{L(s.ar, s.en)}</option>)}
                    </select>
                    <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{L("تفاصيل", "Details")}</button>
                  </div>
                  {open === o.id && (
                    <div className="mt-3 space-y-2 rounded-2xl bg-cream p-4 text-sm">
                      <ul className="space-y-1">
                        {o.lines.map((l, i) => (
                          <li key={i}>• {l.name} {l.cm}{L("سم", "cm")} × {l.qty} — {money(l.unit * l.qty)}{l.addons.length ? ` (+${l.addons.join("، ")})` : ""}{l.text ? ` «${l.text}»` : ""}</li>
                        ))}
                      </ul>
                      <p>{L("الجوال", "Phone")}: <b dir="ltr">{o.customer.phone}</b> · {L("العنوان", "Address")}: {o.customer.address}</p>
                      <p>{L("التسليم", "Delivery")}: {o.customer.date} {o.customer.time}{o.customer.notes ? ` · ${o.customer.notes}` : ""}</p>
                      <p>{L("المجموع", "Subtotal")} {money(o.totals.subtotal)} · {L("الإضافات", "Extras")} {money(o.totals.addons)} · {L("الخصم", "Discount")} −{money(o.totals.discount)} · {L("التوصيل", "Delivery")} {money(o.totals.shipping)}{o.coupon ? ` · 🎟 ${o.coupon}` : ""}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a className="btn btn-ghost !min-h-10 text-sm" href={wa} target="_blank" rel="noopener noreferrer">💬 {L("راسل العميل", "Message customer")}</a>
                        <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف الطلب من هذا الجهاز؟", "Delete this order from this device?")) && removeOrder(o.id)}>{L("حذف", "Delete")}</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">{L(`الطلبات تُحفظ على هذا الجهاز فقط. رقم واتساب المتجر الحالي: ${settings.whatsapp}`, `Orders are stored on this device only. Current store WhatsApp: ${settings.whatsapp}`)}</p>
      </Panel>
    </>
  );
}
