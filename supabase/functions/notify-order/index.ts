// Supabase Edge Function: sends a Web Push notification to the admin's phones for every new order.
// Trigger: Database Webhook (Table: orders, Event: INSERT) -> this function, header x-webhook-secret.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });
  const { record } = await req.json();
  if (!record?.id) return new Response("no record", { status: 400 });

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: subs } = await sb.from("push_subscriptions").select("endpoint,data");

  const payload = JSON.stringify({
    title: `طلب جديد ${record.id}`,
    body: `${record.data?.customer?.name ?? ""} · ${record.total} ر.س`,
    url: "./",
    tag: record.id,
  });

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s.data, payload);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return new Response("ok");
});
