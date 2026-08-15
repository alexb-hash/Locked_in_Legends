CREATE POLICY "character art read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'character-art' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "character art insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'character-art' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "character art update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'character-art' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'character-art' AND (storage.foldername(name))[1] = auth.uid()::text);