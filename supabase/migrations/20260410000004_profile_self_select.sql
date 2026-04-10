-- Allow users to read their own profile row via the anon-key session client.
--
-- This policy is belt-and-suspenders alongside the existing "profiles_select_own"
-- policy from the initial schema. The original policy should already exist, but
-- if it was ever dropped (e.g., during a manual Supabase dashboard operation or
-- a partial migration run), the middleware's role check after OAuth signup would
-- fail: the callback upserts the profile via the service-role key (bypasses RLS),
-- but middleware uses the anon-key session client to look up the profile and gets
-- NULL back — causing an infinite redirect loop to /signup.
--
-- Re-creating the policy idempotently (DROP IF EXISTS + CREATE) ensures the live
-- database always has this policy regardless of migration history.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);
