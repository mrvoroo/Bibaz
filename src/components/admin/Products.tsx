"use client";

import { useState } from "react";
import { uid, useDb, useT } from "@/lib/store";
import { FLAVORS, FLAVOR_KEYS } from "@/lib/flavors";
import { SIZES, type Addon, type FlavorKey, type Product } from "@/lib/types";
import { Badge, Field, L10nInput, NInput, Panel, TInput, Toggle, toggleIn, useL } from "./ui";
import { ProductArt } from "@/components/ProductArt";

const SERVES = { 15: "4-6", 20: "8-10", 25: "12-14", 30: "16-20" } as const;

function newProduct(sort: number): Product {
  return {
    id: uid("p"),
    slug: `new-cake-${Date.now().toString(36)}`,
    name: { ar: "كيكة جديدة", en: "New cake" },
    desc: { ar: "", en: "" },
    flavor: "classic",
    sizes: SIZES.map((cm) => ({ cm, serves: SERVES[cm], price: 0, stock: 10, enabled: true })),
    addonIds: [],
    featured: false,
    active: false,
    sort,
  };
}

/** Resize an uploaded image to keep the draft small (stored as a data URL). */
async function fileToDataUrl(file: File, max = 900): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

function ProductEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const L = useL();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const p = data.products.find((x) => x.id === id);
  if (!p) return null;
  const patch = (fn: (p: Product) => void) =>
    update((d) => {
      const t = d.products.find((x) => x.id === id);
      if (t) fn(t);
    });

  return (
    <div className="mt-4 space-y-4 rounded-2xl bg-cream p-4">
      <L10nInput label={L("اسم المنتج", "Product name")} value={p.name} onChange={(v) => patch((t) => (t.name = v))} />
      <L10nInput label={L("الوصف", "Description")} value={p.desc} multiline onChange={(v) => patch((t) => (t.desc = v))} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={L("الرابط (slug) - إنجليزي بدون مسافات", "Slug")}>
          <TInput dir="ltr" value={p.slug} onChange={(v) => patch((t) => (t.slug = v.toLowerCase().replace(/[^a-z0-9-]/g, "-")))} />
        </Field>
        <Field label={L("النكهة / الثيم (للألوان و3D)", "Flavour / theme")}>
          <select className="input !min-h-11" value={p.flavor} onChange={(e) => patch((t) => (t.flavor = e.target.value as FlavorKey))}>
            {FLAVOR_KEYS.map((k) => (
              <option key={k} value={k}>{FLAVORS[k].label.ar} / {FLAVORS[k].label.en}</option>
            ))}
          </select>
        </Field>
        <Field label={L("الترتيب", "Sort order")}>
          <NInput value={p.sort} onChange={(v) => patch((t) => (t.sort = v))} />
        </Field>
      </div>
      <L10nInput label={L("شارة (اختياري، مثل: جديد)", "Badge (optional)")} value={p.badge ?? { ar: "", en: "" }} onChange={(v) => patch((t) => (t.badge = v.ar || v.en ? v : undefined))} />

      <div>
        <span className="mb-2 block text-sm font-bold">{L("المقاسات والأسعار (ر.س)", "Sizes & prices (SAR)")}</span>
        <div className="space-y-2">
          {p.sizes.map((s, i) => (
            <div key={s.cm} className="grid grid-cols-[auto_1fr_1fr_1fr] items-end gap-2 rounded-xl bg-white p-2 sm:grid-cols-[90px_1fr_1fr_1fr_auto]">
              <div className="pb-2 text-lg font-extrabold">{s.cm} {L("سم", "cm")}</div>
              <Field label={L("يكفي", "Serves")}><TInput dir="ltr" value={s.serves} onChange={(v) => patch((t) => (t.sizes[i].serves = v))} /></Field>
              <Field label={L("السعر", "Price")}><NInput value={s.price} onChange={(v) => patch((t) => (t.sizes[i].price = v))} /></Field>
              <Field label={L("المخزون", "Stock")}><NInput value={s.stock} onChange={(v) => patch((t) => (t.sizes[i].stock = v))} /></Field>
              <div className="col-span-4 pb-1 sm:col-span-1"><Toggle checked={s.enabled} onChange={(v) => patch((t) => (t.sizes[i].enabled = v))} label={L("متاح", "On")} /></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-bold">{L("الصورة", "Image")}</span>
        <div className="flex flex-wrap items-center gap-3">
          <ProductArt product={p} alt="" className="h-20 w-24 rounded-xl" />
          <div className="min-w-[220px] flex-1 space-y-2">
            <TInput dir="ltr" placeholder="https://… " value={p.image?.startsWith("data:") ? "" : (p.image ?? "")} onChange={(v) => patch((t) => (t.image = v || undefined))} />
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-ghost !min-h-10 cursor-pointer text-sm">
                {L("رفع صورة", "Upload image")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) void fileToDataUrl(f).then((u) => patch((t) => (t.image = u)));
                  }}
                />
              </label>
              {p.image && <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => patch((t) => (t.image = undefined))}>{L("إزالة", "Remove")}</button>}
            </div>
            <p className="text-xs text-muted">{L("للنشر على GitHub يُفضّل رابط صورة (ملف داخل مجلد public) بدل الرفع المباشر.", "For publishing on GitHub prefer a URL / file in the public folder over direct upload.")}</p>
          </div>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-bold">{L("الإضافات المتاحة لهذا المنتج", "Add-ons available")}</span>
        <div className="flex flex-wrap gap-2">
          {data.addons.map((a) => (
            <button key={a.id} type="button" aria-pressed={p.addonIds.includes(a.id)} onClick={() => patch((t) => (t.addonIds = toggleIn(t.addonIds, a.id)))}
              className={`rounded-full border px-3 py-1 text-sm font-bold ${p.addonIds.includes(a.id) ? "border-berry bg-berry text-white" : "border-line bg-white"}`}>
              {a.name.ar}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Toggle checked={p.active} onChange={(v) => patch((t) => (t.active = v))} label={L("ظاهر في المتجر", "Visible")} />
        <Toggle checked={p.featured} onChange={(v) => patch((t) => (t.featured = v))} label={L("مميّز بالرئيسية", "Featured on home")} />
        <button type="button" className="btn btn-ghost !min-h-10 ms-auto" onClick={onClose}>{L("تم", "Done")}</button>
      </div>
    </div>
  );
}

export function Products() {
  const L = useL();
  const { money } = useT();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const [open, setOpen] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  return (
    <>
      <Panel
        title={L("المنتجات", "Products")}
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary !min-h-10 text-sm"
              onClick={() => {
                const p = newProduct(data.products.length + 1);
                update((d) => void d.products.push(p));
                setOpen(p.id);
              }}
            >
              + {L("منتج جديد", "New product")}
            </button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl bg-cream p-3">
          <Field label={L("تعديل كل الأسعار بنسبة % (مثال 10 أو -5)", "Adjust all prices by % (e.g. 10 or -5)")} className="min-w-[220px] flex-1">
            <input className="input !min-h-11" type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
          </Field>
          <button
            type="button"
            className="btn btn-ghost !min-h-11"
            onClick={() => {
              if (!pct || !confirm(L(`تطبيق ${pct}% على كل الأسعار؟`, `Apply ${pct}% to all prices?`))) return;
              update((d) => d.products.forEach((p) => p.sizes.forEach((s) => (s.price = Math.max(0, Math.round(s.price * (1 + pct / 100)))))));
              setPct(0);
            }}
          >
            {L("تطبيق", "Apply")}
          </button>
        </div>

        <ul className="divide-y divide-line">
          {[...data.products].sort((a, b) => a.sort - b.sort).map((p) => {
            const prices = p.sizes.filter((s) => s.enabled).map((s) => s.price);
            return (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ProductArt product={p} alt="" className="h-14 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">{p.name.ar} <span className="font-medium text-muted">/ {p.name.en}</span></div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                      <Badge tone={p.active ? "green" : "gray"}>{p.active ? L("ظاهر", "Visible") : L("مخفي", "Hidden")}</Badge>
                      {p.featured && <Badge tone="pink">{L("مميز", "Featured")}</Badge>}
                      <span className="text-muted">{prices.length ? `${money(Math.min(...prices))} – ${money(Math.max(...prices))}` : "—"}</span>
                    </div>
                  </div>
                  <Toggle checked={p.active} onChange={(v) => update((d) => void (d.products.find((x) => x.id === p.id)!.active = v))} label={L("ظاهر", "On")} />
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? L("إغلاق", "Close") : L("تعديل", "Edit")}</button>
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => update((d) => { const c = structuredClone(p); c.id = uid("p"); c.slug = `${p.slug}-copy-${Date.now().toString(36).slice(-3)}`; c.name = { ar: `${p.name.ar} (نسخة)`, en: `${p.name.en} (copy)` }; c.active = false; d.products.push(c); })}>{L("نسخ", "Copy")}</button>
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف المنتج نهائيًا؟", "Delete this product permanently?")) && update((d) => void (d.products = d.products.filter((x) => x.id !== p.id)))}>{L("حذف", "Delete")}</button>
                </div>
                {open === p.id && <ProductEditor id={p.id} onClose={() => setOpen(null)} />}
              </li>
            );
          })}
        </ul>
      </Panel>
      <AddonsPanel />
    </>
  );
}

function AddonsPanel() {
  const L = useL();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const patch = (id: string, fn: (a: Addon) => void) => update((d) => { const a = d.addons.find((x) => x.id === id); if (a) fn(a); });
  return (
    <Panel
      title={L("الإضافات (شموع، بطاقات، كتابة…)", "Add-ons (candles, cards, writing…)")}
      actions={<button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={() => update((d) => void d.addons.push({ id: uid("a"), name: { ar: "إضافة جديدة", en: "New add-on" }, price: 0, active: true }))}>+ {L("إضافة", "Add")}</button>}
    >
      <ul className="space-y-3">
        {data.addons.map((a) => (
          <li key={a.id} className="grid items-end gap-3 rounded-2xl bg-cream p-3 md:grid-cols-[2fr_100px_auto_auto_auto]">
            <L10nInput label={L("الاسم", "Name")} value={a.name} onChange={(v) => patch(a.id, (x) => (x.name = v))} />
            <Field label={L("السعر", "Price")}><NInput value={a.price} onChange={(v) => patch(a.id, (x) => (x.price = v))} /></Field>
            <Toggle checked={!!a.needsText} onChange={(v) => patch(a.id, (x) => (x.needsText = v))} label={L("يطلب نصًا", "Needs text")} />
            <Toggle checked={a.active} onChange={(v) => patch(a.id, (x) => (x.active = v))} label={L("فعّال", "Active")} />
            <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف؟", "Delete?")) && update((d) => void (d.addons = d.addons.filter((x) => x.id !== a.id)))}>{L("حذف", "Delete")}</button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
