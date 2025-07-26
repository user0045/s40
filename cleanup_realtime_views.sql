-- Drop all functions from add_realtime_views.sql
DROP FUNCTION IF EXISTS public.increment_episode_views(UUID);
DROP FUNCTION IF EXISTS public.get_show_total_views(UUID[]);
DROP FUNCTION IF EXISTS public.get_season_total_views(UUID[]);
DROP FUNCTION IF EXISTS public.get_web_series_total_views(UUID);
DROP FUNCTION IF EXISTS public.increment_movie_views(UUID);
DROP FUNCTION IF EXISTS public.get_platform_stats();

-- Remove views column from episode table
ALTER TABLE public.episode DROP COLUMN IF EXISTS views;
