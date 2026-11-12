import { computeCart } from "../src/lib/engine";
import { SEED } from "../src/lib/seed";
const d = SEED;
const run = (lines: any[], coupon = "", offers = d.offers) =>
  computeCart(lines, d.products, d.addons, offers, d.settings, coupon);
const L = (p: string, cm: number, qty: number) => ({ key: p + cm, productId: p, cm, qty, addonIds: [] });
const assert = (c: boolean, m: string) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };

// buy 2 get 1 (15cm) -> 3 units of p1@95 => 95 free
let r = run([L("p1", 15, 3)]);
assert(r.discount === 95, `buy2get1 discount=${r.discount}`);
// 3 mixed 15cm: cheapest free
r = run([L("p1", 15, 1), L("p4", 15, 1), L("p2", 15, 1)]);
assert(r.discount === 95, `cheapest free discount=${r.discount}`);
// coupon only applies with code
r = run([L("p1", 20, 1)]);
assert(r.discount === 0, "no coupon => 0");
r = run([L("p1", 20, 1)], "welcome10");
assert(r.discount === 14.5 && r.couponState === "valid", `coupon 10% => ${r.discount}`);
r = run([L("p1", 20, 1)], "bad");
assert(r.couponState === "invalid", "invalid coupon");
// free shipping over 300
r = run([L("p1", 25, 2)]);
assert(r.shipping === 0, `free shipping over 300 (subtotal ${r.subtotal})`);
r = run([L("p1", 15, 1)]);
assert(r.shipping === 25 && r.freeShippingGap! > 0, `shipping 25, gap=${r.freeShippingGap}`);
// second 50%
const o2 = d.offers.map((o) => (o.id === "o-second50" ? { ...o, active: true } : o));
r = run([L("p1", 20, 2)], "", o2);
assert(r.discount === 72.5, `2nd 50% => ${r.discount}`);
// bundle
const bundle = [{ ...d.offers[0], id: "b", type: "bundle" as const, active: true, sizes: [], bundleProductIds: ["p1", "p3"], bundlePrice: 200, stackable: false }];
r = computeCart([L("p1", 20, 1), L("p3", 20, 1)], d.products, d.addons, bundle as any, d.settings, "");
assert(r.discount === 115, `bundle 145+170-200 => ${r.discount}`);
// tiered
const t = d.offers.map((o) => (o.id === "o-tiered" ? { ...o, active: true } : o));
r = run([L("p1", 20, 3)], "", t);
assert(Math.abs(r.discount - 43.5) < 0.01, `tiered 3 => 10% of 435 = ${r.discount}`);
// district delivery fee (Riyadh only)
r = computeCart([L("p1", 15, 1)], d.products, d.addons, d.offers, d.settings, "", { district: "الشفا" });
assert(r.shipping === 35, `district الشفا => ${r.shipping}`);
r = computeCart([L("p1", 15, 1)], d.products, d.addons, d.offers, d.settings, "", { district: "الملقا" });
assert(r.shipping === 20, `district الملقا => ${r.shipping}`);
// order message round-trip (WhatsApp text -> admin import)
import { buildOrderMessage, parseOrderMessage } from "../src/lib/orderMessage";
const order: any = {
  id: "BZ-ABC123", createdAt: "x", status: "new",
  payment: { type: "transfer", methodName: "تحويل عبر برق (Barq)" },
  customer: { name: "أحمد", phone: "0590873178", city: "الرياض - النخيل", address: "شارع كذا، مبنى/فيلا 7", date: "2026-11-13", time: "10:00 - 13:00", notes: "" },
  lines: [{ name: "نيويورك كلاسيك", cm: 15, qty: 2, unit: 95, addons: ["شموع", "بطاقة"], text: "مبروك" }],
  totals: { subtotal: 190, addons: 58, discount: 0, shipping: 20, total: 268 },
};
const msg = buildOrderMessage(order);
assert(!/[\u{1F300}-\u{1FAFF}\u2501]/u.test(msg), "message has no emoji/box chars");
const back = parseOrderMessage(msg)!;
assert(!!back && back.id === "BZ-ABC123" && back.totals.total === 268 && back.lines[0].qty === 2 && back.lines[0].unit === 95 && back.customer.time === "10:00 - 13:00" && back.lines[0].text === "مبروك", "parse(build(order)) round-trips");
