-- Streaks: owner only
DROP POLICY IF EXISTS "streaks readable" ON public.streaks;
CREATE POLICY "streaks readable by owner" ON public.streaks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Badges: owner only
DROP POLICY IF EXISTS "user badges readable" ON public.user_badges;
CREATE POLICY "user badges readable by owner" ON public.user_badges
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Leaderboard: own row, or same league within the same season
DROP POLICY IF EXISTS "leaderboard readable" ON public.leaderboard_entries;
CREATE POLICY "leaderboard readable in own league" ON public.leaderboard_entries
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR league_id = (SELECT p.league_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- XP engine: no direct execution by signed-in users
CREATE OR REPLACE FUNCTION public.award_xp_for(_user_id uuid, _kind text, _amount integer, _source_key text DEFAULT NULL::text)
 RETURNS TABLE(awarded integer, total_xp integer, current_streak integer, streak_incremented boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := _user_id;
  _inserted boolean := false;
  _total integer := 0;
  _streak integer := 0;
  _bumped boolean := false;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _last date;
  _season uuid;
  _league uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 0 OR _amount > 500 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  IF _source_key IS NULL THEN
    INSERT INTO public.xp_events (user_id, kind, amount, source_key) VALUES (_uid, _kind, _amount, NULL);
    _inserted := true;
  ELSE
    INSERT INTO public.xp_events (user_id, kind, amount, source_key)
    VALUES (_uid, _kind, _amount, _source_key)
    ON CONFLICT (user_id, source_key) WHERE source_key IS NOT NULL DO NOTHING;
    _inserted := FOUND;
  END IF;

  IF _inserted AND _amount > 0 THEN
    UPDATE public.profiles p SET xp = p.xp + _amount, updated_at = now() WHERE p.id = _uid RETURNING p.xp INTO _total;

    SELECT s.id INTO _season FROM public.league_seasons s WHERE s.is_active ORDER BY s.starts_at DESC LIMIT 1;
    SELECT p.league_id INTO _league FROM public.profiles p WHERE p.id = _uid;
    IF _season IS NOT NULL AND _league IS NOT NULL THEN
      INSERT INTO public.leaderboard_entries (season_id, user_id, league_id, xp)
      VALUES (_season, _uid, _league, _amount)
      ON CONFLICT (season_id, user_id) DO UPDATE SET xp = public.leaderboard_entries.xp + EXCLUDED.xp, updated_at = now();
    END IF;
  ELSE
    SELECT p.xp INTO _total FROM public.profiles p WHERE p.id = _uid;
  END IF;

  INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (_uid, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT st.last_activity_date INTO _last FROM public.streaks st WHERE st.user_id = _uid;
  IF _last IS DISTINCT FROM _today THEN
    UPDATE public.streaks st
      SET current_streak = CASE WHEN _last = _today - 1 THEN st.current_streak + 1 ELSE 1 END,
          longest_streak = GREATEST(st.longest_streak, CASE WHEN _last = _today - 1 THEN st.current_streak + 1 ELSE 1 END),
          last_activity_date = _today,
          updated_at = now()
    WHERE st.user_id = _uid
    RETURNING st.current_streak INTO _streak;
    INSERT INTO public.streak_days (user_id, day) VALUES (_uid, _today) ON CONFLICT DO NOTHING;
    _bumped := true;
  ELSE
    SELECT st.current_streak INTO _streak FROM public.streaks st WHERE st.user_id = _uid;
  END IF;

  RETURN QUERY SELECT CASE WHEN _inserted THEN _amount ELSE 0 END, COALESCE(_total, 0), COALESCE(_streak, 0), _bumped;
END;
$function$;

REVOKE ALL ON FUNCTION public.award_xp_for(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for(uuid, text, integer, text) TO service_role;

DROP FUNCTION IF EXISTS public.award_xp(text, integer, text);