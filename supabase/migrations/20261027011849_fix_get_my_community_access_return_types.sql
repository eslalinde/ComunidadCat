-- Match the declared RPC result types: communities.number and parishes.name
-- are varchar columns, which RETURN QUERY does not implicitly cast to text.
CREATE OR REPLACE FUNCTION public.get_my_community_access()
RETURNS TABLE (
  community_id bigint,
  community_number text,
  parish_name text,
  granted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uca.community_id,
    c.number::text,
    par.name::text,
    uca.created_at
  FROM public.user_community_access uca
  INNER JOIN public.communities c ON c.id = uca.community_id
  LEFT JOIN public.parishes par ON par.id = c.parish_id
  WHERE uca.user_id = auth.uid()
  ORDER BY par.name, c.number;
END;
$$;
