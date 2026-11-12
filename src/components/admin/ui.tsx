"use client";

import { useT } from "@/lib/store";
import type { L10n } from "@/lib/types";

export function useL() {
  const { lang } = useT();
  return (ar: string, en: string) => (lang === "ar" ? ar : en);
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-bold">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-green-600" : "bg-sand"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "start-6" : "start-1"}`}
        />
      </button>
      {label}
    </label>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TInput({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input className="input !min-h-11" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function NInput({ value, onChange, ...rest }: { value: number | undefined; onChange: (v: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      className="input !min-h-11"
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
      {...rest}
    />
  );
}

export function L10nInput({ label, value, onChange, multiline = false }: { label: string; value: L10n; onChange: (v: L10n) => void; multiline?: boolean }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <Tag
          className={`input ${multiline ? "" : "!min-h-11"}`}
          dir="rtl"
          placeholder="العربية"
          aria-label={`${label} (AR)`}
          value={value.ar}
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
        />
        <Tag
          className={`input ${multiline ? "" : "!min-h-11"}`}
          dir="ltr"
          placeholder="English"
          aria-label={`${label} (EN)`}
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
        />
      </div>
    </div>
  );
}

export function Panel({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card mb-6 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-bold transition ${on ? "border-berry bg-berry text-white" : "border-line bg-white hover:border-berry"}`}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "green" | "red" | "amber" | "pink"; children: React.ReactNode }) {
  const c = {
    gray: "bg-sand text-choco",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    pink: "bg-blush text-berry-deep",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${c}`}>{children}</span>;
}

export function toggleIn<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}
