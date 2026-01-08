-- Locations table
create table public.locations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    contact_name text,
    contact_phone text,
    spots_count integer not null check (spots_count > 0),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.locations enable row level security;

-- Location spots table (each spot can have one setup)
create table public.location_spots (
    id uuid primary key default gen_random_uuid(),
    location_id uuid references public.locations(id) on delete cascade not null,
    spot_number integer not null,
    setup_id uuid references public.setups(id) on delete set null unique,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    unique (location_id, spot_number)
);

alter table public.location_spots enable row level security;

-- RLS Policies for locations
create policy "Authenticated users can view locations"
on public.locations
for select
to authenticated
using (true);

create policy "Admins can insert locations"
on public.locations
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update locations"
on public.locations
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete locations"
on public.locations
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for location_spots
create policy "Authenticated users can view spots"
on public.location_spots
for select
to authenticated
using (true);

create policy "Admins can insert spots"
on public.location_spots
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update spots"
on public.location_spots
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete spots"
on public.location_spots
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
create trigger update_locations_updated_at
before update on public.locations
for each row
execute function public.update_updated_at_column();

create trigger update_location_spots_updated_at
before update on public.location_spots
for each row
execute function public.update_updated_at_column();

-- Function to auto-create spots when a location is created
create or replace function public.create_location_spots()
returns trigger as $$
begin
  for i in 1..new.spots_count loop
    insert into public.location_spots (location_id, spot_number)
    values (new.id, i);
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger create_spots_on_location_insert
after insert on public.locations
for each row
execute function public.create_location_spots();