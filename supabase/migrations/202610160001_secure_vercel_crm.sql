-- Preserve the existing 106 contacts; add a stable frontend identifier and private card-photo storage.
alter table public.contacts
  add column if not exists app_id text;

update public.contacts
set app_id = id::text
where app_id is null;

alter table public.contacts
  alter column app_id set default gen_random_uuid()::text;

create unique index if not exists contacts_app_id_uidx on public.contacts (app_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crm-card-images', 'crm-card-images', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists crm_card_images_authenticated_select on storage.objects;
create policy crm_card_images_authenticated_select
on storage.objects for select to authenticated
using (bucket_id = 'crm-card-images');

drop policy if exists crm_card_images_authenticated_insert on storage.objects;
create policy crm_card_images_authenticated_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'crm-card-images');

drop policy if exists crm_card_images_authenticated_update on storage.objects;
create policy crm_card_images_authenticated_update
on storage.objects for update to authenticated
using (bucket_id = 'crm-card-images')
with check (bucket_id = 'crm-card-images');

drop policy if exists crm_card_images_authenticated_delete on storage.objects;
create policy crm_card_images_authenticated_delete
on storage.objects for delete to authenticated
using (bucket_id = 'crm-card-images');

-- The helper functions should not be callable directly by anonymous clients.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.is_admin() from anon, authenticated;
