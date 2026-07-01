-- ============================================================================
-- Auto-create a profile row whenever a new auth user signs up.
--
-- Runs as SECURITY DEFINER so it can insert into `profiles` regardless of RLS.
-- full_name is pulled from the signup metadata if provided.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- Fire the function after each new row in auth.users.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
