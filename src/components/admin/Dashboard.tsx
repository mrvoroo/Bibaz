"use client";

import { useEffect, useState } from "react";
import { BASE_PATH, useDb, useOrders, useT } from "@/lib/store";
import { isOfferLive } from "@/lib/engine";
import { Badge, Panel, useL } from "./ui";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-berry-deep">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Dashboard() {
  const L = useL();
  const { money } = useT();
  const data = useDb((s) => s.data);
  const orders = useOrders((s) => s.orders);
  const live = orders.filter((o) => o.status !== "cancelled");
  const revenue = live.filter((o) => o.status !== "new").reduce((s, o) => s + o.totals.total, 0);
  const pending = orders.filter((o) => o.status === "new").length;
  const avg = live.length ? live.reduce((s, o) => s + o.totals.total, 0) / live.length : 0;

  const top = new Map<string, number>();
  live.forEach((o) => o.lines.forEach((l) => top.set(l.name, (top.get(l.name) ?? 0) + l.qty)));
  const topList = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const s = data.settings;
  const checklist = [
    { ok: s.whatsapp !== "966500000000" && s.whatsapp.length >= 11, ar: "تغيير رقم واتساب المتجر", en: "Set the store WhatsApp number" },
    { ok: s.transfer.some((m) => m.enabled && ((!!m.iban && m.iban !== "SA00 0000 0000 0000 0000 0000") || (!!m.accountNumber && m.accountNumber !== "0500000000"))), ar: "إدخال بيانات حساب حقيقية في طرق التحويل", en: "Enter real account details in transfer methods" },
    { ok: data.products.some((p) => p.image), ar: "إضافة صور حقيقية للمنتجات", en: "Add real product photos" },
    { ok: data.products.some((p) => p.active && p.sizes.some((x) => x.price > 0)), ar: "مراجعة المنتجات والأسعار", en: "Review products & prices" },
    { ok: s.adminPassHash !== "c4d21fcfd647b31e5311968633945c00a670cc0303d5d8ccd7acd73e0d105b22", ar: "تغيير كلمة مرور لوحة التحكم الافتراضية", en: "Change the default admin passcode" },
  ];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={L("إجمالي المبيعات المؤكدة", "Confirmed revenue")} value={money(revenue)} />
        <Kpi label={L("الطلبات", "Orders")} value={String(orders.length)} hint={`${pending} ${L("بانتظار التحويل", "awaiting transfer")}`} />
        <Kpi label={L("متوسط الطلب", "Avg. order")} value={money(Math.round(avg))} />
        <Kpi label={L("عروض فعّالة", "Live offers")} value={String(data.offers.filter((o) => isOfferLive(o)).length)} hint={`${data.products.filter((p) => p.active).length} ${L("منتج ظاهر", "visible products")}`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={L("قائمة الإطلاق", "Launch checklist")}>
          <ul className="space-y-2">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold text-white ${c.ok ? "bg-green-600" : "bg-amber-500"}`}>{c.ok ? "✓" : "!"}</span>
                {L(c.ar, c.en)}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={L("الأكثر مبيعًا", "Top sellers")}>
          {topList.length === 0 ? <p className="text-muted">—</p> : (
            <ul className="space-y-2">
              {topList.map(([n, q]) => (
                <li key={n} className="flex justify-between text-sm"><span>{n}</span><Badge tone="pink">× {q}</Badge></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

interface Report {
  updatedAt: string;
  history?: string;
  agents: { id: string; name: string; score: number; verdict: string; findings: { severity: string; text: string; status: string }[] }[];
}

export function Agents() {
  const L = useL();
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => {
    fetch(`${BASE_PATH}/agent-reports.json`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).then(setR).catch(() => setR(null));
  }, []);
  if (!r) return <Panel title={L("تقييم الوكلاء", "Agent scorecards")}><p className="text-muted">{L("لم تُشغَّل التقييمات بعد.", "No reviews yet.")}</p></Panel>;
  const tone = (n: number) => (n >= 8 ? "text-green-700" : n >= 6 ? "text-amber-600" : "text-red-600");
  return (
    <>
      <p className="mb-1 text-sm text-muted">{L("آخر تحديث", "Last updated")}: {r.updatedAt}</p>
      {r.history && <p className="mb-4 text-sm font-bold text-berry-deep">{r.history}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {r.agents.map((a) => (
          <section key={a.id} className="card p-5">
            <h3 className="text-lg font-bold">{a.name}</h3>
            <div className={`my-2 text-5xl font-extrabold ${tone(a.score)}`}>{a.score}<span className="text-xl text-muted">/10</span></div>
            <p className="mb-3 text-sm">{a.verdict}</p>
            <ul className="space-y-2 text-sm">
              {a.findings.map((f, i) => (
                <li key={i} className="rounded-xl bg-cream p-2.5">
                  <div className="mb-1 flex gap-1.5"><Badge tone={f.severity === "high" ? "red" : f.severity === "medium" ? "amber" : "gray"}>{f.severity}</Badge><Badge tone={f.status === "fixed" ? "green" : "gray"}>{f.status}</Badge></div>
                  {f.text}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
