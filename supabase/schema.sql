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

-- Apply allowance effects for purchase request status changes
-- Rules:
-- - When request moves into approved, deduct total (cost + shipping)
-- - When request moves out of approved into denied/wishlist, refund total
create or replace function public.apply_purchase_request_allowance_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_amount numeric(12,2);
  actor uuid;
  available_balance numeric(12,2);
  member_uid uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  total_amount := coalesce(new.cost, 0) + coalesce(new.shipping_cost, 0);
  actor := coalesce(auth.uid(), new.created_by, old.created_by);

  -- Prefer the request owner if they are not owner.
  select m.user_id
  into member_uid
  from public.app_members m
  where m.user_id = new.created_by
    and m.role <> 'owner'
  limit 1;

  -- Fallback to any explicit member row.
  if member_uid is null then
    select m.user_id
    into member_uid
    from public.app_members m
    where m.role = 'member'
    limit 1;
  end if;

  -- Last fallback to any non-owner row.
  if member_uid is null then
    select m.user_id
    into member_uid
    from public.app_members m
    where m.role <> 'owner'
    limit 1;
  end if;

  if member_uid is null then
    raise exception 'No member user found for allowance operations'
      using errcode = 'P0001';
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    select coalesce(b.balance, 0)
    into available_balance
    from public.allowance_balances b
    where b.user_id = member_uid;

    if coalesce(available_balance, 0) < total_amount then
      raise exception 'Insufficient member allowance balance'
        using errcode = 'P0001';
    end if;
  end if;

  if old.status = 'denied' and new.status = 'approved' then
    insert into public.allowance_ledger (user_id, amount, reason, message, created_by, created_at)
    values (
      member_uid,
      -total_amount,
      'Purchase Re-Approved',
      'PR:' || new.id::text || ' moved from denied to approved',
      actor,
      now()
    );
  elsif new.status = 'approved' and old.status <> 'approved' then
    insert into public.allowance_ledger (user_id, amount, reason, message, created_by, created_at)
    values (
      member_uid,
      -total_amount,
      'Purchase Approved',
      'PR:' || new.id::text || ' moved to approved',
      actor,
      now()
    );
  elsif old.status = 'approved' and new.status in ('denied', 'wishlist') then
    insert into public.allowance_ledger (user_id, amount, reason, message, created_by, created_at)
    values (
      member_uid,
      total_amount,
      'Purchase Refund',
      'PR:' || new.id::text || ' moved from approved to ' || new.status,
      actor,
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_purchase_requests_allowance_effects on public.purchase_requests;
create trigger trg_purchase_requests_allowance_effects
after update on public.purchase_requests
for each row
execute function public.apply_purchase_request_allowance_effects();

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

create or replace function public.can_update_purchase_request(
  uid uuid,
  pr_id uuid,
  new_status text,
  new_created_by uuid
)
returns boolean
language sql
stable
as $$
  with me as (
    select m.role
    from public.app_members m
    where m.user_id = uid
  ), old_row as (
    select p.status, p.created_by
    from public.purchase_requests p
    where p.id = pr_id
  )
  select exists(
    select 1
    from me, old_row
    where
      (
        (me.role = 'owner' and new_status in ('approved', 'denied'))
        or
        (me.role = 'member' and old_row.created_by = uid and old_row.status = 'denied' and new_status = 'wishlist')
        or
        (me.role = 'member' and old_row.created_by = uid and old_row.status = 'wishlist' and new_status = 'pending')
      )
      and new_created_by = old_row.created_by
  )
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
with check (
  exists(
    select 1
    from public.app_members m
    where m.user_id = auth.uid()
      and m.role = 'member'
  )
  and created_by = auth.uid()
);

drop policy if exists pr_update_members on public.purchase_requests;
create policy pr_update_members
on public.purchase_requests
for update
using (public.is_member(auth.uid()))
with check (public.can_update_purchase_request(auth.uid(), id, status, created_by));

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
with check (public.is_owner(auth.uid()));

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
