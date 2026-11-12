import type { Addon, CartLine, Offer, Product, Settings, SizeCm } from "./types";

export interface PricedLine {
  line: CartLine;
  product: Product;
  unit: number;
  addonsTotal: number;
  lineSubtotal: number; // unit * qty
  discount: number;
}

export interface AppliedOffer {
  offerId: string;
  amount: number;
  gift?: string; // addon id given free
  shippingFree?: boolean;
}

export interface CartResult {
  lines: PricedLine[];
  subtotal: number;
  addonsTotal: number;
  discount: number;
  applied: AppliedOffer[];
  shipping: number;
  total: number;
  itemCount: number;
  freeShippingGap: number | null; // how much more for free shipping, null = n/a
  couponState: "none" | "valid" | "invalid";
  freeGifts: string[];
}

interface Unit {
  lineIdx: number;
  productId: string;
  cm: SizeCm;
  price: number;
  rem: number;
  touched: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function isOfferLive(o: Offer, now = new Date()): boolean {
  if (!o.active) return false;
  if (o.startsAt && new Date(o.startsAt) > now) return false;
  if (o.endsAt && new Date(o.endsAt) < now) return false;
  return true;
}

function inScope(o: Offer, u: { productId: string; cm: SizeCm }) {
  if (o.productIds.length && !o.productIds.includes(u.productId)) return false;
  if (o.sizes.length && !o.sizes.includes(u.cm)) return false;
  return true;
}

export function computeCart(
  cart: CartLine[],
  products: Product[],
  addons: Addon[],
  offers: Offer[],
  settings: Settings,
  coupon: string,
  opts: { cod?: boolean; now?: Date } = {},
): CartResult {
  const now = opts.now ?? new Date();
  const lines: PricedLine[] = [];
  const units: Unit[] = [];

  cart.forEach((line) => {
    const product = products.find((p) => p.id === line.productId);
    const size = product?.sizes.find((s) => s.cm === line.cm);
    if (!product || !size) return;
    const idx = lines.length;
    const addonsTotal = line.addonIds.reduce((s, id) => s + (addons.find((a) => a.id === id)?.price ?? 0), 0) * line.qty;
    lines.push({ line, product, unit: size.price, addonsTotal, lineSubtotal: size.price * line.qty, discount: 0 });
    for (let i = 0; i < line.qty; i++) {
      units.push({ lineIdx: idx, productId: product.id, cm: line.cm, price: size.price, rem: size.price, touched: false });
    }
  });

  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  const addonsTotal = lines.reduce((s, l) => s + l.addonsTotal, 0);
  const code = coupon.trim().toUpperCase();

  const live = offers
    .filter((o) => isOfferLive(o, now))
    .filter((o) => !o.code || o.code.toUpperCase() === code)
    .sort((a, b) => b.priority - a.priority);

  const couponState: CartResult["couponState"] = !code
    ? "none"
    : offers.some((o) => o.code && o.code.toUpperCase() === code && isOfferLive(o, now))
      ? "valid"
      : "invalid";

  const applied: AppliedOffer[] = [];
  let shippingFree = false;
  const freeGifts: string[] = [];

  const take = (u: Unit, amount: number) => {
    const a = Math.min(u.rem, amount);
    u.rem -= a;
    u.touched = true;
    lines[u.lineIdx].discount += a;
    return a;
  };

  for (const o of live) {
    const eligible = units.filter((u) => inScope(o, u) && (o.stackable || !u.touched));
    const eligibleSum = eligible.reduce((s, u) => s + u.rem, 0);
    if (o.minSubtotal && subtotal < o.minSubtotal) continue;
    let amount = 0;

    switch (o.type) {
      case "percent":
        eligible.forEach((u) => (amount += take(u, (u.rem * (o.percent ?? 0)) / 100)));
        break;
      case "fixed": {
        if (!eligible.length) break;
        let left = Math.min(o.amount ?? 0, eligibleSum);
        for (const u of eligible) {
          if (left <= 0) break;
          const t = take(u, Math.min(left, u.rem));
          left -= t;
          amount += t;
        }
        break;
      }
      case "buyXgetY":
      case "nthPercent": {
        const buy = o.type === "nthPercent" ? (o.nth ?? 2) - 1 : (o.buy ?? 1);
        const get = o.type === "nthPercent" ? 1 : (o.get ?? 1);
        const pct = o.percent ?? 100;
        const group = buy + get;
        if (group <= 0) break;
        const sorted = [...eligible].sort((a, b) => b.price - a.price);
        const sets = Math.floor(sorted.length / group);
        if (!sets) break;
        // cheapest sets*get units receive the discount
        const targets = sorted.slice(sorted.length - sets * get);
        targets.forEach((u) => (amount += take(u, (u.price * pct) / 100)));
        break;
      }
      case "tiered": {
        const qty = eligible.length;
        const tier = [...(o.tiers ?? [])].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty);
        if (!tier) break;
        eligible.forEach((u) => (amount += take(u, (u.rem * tier.percent) / 100)));
        break;
      }
      case "bundle": {
        const ids = o.bundleProductIds ?? [];
        if (!ids.length || !o.bundlePrice) break;
        const pools = ids.map((id) => eligible.filter((u) => u.productId === id).sort((a, b) => a.price - b.price));
        const sets = Math.min(...pools.map((p) => p.length));
        for (let s = 0; s < sets; s++) {
          const group = pools.map((p) => p[s]);
          const full = group.reduce((t, u) => t + u.rem, 0);
          const off = Math.max(0, full - o.bundlePrice);
          let left = off;
          group.forEach((u, i) => {
            const share = i === group.length - 1 ? left : Math.min(left, round((off * u.rem) / full));
            const t = take(u, share);
            left -= t;
            amount += t;
          });
        }
        break;
      }
      case "freeShipping":
        shippingFree = true;
        applied.push({ offerId: o.id, amount: 0, shippingFree: true });
        continue;
      case "freeGift":
        if (o.giftAddonId) {
          freeGifts.push(o.giftAddonId);
          applied.push({ offerId: o.id, amount: 0, gift: o.giftAddonId });
        }
        continue;
    }
    if (amount > 0) applied.push({ offerId: o.id, amount: round(amount) });
  }

  const discount = round(lines.reduce((s, l) => s + l.discount, 0));
  let shipping = settings.shippingFee;
  const threshold = settings.freeShippingOver;
  if (shippingFree || (threshold > 0 && subtotal - discount >= threshold)) shipping = 0;
  if (!lines.length) shipping = 0;
  if (opts.cod) shipping += settings.cod.fee;

  // free-shipping progress (from the setting or from a live freeShipping offer)
  const gaps: number[] = [];
  if (threshold > 0) gaps.push(threshold - (subtotal - discount));
  offers
    .filter((o) => o.type === "freeShipping" && isOfferLive(o, now) && !o.code)
    .forEach((o) => gaps.push((o.minSubtotal ?? 0) - subtotal));
  const minGap = gaps.length ? Math.min(...gaps) : null;
  const freeShippingGap = shipping === 0 && !opts.cod ? 0 : minGap !== null && minGap > 0 ? round(minGap) : null;

  // Free gifts have no cost: addons are ignored for gifts (they are shown as 0)
  const total = round(Math.max(0, subtotal - discount + addonsTotal + shipping));

  return {
    lines: lines.map((l) => ({ ...l, discount: round(l.discount) })),
    subtotal,
    addonsTotal,
    discount,
    applied,
    shipping,
    total,
    itemCount: cart.reduce((s, l) => s + l.qty, 0),
    freeShippingGap,
    couponState,
    freeGifts,
  };
}

/** Offers that should be advertised on a product (badge / banner). */
export function offersForProduct(offers: Offer[], productId: string, now = new Date()): Offer[] {
  return offers.filter(
    (o) =>
      isOfferLive(o, now) &&
      !o.code &&
      o.showBadge &&
      (o.productIds.length === 0 || o.productIds.includes(productId)),
  );
}

export function minPrice(p: Product): number {
  const enabled = p.sizes.filter((s) => s.enabled);
  return enabled.length ? Math.min(...enabled.map((s) => s.price)) : 0;
}
