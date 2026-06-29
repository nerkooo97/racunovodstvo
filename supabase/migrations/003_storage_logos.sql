-- Create public logos bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
);

-- Anyone can view logos (public bucket)
create policy "Logos su javno dostupni"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Authenticated users can upload to their own user folder
create policy "Korisnik može uploadovati vlastiti logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can replace their own logo
create policy "Korisnik može ažurirati vlastiti logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own logo
create policy "Korisnik može obrisati vlastiti logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
