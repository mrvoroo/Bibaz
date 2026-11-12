"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useT } from "@/lib/store";

export default function NotFound() {
  const { t } = useT();
  return (
    <Shell>
      <div className="container-x py-32 text-center">
        <div className="mb-3 text-7xl" aria-hidden>🍰</div>
        <h1 className="mb-6 text-3xl font-bold">{t("not_found")}</h1>
        <Link href="/" className="btn btn-primary">{t("home")}</Link>
      </div>
    </Shell>
  );
}
