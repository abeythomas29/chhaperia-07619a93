-- Modify handle_new_user trigger to auto-approve admin accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, employee_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'TBD'),
    COALESCE(NEW.email, '')
  );

  -- Auto-assign admin role to users with 'admin' in their email
  IF NEW.email LIKE '%admin%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- Retroactively grant 'admin' role to existing users with 'admin' in their username/email
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'
FROM public.profiles p
WHERE p.username LIKE '%admin%'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p.user_id AND r.role = 'admin'
  );
