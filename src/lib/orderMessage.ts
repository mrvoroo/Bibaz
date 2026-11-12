import type { Order } from "./types";
import { orderToCode } from "./orderCode";

const sar = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} ر.س`;

/** Full order "receipt" sent to the store on WhatsApp (Arabic: the store staff language). */
export function buildOrderMessage(o: Order, storeName = "بيباز"): string {
  const L: string[] = [];
  L.push(`🧁 *طلب جديد - ${storeName}*`);
  L.push(`رقم الطلب: ${o.id}`);
  L.push("━━━━━━━━━━━━");
  L.push("*الطلبات:*");
  o.lines.forEach((l, i) => {
    L.push(`${i + 1}) ${l.name} - ${l.cm} سم × ${l.qty} = ${sar(l.unit * l.qty)}`);
    if (l.addons.length) L.push(`   ➕ إضافات: ${l.addons.join("، ")}`);
    if (l.text) L.push(`   ✍️ الكتابة على الكيكة: «${l.text}»`);
  });
  L.push("━━━━━━━━━━━━");
  L.push(`المجموع: ${sar(o.totals.subtotal)}`);
  if (o.totals.addons > 0) L.push(`الإضافات: ${sar(o.totals.addons)}`);
  if (o.totals.discount > 0) L.push(`الخصم: -${sar(o.totals.discount)}${o.coupon ? ` (كوبون ${o.coupon})` : ""}`);
  L.push(`التوصيل: ${o.totals.shipping === 0 ? "مجاني" : sar(o.totals.shipping)}`);
  L.push(`*الإجمالي: ${sar(o.totals.total)}*`);
  L.push("━━━━━━━━━━━━");
  L.push(`👤 الاسم: ${o.customer.name}`);
  L.push(`📞 الجوال: ${o.customer.phone}`);
  L.push(`📍 المنطقة: ${o.customer.city}`);
  L.push(`🏠 العنوان: ${o.customer.address}`);
  if (o.customer.map) L.push(`🗺 الموقع على الخريطة: ${o.customer.map}`);
  L.push(`📅 موعد التسليم: ${o.customer.date} (${o.customer.time})`);
  if (o.customer.notes) L.push(`📝 ملاحظات: ${o.customer.notes}`);
  L.push("━━━━━━━━━━━━");
  L.push(`💳 طريقة الدفع: ${o.payment.methodName ?? (o.payment.type === "cod" ? "الدفع عند الاستلام" : "تحويل")}`);
  L.push(o.payment.type === "transfer" ? "سأرفق صورة إيصال التحويل في المحادثة بعد هذه الرسالة 🙏" : "الدفع عند الاستلام.");
  L.push("");
  L.push(`رمز الطلب (للمتجر): ${orderToCode(o)}`);
  return L.join("\n");
}

export function whatsappUrl(number: string, text: string): string | null {
  if (!/^\d{9,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
