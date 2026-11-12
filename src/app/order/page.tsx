"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Shell } from "@/components/Shell";
import { Drip } from "@/components/Drip";
import { useDb, useOrders, useT } from "@/lib/store";
import { orderToCode } from "@/lib/orderCode";

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useT();
  const [ok, setOk] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-3" role="group" aria-label={label}>
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="break-all font-extrabold" dir="ltr">{value}</div>
      </div>
      <button
        type="button"
        className="btn btn-ghost !min-h-10 !px-4 text-sm"
        onClick={async () => {
          try { await navigator.clipboard.writeText(value.replace(/\s/g, "")); } catch {}
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        }}
      >
        {ok ? `✓ ${t("copied")}` : t("copy")}
      </button>
      <span className="sr-only" role="status">{ok ? t("copied") : ""}</span>
    </div>
  );
}

function OrderView() {
  const id = useSearchParams().get("id");
  const { t, tx, money, lang } = useT();
  const order = useOrders((s) => s.orders.find((o) => o.id === id));
  const settings = useDb((s) => s.data.settings);

  if (!order) {
    return (
      <div className="container-x py-28 text-center">
        <p className="mb-6 text-2xl font-bold">{t("not_found")}</p>
        <Link href="/shop/" className="btn btn-primary">{t("shop")}</Link>
      </div>
    );
  }

  const method = settings.transfer.find((m) => m.id === order.payment.methodId);
  const lineText = order.lines
    .map((l) => `• ${l.name} ${l.cm}سم × ${l.qty}${l.addons.length ? ` (+${l.addons.join("، ")})` : ""}${l.text ? ` «${l.text}»` : ""}`)
    .join("\n");
  const msg = [
    `طلب جديد ${order.id}`,
    lineText,
    `الإجمالي: ${order.totals.total} ر.س`,
    `الدفع: ${order.payment.methodName}`,
    `الاسم: ${order.customer.name}`,
    `الجوال: ${order.customer.phone}`,
    `التسليم: ${order.customer.city} - ${order.customer.date} ${order.customer.time}`,
    order.payment.type === "transfer" ? "سأرفق صورة إيصال التحويل في المحادثة بعد هذه الرسالة 🙏" : "",
    `رمز الطلب: ${orderToCode(order)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const waHref = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="container-x max-w-2xl py-10 md:py-16">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-berry to-berry-deep text-4xl text-white shadow-soft">✓</div>
        <h1 className="text-4xl font-bold text-choco">{t("order_received")}</h1>
        <p className="mt-2 text-muted">
          {t("order_no")}: <b className="text-ink" dir="ltr">{order.id}</b>
        </p>
      </motion.div>

      {order.payment.type === "transfer" ? (
        <section className="card space-y-3 p-5 md:p-6">
          <h2 className="text-xl font-bold">{t("pay_now")}</h2>
          <ol className="space-y-2 text-sm font-bold">
            {(["step_1", "step_2", "step_3"] as const).map((k, i) => (
              <li key={k} className="flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-berry text-xs text-white">{i + 1}</span>
                {t(k)}
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-gradient-to-br from-berry to-berry-deep p-4 text-white">
            <div className="text-sm opacity-80">{t("amount_due")}</div>
            <div className="text-3xl font-extrabold">{money(order.totals.total)}</div>
            <div className="mt-1 text-sm opacity-90">{order.payment.methodName}</div>
          </div>
          {method ? (
            <>
              <CopyRow label={t("account_name")} value={method.accountName} />
              <CopyRow label={t("iban")} value={method.iban} />
              <CopyRow label={t("account_no")} value={method.accountNumber} />
              {tx(method.note) && <p className="text-sm text-muted">{tx(method.note)}</p>}
            </>
          ) : null}
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full !min-h-14 text-lg">
            💬 {t("send_receipt")}
          </a>
          <p className="text-center text-sm font-bold text-berry-deep">{t("receipt_hint")}</p>
        </section>
      ) : (
        <section className="card space-y-3 p-5 md:p-6">
          <p className="font-bold">{t("cod_note")}</p>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full !min-h-14">
            💬 {t("whatsapp")}
          </a>
        </section>
      )}

      <section className="card mt-5 p-5">
        <h2 className="mb-3 text-lg font-bold">{t("order_summary")}</h2>
        <ul className="space-y-1.5 text-sm">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{l.name} · {l.cm} {t("cm")} × {l.qty}</span>
              <span className="font-bold">{money(l.unit * l.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {order.customer.city} · {order.customer.date} · {order.customer.time}
        </p>
      </section>

      <div className="relative mt-10 text-center">
        <Link href="/shop/" className="btn btn-ghost">{t("continue_shopping")}</Link>
        <p className="sr-only">{lang}</p>
      </div>
      <Drip fill="#fbdfe3" height={60} className="mt-10 opacity-0" />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="container-x py-32 text-center">…</div>}>
        <OrderView />
      </Suspense>
    </Shell>
  );
}
