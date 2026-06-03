## Goal
Create `public.admin_list_users()` RPC so Admin → User Management lists every user — including auth users without a profile — and ensure new signups always get a profile row.

## Migration (non-destructive)

**1. Create `public.admin_list_users()` as `SECURITY DEFINER`**
- Returns: `id uuid, user_id uuid, name text, employee_id text, username text, status text, requested_department text, roles text[]`
- Guard: `IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;`
- Source: `auth.users u` LEFT JOIN `public.profiles p ON p.user_id = u.id` LEFT JOIN aggregated roles (`SELECT user_id, array_agg(role) FROM public.user_roles GROUP BY user_id`)
- Fallback values when profile is missing: `name = COALESCE(p.name, split_part(u.email,'@',1), 'Unknown')`, `employee_id = COALESCE(p.employee_id, 'TBD')`, `username = COALESCE(p.username, u.email, '')`, `status = COALESCE(p.status, 'active')`, `requested_department = COALESCE(p.requested_department::text, 'worker')`, `roles = COALESCE(r.roles, ARRAY[]::text[])`
- `id = COALESCE(p.id, u.id)` so the frontend key stays stable
- `SET search_path = public, auth`
- `GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;` (revoke from anon)

**2. Re-assert signup trigger (idempotent, no data touched)**
- `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`
- `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
- `handle_new_user` already exists — not modified.

**3. Backfill missing profiles (safe, additive)**
- `INSERT INTO public.profiles (user_id, name, employee_id, username, requested_department) SELECT u.id, COALESCE(split_part(u.email,'@',1),'New User'), 'TBD', COALESCE(u.email,''), 'worker' FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE p.id IS NULL;`
- Pure insert — never updates or deletes existing rows.

## Frontend change
`src/pages/admin/UserManagement.tsx` — replace the two `from("profiles")` + `from("user_roles")` fetches in `fetchUsers()` with a single `supabase.rpc("admin_list_users")` call, map the returned rows into the existing `UserRow` shape. No other UI changes.

## Out of scope
No edits to existing users, roles, profiles, RLS policies, or `handle_new_user`. No destructive SQL.