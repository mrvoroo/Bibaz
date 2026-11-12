"use client";

import { useState } from "react";
import { sha256, uid, useDb } from "@/lib/store";
import type { Settings, TransferMethod } from "@/lib/types";
import { Badge, Field, L10nInput, NInput, Panel, TInput, Toggle, useL } from "./ui";

export function Payments() {
  const L = useL();
  const s = useDb((x) => x.data.settings);
  const update = useDb((x) => x.update);
  const patch = (id: string, fn: (m: TransferMethod) => void) => update((d) => { const m = d.settings.transfer.find((x) => x.id === id); if (m) fn(m); });

  return (
    <>
      <Panel
        title={L("طرق التحويل", "Transfer methods")}
        actions={
          <button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={() => update((d) => void d.settings.transfer.push({ id: uid("t"), name: { ar: "طريقة تحويل جديدة", en: "New transfer method" }, enabled: false, accountName: "", iban: "", accountNumber: "", note: { ar: "", en: "" } }))}>
            + {L("طريقة تحويل", "Add method")}
          </button>
        }
      >
        <p className="mb-4 rounded-2xl bg-cream p-3 text-sm text-muted">
          {L("الدفع بالتحويل فقط. أضف أي بنك أو محفظة داخل السعودية (برق، SCBA، stc pay، الراجحي…) وفعّل أو أوقف كل واحدة. بيانات الحساب تظهر للعميل بعد تأكيد الطلب.", "Payment is by transfer only. Add any bank or wallet in Saudi Arabia (Barq, SCBA, stc pay, Al Rajhi…) and toggle each. Account details are shown to the customer after confirming.")}
        </p>
        <ul className="space-y-4">
          {s.transfer.map((m) => (
            <li key={m.id} className="space-y-3 rounded-2xl bg-cream p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone={m.enabled ? "green" : "gray"}>{m.enabled ? L("مفعّلة", "Enabled") : L("متوقفة", "Disabled")}</Badge>
                <div className="flex items-center gap-4">
                  <Toggle checked={m.enabled} onChange={(v) => patch(m.id, (x) => (x.enabled = v))} label={L("تفعيل", "Enable")} />
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("حذف؟", "Delete?")) && update((d) => void (d.settings.transfer = d.settings.transfer.filter((x) => x.id !== m.id)))}>{L("حذف", "Delete")}</button>
                </div>
              </div>
              <L10nInput label={L("اسم الطريقة (يظهر للعميل)", "Method name")} value={m.name} onChange={(v) => patch(m.id, (x) => (x.name = v))} />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label={L("اسم صاحب الحساب", "Account holder")}><TInput value={m.accountName} onChange={(v) => patch(m.id, (x) => (x.accountName = v))} /></Field>
                <Field label={L("رقم الآيبان IBAN", "IBAN")}><TInput dir="ltr" value={m.iban} onChange={(v) => patch(m.id, (x) => (x.iban = v))} /></Field>
                <Field label={L("رقم الحساب / الجوال (للمحافظ وبرق)", "Account / mobile no.")}><TInput dir="ltr" value={m.accountNumber} onChange={(v) => patch(m.id, (x) => (x.accountNumber = v))} /></Field>
              </div>
              <L10nInput label={L("ملاحظة للعميل", "Note to customer")} value={m.note} onChange={(v) => patch(m.id, (x) => (x.note = v))} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={L("الدفع عند الاستلام (Cash & Delivery)", "Cash on delivery")}>
        <div className="flex flex-wrap items-center gap-6">
          <Toggle checked={s.cod.enabled} onChange={(v) => update((d) => void (d.settings.cod.enabled = v))} label={s.cod.enabled ? L("مفعّل", "Enabled") : L("مقفول (الافتراضي)", "Off (default)")} />
          <Field label={L("رسوم إضافية (ر.س)", "Extra fee (SAR)")} className="w-40"><NInput value={s.cod.fee} onChange={(v) => update((d) => void (d.settings.cod.fee = v))} /></Field>
        </div>
        <p className="mt-3 text-sm text-muted">{L("مقفول افتراضيًا. عند تفعيله يظهر كخيار دفع إضافي في صفحة إتمام الطلب.", "Off by default. When enabled it appears as an extra payment option at checkout.")}</p>
      </Panel>
    </>
  );
}

export function SettingsTab() {
  const L = useL();
  const s = useDb((x) => x.data.settings);
  const update = useDb((x) => x.update);
  const [pass, setPass] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (fn: (st: Settings) => void) => update((d) => fn(d.settings));

  return (
    <>
      <Panel title={L("بيانات المتجر", "Store info")}>
        <div className="space-y-4">
          <L10nInput label={L("اسم المتجر", "Store name")} value={s.storeName} onChange={(v) => set((x) => (x.storeName = v))} />
          <L10nInput label={L("الشعار النصي", "Tagline")} value={s.tagline} onChange={(v) => set((x) => (x.tagline = v))} />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={L("رقم واتساب (بالصيغة الدولية بدون +)", "WhatsApp (international, no +)")} hint="9665XXXXXXXX"><TInput dir="ltr" value={s.whatsapp} onChange={(v) => set((x) => (x.whatsapp = v.replace(/\D/g, "")))} /></Field>
            <Field label={L("حساب إنستغرام", "Instagram handle")}><TInput dir="ltr" value={s.instagram} onChange={(v) => set((x) => (x.instagram = v.replace(/[^\w.]/g, "")))} /></Field>
            <Field label={L("اللغة الافتراضية للموقع", "Default site language")}>
              <select className="input !min-h-11" value={s.defaultLang} onChange={(e) => set((x) => (x.defaultLang = e.target.value as "ar" | "en"))}>
                <option value="ar">العربية (RTL)</option>
                <option value="en">English (LTR)</option>
              </select>
            </Field>
          </div>
          <L10nInput label={L("شريط الإعلان العلوي", "Announcement bar")} value={s.announcement} onChange={(v) => set((x) => (x.announcement = v))} />
          <Toggle checked={s.announcementOn} onChange={(v) => set((x) => (x.announcementOn = v))} label={L("إظهار الشريط", "Show bar")} />
        </div>
      </Panel>

      <Panel title={L("التوصيل والطلبات", "Delivery & orders")}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label={L("رسوم التوصيل (ر.س)", "Delivery fee (SAR)")}><NInput value={s.shippingFee} onChange={(v) => set((x) => (x.shippingFee = v))} /></Field>
          <Field label={L("توصيل مجاني فوق (0 = إيقاف)", "Free delivery over (0 = off)")}><NInput value={s.freeShippingOver} onChange={(v) => set((x) => (x.freeShippingOver = v))} /></Field>
          <Field label={L("الحد الأدنى للطلب", "Minimum order")}><NInput value={s.minOrder} onChange={(v) => set((x) => (x.minOrder = v))} /></Field>
          <Field label={L("ساعات التحضير المسبقة", "Prep lead time (hours)")}><NInput value={s.prepHours} onChange={(v) => set((x) => (x.prepHours = v))} /></Field>
        </div>
        <Field label={L("أحياء الرياض ورسوم التوصيل (سطر لكل حي: الحي=الرسم)", "Riyadh districts & delivery fee (one per line: District=fee)")} hint={L("مثال: الملقا=20 . التوصيل داخل الرياض فقط. الحي الذي لا يظهر في القائمة لا يستطيع العميل طلبه. بدون رقم = الرسم العام أعلاه.", "e.g. Al Malqa=20 . Riyadh only. Districts not listed cannot be ordered. No number = the default fee above.")} className="mt-4">
          <textarea
            className="input !min-h-[260px]"
            dir="auto"
            defaultValue={s.districts.map((d) => `${d.name}=${d.fee}`).join("\n")}
            onBlur={(e) =>
              set((x) => {
                const out: { name: string; fee: number }[] = [];
                e.target.value.split("\n").forEach((raw) => {
                  const i = raw.lastIndexOf("=");
                  const name = (i >= 0 ? raw.slice(0, i) : raw).trim().slice(0, 60);
                  const feeRaw = i >= 0 ? raw.slice(i + 1).trim() : "";
                  if (!name || out.some((d) => d.name === name)) return;
                  out.push({ name, fee: feeRaw !== "" && isFinite(Number(feeRaw)) ? Math.max(0, Number(feeRaw)) : x.shippingFee });
                });
                x.districts = out;
              })
            }
          />
        </Field>
      </Panel>

      <Panel title={L("الثقة والمحتوى", "Trust & content")}>
        <div className="space-y-4">
          <L10nInput label={L("من نحن (يظهر في الرئيسية)", "About us (home page)")} multiline value={s.about} onChange={(v) => set((x) => (x.about = v))} />
          <L10nInput label={L("السياسات (سطر لكل بند، الصيغة: العنوان: النص)", "Policies (one per line, Title: text)")} multiline value={s.policies} onChange={(v) => set((x) => (x.policies = v))} />
          <div>
            <span className="mb-2 block text-sm font-bold">{L("آراء العملاء (أضف آراء حقيقية فقط، وتختفي لو فاضية)", "Customer reviews (real ones only; hidden when empty)")}</span>
            <div className="space-y-3">
              {s.testimonials.map((r, i) => (
                <div key={i} className="space-y-2 rounded-2xl bg-cream p-3">
                  <Field label={L("اسم العميل", "Customer name")}><TInput value={r.name} onChange={(v) => set((x) => (x.testimonials[i].name = v))} /></Field>
                  <L10nInput label={L("الرأي", "Review")} value={r.text} multiline onChange={(v) => set((x) => (x.testimonials[i].text = v))} />
                  <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => set((x) => (x.testimonials = x.testimonials.filter((_, k) => k !== i)))}>{L("حذف", "Delete")}</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => set((x) => x.testimonials.push({ name: "", text: { ar: "", en: "" } }))}>+ {L("رأي", "Review")}</button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={L("كلمة مرور لوحة التحكم", "Admin passcode")}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={L("كلمة مرور جديدة (8 أحرف على الأقل)", "New passcode (min 8 chars)")} className="min-w-[240px] flex-1">
            <TInput type="password" dir="ltr" value={pass} onChange={setPass} autoComplete="new-password" />
          </Field>
          <button
            type="button"
            className="btn btn-primary !min-h-11"
            disabled={pass.length < 8}
            onClick={async () => {
              const h = await sha256(pass);
              set((x) => (x.adminPassHash = h));
              setPass("");
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            {saved ? "✓" : L("حفظ", "Save")}
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">{L("تنبيه: الحماية هنا على مستوى الواجهة فقط لأن الموقع ثابت (GitHub Pages). التحكم الحقيقي في النشر عبر صلاحيات مستودع GitHub.", "Note: protection here is UI-level only because the site is static (GitHub Pages). Real control over publishing is your GitHub repository permissions.")}</p>
      </Panel>
    </>
  );
}
