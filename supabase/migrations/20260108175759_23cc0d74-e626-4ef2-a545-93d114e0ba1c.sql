-- Create roles enum and table for admin access control
create type public.app_role as enum ('admin', 'employee');

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Setups table
create table public.setups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.setups enable row level security;

-- Machines table
create table public.machines (
    id uuid primary key default gen_random_uuid(),
    serial_number text not null unique,
    model text,
    status text default 'active',
    setup_id uuid references public.setups(id) on delete set null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.machines enable row level security;

-- RLS Policies for user_roles
create policy "Users can see their own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage all roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for setups
create policy "Authenticated users can view setups"
on public.setups
for select
to authenticated
using (true);

create policy "Admins can insert setups"
on public.setups
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update setups"
on public.setups
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete setups"
on public.setups
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for machines
create policy "Authenticated users can view machines"
on public.machines
for select
to authenticated
using (true);

create policy "Admins can insert machines"
on public.machines
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update machines"
on public.machines
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete machines"
on public.machines
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_setups_updated_at
before update on public.setups
for each row
execute function public.update_updated_at_column();

create trigger update_machines_updated_at
before update on public.machines
for each row
execute function public.update_updated_at_column();