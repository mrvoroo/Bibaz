"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_PATH, useDb, useOrders, useT } from "@/lib/store";
import { codeToOrder } from "@/lib/orderCode";
import { parseOrderMessage } from "@/lib/orderMessage";
import { backendEnabled, enablePush, notifyLocal, pushSupported, registerSW, remoteDelete, remoteList, remoteSetStatus, subscribeOrders } from "@/lib/backend";
import { downloadBlob, intlPhone, sharePdf, waLink } from "@/lib/share";
import { InvoiceSheet, makeInvoicePdf } from "@/components/Invoice";
import { ProductArt } from "@/components/ProductArt";
import type { Order, OrderStatus } from "@/lib/types";
import { Badge, Panel, useL } from "./ui";

export const STATUSES: { k: OrderStatus; ar: string; en: string; tone: "gray" | "green" | "red" | "amber" | "pink" }[] = [
  { k: "new", ar: "جديد (بانتظار التحويل)", en: "New (awaiting transfer)", tone: "amber" },
  { k: "paid", ar: "تم التحويل / مؤكد", en: "Paid / confirmed", tone: "green" },
  { k: "preparing", ar: "قيد التحضير", en: "Preparing", tone: "pink" },
  { k: "out", ar: "خرج للتوصيل", en: "Out for delivery", tone: "pink" },
  { k: "delivered", ar: "تم التسليم", en: "Delivered", tone: "green" },
  { k: "cancelled", ar: "ملغي", en: "Cancelled", tone: "red" },
];

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Install-as-app + notifications controls (the admin panel is a PWA). */
function AppBar() {
  const L = useL();
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void registerSW(BASE_PATH);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    if ("Notification" in window) setPerm(Notification.permission);
    const h = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const ios = typeof navigator !== "undefined" && /iphone|ipad/i.test(navigator.userAgent);
  return (
    <div className="mb-6 rounded-2xl bg-white p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="me-auto text-base font-extrabold">📱 {L("تطبيق الإدارة على جوالك", "Admin app on your phone")}</h2>
        {!installed && bip && (
          <button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={async () => { await bip.prompt(); setBip(null); }}>
            ⬇ {L("تثبيت التطبيق", "Install app")}
          </button>
        )}
        {installed && <Badge tone="green">{L("مثبّت ✓", "Installed ✓")}</Badge>}
        {pushSupported() && perm !== "granted" && (
          <button
            type="button"
            className="btn btn-ghost !min-h-10 text-sm"
            onClick={async () => {
              const r = await enablePush(BASE_PATH);
              setPerm("Notification" in window ? Notification.permission : "default");
              setMsg(
                r === "ok" ? L("تم تفعيل الإشعارات ✓", "Notifications enabled ✓")
                : r === "denied" ? L("تم رفض الإذن من المتصفح", "Permission denied")
                : r === "no-vapid" ? L("الإشعارات تعمل أثناء فتح التطبيق فقط حتى تضيف مفاتيح Push (انظر SETUP-BACKEND.md)", "Notifications work while the app is open until Push keys are added (see SETUP-BACKEND.md)")
                : L("تعذّر التفعيل", "Could not enable"),
              );
            }}
          >
            🔔 {L("تفعيل إشعارات الطلبات", "Enable order notifications")}
          </button>
        )}
        {perm === "granted" && <Badge tone="green">🔔 {L("الإشعارات مفعّلة", "Notifications on")}</Badge>}
      </div>
      {!installed && !bip && (
        <p className="mt-2 text-xs text-muted">
          {ios
            ? L("على الآيفون: افتح الموقع في Safari ثم زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».", "iPhone: open in Safari, tap Share, then “Add to Home Screen”.")
            : L("على أندرويد: من قائمة Chrome (⋮) اختر «تثبيت التطبيق / إضافة إلى الشاشة الرئيسية».", "Android: Chrome menu (⋮) → “Install app / Add to Home screen”.")}
        </p>
      )}
      {msg && <p role="status" className="mt-2 text-sm font-bold text-berry-deep">{msg}</p>}
      {!backendEnabled && (
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-800">
          {L("وضع محلي: الطلبات لا تصل لجوالك تلقائيًا حتى تفعّل قاعدة البيانات (SETUP-BACKEND.md).", "Local mode: orders do not reach your phone automatically until the backend is enabled (SETUP-BACKEND.md).")}
        </p>
      )}
    </div>
  );
}

/** One order, laid out like the customer's summary + invoice actions. */
function OrderDetail({ o }: { o: Order }) {
  const L = useL();
  const { money } = useT();
  const catalog = useDb((s) => s.data);
  const sheet = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let dead = false;
    const t = setTimeout(() => {
      if (sheet.current) makeInvoicePdf(sheet.current).then((b) => !dead && setPdf(b)).catch(() => {});
    }, 500);
    return () => { dead = true; clearTimeout(t); };
  }, [o.id]);

  const file = `bibaz-${o.id}.pdf`;
  const to = intlPhone(o.customer.phone);
  const text = `مرحبًا ${o.customer.name}، هذه فاتورة طلبك ${o.id} من ${catalog.settings.storeName.ar}. الإجمالي ${o.totals.total} ر.س. شكرًا لاختيارك لنا.`;

  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-cream p-4 text-sm">
      <ul className="space-y-3">
        {o.lines.map((l, i) => {
          const p = catalog.products.find((x) => x.id === l.pid) ?? catalog.products.find((x) => x.name.ar === l.name);
          return (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              {p ? <ProductArt product={p} alt="" className="h-16 w-16 shrink-0 rounded-xl" /> : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-sand text-2xl">🍰</span>}
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">{l.name}</p>
                <p className="text-xs text-muted">{l.cm} {L("سم", "cm")} × {l.qty}</p>
                {l.addons.length > 0 && <p className="text-xs text-muted">+ {l.addons.join("، ")}</p>}
                {l.text && <p className="text-xs font-bold text-berry">«{l.text}»</p>}
              </div>
              <span className="font-extrabold">{money(l.unit * l.qty)}</span>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-1.5 rounded-2xl bg-white p-3">
        <div className="flex justify-between"><dt className="text-muted">{L("المجموع الفرعي", "Subtotal")}</dt><dd className="font-bold">{money(o.totals.subtotal)}</dd></div>
        {o.totals.addons > 0 && <div className="flex justify-between"><dt className="text-muted">{L("الإضافات", "Extras")}</dt><dd className="font-bold">{money(o.totals.addons)}</dd></div>}
        {o.totals.discount > 0 && <div className="flex justify-between text-green-700"><dt>{L("الخصم", "Discount")}{o.coupon ? ` (${o.coupon})` : ""}</dt><dd className="font-bold">−{money(o.totals.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">{L("التوصيل", "Delivery")}</dt><dd className="font-bold">{o.totals.shipping === 0 ? L("مجاني", "Free") : money(o.totals.shipping)}</dd></div>
        <div className="flex items-end justify-between border-t border-line pt-2"><dt className="font-extrabold">{L("الإجمالي", "Total")}</dt><dd className="text-xl font-extrabold text-berry-deep">{money(o.totals.total)}</dd></div>
      </dl>

      <div className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-extrabold text-berry-deep">{L("العميل", "Customer")}</p>
          <p>{o.customer.name}</p>
          <p dir="ltr" className="text-start">{o.customer.phone}</p>
          <p className="mt-1">{o.customer.city}</p>
          <p className="text-muted">{o.customer.address}</p>
          {o.customer.map && <a className="font-bold text-berry underline" href={o.customer.map} target="_blank" rel="noopener noreferrer">🗺 {L("الموقع على الخريطة", "Map location")}</a>}
        </div>
        <div>
          <p className="mb-1 font-extrabold text-berry-deep">{L("التسليم والدفع", "Delivery & payment")}</p>
          <p>{o.customer.date} · <span dir="ltr">{o.customer.time}</span></p>
          <p className="mt-1">{o.payment.methodName}</p>
          {o.customer.notes && <p className="mt-1 text-muted">{o.customer.notes}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary !min-h-11 text-sm" disabled={!pdf} onClick={() => pdf && downloadBlob(pdf, file)}>
          📄 {pdf ? L("تحميل فاتورة PDF", "Download PDF invoice") : L("جارٍ تجهيز الفاتورة…", "Preparing…")}
        </button>
        <button
          type="button"
          className="btn btn-ghost !min-h-11 text-sm"
          disabled={!pdf}
          onClick={async () => {
            if (!pdf) return;
            if (await sharePdf(pdf, file, text)) return setNote(L("اختر واتساب ثم محادثة العميل.", "Pick WhatsApp then the customer's chat."));
            downloadBlob(pdf, file);
            setNote(L("تم تحميل الفاتورة، أرفقها في المحادثة.", "Downloaded; attach it in the chat."));
            window.open(waLink(to, text), "_blank", "noopener");
          }}
        >
          💬 {L("إرسال الفاتورة للعميل على واتساب", "Send invoice to customer on WhatsApp")}
        </button>
        <a className="btn btn-ghost !min-h-11 text-sm" href={waLink(to, `طلبك ${o.id}: ${STATUSES.find((s) => s.k === o.status)!.ar}`)} target="_blank" rel="noopener noreferrer">
          ✉ {L("رسالة حالة الطلب", "Status message")}
        </a>
      </div>
      {note && <p role="status" className="text-sm font-bold text-green-700">{note}</p>}

      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <InvoiceSheet ref={sheet} order={o} storeName={catalog.settings.storeName.ar} phone={catalog.settings.whatsapp ? `+${catalog.settings.whatsapp}` : undefined} />
      </div>
    </div>
  );
}

export function Orders() {
  const L = useL();
  const { money } = useT();
  const orders = useOrders((s) => s.orders);
  const addOrder = useOrders((s) => s.addOrder);
  const setAll = useOrders((s) => s.setAll);
  const setStatus = useOrders((s) => s.setStatus);
  const removeOrder = useOrders((s) => s.removeOrder);
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);

  // Backend: load all orders, then listen live and notify on every new order
  useEffect(() => {
    if (!backendEnabled) return;
    let off: (() => void) | undefined;
    let dead = false;
    remoteList().then((list) => { if (!dead) { setAll(list); setLoading(false); } });
    subscribeOrders(
      (o) => {
        addOrder(o);
        void notifyLocal(`طلب جديد ${o.id}`, `${o.customer.name} · ${o.totals.total} ر.س`, `${BASE_PATH}/admin/#orders`);
      },
      (o) => addOrder(o),
    ).then((u) => (dead ? u() : (off = u)));
    return () => { dead = true; off?.(); };
  }, [addOrder, setAll]);

  return (
    <>
      <AppBar />

      {!backendEnabled && (
        <Panel title={L("استيراد طلب من رسالة واتساب (الوضع المحلي)", "Import an order from WhatsApp (local mode)")}>
          <p className="mb-3 text-sm text-muted">{L("الصق نص رسالة الطلب (أو رمز الطلب) هنا لتسجيل الطلب ومتابعته.", "Paste the order message (or order code) here to register and track it.")}</p>
          <div className="flex flex-wrap gap-2">
            <textarea className="input !min-h-[100px] flex-1" dir="auto" value={code} onChange={(e) => { setCode(e.target.value.slice(0, 12000)); setErr(false); }} placeholder={L("الصق هنا", "Paste here")} />
            <button
              type="button"
              className="btn btn-primary !min-h-11"
              onClick={() => {
                const m = code.match(/[A-Za-z0-9+/=]{80,}/);
                const o = parseOrderMessage(code) ?? (m ? codeToOrder(m[0]) : null);
                if (!o) return setErr(true);
                addOrder(o);
                setCode("");
              }}
            >
              {L("استيراد", "Import")}
            </button>
          </div>
          {err && <p className="mt-2 text-sm font-bold text-red-600">{L("تعذّر قراءة الرسالة", "Could not read it")}</p>}
        </Panel>
      )}

      <Panel title={`${L("الطلبات", "Orders")} (${orders.length})`}>
        {loading ? (
          <p className="py-8 text-center text-muted">…</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-muted">{L("لا توجد طلبات بعد", "No orders yet")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold" dir="ltr">{o.id}</div>
                    <div className="text-sm text-muted">{o.customer.name} · {o.customer.city} · {o.customer.date}</div>
                  </div>
                  {o.status === "new" && <Badge tone="amber">{L("جديد", "New")}</Badge>}
                  <Badge tone={o.payment.type === "cod" ? "amber" : "pink"}>{o.payment.methodName}</Badge>
                  <span className="font-extrabold text-berry-deep">{money(o.totals.total)}</span>
                  <select
                    className="input !min-h-10 !w-auto"
                    value={o.status}
                    onChange={(e) => {
                      const st = e.target.value as OrderStatus;
                      setStatus(o.id, st);
                      if (backendEnabled) void remoteSetStatus(o.id, st);
                    }}
                    aria-label={L("الحالة", "Status")}
                  >
                    {STATUSES.map((s) => <option key={s.k} value={s.k}>{L(s.ar, s.en)}</option>)}
                  </select>
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? L("إغلاق", "Close") : L("فتح الطلب", "Open")}</button>
                </div>
                {open === o.id && (
                  <>
                    <OrderDetail o={o} />
                    <button
                      type="button"
                      className="btn btn-ghost !min-h-10 mt-2 text-sm text-red-600"
                      onClick={() => {
                        if (!confirm(L("حذف الطلب نهائيًا؟", "Delete this order permanently?"))) return;
                        removeOrder(o.id);
                        if (backendEnabled) void remoteDelete(o.id);
                      }}
                    >
                      {L("حذف الطلب", "Delete order")}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
