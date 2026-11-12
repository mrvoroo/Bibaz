import type { Order } from "./types";

/** Compact, copy-pasteable order code sent inside the WhatsApp message.
 *  The admin pastes it in Admin > Orders to register/track the order. */
export function orderToCode(o: Order): string {
  const compact = {
    i: o.id,
    c: o.createdAt,
    p: o.payment,
    u: o.customer,
    l: o.lines,
    t: o.totals,
    k: o.coupon,
  };
  const json = JSON.stringify(compact);
  return btoa(unescape(encodeURIComponent(json)));
}

export function codeToOrder(code: string): Order | null {
  try {
    if (code.length > 12_000) return null;
    const json = decodeURIComponent(escape(atob(code.trim())));
    const c = JSON.parse(json, (k, v) => (k === "__proto__" || k === "constructor" ? undefined : v));
    if (!c?.i || !c?.u || !c?.l || !c?.t) return null;
    if (!/^BZ-[A-Z0-9]{4,8}$/.test(String(c.i))) return null;
    const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 && v < 1_000_000 ? v : 0);
    const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
      id: str(c.i, 20),
      createdAt: str(c.c, 40) || new Date().toISOString(),
      status: "new",
      payment: {
        type: c.p?.type === "cod" ? "cod" : "transfer",
        methodId: str(c.p?.methodId, 40) || undefined,
        methodName: str(c.p?.methodName, 80) || undefined,
      },
      customer: {
        name: str(c.u.name, 80),
        phone: str(c.u.phone, 16),
        city: str(c.u.city, 60),
        address: str(c.u.address),
        date: str(c.u.date, 12),
        time: str(c.u.time, 20),
        notes: str(c.u.notes),
      },
      lines: Array.isArray(c.l)
        ? c.l.slice(0, 50).map((l: Record<string, unknown>) => ({
            name: str(l.name, 100),
            cm: num(l.cm),
            qty: num(l.qty),
            unit: num(l.unit),
            addons: Array.isArray(l.addons) ? (l.addons as unknown[]).slice(0, 10).map((a) => str(a, 60)) : [],
            text: str(l.text, 40) || undefined,
          }))
        : [],
      totals: {
        subtotal: num(c.t.subtotal),
        addons: num(c.t.addons),
        discount: num(c.t.discount),
        shipping: num(c.t.shipping),
        total: num(c.t.total),
      },
      coupon: str(c.k, 24) || undefined,
    };
  } catch {
    return null;
  }
}
