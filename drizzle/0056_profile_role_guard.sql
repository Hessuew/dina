-- Prevent authenticated Supabase clients from changing a profile's role unless
-- the request belongs to an Admin. The application uses a direct server-side
-- database connection, so requests without PostgREST JWT settings remain
-- trusted; service-role requests are also explicitly allowed for provisioning.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_role text;
  request_sub text;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  request_role := current_setting('request.jwt.claim.role', true);
  IF request_role IS NULL OR request_role = '' OR request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  request_sub := current_setting('request.jwt.claim.sub', true);
  IF request_role <> 'authenticated'
    OR request_sub IS NULL
    OR request_sub = ''
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles AS actor
      WHERE actor.id::text = request_sub
        AND actor.role = 'admin'
    )
  THEN
    RAISE EXCEPTION 'Only Admins may change profile roles'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO service_role;
--> statement-breakpoint
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();
