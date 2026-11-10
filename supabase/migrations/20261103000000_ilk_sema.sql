-- İlk şema: profiller, ölçüler, ürünler, beden tabloları, favoriler
-- Her satır yalnızca kendi verisini görür (RLS): owner_id = auth.uid()

create extension if not exists pgcrypto;

-- Profiller (kullanıcının kendisi ve aile üyeleri)
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  ad          text not null,
  cinsiyet    text not null check (cinsiyet in ('kadin', 'erkek')),
  created_at  timestamptz not null default now()
);

-- Profil başına ölçüler (cm). Geçmiş tutulur; uygulama en son kaydı okur.
create table if not exists public.measurements (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  boy_cm      numeric(5, 1) not null check (boy_cm > 0),
  gogus_cm    numeric(5, 1) not null check (gogus_cm > 0),
  bel_cm      numeric(5, 1) not null check (bel_cm > 0),
  kalca_cm    numeric(5, 1) not null check (kalca_cm > 0),
  -- Kilo isteğe bağlıdır: hassas bir bilgi ve kullanıcı girmek zorunda değil. Boşsa ölçü
  -- çözücü kalan dört ölçüden weight key'ini de çözer (docs/glb-sozlesmesi.md).
  kilo_kg     numeric(5, 1) check (kilo_kg > 0),
  created_at  timestamptz not null default now()
);

create index if not exists measurements_profile_idx
  on public.measurements (profile_id, created_at desc);

-- Eklenen ürünler (internetten alınan kıyafetler)
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  ad           text not null,
  tur          text not null check (tur in ('tisort', 'pantolon', 'gomlek', 'elbise', 'etek')),
  gorsel_yolu  text,            -- Supabase Storage yolu
  kaynak_link  text,            -- ürün sayfası (varsa)
  created_at   timestamptz not null default now()
);

create index if not exists products_owner_idx on public.products (owner_id);

-- Ürüne ait beden tablosu (cm).
-- Ürün ölçüleri DÜZ SERİLİ GENİŞLİKTİR, çevre değildir: en_cm koltuk altından koltuk altına,
-- bel_cm ve kalca_cm ilgili hizada kenardan kenaradır. measurements tablosundaki vücut
-- ölçüleri ise çevredir; uygunluk hesabı ürün ölçüsünü 2 ile çarpıp karşılaştırır.
-- boy_cm, kol_cm ve ic_bacak_cm uzunluktur, çarpılmaz.
-- Türle ilgisi olmayan sütun boş kalır: kol_cm yalnızca üst giyimde, ic_bacak_cm yalnızca
-- pantolonda, bel_cm ve kalca_cm alt giyim ile elbisede dolar.
create table if not exists public.size_charts (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  beden        text not null,
  boy_cm       numeric(5, 1) check (boy_cm > 0),
  en_cm        numeric(5, 1) check (en_cm > 0),
  kol_cm       numeric(5, 1) check (kol_cm > 0),
  bel_cm       numeric(5, 1) check (bel_cm > 0),
  kalca_cm     numeric(5, 1) check (kalca_cm > 0),
  ic_bacak_cm  numeric(5, 1) check (ic_bacak_cm > 0),
  unique (product_id, beden),
  -- Her bedende en az bir ölçü dolu olmalı; tamamen boş satır işe yaramaz.
  constraint size_charts_en_az_bir_olcu check (
    num_nonnulls(boy_cm, en_cm, kol_cm, bel_cm, kalca_cm, ic_bacak_cm) > 0
  )
);

-- Favoriler
create table if not exists public.favorites (
  owner_id    uuid not null references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (owner_id, product_id)
);

-- ---------------------------------------------------------------
-- Satır düzeyi güvenlik (RLS)
-- ---------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.measurements   enable row level security;
alter table public.products       enable row level security;
alter table public.size_charts    enable row level security;
alter table public.favorites      enable row level security;

create policy "profiles: kendi kaydı"
  on public.profiles for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "measurements: kendi profilinin ölçüleri"
  on public.measurements for all
  using (exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id and p.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id and p.owner_id = auth.uid()));

create policy "products: kendi ürünleri"
  on public.products for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "size_charts: kendi ürününün tablosu"
  on public.size_charts for all
  using (exists (
    select 1 from public.products p
    where p.id = size_charts.product_id and p.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.products p
    where p.id = size_charts.product_id and p.owner_id = auth.uid()));

create policy "favorites: kendi favorileri"
  on public.favorites for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
