CREATE POLICY "Users can insert own worker role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'worker'::app_role
);