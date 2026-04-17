create table if not exists provisions (
  canonical_id        text primary key,
  jurisdiction        text not null,
  code                text not null,
  section             text not null,
  text_content        text,
  ingestion_status    text not null default 'ingested',
  confidence          numeric(3,2) not null default 1.0,
  provenance_source   text,
  version_hash        text,
  ingested_at         timestamptz default now()
);

create table if not exists citations (
  from_canonical_id   text not null references provisions(canonical_id),
  to_canonical_id     text not null,
  depth_found         int,
  primary key (from_canonical_id, to_canonical_id)
);

create table if not exists aliases (
  alias               text primary key,
  canonical_id        text not null references provisions(canonical_id)
);

create table if not exists ambiguous_citations (
  raw                 text not null,
  candidate_ids       text[] not null,
  created_at          timestamptz default now()
);

create table if not exists missing_nodes (
  canonical_id        text primary key,
  inbound_count       int not null default 1,
  priority_score      numeric(8,4) not null default 0,
  first_seen_at       timestamptz default now(),
  last_seen_at        timestamptz default now()
);
