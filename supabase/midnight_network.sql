-- Midnight Signal v16.4 - optional Midnight Network basket identity metadata
-- Run this only if you want asset role metadata persisted in Supabase.

create table if not exists asset_roles (
  symbol text primary key,
  network text not null,
  role text not null,
  short_role text not null,
  thesis text not null,
  updated_at timestamp with time zone default now()
);

insert into asset_roles (symbol, network, role, short_role, thesis)
values
  ('BTC', 'Bitcoin', 'Liquidity / macro anchor', 'Macro anchor', 'BTC sets the broad risk backdrop for crypto liquidity and market appetite.'),
  ('ADA', 'Cardano', 'Cardano ecosystem anchor', 'Cardano anchor', 'ADA reflects Cardano ecosystem strength, which matters for Midnight network attention.'),
  ('NIGHT', 'Cardano / Midnight', 'Midnight ecosystem asset', 'Midnight asset', 'NIGHT is the direct Midnight asset and should represent Midnight-specific signal strength.')
on conflict (symbol) do update set
  network = excluded.network,
  role = excluded.role,
  short_role = excluded.short_role,
  thesis = excluded.thesis,
  updated_at = now();
