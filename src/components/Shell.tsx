"use client";

import Link from "next/link";
import { useCart, useDb, useLangStore, useT } from "@/lib/store";
import { Logo } from "./Logo";
import { Drip } from "./Drip";
import { CartDrawer } from "./CartDrawer";

function Header() {
  const { t, lang } = useT();
  const setLang = useLangStore((s) => s.setLang);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const setOpen = useCart((s) => s.setOpen);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-3 md:h-[72px]">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5 md:gap-3" aria-label="Main">
          <Link href="/shop/" className="rounded-full px-3 py-2 text-sm font-bold hover:bg-blush md:text-base">
            {t("shop")}
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-full border border-line bg-white px-3 py-2 text-sm font-bold hover:border-berry"
            aria-label="Language"
          >
            {t("lang_switch")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-primary relative !min-h-11 !px-4"
            aria-label={`${t("open_cart")} (${count})`}
          >
            <span aria-hidden>🛍</span>
            <span className="hidden sm:inline">{t("cart")}</span>
            {count > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-extrabold text-berry">{count}</span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Announcement() {
  const { tx } = useT();
  const s = useDb((x) => x.data.settings);
  if (!s.announcementOn || !tx(s.announcement)) return null;
  return (
    <div className="bg-choco px-4 py-2 text-center text-sm font-bold text-cream" role="note">
      {tx(s.announcement)}
    </div>
  );
}

function Footer() {
  const { t, tx } = useT();
  const s = useDb((x) => x.data.settings);
  return (
    <footer className="relative mt-24 bg-choco text-cream">
      <div className="absolute inset-x-0 -top-px -translate-y-full" aria-hidden>
        <Drip fill="#3b2218" flip height={70} className="rotate-180 scale-x-[-1]" />
      </div>
      <div className="container-x grid gap-8 py-12 md:grid-cols-3">
        <div>
          <div className="mb-3 [&_*]:!text-cream">
            <Logo />
          </div>
          <p className="max-w-xs text-sm text-cream/75">{tx(s.tagline)}</p>
        </div>
        <div className="space-y-2 text-sm">
          <h2 className="mb-2 text-base font-bold">{t("follow")}</h2>
          {/^\d{9,15}$/.test(s.whatsapp) && (
            <a className="block hover:text-blush" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer">
              {t("whatsapp")}
            </a>
          )}
          {/^[A-Za-z0-9._]{1,30}$/.test(s.instagram) && (
            <a className="block hover:text-blush" href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <Link className="block hover:text-blush" href="/shop/">{t("shop")}</Link>
          <Link className="block hover:text-blush" href="/admin/">{t("admin")}</Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-cream/60">{t("footer_note")}</div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang } = useT();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        {lang === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>
      <Announcement />
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
