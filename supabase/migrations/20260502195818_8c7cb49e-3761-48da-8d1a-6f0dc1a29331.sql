
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested_dept public.signup_department;
BEGIN
  requested_dept := CASE
    WHEN NEW.raw_user_meta_data->>'requested_department' = 'inventory_manager' THEN 'inventory_manager'::public.signup_department
    WHEN NEW.raw_user_meta_data->>'requested_department' = 'slitting_manager' THEN 'slitting_manager'::public.signup_department
    ELSE 'worker'::public.signup_department
  END;

  INSERT INTO public.profiles (user_id, name, employee_id, username, requested_department)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User'),
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'employee_id'), ''), 'TBD'),
    COALESCE(NEW.email, ''),
    requested_dept
  );

  RETURN NEW;
END;
$function$;
