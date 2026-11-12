"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useDb, useT } from "@/lib/store";

export default function PoliciesPage() {
  const { t, tx } = useT();
  const s = useDb((x) => x.data.settings);
  const lines = tx(s.policies).split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <Shell>
      <div className="container-x max-w-3xl py-10 md:py-16">
        <h1 className="mb-6 text-4xl font-bold text-choco">{t("policies")}</h1>
        <div className="card space-y-4 p-6">
          {lines.map((l, i) => {
            const [head, ...rest] = l.split(/[:：]/);
            return rest.length ? (
              <p key={i}><b className="text-berry-deep">{head}:</b> {rest.join(":").trim()}</p>
            ) : (
              <p key={i}>{l}</p>
            );
          })}
        </div>
        <Link href="/shop/" className="btn btn-primary mt-8">{t("shop_now")}</Link>
      </div>
    </Shell>
  );
}
