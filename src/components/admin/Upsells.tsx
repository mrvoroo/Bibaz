"use client";

import { uid, useDb } from "@/lib/store";
import { SIZES, type SizeCm, type UpsellRule } from "@/lib/types";
import { Chip, Field, L10nInput, Panel, Toggle, toggleIn, useL } from "./ui";

export function Upsells() {
  const L = useL();
  const data = useDb((s) => s.data);
  const update = useDb((s) => s.update);
  const patch = (id: string, fn: (r: UpsellRule) => void) => update((d) => { const r = d.upsells.find((x) => x.id === id); if (r) fn(r); });

  const PLACE: { k: UpsellRule["placements"][number]; ar: string; en: string }[] = [
    { k: "product", ar: "صفحة المنتج", en: "Product page" },
    { k: "cart", ar: "السلة", en: "Cart" },
    { k: "checkout", ar: "إتمام الطلب", en: "Checkout" },
  ];

  return (
    <>
      <Panel
        title={L("قواعد الاقتراحات (Upsell / Cross-sell)", "Upsell / cross-sell rules")}
        actions={
          <button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={() => update((d) => void d.upsells.push({ id: uid("u"), active: true, triggerProductId: "any", suggestKind: "addon", suggestId: d.addons[0]?.id ?? "", placements: ["cart"], message: { ar: "قد يعجبك أيضًا", en: "You may also like" } }))}>
            + {L("قاعدة جديدة", "New rule")}
          </button>
        }
      >
        <p className="mb-4 rounded-2xl bg-cream p-3 text-sm text-muted">
          {L("مثال: إذا كان في السلة «نيويورك كلاسيك» اقترح «لوتس» بمقاس 15 سم. الاقتراح يظهر تلقائيًا في الأماكن التي تختارها.", "Example: if the cart has “New York Classic”, suggest “Lotus” in 15 cm. Suggestions appear automatically where you choose.")}
        </p>
        <ul className="space-y-4">
          {data.upsells.map((r) => {
            const prod = data.products.find((p) => p.id === r.suggestId);
            return (
              <li key={r.id} className="space-y-3 rounded-2xl bg-cream p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label={L("إذا كان في السلة / الصفحة", "When cart/page has")}>
                    <select className="input !min-h-11" value={r.triggerProductId} onChange={(e) => patch(r.id, (x) => (x.triggerProductId = e.target.value))}>
                      <option value="any">{L("أي منتج", "Any product")}</option>
                      {data.products.map((p) => <option key={p.id} value={p.id}>{p.name.ar}</option>)}
                    </select>
                  </Field>
                  <Field label={L("نوع الاقتراح", "Suggest")}>
                    <select className="input !min-h-11" value={r.suggestKind} onChange={(e) => patch(r.id, (x) => { x.suggestKind = e.target.value as "product" | "addon"; x.suggestId = x.suggestKind === "product" ? (d0(data.products)) : (data.addons[0]?.id ?? ""); })}>
                      <option value="product">{L("منتج", "A product")}</option>
                      <option value="addon">{L("إضافة", "An add-on")}</option>
                    </select>
                  </Field>
                  <Field label={L("المقترح", "Item")}>
                    <select className="input !min-h-11" value={r.suggestId} onChange={(e) => patch(r.id, (x) => (x.suggestId = e.target.value))}>
                      {r.suggestKind === "product"
                        ? data.products.map((p) => <option key={p.id} value={p.id}>{p.name.ar}</option>)
                        : data.addons.map((a) => <option key={a.id} value={a.id}>{a.name.ar}</option>)}
                    </select>
                  </Field>
                </div>
                {r.suggestKind === "product" && prod && (
                  <div>
                    <span className="mb-1 block text-sm font-bold">{L("المقاس المقترح", "Suggested size")}</span>
                    <div className="flex gap-2">
                      {SIZES.map((s) => <Chip key={s} on={r.suggestSize === s} onClick={() => patch(r.id, (x) => (x.suggestSize = s as SizeCm))}>{s} {L("سم", "cm")}</Chip>)}
                    </div>
                  </div>
                )}
                <L10nInput label={L("رسالة الاقتراح", "Message")} value={r.message} onChange={(v) => patch(r.id, (x) => (x.message = v))} />
                <div>
                  <span className="mb-1 block text-sm font-bold">{L("أين يظهر؟", "Where to show")}</span>
                  <div className="flex flex-wrap gap-2">
                    {PLACE.map((p) => <Chip key={p.k} on={r.placements.includes(p.k)} onClick={() => patch(r.id, (x) => (x.placements = toggleIn(x.placements, p.k)))}>{L(p.ar, p.en)}</Chip>)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Toggle checked={r.active} onChange={(v) => patch(r.id, (x) => (x.active = v))} label={L("فعّالة", "Active")} />
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف القاعدة؟", "Delete rule?")) && update((d) => void (d.upsells = d.upsells.filter((x) => x.id !== r.id)))}>{L("حذف", "Delete")}</button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={L("ترقية المقاس التلقائية", "Automatic size upgrade")}>
        <Toggle
          checked={data.settings.sizeUpgradeNudge}
          onChange={(v) => update((d) => void (d.settings.sizeUpgradeNudge = v))}
          label={L("اقترح على العميل في السلة المقاس الأكبر التالي مع فرق السعر", "Suggest the next bigger size in the cart with the price difference")}
        />
      </Panel>
    </>
  );
}

const d0 = (ps: { id: string }[]) => ps[0]?.id ?? "";
