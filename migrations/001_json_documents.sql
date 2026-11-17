create table if not exists json_documents (
  name text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);
