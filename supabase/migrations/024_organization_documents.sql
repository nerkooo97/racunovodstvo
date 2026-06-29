-- Fleksibilna evidencija svih dokumenata organizacije (radnici, partneri, upload, …)

create table public.organization_documents (
  id                uuid        primary key default gen_random_uuid(),
  organization_id   uuid        not null references public.organizations(id) on delete cascade,

  category          text        not null default 'general',
  document_type     text        not null,
  document_label    text        not null,

  employee_id       uuid        references public.employees(id) on delete set null,
  partner_id        uuid        references public.partners(id) on delete set null,

  document_number   text        not null,
  sequence_number   int         not null,
  year              int         not null,
  number_prefix     text,

  document_date     date        not null,
  document_place    text,
  title             text,
  notes             text,

  payload           jsonb       not null default '{}',
  metadata          jsonb       not null default '{}',

  storage_path      text,
  mime_type         text        not null default 'application/pdf',
  file_name         text,

  source            text        not null default 'generated'
    check (source in ('generated', 'upload', 'import')),

  status            text        not null default 'issued'
    check (status in ('draft', 'issued', 'cancelled', 'archived')),

  created_by        uuid        references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (organization_id, document_type, year, sequence_number)
);

create index organization_documents_org_idx
  on public.organization_documents (organization_id, year desc, created_at desc);

create index organization_documents_employee_idx
  on public.organization_documents (employee_id, created_at desc)
  where employee_id is not null;

create index organization_documents_category_idx
  on public.organization_documents (organization_id, category, created_at desc);

create index organization_documents_type_idx
  on public.organization_documents (organization_id, document_type, year desc);

alter table public.organization_documents enable row level security;

create policy "organization_documents_owner_select"
  on public.organization_documents for select
  to authenticated
  using (
    organization_id in (
      select id from public.organizations where owner_id = (select auth.uid())
    )
  );

create policy "organization_documents_owner_insert"
  on public.organization_documents for insert
  to authenticated
  with check (
    organization_id in (
      select id from public.organizations where owner_id = (select auth.uid())
    )
  );

create policy "organization_documents_owner_update"
  on public.organization_documents for update
  to authenticated
  using (
    organization_id in (
      select id from public.organizations where owner_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select id from public.organizations where owner_id = (select auth.uid())
    )
  );

create policy "organization_documents_owner_delete"
  on public.organization_documents for delete
  to authenticated
  using (
    organization_id in (
      select id from public.organizations where owner_id = (select auth.uid())
    )
  );

-- Privatni bucket za arhivu dokumenata
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-documents',
  'org-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy "org_documents_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );

create policy "org_documents_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );

create policy "org_documents_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'org-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where owner_id = (select auth.uid())
    )
  );
