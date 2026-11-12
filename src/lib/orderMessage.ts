import type { Order } from "./types";

const sar = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} ر.س`;
const SEP = "----------------------";

/** "10:00 - 13:00" -> "من 10:00 إلى 13:00" (a plain range breaks in right-to-left chat bubbles). */
const slot = (t: string) => t.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, "من $1 إلى $2");

/**
 * Full order "receipt" sent to the store on WhatsApp (Arabic: the store staff language).
 * Plain text only: no emojis or box-drawing characters (some WhatsApp desktop clients show them as "�"),
 * and no long encoded blobs. The admin can import this very message from Admin > Orders.
 */
export function buildOrderMessage(o: Order, storeName = "بيباز"): string {
  const L: string[] = [];
  L.push(`*طلب جديد - ${storeName}*`);
  L.push(`رقم الطلب: ${o.id}`);
  L.push(SEP);
  L.push("*الطلبات:*");
  o.lines.forEach((l, i) => {
    L.push(`${i + 1}) ${l.name} - ${l.cm} سم × ${l.qty} = ${sar(l.unit * l.qty)}`);
    if (l.addons.length) L.push(`   الإضافات: ${l.addons.join("، ")}`);
    if (l.text) L.push(`   الكتابة على الكيكة: «${l.text}»`);
  });
  L.push(SEP);
  L.push(`المجموع: ${sar(o.totals.subtotal)}`);
  if (o.totals.addons > 0) L.push(`الإضافات: ${sar(o.totals.addons)}`);
  if (o.totals.discount > 0) L.push(`الخصم: -${sar(o.totals.discount)}${o.coupon ? ` (كوبون ${o.coupon})` : ""}`);
  L.push(`التوصيل: ${o.totals.shipping === 0 ? "مجاني" : sar(o.totals.shipping)}`);
  L.push(`*الإجمالي: ${sar(o.totals.total)}*`);
  L.push(SEP);
  L.push(`الاسم: ${o.customer.name}`);
  L.push(`الجوال: ${o.customer.phone}`);
  L.push(`المنطقة: ${o.customer.city}`);
  L.push(`العنوان: ${o.customer.address}`);
  if (o.customer.map) L.push(`الموقع على الخريطة: ${o.customer.map}`);
  L.push(`موعد التسليم: ${o.customer.date} (${slot(o.customer.time)})`);
  if (o.customer.notes) L.push(`ملاحظات: ${o.customer.notes}`);
  L.push(SEP);
  L.push(`طريقة الدفع: ${o.payment.methodName ?? (o.payment.type === "cod" ? "الدفع عند الاستلام" : "تحويل")}`);
  L.push(o.payment.type === "transfer" ? "سأرفق صورة إيصال التحويل في المحادثة بعد هذه الرسالة." : "الدفع عند الاستلام.");
  return L.join("\n");
}

export function whatsappUrl(number: string, text: string): string | null {
  if (!/^\d{9,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Admin side: rebuild an Order from the WhatsApp message text produced by buildOrderMessage. */
export function parseOrderMessage(text: string): Order | null {
  if (text.length > 8000) return null;
  const rows = text.replace(/\r/g, "").split("\n").map((x) => x.replace(/^\*+/, ""));
  const get = (label: string) => {
    const r = rows.find((x) => x.startsWith(`${label}:`));
    return r ? r.slice(label.length + 1).replace(/\*/g, "").trim() : "";
  };
  const num = (s: string) => {
    const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    const v = m ? Math.abs(Number(m[0])) : 0;
    return isFinite(v) && v < 1_000_000 ? v : 0;
  };
  const id = (text.match(/رقم الطلب:\s*(BZ-[A-Z0-9]{4,8})/) ?? [])[1];
  if (!id) return null;

  const lines: Order["lines"] = [];
  for (const r of rows) {
    const m = r.match(/^\d+\)\s*(.+?)\s*-\s*(\d+)\s*سم\s*×\s*(\d+)\s*=\s*([\d.]+)/);
    if (m) {
      const qty = Math.max(1, Number(m[3]));
      lines.push({ name: m[1].slice(0, 100), cm: Number(m[2]), qty, unit: Number(m[4]) / qty, addons: [] });
      continue;
    }
    const last = lines[lines.length - 1];
    if (!last) continue;
    const ad = r.match(/^\s+الإضافات:\s*(.+)$/);
    if (ad) last.addons = ad[1].split("،").map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 10);
    const wr = r.match(/^\s+الكتابة على الكيكة:\s*«(.*)»/);
    if (wr) last.text = wr[1].slice(0, 40);
  }
  if (!lines.length) return null;

  const when = get("موعد التسليم").match(/^(\S+)\s*\((?:من\s*)?(\d{1,2}:\d{2})\s*(?:إلى|-)\s*(\d{1,2}:\d{2})\)/);
  const pay = get("طريقة الدفع");
  const shipRaw = get("التوصيل");
  const mapRaw = get("الموقع على الخريطة");
  return {
    id,
    createdAt: new Date().toISOString(),
    status: "new",
    payment: { type: /عند الاستلام/.test(pay) ? "cod" : "transfer", methodName: pay.slice(0, 80) || undefined },
    customer: {
      name: get("الاسم").slice(0, 80),
      phone: get("الجوال").replace(/[^\d+]/g, "").slice(0, 16),
      city: get("المنطقة").slice(0, 60),
      address: get("العنوان").slice(0, 300),
      date: (when?.[1] ?? "").slice(0, 12),
      time: when ? `${when[2]} - ${when[3]}` : "",
      notes: get("ملاحظات").slice(0, 300),
      map: /^https:\/\/maps\.google\.com\/\?q=-?[\d.]+,-?[\d.]+$/.test(mapRaw) ? mapRaw : undefined,
    },
    lines,
    totals: {
      subtotal: num(get("المجموع")),
      addons: num(rows.find((x) => x.startsWith("الإضافات:")) ?? ""),
      discount: num(get("الخصم")),
      shipping: shipRaw.startsWith("مجاني") ? 0 : num(shipRaw),
      total: num(get("الإجمالي")),
    },
    coupon: (get("الخصم").match(/كوبون\s+([A-Za-z0-9_-]{1,24})/) ?? [])[1],
  };
}
