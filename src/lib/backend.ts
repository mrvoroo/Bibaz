"use client";

/**
 * Optional Supabase backend (orders database + admin login + realtime + web-push).
 * Configure with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (public by design; Row Level Security protects the data).
 * Without them the store still works in "local mode" (orders stay on the device). See SETUP-BACKEND.md.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderStatus } from "./types";

export const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const backendEnabled = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SB_URL) && SB_KEY.length > 20;

/** Customer side: insert the order (anon role may INSERT only, never read). */
export async function submitOrderRemote(order: Order): Promise<boolean> {
  if (!backendEnabled) return false;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/orders`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ id: order.id, status: "new", total: order.totals.total, data: order }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

let client: SupabaseClient | null = null;
export async function sb(): Promise<SupabaseClient> {
  if (client) return client;
  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export async function sbSession() {
  const { data } = await (await sb()).auth.getSession();
  return data.session;
}
export async function sbSignIn(email: string, password: string): Promise<string | null> {
  const { error } = await (await sb()).auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}
export async function sbSignOut() {
  await (await sb()).auth.signOut();
}

type Row = { id: string; status: OrderStatus; created_at: string; data: Order };
const fromRow = (r: Row): Order => ({ ...r.data, id: r.id, status: r.status, createdAt: r.created_at ?? r.data.createdAt });

export async function remoteList(): Promise<Order[]> {
  const { data, error } = await (await sb()).from("orders").select("id,status,created_at,data").order("created_at", { ascending: false }).limit(500);
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}
export async function remoteSetStatus(id: string, status: OrderStatus) {
  await (await sb()).from("orders").update({ status }).eq("id", id);
}
export async function remoteDelete(id: string) {
  await (await sb()).from("orders").delete().eq("id", id);
}

/** Admin: live INSERT/UPDATE events. Returns an unsubscribe function. */
export async function subscribeOrders(onInsert: (o: Order) => void, onUpdate: (o: Order) => void): Promise<() => void> {
  const c = await sb();
  const ch = c
    .channel("orders-live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => onInsert(fromRow(p.new as Row)))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (p) => onUpdate(fromRow(p.new as Row)))
    .subscribe();
  return () => void c.removeChannel(ch);
}

/* ───────────── Web push (admin phone) ───────────── */

const b64ToU8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
};

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerSW(basePath: string) {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/admin/` });
  } catch {
    return null;
  }
}

/** Ask permission, subscribe to push and store the subscription (needs the signed-in admin). */
export async function enablePush(basePath: string): Promise<"ok" | "denied" | "unsupported" | "no-vapid" | "error"> {
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = (await registerSW(basePath)) ?? (await navigator.serviceWorker.ready);
  if (!VAPID_PUBLIC || !backendEnabled) return "no-vapid";
  try {
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) }));
    const json = sub.toJSON();
    const { error } = await (await sb()).from("push_subscriptions").upsert({ endpoint: json.endpoint, data: json });
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

/** Local notification (works while the admin app is open, even without push keys). */
export async function notifyLocal(title: string, body: string, url: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "icons/icon-192.png", tag: url, data: { url }, dir: "rtl", lang: "ar" } as NotificationOptions);
    else new Notification(title, { body, dir: "rtl", lang: "ar" });
  } catch {}
}
