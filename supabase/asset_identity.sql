-- Midnight Signal v16.3 Asset Identity Layer
-- Canonicalizes ambiguous symbols so the Midnight Network asset resolves to NIGHT, not MID.

create table if not exists asset_identities (
  symbol text primary key,
  name text not null,
  network text,
  coingecko_id text,
  is_midnight_network boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists asset_aliases (
  alias text primary key,
  symbol text not null references asset_identities(symbol) on delete cascade,
  created_at timestamp with time zone default now()
);

insert into asset_identities (symbol, name, network, coingecko_id, is_midnight_network)
values
  ('BTC', 'Bitcoin', 'Bitcoin', 'bitcoin', true),
  ('ADA', 'Cardano', 'Cardano', 'cardano', true),
  ('NIGHT', 'Midnight', 'Cardano', null, true)
on conflict (symbol) do update set
  name = excluded.name,
  network = excluded.network,
  coingecko_id = excluded.coingecko_id,
  is_midnight_network = excluded.is_midnight_network,
  updated_at = now();

insert into asset_aliases (alias, symbol)
values
  ('BITCOIN', 'BTC'),
  ('XBT', 'BTC'),
  ('CARDANO', 'ADA'),
  ('MIDNIGHT', 'NIGHT'),
  ('MIDNIGHT NETWORK', 'NIGHT'),
  ('MID', 'NIGHT')
on conflict (alias) do update set symbol = excluded.symbol;

create index if not exists idx_asset_aliases_symbol on asset_aliases(symbol);
