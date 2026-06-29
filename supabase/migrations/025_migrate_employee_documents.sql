-- Migracija sa ranije verzije employee_documents (ako postoji)

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'employee_documents'
  ) then
    insert into public.organization_documents (
      id, organization_id, category, document_type, document_label,
      employee_id, document_number, sequence_number, year, number_prefix,
      document_date, document_place, payload, storage_path, mime_type,
      source, status, created_by, created_at, updated_at
    )
    select
      id, organization_id, 'radnik', template_id, template_label,
      employee_id, document_number, sequence_number, year, null,
      document_date, document_place, payload, storage_path, 'application/pdf',
      'generated', status, created_by, created_at, updated_at
    from public.employee_documents;

    drop table public.employee_documents;
  end if;
end $$;

-- Ukloni stari bucket policy ako postoji (bucket ostaje za ručno čišćenje)
drop policy if exists "employee_docs_storage_select" on storage.objects;
drop policy if exists "employee_docs_storage_insert" on storage.objects;
drop policy if exists "employee_docs_storage_delete" on storage.objects;
