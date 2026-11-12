export type Lang = "ar" | "en";
export type L10n = { ar: string; en: string };
export type SizeCm = 15 | 20 | 25 | 30;
export const SIZES: SizeCm[] = [15, 20, 25, 30];

export type FlavorKey =
  | "classic"
  | "strawberry"
  | "blueberry"
  | "lotus"
  | "pistachio"
  | "chocolate"
  | "caramel"
  | "mango";

export interface SizeOption {
  cm: SizeCm;
  serves: string; // e.g. "4-6"
  price: number; // SAR
  stock: number; // 0 = sold out
  enabled: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: L10n;
  desc: L10n;
  flavor: FlavorKey;
  badge?: L10n;
  image?: string; // URL or data URL. Empty = illustrated placeholder
  sizes: SizeOption[];
  addonIds: string[];
  featured: boolean;
  active: boolean;
  sort: number;
  ingredients?: L10n;
  allergens?: L10n;
  storage?: L10n;
  occasions?: string[];
}

export interface Addon {
  id: string;
  name: L10n;
  price: number;
  needsText?: boolean;
  active: boolean;
}

export type OfferType =
  | "percent"
  | "fixed"
  | "buyXgetY"
  | "nthPercent"
  | "tiered"
  | "bundle"
  | "freeShipping"
  | "freeGift";

export interface Offer {
  id: string;
  name: L10n;
  type: OfferType;
  active: boolean;
  priority: number; // higher runs first
  stackable: boolean; // may combine with other offers on the same item
  code?: string; // coupon code (offer applies only when entered)
  startsAt?: string; // ISO date
  endsAt?: string;
  productIds: string[]; // empty = all products
  sizes: SizeCm[]; // empty = all sizes
  minSubtotal?: number;
  percent?: number;
  amount?: number;
  buy?: number;
  get?: number;
  nth?: number;
  tiers?: { qty: number; percent: number }[];
  bundleProductIds?: string[];
  bundlePrice?: number;
  giftAddonId?: string;
  showBadge: boolean;
}

export interface UpsellRule {
  id: string;
  active: boolean;
  triggerProductId: string; // "any" or a product id
  suggestKind: "product" | "addon";
  suggestId: string;
  suggestSize?: SizeCm;
  placements: ("product" | "cart" | "checkout")[];
  message: L10n;
}

export interface TransferMethod {
  id: string;
  name: L10n;
  enabled: boolean;
  accountName: string;
  iban: string;
  accountNumber: string;
  note: L10n;
}

export interface Settings {
  storeName: L10n;
  tagline: L10n;
  whatsapp: string; // international, digits only e.g. 9665XXXXXXXX
  instagram: string;
  announcement: L10n;
  announcementOn: boolean;
  defaultLang: Lang;
  shippingFee: number;
  freeShippingOver: number; // 0 = off
  minOrder: number;
  prepHours: number;
  districts: { name: string; fee: number }[]; // Riyadh districts and their delivery fee
  transfer: TransferMethod[];
  cod: { enabled: boolean; fee: number };
  sizeUpgradeNudge: boolean;
  adminPassHash: string;
  about: L10n;
  policies: L10n; // multi-line text shown on /policies
  testimonials: { name: string; text: L10n }[]; // only real reviews; hidden if empty
}

export interface StoreData {
  version: number;
  products: Product[];
  addons: Addon[];
  offers: Offer[];
  upsells: UpsellRule[];
  settings: Settings;
  orders: Order[];
}

export interface CartLine {
  key: string;
  productId: string;
  cm: SizeCm;
  qty: number;
  addonIds: string[];
  text?: string;
}

export type OrderStatus =
  | "new"
  | "paid"
  | "preparing"
  | "out"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  payment: { type: "transfer" | "cod"; methodId?: string; methodName?: string };
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    date: string;
    time: string;
    notes: string;
    map?: string; // optional Google Maps link of the customer's shared location
  };
  lines: {
    name: string;
    cm: number;
    qty: number;
    unit: number;
    addons: string[];
    text?: string;
  }[];
  totals: {
    subtotal: number;
    addons: number;
    discount: number;
    shipping: number;
    total: number;
  };
  coupon?: string;
}
