-- AI Speaking Coach — PostgreSQL schema
-- Applied automatically on first query when DATABASE_URL is set.
-- Designed so a future auth system only needs to fill user_id.

create table if not exists practice_sessions (
  id                text primary key,
  user_id           text,                    -- null until auth exists
  scenario_id       text not null,
  custom_topic      text,
  native_language   text not null,
  target_language   text not null,
  level             text not null,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_ms       bigint not null default 0,
  speaking_ms       bigint not null default 0,
  words_spoken      integer not null default 0,
  turns             integer not null default 0,
  -- Scores: nullable; *_estimated flags whether a real provider measured them.
  pronunciation_score   double precision,
  pronunciation_estimated boolean not null default true,
  grammar_score         double precision,
  grammar_estimated     boolean not null default true,
  vocabulary_score      double precision,
  vocabulary_estimated  boolean not null default true,
  fluency_words_per_minute double precision,
  fillers               integer not null default 0,
  messages          jsonb not null default '[]',
  analyses          jsonb not null default '[]',
  synced_at         timestamptz not null default now()
);

create index if not exists sessions_started_idx on practice_sessions (started_at desc);
create index if not exists sessions_user_idx on practice_sessions (user_id);

create table if not exists word_practice (
  id            bigserial primary key,
  user_id       text,
  session_id    text references practice_sessions(id) on delete set null,
  word          text not null,
  language      text not null,
  attempts      integer not null default 0,
  best_accuracy double precision,          -- 0–1 transcript match (estimate)
  estimated     boolean not null default true,
  updated_at    timestamptz not null default now(),
  unique (word, language)
);

create table if not exists daily_activity (
  user_id          text not null default 'local',
  day              date not null,
  sessions         integer not null default 0,
  speaking_seconds bigint not null default 0,
  words            integer not null default 0,
  primary key (user_id, day)
);
