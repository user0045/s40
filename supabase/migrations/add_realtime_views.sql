
-- Add views column to episode table if it doesn't exist
ALTER TABLE public.episode ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;

-- Function to increment episode views
CREATE OR REPLACE FUNCTION public.increment_episode_views(episode_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.episode 
    SET views = COALESCE(views, 0) + 1, updated_at = now()
    WHERE episode_id = episode_uuid;
    
    -- Log the operation for debugging
    RAISE NOTICE 'Updated episode % views to %', episode_uuid, (SELECT views FROM public.episode WHERE episode_id = episode_uuid);
END;
$$;

-- Function to increment movie views
CREATE OR REPLACE FUNCTION public.increment_movie_views(movie_content_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.movie 
    SET views = views + 1, updated_at = now()
    WHERE content_id = movie_content_id;
END;
$$;

-- Function to get movie views
CREATE OR REPLACE FUNCTION public.get_movie_views(movie_content_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    movie_views BIGINT := 0;
BEGIN
    SELECT COALESCE(views, 0) INTO movie_views
    FROM public.movie
    WHERE content_id = movie_content_id;
    
    RETURN movie_views;
END;
$$;

-- Function to get episode views
CREATE OR REPLACE FUNCTION public.get_episode_views(episode_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    episode_views BIGINT := 0;
BEGIN
    SELECT COALESCE(views, 0) INTO episode_views
    FROM public.episode
    WHERE episode_id = episode_uuid;
    
    RETURN episode_views;
END;
$$;

-- Function to get total views for a show (sum of all episodes)
CREATE OR REPLACE FUNCTION public.get_show_total_views(show_episode_ids UUID[])
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total_views BIGINT := 0;
BEGIN
    SELECT COALESCE(SUM(views), 0) INTO total_views
    FROM public.episode
    WHERE episode_id = ANY(show_episode_ids);
    
    RETURN total_views;
END;
$$;

-- Function to get show views by show content ID
CREATE OR REPLACE FUNCTION public.get_show_views_by_content_id(show_content_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total_views BIGINT := 0;
    show_episodes UUID[];
BEGIN
    -- Get episode list for the show
    SELECT episode_id_list INTO show_episodes
    FROM public.show
    WHERE id = show_content_id;
    
    IF show_episodes IS NOT NULL AND array_length(show_episodes, 1) > 0 THEN
        SELECT public.get_show_total_views(show_episodes) INTO total_views;
    END IF;
    
    RETURN total_views;
END;
$$;

-- Function to get total views for a season (sum of all episodes in that season)
CREATE OR REPLACE FUNCTION public.get_season_total_views(season_episode_ids UUID[])
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total_views BIGINT := 0;
BEGIN
    SELECT COALESCE(SUM(views), 0) INTO total_views
    FROM public.episode
    WHERE episode_id = ANY(season_episode_ids);
    
    RETURN total_views;
END;
$$;

-- Function to get total views for web series (sum of all episodes across all seasons)
CREATE OR REPLACE FUNCTION public.get_web_series_total_views(web_series_content_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total_views BIGINT := 0;
    season_record RECORD;
BEGIN
    -- Get all seasons for this web series
    FOR season_record IN 
        SELECT s.season_id, s.episode_id_list
        FROM public.season s
        JOIN public.web_series ws ON s.season_id = ANY(ws.season_id_list)
        WHERE ws.content_id = web_series_content_id
    LOOP
        -- Add views from all episodes in this season
        IF season_record.episode_id_list IS NOT NULL AND array_length(season_record.episode_id_list, 1) > 0 THEN
            SELECT total_views + COALESCE(SUM(views), 0) INTO total_views
            FROM public.episode
            WHERE episode_id = ANY(season_record.episode_id_list);
        END IF;
    END LOOP;
    
    RETURN total_views;
END;
$$;

-- Function to get overall platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
    total_movies BIGINT,
    total_shows BIGINT,
    total_web_series BIGINT,
    total_movie_views BIGINT,
    total_show_views BIGINT,
    total_web_series_views BIGINT,
    total_views BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    movie_views_sum BIGINT := 0;
    show_views_sum BIGINT := 0;
    web_series_views_sum BIGINT := 0;
    show_record RECORD;
    web_series_record RECORD;
BEGIN
    -- Get movie views
    SELECT COALESCE(SUM(m.views), 0) INTO movie_views_sum FROM public.movie m;
    
    -- Get show views (sum of all episodes for each show)
    FOR show_record IN SELECT id FROM public.show
    LOOP
        show_views_sum := show_views_sum + public.get_show_views_by_content_id(show_record.id);
    END LOOP;
    
    -- Get web series views (sum of all episodes for each web series)
    FOR web_series_record IN SELECT content_id FROM public.web_series
    LOOP
        web_series_views_sum := web_series_views_sum + public.get_web_series_total_views(web_series_record.content_id);
    END LOOP;
    
    RETURN QUERY
    SELECT 
        -- Count of content types
        (SELECT COUNT(*) FROM public.upload_content WHERE content_type = 'Movie')::BIGINT,
        (SELECT COUNT(*) FROM public.upload_content WHERE content_type = 'Show')::BIGINT,
        (SELECT COUNT(*) FROM public.upload_content WHERE content_type = 'Web Series')::BIGINT,
        -- Total views by content type
        movie_views_sum,
        show_views_sum,
        web_series_views_sum,
        -- Total platform views
        (movie_views_sum + show_views_sum + web_series_views_sum)::BIGINT;
END;
$$;

-- Function to get content views by type and ID (used by the API)
CREATE OR REPLACE FUNCTION public.get_content_views(content_type_param TEXT, content_id_param UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    views_count BIGINT := 0;
BEGIN
    CASE content_type_param
        WHEN 'movie' THEN
            SELECT public.get_movie_views(content_id_param) INTO views_count;
        WHEN 'show' THEN
            SELECT public.get_show_views_by_content_id(content_id_param) INTO views_count;
        WHEN 'web-series' THEN
            SELECT public.get_web_series_total_views(content_id_param) INTO views_count;
        WHEN 'episode' THEN
            SELECT public.get_episode_views(content_id_param) INTO views_count;
        ELSE
            views_count := 0;
    END CASE;
    
    RETURN views_count;
END;
$$;

-- Function to get season views by season ID
CREATE OR REPLACE FUNCTION public.get_season_total_views_by_id(season_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total_views BIGINT := 0;
    season_episodes UUID[];
BEGIN
    -- Get episode list for the season
    SELECT episode_id_list INTO season_episodes
    FROM public.season
    WHERE season_id = season_uuid;
    
    IF season_episodes IS NOT NULL AND array_length(season_episodes, 1) > 0 THEN
        SELECT public.get_season_total_views(season_episodes) INTO total_views;
    END IF;
    
    RETURN total_views;
END;
$$;
