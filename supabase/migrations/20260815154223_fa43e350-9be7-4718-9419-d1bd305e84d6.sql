CREATE TABLE public.character_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.series(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, series_id, kind)
);
CREATE INDEX character_frames_lookup_idx ON public.character_frames (series_id, character_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_frames TO authenticated;
GRANT ALL ON public.character_frames TO service_role;
ALTER TABLE public.character_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frames readable" ON public.character_frames FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND (s.is_public OR s.owner_id = auth.uid())));
CREATE POLICY "frames write own" ON public.character_frames FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.episode_slides ADD COLUMN art_url text;