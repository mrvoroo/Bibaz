"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sha256, useDb, useLangStore, useT } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { Dashboard, Agents } from "@/components/admin/Dashboard";
import { Products } from "@/components/admin/Products";
import { Offers } from "@/components/admin/Offers";
import { Upsells } from "@/components/admin/Upsells";
import { Payments, SettingsTab } from "@/components/admin/Settings";
import { Orders } from "@/components/admin/Orders";
import { useL } from "@/components/admin/ui";

const SESSION_KEY = "bibaz-admin-ok";
const TABS = [
  { k: "dashboard", ar: "الرئيسية", en: "Dashboard", icon: "📊" },
  { k: "orders", ar: "الطلبات", en: "Orders", icon: "📦" },
  { k: "products", ar: "المنتجات والأسعار", en: "Products & prices", icon: "🍰" },
  { k: "offers", ar: "العروض", en: "Offers", icon: "🏷" },
  { k: "upsells", ar: "الاقتراحات (Upsell)", en: "Upsells", icon: "✨" },
  { k: "payments", ar: "الدفع", en: "Payments", icon: "💳" },
  { k: "settings", ar: "الإعدادات", en: "Settings", icon: "⚙️" },
  { k: "agents", ar: "تقييم الوكلاء", en: "Agent scorecards", icon: "🛡" },
] as const;
type Tab = (typeof TABS)[number]["k"];

function Gate({ onOk }: { onOk: () => void }) {
  const L = useL();
  const hash = useDb((s) => s.data.settings.adminPassHash);
  const [v, setV] = useState("");
  const [bad, setBad] = useState(false);
  const [wait, setWait] = useState(0);
  const tries = useRef(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wait > 0) return;
    if ((await sha256(v)) === hash) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      onOk();
    } else {
      tries.current += 1;
      setBad(true);
      setV("");
      setWait(Math.min(60, 2 ** tries.current));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6 text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="text-2xl font-bold">{L("لوحة التحكم", "Admin panel")}</h1>
        <input
          type="password"
          dir="ltr"
          className="input text-center"
          placeholder={L("كلمة المرور", "Passcode")}
          value={v}
          onChange={(e) => { setV(e.target.value); setBad(false); }}
          autoFocus
          autoComplete="current-password"
          aria-label={L("كلمة المرور", "Passcode")}
          aria-invalid={bad}
        />
        {bad && <p className="text-sm font-bold text-red-600">{L("كلمة المرور غير صحيحة", "Incorrect passcode")}{wait > 0 ? ` (${wait}s)` : ""}</p>}
        <button className="btn btn-primary w-full" disabled={!v || wait > 0}>{L("دخول", "Enter")}</button>
        <Link href="/" className="block text-sm text-muted hover:text-berry">← {L("العودة للمتجر", "Back to store")}</Link>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const L = useL();
  const { lang } = useT();
  const setLang = useLangStore((s) => s.setLang);
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const hasDraft = useDb((s) => s.hasDraft);
  const exportJson = useDb((s) => s.exportJson);
  const importJson = useDb((s) => s.importJson);
  const discard = useDb((s) => s.discardDraft);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setOk(sessionStorage.getItem(SESSION_KEY) === "1"); } catch { setOk(false); }
    const h = location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.k === h)) setTab(h);
  }, []);

  if (ok === null) return null;
  if (!ok) return <Gate onOk={() => setOk(true)} />;

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "store-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Store"><Logo /></Link>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "English" : "عربي"}</button>
            <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} setOk(false); }}>{L("خروج", "Log out")}</button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 pb-2" role="tablist" aria-label="Admin sections">
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={tab === t.k}
                onClick={() => { setTab(t.k); history.replaceState(null, "", `#${t.k}`); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab === t.k ? "bg-berry text-white" : "bg-white text-choco hover:bg-blush"}`}
              >
                <span aria-hidden>{t.icon}</span> {L(t.ar, t.en)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${hasDraft ? "bg-amber-50 ring-1 ring-amber-300" : "bg-white ring-1 ring-line"}`} role="status">
          <p className="min-w-[240px] flex-1 text-sm font-bold">
            {hasDraft
              ? L("لديك تعديلات غير منشورة (محفوظة في متصفحك فقط). صدّر الملف وارفعه إلى GitHub لتظهر للعملاء.", "You have unpublished changes (saved in this browser only). Export the file and upload it to GitHub to publish.")
              : L("لا توجد تعديلات غير منشورة.", "No unpublished changes.")}
          </p>
          <button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={download}>⬇ {L("تصدير store-data.json", "Export store-data.json")}</button>
          <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => fileRef.current?.click()}>⬆ {L("استيراد", "Import")}</button>
          <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f && !importJson(await f.text())) alert(L("ملف غير صالح", "Invalid file")); e.target.value = ""; }} />
          {hasDraft && <button type="button" className="btn btn-ghost !min-h-10 text-sm text-red-600" onClick={() => confirm(L("تجاهل كل التعديلات غير المنشورة؟", "Discard all unpublished changes?")) && discard()}>{L("تجاهل المسودة", "Discard draft")}</button>}
        </div>

        {tab === "dashboard" && <Dashboard />}
        {tab === "orders" && <Orders />}
        {tab === "products" && <Products />}
        {tab === "offers" && <Offers />}
        {tab === "upsells" && <Upsells />}
        {tab === "payments" && <Payments />}
        {tab === "settings" && <SettingsTab />}
        {tab === "agents" && <Agents />}
      </main>
    </div>
  );
}
