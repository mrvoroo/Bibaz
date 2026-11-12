import type { Metadata, Viewport } from "next";
import { Tajawal, El_Messiri, Aref_Ruqaa } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const body = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--font-body", display: "swap" });
const display = El_Messiri({ subsets: ["arabic", "latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const logo = Aref_Ruqaa({ subsets: ["arabic", "latin"], weight: ["700"], variable: "--font-logo", display: "swap" });

export const metadata: Metadata = {
  title: "بيباز | Bibaz — Cheesecake",
  description: "تشيز كيك فاخر بأربعة مقاسات، يُحضَّر طازجًا ويصل إلى بابك. Premium cheesecake in four sizes, baked fresh and delivered.",
};

export const viewport: Viewport = { themeColor: "#fff8ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${body.variable} ${display.variable} ${logo.variable}`}>
      <head>
        {/* Static hosting cannot send CSP headers, so use a meta policy. 'unsafe-inline' is required by Next's inline bootstrap. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
