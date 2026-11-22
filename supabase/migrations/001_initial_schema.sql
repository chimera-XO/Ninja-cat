-- ============================================================================
-- NINJA CAT: SHADOW RUN - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_telegram_id on public.profiles (telegram_id);

-- 2. GAME_SCORES TABLE
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 1000000),
  distance integer not null check (distance >= 0 and distance <= 250000),
  coins_collected integer not null check (coins_collected >= 0 and coins_collected <= 50000),
  created_at timestamptz not null default now()
);

create index if not exists idx_game_scores_user_id on public.game_scores (user_id);
create index if not exists idx_game_scores_score_desc on public.game_scores (score desc);

-- 3. PLAYER_STATS TABLE
create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  games_played integer not null default 0 check (games_played >= 0),
  highest_score integer not null default 0 check (highest_score >= 0),
  total_coins integer not null default 0 check (total_coins >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_stats_highest_score on public.player_stats (highest_score desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- All writes are performed exclusively through server-side Next.js API routes
-- using the SUPABASE_SERVICE_ROLE_KEY after verifying Telegram initData HMAC
-- and anti-cheat score physics bounds.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.game_scores enable row level security;
alter table public.player_stats enable row level security;

-- Public read access for leaderboard & profile display
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Public read game_scores" on public.game_scores;
create policy "Public read game_scores"
  on public.game_scores for select
  using (true);

drop policy if exists "Public read player_stats" on public.player_stats;
create policy "Public read player_stats"
  on public.player_stats for select
  using (true);

-- Atomic RPC helper to record a validated run and update player_stats safely
create or replace function public.record_game_run(
  p_user_id uuid,
  p_score integer,
  p_distance integer,
  p_coins integer
)
returns table (
  games_played integer,
  highest_score integer,
  total_coins integer,
  is_new_record boolean
)
language plpgsql
security definer
as $$
declare
  v_prev_best integer := 0;
  v_new_best integer := 0;
  v_games integer := 0;
  v_coins integer := 0;
begin
  select coalesce(ps.highest_score, 0)
    into v_prev_best
    from public.player_stats ps
   where ps.user_id = p_user_id;

  insert into public.game_scores (user_id, score, distance, coins_collected)
  values (p_user_id, p_score, p_distance, p_coins);

  insert into public.player_stats (user_id, games_played, highest_score, total_coins, updated_at)
  values (p_user_id, 1, p_score, p_coins, now())
  on conflict (user_id) do update
    set games_played  = public.player_stats.games_played + 1,
        highest_score = greatest(public.player_stats.highest_score, excluded.highest_score),
        total_coins   = public.player_stats.total_coins + excluded.total_coins,
        updated_at    = now()
  returning public.player_stats.games_played,
            public.player_stats.highest_score,
            public.player_stats.total_coins
    into v_games, v_new_best, v_coins;

  return query select v_games, v_new_best, v_coins, (p_score > v_prev_best);
end;
$$;
