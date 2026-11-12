-- Bibaz backend schema (run once in Supabase > SQL Editor)

create table if not exists public.orders (
  id          text primary key,
  created_at  timestamptz not null default now(),
  status      text not null default 'new',
  total       numeric not null check (total >= 0),
  data        jsonb not null
);

alter table public.orders enable row level security;

-- Customers (anon key) may ONLY insert new orders, never read them.
create policy "customers can place orders" on public.orders
  for insert to anon
  with check (status = 'new' and octet_length(data::text) < 20000);

-- Only the signed-in admin can read / update / delete.
create policy "admin read orders"   on public.orders for select to authenticated using (true);
create policy "admin update orders" on public.orders for update to authenticated using (true) with check (true);
create policy "admin delete orders" on public.orders for delete to authenticated using (true);

-- live updates for the admin app
alter publication supabase_realtime add table public.orders;

-- web-push subscriptions of the admin's phones
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "admin manages push subscriptions" on public.push_subscriptions
  for all to authenticated using (true) with check (true);
