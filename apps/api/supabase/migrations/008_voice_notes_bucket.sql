INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  10485760,
  ARRAY['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "elderly_upload_voice_notes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "owner_read_voice_notes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
