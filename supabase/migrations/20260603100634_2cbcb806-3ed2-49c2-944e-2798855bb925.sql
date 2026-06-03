CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  employee_id text,
  username text,
  status text,
  requested_department text,
  roles text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.id, u.id) AS id,
    u.id AS user_id,
    COALESCE(p.name, split_part(u.email, '@', 1), 'Unknown') AS name,
    COALESCE(p.employee_id, 'TBD') AS employee_id,
    COALESCE(p.username, u.email, '') AS username,
    COALESCE(p.status, 'active') AS status,
    COALESCE(p.requested_department::text, 'worker') AS requested_department,
    COALESCE(r.roles, ARRAY[]::text[]) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN (
    SELECT ur.user_id, array_agg(ur.role::text) AS roles
    FROM public.user_roles ur
    GROUP BY ur.user_id
  ) r ON r.user_id = u.id
  ORDER BY COALESCE(p.name, u.email);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, name, employee_id, username, requested_department)
SELECT
  u.id,
  COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'New User'),
  'TBD-' || substr(u.id::text, 1, 8),
  COALESCE(u.email, ''),
  'worker'::public.signup_department
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;