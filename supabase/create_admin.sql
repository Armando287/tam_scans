-- ============================================================
-- Create the admin user for MangaVerse.
-- Run this AFTER schema.sql, in the Supabase Dashboard → SQL Editor.
--
-- ⚠️ CHANGE the email/password below before running, and change the
-- password again after your first login. This inserts directly into
-- Supabase's auth tables (a documented seeding technique) since we
-- were only given the anon/publishable key, not the service_role key.
-- ============================================================

do $$
declare
  admin_email    text := 'admin@mangaverse.local';   -- 🔧 change me
  admin_password text := 'ChangeMe123!';              -- 🔧 change me
  new_user_id    uuid := gen_random_uuid();
begin
  -- Skip if a user with this email already exists
  if exists (select 1 from auth.users where email = admin_email) then
    raise notice 'User % already exists, promoting to admin only.', admin_email;

    update public.profiles
    set is_admin = true
    where id = (select id from auth.users where email = admin_email);

    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change, email_change_token_new,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('display_name', 'Admin'),
    now(), now(), false, false
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
  ) values (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    'email',
    jsonb_build_object('sub', new_user_id::text, 'email', admin_email),
    now(), now(), now()
  );

  -- The on_auth_user_created trigger (from schema.sql) creates the
  -- matching public.profiles row automatically. Now promote it to admin.
  update public.profiles set is_admin = true where id = new_user_id;

  raise notice 'Admin user created: % / %', admin_email, admin_password;
end $$;
