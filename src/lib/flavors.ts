import type { FlavorKey, L10n } from "./types";

export interface FlavorTheme {
  label: L10n;
  body: string; // cheesecake body
  top: string; // sauce / top layer
  topDark: string;
  crust: string;
  topping: "strawberry" | "blueberry" | "lotus" | "pistachio" | "chocolate" | "caramel" | "mango" | "none";
  topColor: string;
  glow: string; // soft background tint
}

export const FLAVORS: Record<FlavorKey, FlavorTheme> = {
  classic: {
    label: { ar: "كلاسيك نيويورك", en: "New York Classic" },
    body: "#FFF1D6",
    top: "#F6D7A0",
    topDark: "#E4B873",
    crust: "#9C6A3C",
    topping: "none",
    topColor: "#F6D7A0",
    glow: "#FFF0D2",
  },
  strawberry: {
    label: { ar: "فراولة", en: "Strawberry" },
    body: "#FFE7EA",
    top: "#E8365B",
    topDark: "#B91E43",
    crust: "#9C6A3C",
    topping: "strawberry",
    topColor: "#D62B4E",
    glow: "#FFDDE3",
  },
  blueberry: {
    label: { ar: "توت أزرق", en: "Blueberry" },
    body: "#F2ECFA",
    top: "#5B4B9A",
    topDark: "#3F3278",
    crust: "#8F6238",
    topping: "blueberry",
    topColor: "#3C3A8C",
    glow: "#E7E0F6",
  },
  lotus: {
    label: { ar: "لوتس", en: "Lotus Biscoff" },
    body: "#F8E4C8",
    top: "#B9712E",
    topDark: "#8F501C",
    crust: "#7B4A23",
    topping: "lotus",
    topColor: "#C98A4B",
    glow: "#F9E5CC",
  },
  pistachio: {
    label: { ar: "فستق", en: "Pistachio" },
    body: "#EEF3DA",
    top: "#8FB05A",
    topDark: "#6B8F3A",
    crust: "#8F6238",
    topping: "pistachio",
    topColor: "#7FA04B",
    glow: "#E8F0D2",
  },
  chocolate: {
    label: { ar: "شوكولاتة", en: "Dark Chocolate" },
    body: "#E9D3C0",
    top: "#4A2A1C",
    topDark: "#2E170E",
    crust: "#3A2216",
    topping: "chocolate",
    topColor: "#5A3322",
    glow: "#EEDCCD",
  },
  caramel: {
    label: { ar: "كراميل مملح", en: "Salted Caramel" },
    body: "#FFEBC9",
    top: "#D98A2B",
    topDark: "#B26A14",
    crust: "#9C6A3C",
    topping: "caramel",
    topColor: "#E09A3E",
    glow: "#FFE8C4",
  },
  mango: {
    label: { ar: "مانجو", en: "Mango" },
    body: "#FFF0C7",
    top: "#FFB521",
    topDark: "#E58F00",
    crust: "#9C6A3C",
    topping: "mango",
    topColor: "#FFA400",
    glow: "#FFEDB8",
  },
};

export const OCCASIONS: { key: string; label: L10n; icon: string }[] = [
  { key: "birthday", label: { ar: "عيد ميلاد", en: "Birthday" }, icon: "🎂" },
  { key: "graduation", label: { ar: "تخرج", en: "Graduation" }, icon: "🎓" },
  { key: "newborn", label: { ar: "مولود جديد", en: "New baby" }, icon: "🍼" },
  { key: "eid", label: { ar: "العيد ورمضان", en: "Eid & Ramadan" }, icon: "🌙" },
  { key: "mothers", label: { ar: "عيد الأم", en: "Mother's Day" }, icon: "💐" },
  { key: "national", label: { ar: "اليوم الوطني", en: "National Day" }, icon: "🇸🇦" },
  { key: "gift", label: { ar: "هدية", en: "Gift" }, icon: "🎁" },
];

export const FLAVOR_KEYS =Object.keys(FLAVORS) as FlavorKey[];
