alter policy parish_catechesis_select_authenticated on public.parish_catechesis
  to authenticated using (public.can_access_parish(parish_id));

alter policy priests_select_authenticated on public.priests
  to authenticated using (public.can_access_parish(parish_id));
