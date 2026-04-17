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
  relationship_type   text not null default 'references',
  source_method       text not null default 'parser',
  confidence          numeric(4,3),
  explanation         text not null default 'Referenced directly in text',
  primary key (from_canonical_id, to_canonical_id)
);
-- Migration for existing databases:
-- ALTER TABLE citations
--   ADD COLUMN IF NOT EXISTS relationship_type text NOT NULL DEFAULT 'references',
--   ADD COLUMN IF NOT EXISTS source_method text NOT NULL DEFAULT 'parser',
--   ADD COLUMN IF NOT EXISTS confidence numeric(4,3),
--   ADD COLUMN IF NOT EXISTS explanation text NOT NULL DEFAULT 'Referenced directly in text';

create table if not exists aliases (
  alias               text primary key,
  canonical_id        text not null references provisions(canonical_id)
);

create table if not exists ambiguous_citations (
  raw                 text not null,
  candidate_ids       text[] not null,
  created_at          timestamptz default now()
);

create table if not exists citation_requests (
  canonical_id     text primary key,
  latest_raw_input text not null,
  requested_at     timestamptz not null default now(),
  request_count    int not null default 1,
  status           text not null default 'requested',
  source_mode      text not null default 'manual',
  last_error       text
);

create table if not exists missing_nodes (
  canonical_id        text primary key,
  inbound_count       int not null default 1,
  priority_score      numeric(8,4) not null default 0,
  first_seen_at       timestamptz default now(),
  last_seen_at        timestamptz default now()
);
