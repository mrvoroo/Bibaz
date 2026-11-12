"use client";

import { forwardRef } from "react";
import type { Order } from "@/lib/types";

const sar = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} ر.س`;
const slot = (t: string) => t.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, "من $1 إلى $2");

const C = { berry: "#c8325e", deep: "#7a1e3f", ink: "#2b1a14", muted: "#7d6558", line: "#ecd9bd", cream: "#fff8ee", blush: "#fbdfe3" };

/**
 * A4 invoice, rendered with inline hex styles only (html2canvas cannot parse modern CSS colour functions).
 * Rendered off-screen and turned into a PDF by makeInvoicePdf().
 */
export const InvoiceSheet = forwardRef<HTMLDivElement, { order: Order; storeName: string; phone?: string }>(function InvoiceSheet(
  { order, storeName, phone },
  ref,
) {
  const o = order;
  const cell = { padding: "10px 8px", borderBottom: `1px solid ${C.line}`, textAlign: "right" as const, fontSize: 14 };
  const row = (k: string, v: string) =>
    v ? (
      <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 14 }}>
        <span style={{ color: C.muted, minWidth: 110 }}>{k}</span>
        <span style={{ fontWeight: 700, flex: 1, wordBreak: "break-word" }}>{v}</span>
      </div>
    ) : null;
  return (
    <div
      ref={ref}
      dir="rtl"
      lang="ar"
      style={{ width: 794, minHeight: 1123, background: "#ffffff", color: C.ink, fontFamily: "var(--font-body), Tajawal, sans-serif", padding: 44, boxSizing: "border-box" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `4px solid ${C.berry}`, paddingBottom: 18, marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "var(--font-logo), serif", fontSize: 48, color: C.deep, lineHeight: 1 }}>{storeName}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>تشيز كيك يُصنع بحب{phone ? ` · ${phone}` : ""}</div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.berry }}>فاتورة طلب</div>
          <div style={{ fontSize: 14, marginTop: 4 }} dir="ltr">{o.id}</div>
          <div style={{ fontSize: 13, color: C.muted }} dir="ltr">{new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
        <div style={{ flex: 1, background: C.cream, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, color: C.deep, marginBottom: 10 }}>بيانات العميل</div>
          {row("الاسم", o.customer.name)}
          {row("الجوال", o.customer.phone)}
          {row("المنطقة", o.customer.city)}
          {row("العنوان", o.customer.address)}
        </div>
        <div style={{ flex: 1, background: C.cream, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, color: C.deep, marginBottom: 10 }}>التسليم والدفع</div>
          {row("تاريخ التسليم", o.customer.date)}
          {row("الوقت", slot(o.customer.time))}
          {row("طريقة الدفع", o.payment.methodName ?? (o.payment.type === "cod" ? "الدفع عند الاستلام" : "تحويل"))}
          {row("ملاحظات", o.customer.notes)}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead>
          <tr style={{ background: C.berry, color: "#ffffff" }}>
            {["#", "المنتج", "المقاس", "الكمية", "سعر الوحدة", "الإجمالي"].map((h) => (
              <th key={h} style={{ padding: "10px 8px", textAlign: "right", fontSize: 13 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {o.lines.map((l, i) => (
            <tr key={i}>
              <td style={cell}>{i + 1}</td>
              <td style={cell}>
                <div style={{ fontWeight: 800 }}>{l.name}</div>
                {l.addons.length > 0 && <div style={{ fontSize: 12, color: C.muted }}>الإضافات: {l.addons.join("، ")}</div>}
                {l.text && <div style={{ fontSize: 12, color: C.berry }}>الكتابة على الكيكة: «{l.text}»</div>}
              </td>
              <td style={cell}>{l.cm} سم</td>
              <td style={cell}>{l.qty}</td>
              <td style={cell}>{sar(l.unit)}</td>
              <td style={{ ...cell, fontWeight: 800 }}>{sar(l.unit * l.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginInlineStart: "auto", width: 320, fontSize: 15 }}>
        {(
          [
            ["المجموع", sar(o.totals.subtotal)],
            ...(o.totals.addons > 0 ? [["الإضافات", sar(o.totals.addons)]] : []),
            ...(o.totals.discount > 0 ? [[`الخصم${o.coupon ? ` (${o.coupon})` : ""}`, `-${sar(o.totals.discount)}`]] : []),
            ["التوصيل", o.totals.shipping === 0 ? "مجاني" : sar(o.totals.shipping)],
          ] as string[][]
        ).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ color: C.muted }}>{k}</span>
            <span style={{ fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", marginTop: 10, background: C.berry, color: "#ffffff", borderRadius: 12, fontSize: 18, fontWeight: 800 }}>
          <span>الإجمالي</span>
          <span>{sar(o.totals.total)}</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>الأسعار شاملة ضريبة القيمة المضافة.</div>
      </div>

      <div style={{ marginTop: 44, paddingTop: 14, borderTop: `1px dashed ${C.line}`, textAlign: "center", color: C.muted, fontSize: 13 }}>
        شكرًا لاختياركم {storeName} 💕
      </div>
    </div>
  );
});

/** Renders the sheet element to a (possibly multi-page) A4 PDF blob. */
export async function makeInvoicePdf(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  try {
    await document.fonts?.ready;
  } catch {}
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const w = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const h = (canvas.height * w) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.92);
  for (let y = 0, first = true; y < h - 1; y += pageH, first = false) {
    if (!first) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, -y, w, h);
  }
  return pdf.output("blob");
}
