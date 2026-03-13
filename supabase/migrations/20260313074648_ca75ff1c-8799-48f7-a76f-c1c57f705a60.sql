
-- Fix users who signed up before trigger was active
INSERT INTO public.profiles (user_id, name, employee_id, username)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', 'User'), COALESCE(u.raw_user_meta_data->>'employee_id', 'TBD'), COALESCE(u.email, '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'worker'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.id IS NULL;
