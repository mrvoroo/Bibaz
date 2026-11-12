"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";
import { SEED } from "./seed";
import { t as translate, tx as txFn, money as moneyFn, type TKey } from "./i18n";
import type { CartLine, Lang, Order, OrderStatus, SizeCm, StoreData } from "./types";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DRAFT_KEY = "bibaz-draft-v1";

const safeStorage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

/* ───────────── Catalog / settings (the "database") ───────────── */

interface DbState {
  data: StoreData;
  ready: boolean;
  hasDraft: boolean;
  init: () => Promise<void>;
  update: (fn: (d: StoreData) => void) => void;
  discardDraft: () => void;
  importJson: (json: string) => boolean;
  exportJson: () => string;
}

const MAX_JSON = 6_000_000; // ~6MB (drafts may contain resized images)

/** Parse untrusted JSON: size cap, drop prototype-pollution keys, validate shape. */
export function safeParseCatalog(text: string): Partial<StoreData> | null {
  if (typeof text !== "string" || text.length > MAX_JSON) return null;
  try {
    const obj = JSON.parse(text, (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    const out: Partial<StoreData> = {};
    for (const key of ["products", "addons", "offers", "upsells"] as const) {
      if (obj[key] !== undefined) {
        if (!Array.isArray(obj[key])) return null;
        (out as Record<string, unknown>)[key] = obj[key];
      }
    }
    if (obj.settings !== undefined) {
      if (typeof obj.settings !== "object" || Array.isArray(obj.settings)) return null;
      const st = obj.settings as Record<string, unknown>;
      // normalise fields the UI iterates over so a bad import can never crash pages
      if ("testimonials" in st && !Array.isArray(st.testimonials)) st.testimonials = [];
      if (Array.isArray(st.testimonials))
        st.testimonials = (st.testimonials as { name?: unknown; text?: unknown }[]).filter((r) => r && typeof r.name === "string" && r.text && typeof r.text === "object").slice(0, 12);
      if ("cities" in st && (!Array.isArray(st.cities) || !st.cities.every((c) => typeof c === "string"))) delete st.cities;
      if ("transfer" in st && !Array.isArray(st.transfer)) delete st.transfer;
      if ("cityFees" in st) {
        const fees: Record<string, number> = {};
        if (st.cityFees && typeof st.cityFees === "object")
          for (const [k, v] of Object.entries(st.cityFees as Record<string, unknown>)) if (typeof v === "number" && isFinite(v) && v >= 0) fees[k] = v;
        st.cityFees = fees;
      }
      for (const k of ["shippingFee", "freeShippingOver", "minOrder", "prepHours"]) {
        if (k in st && !(typeof st[k] === "number" && isFinite(st[k] as number) && (st[k] as number) >= 0)) delete st[k];
      }
      if (typeof st.whatsapp === "string") st.whatsapp = st.whatsapp.replace(/\D/g, "").slice(0, 15);
      out.settings = st as unknown as StoreData["settings"];
    }
    // products must be well formed or the storefront could crash
    const okProduct = (p: unknown) => {
      const x = p as { id?: unknown; slug?: unknown; name?: unknown; sizes?: unknown };
      return (
        !!x && typeof x.id === "string" && typeof x.slug === "string" && /^[a-z0-9-]{1,80}$/.test(x.slug) && !!x.name && typeof x.name === "object" &&
        Array.isArray(x.sizes) && x.sizes.every((s: { price?: unknown }) => typeof s?.price === "number" && isFinite(s.price) && s.price >= 0)
      );
    };
    if (out.products && !out.products.every(okProduct)) return null;
    return out;
  } catch {
    return null;
  }
}

function merge(base: StoreData, incoming: Partial<StoreData>): StoreData {
  return {
    ...base,
    ...incoming,
    settings: { ...base.settings, ...(incoming.settings ?? {}) },
    orders: [],
  };
}

export const useDb = create<DbState>((set, get) => ({
  data: SEED,
  ready: false,
  hasDraft: false,
  init: async () => {
    if (get().ready) return;
    const ls = safeStorage();
    try {
      const draft = ls?.getItem(DRAFT_KEY);
      const parsedDraft = draft ? safeParseCatalog(draft) : null;
      if (parsedDraft) {
        set({ data: merge(SEED, parsedDraft), ready: true, hasDraft: true });
        return;
      }
    } catch {}
    try {
      const res = await fetch(`${BASE_PATH}/store-data.json`, { cache: "no-store" });
      if (res.ok) {
        const json = safeParseCatalog(await res.text());
        if (json) {
          set({ data: merge(SEED, json), ready: true });
          return;
        }
      }
    } catch {}
    set({ ready: true });
  },
  update: (fn) => {
    const next = structuredClone(get().data);
    fn(next);
    set({ data: next, hasDraft: true });
    try {
      safeStorage()?.setItem(DRAFT_KEY, JSON.stringify({ ...next, orders: [] }));
    } catch {}
  },
  discardDraft: () => {
    try {
      safeStorage()?.removeItem(DRAFT_KEY);
    } catch {}
    set({ hasDraft: false, ready: false });
    void get().init();
  },
  importJson: (json) => {
    const parsed = safeParseCatalog(json);
    if (!parsed || !parsed.products || !parsed.settings) return false;
    get().update((d) => {
      Object.assign(d, merge(SEED, parsed));
    });
    return true;
  },
  exportJson: () => JSON.stringify({ ...get().data, orders: [] }, null, 2),
}));

/* ───────────── Language ───────────── */

interface LangState {
  lang: Lang | null;
  setLang: (l: Lang) => void;
}
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({ lang: null, setLang: (lang) => set({ lang }) }),
    { name: "bibaz-lang", storage: createJSONStorage(() => safeStorage() as Storage) },
  ),
);

export function useT() {
  const stored = useLangStore((s) => s.lang);
  const def = useDb((s) => s.data.settings.defaultLang);
  const lang: Lang = stored ?? def;
  return useMemo(
    () => ({
      lang,
      dir: (lang === "ar" ? "rtl" : "ltr") as "rtl" | "ltr",
      t: (k: TKey, vars?: Record<string, string | number>) => translate(k, lang, vars),
      tx: (l?: { ar: string; en: string }) => txFn(l, lang),
      money: (n: number) => moneyFn(n, lang),
    }),
    [lang],
  );
}

/* ───────────── Cart ───────────── */

interface CartState {
  lines: CartLine[];
  coupon: string;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  changeSize: (key: string, cm: SizeCm) => void;
  toggleAddon: (key: string, addonId: string) => void;
  setCoupon: (c: string) => void;
  clear: () => void;
}

const lineKey = (l: Omit<CartLine, "key">) =>
  `${l.productId}|${l.cm}|${[...l.addonIds].sort().join(",")}|${l.text ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      coupon: "",
      open: false,
      setOpen: (open) => set({ open }),
      add: (l) => {
        const key = lineKey(l);
        const lines = get().lines;
        const ex = lines.find((x) => x.key === key);
        set({
          lines: ex
            ? lines.map((x) => (x.key === key ? { ...x, qty: Math.min(20, x.qty + l.qty) } : x))
            : [...lines, { ...l, key }],
        });
      },
      setQty: (key, qty) =>
        set({
          lines: get()
            .lines.map((l) => (l.key === key ? { ...l, qty: Math.max(0, Math.min(20, qty)) } : l))
            .filter((l) => l.qty > 0),
        }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      changeSize: (key, cm) => {
        const lines = get().lines;
        const l = lines.find((x) => x.key === key);
        if (!l) return;
        const nl = { ...l, cm };
        const nk = lineKey(nl);
        const others = lines.filter((x) => x.key !== key);
        const dup = others.find((x) => x.key === nk);
        set({
          lines: dup
            ? others.map((x) => (x.key === nk ? { ...x, qty: Math.min(20, x.qty + l.qty) } : x))
            : lines.map((x) => (x.key === key ? { ...nl, key: nk } : x)),
        });
      },
      toggleAddon: (key, addonId) =>
        set({
          lines: get().lines.map((l) => {
            if (l.key !== key) return l;
            const addonIds = l.addonIds.includes(addonId)
              ? l.addonIds.filter((a) => a !== addonId)
              : [...l.addonIds, addonId];
            const nl = { ...l, addonIds };
            return { ...nl, key: lineKey(nl) };
          }),
        }),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ lines: [], coupon: "" }),
    }),
    {
      name: "bibaz-cart-v1",
      storage: createJSONStorage(() => safeStorage() as Storage),
      partialize: (s) => ({ lines: s.lines, coupon: s.coupon }),
    },
  ),
);

/* ───────────── Orders (stay on the device; see README for the sync story) ───────────── */

interface OrdersState {
  orders: Order[];
  addOrder: (o: Order) => void;
  setStatus: (id: string, s: OrderStatus) => void;
  removeOrder: (id: string) => void;
}
export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (o) => set({ orders: [o, ...get().orders.filter((x) => x.id !== o.id)] }),
      setStatus: (id, status) => set({ orders: get().orders.map((o) => (o.id === id ? { ...o, status } : o)) }),
      removeOrder: (id) => set({ orders: get().orders.filter((o) => o.id !== id) }),
    }),
    { name: "bibaz-orders-v1", storage: createJSONStorage(() => safeStorage() as Storage) },
  ),
);

/* ───────────── helpers ───────────── */

export const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
