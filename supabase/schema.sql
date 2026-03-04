-- Candle Light / Lightwell Rewards starter schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Members and roles
create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

-- Purchase requests
create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  link text not null,
  cost numeric(12,2) not null,
  shipping_cost numeric(12,2) not null,
  sale_end_date date not null,
  want_scale int not null check (want_scale between 1 and 10),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'wishlist')),
  wishlist_at timestamptz,
  please_count int not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Stickers
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  emoji text,
  image_path text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Allowance ledger
create table if not exists public.allowance_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  message text,
  sticker_id uuid references public.stickers(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Derived balances
create table if not exists public.allowance_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Grocery list
create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  checked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_requests_created_at on public.purchase_requests(created_at desc);
create index if not exists idx_allowance_ledger_created_at on public.allowance_ledger(created_at desc);
create index if not exists idx_stickers_sort on public.stickers(sort_order asc, created_at desc);
create index if not exists idx_grocery_created_at on public.grocery_items(created_at desc);

-- Maintain wishlist timestamp
create or replace function public.set_wishlist_at_on_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'wishlist' and coalesce(old.status, '') <> 'wishlist' then
    new.wishlist_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_purchase_requests_wishlist on public.purchase_requests;
create trigger trg_purchase_requests_wishlist
before update on public.purchase_requests
for each row
execute function public.set_wishlist_at_on_status_change();

-- Keep allowance balances in sync
create or replace function public.apply_allowance_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.allowance_balances (user_id, balance, updated_at)
    values (new.user_id, new.amount, now())
    on conflict (user_id)
    do update set
      balance = public.allowance_balances.balance + excluded.balance,
      updated_at = now();
    return new;
  elsif tg_op = 'UPDATE' then
    if old.user_id = new.user_id then
      update public.allowance_balances
      set balance = balance - old.amount + new.amount,
          updated_at = now()
      where user_id = new.user_id;
    else
      update public.allowance_balances
      set balance = balance - old.amount,
          updated_at = now()
      where user_id = old.user_id;

      insert into public.allowance_balances (user_id, balance, updated_at)
      values (new.user_id, new.amount, now())
      on conflict (user_id)
      do update set
        balance = public.allowance_balances.balance + excluded.balance,
        updated_at = now();
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.allowance_balances
    set balance = balance - old.amount,
        updated_at = now()
    where user_id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_allowance_delta on public.allowance_ledger;
create trigger trg_allowance_delta
after insert or update or delete on public.allowance_ledger
for each row
execute function public.apply_allowance_delta();

-- RLS
alter table public.app_members enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.stickers enable row level security;
alter table public.allowance_ledger enable row level security;
alter table public.allowance_balances enable row level security;
alter table public.grocery_items enable row level security;

-- Membership check helper
create or replace function public.is_member(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(select 1 from public.app_members m where m.user_id = uid)
$$;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(select 1 from public.app_members m where m.user_id = uid and m.role = 'owner')
$$;

-- app_members: members can read, owners can write
drop policy if exists app_members_select_members on public.app_members;
create policy app_members_select_members
on public.app_members
for select
using (public.is_member(auth.uid()));

drop policy if exists app_members_owner_write on public.app_members;
create policy app_members_owner_write
on public.app_members
for all
using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));

-- purchase_requests
drop policy if exists pr_select_members on public.purchase_requests;
create policy pr_select_members
on public.purchase_requests
for select
using (public.is_member(auth.uid()));

drop policy if exists pr_insert_members on public.purchase_requests;
create policy pr_insert_members
on public.purchase_requests
for insert
with check (public.is_member(auth.uid()) and created_by = auth.uid());

drop policy if exists pr_update_members on public.purchase_requests;
create policy pr_update_members
on public.purchase_requests
for update
using (public.is_member(auth.uid()))
with check (public.is_member(auth.uid()));

-- stickers
drop policy if exists stickers_select_members on public.stickers;
create policy stickers_select_members
on public.stickers
for select
using (public.is_member(auth.uid()));

drop policy if exists stickers_owner_write on public.stickers;
create policy stickers_owner_write
on public.stickers
for all
using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));

-- allowance_ledger
drop policy if exists ledger_select_members on public.allowance_ledger;
create policy ledger_select_members
on public.allowance_ledger
for select
using (public.is_member(auth.uid()));

drop policy if exists ledger_owner_insert on public.allowance_ledger;
create policy ledger_owner_insert
on public.allowance_ledger
for insert
with check (public.is_owner(auth.uid()) and created_by = auth.uid());

drop policy if exists ledger_owner_update_delete on public.allowance_ledger;
create policy ledger_owner_update_delete
on public.allowance_ledger
for update
using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));

drop policy if exists ledger_owner_delete on public.allowance_ledger;
create policy ledger_owner_delete
on public.allowance_ledger
for delete
using (public.is_owner(auth.uid()));

-- allowance_balances and grocery_items
drop policy if exists balances_select_members on public.allowance_balances;
create policy balances_select_members
on public.allowance_balances
for select
using (public.is_member(auth.uid()));

drop policy if exists grocery_select_members on public.grocery_items;
create policy grocery_select_members
on public.grocery_items
for select
using (public.is_member(auth.uid()));

drop policy if exists grocery_insert_members on public.grocery_items;
create policy grocery_insert_members
on public.grocery_items
for insert
with check (public.is_member(auth.uid()) and created_by = auth.uid());

drop policy if exists grocery_update_members on public.grocery_items;
create policy grocery_update_members
on public.grocery_items
for update
using (public.is_member(auth.uid()))
with check (public.is_member(auth.uid()));

drop policy if exists grocery_delete_members on public.grocery_items;
create policy grocery_delete_members
on public.grocery_items
for delete
using (public.is_member(auth.uid()));
