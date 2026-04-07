
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile using metadata passed during signUp
  INSERT INTO public.profiles (user_id, name, employee_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'TBD'),
    COALESCE(NEW.email, '')
  );

  -- Do NOT auto-assign role. Admin must approve and assign role manually.
  RETURN NEW;
END;
$function$;
