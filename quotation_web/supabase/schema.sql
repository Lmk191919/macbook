create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null unique,
  customer_name text not null,
  customer_phone text,
  project_name text not null,
  area double precision not null check (area >= 0),
  renovation_type text not null,
  address text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quotes_updated_at_idx on public.quotes (updated_at desc);
create index if not exists quotes_customer_name_idx on public.quotes (customer_name);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spaces jsonb not null default '[]'::jsonb,
  unit text not null,
  pricing_mode text not null check (pricing_mode in ('combined', 'split')),
  combined_unit_price bigint not null default 0 check (combined_unit_price >= 0),
  labor_unit_price bigint not null default 0 check (labor_unit_price >= 0),
  material_unit_price bigint not null default 0 check (material_unit_price >= 0),
  description text,
  notes text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists catalog_items_sort_order_idx on public.catalog_items (sort_order asc);

create table if not exists public.quote_spaces (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  name text not null,
  notes text,
  area double precision,
  wall_area double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quote_spaces_quote_id_sort_order_idx
  on public.quote_spaces (quote_id, sort_order asc);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  space_id uuid not null references public.quote_spaces(id) on delete cascade,
  source_catalog_item_id uuid references public.catalog_items(id) on delete set null,
  name text not null,
  description text,
  unit text not null,
  quantity double precision not null check (quantity >= 0),
  pricing_mode text not null check (pricing_mode in ('combined', 'split')),
  combined_unit_price bigint not null default 0 check (combined_unit_price >= 0),
  labor_unit_price bigint not null default 0 check (labor_unit_price >= 0),
  material_unit_price bigint not null default 0 check (material_unit_price >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quote_items_space_id_sort_order_idx
  on public.quote_items (space_id, sort_order asc);
create index if not exists quote_items_quote_id_idx
  on public.quote_items (quote_id);

create table if not exists public.quote_adjustments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  kind text not null check (kind in ('charge', 'discount')),
  name text not null,
  amount bigint not null default 0 check (amount >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quote_adjustments_quote_id_sort_order_idx
  on public.quote_adjustments (quote_id, sort_order asc);
