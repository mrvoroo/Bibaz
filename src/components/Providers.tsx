"use client";

import { useEffect } from "react";
import { useDb, useT } from "@/lib/store";
import { Logo } from "./Logo";

export function Providers({ children }: { children: React.ReactNode }) {
  const init = useDb((s) => s.init);
  const ready = useDb((s) => s.ready);
  const { lang, dir } = useT();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center" aria-busy>
        <div className="floaty">
          <Logo size="lg" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
