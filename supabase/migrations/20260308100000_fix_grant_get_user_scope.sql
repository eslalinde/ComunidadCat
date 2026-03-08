-- Fix: re-grant EXECUTE on get_user_scope() to authenticated users.
-- The previous migration (20260308000000) dropped and recreated the
-- function, which removed the existing GRANT. Without it, no user
-- can fetch their scope and the app shows nothing.

GRANT EXECUTE ON FUNCTION public.get_user_scope() TO authenticated;
