-- Los proyectos nuevos de Supabase no dan permisos de tabla automáticamente a los usuarios con sesión.
-- Se los damos aquí; la seguridad por filas (RLS) sigue decidiendo qué filas ve o cambia cada quien.
-- anon (sin sesión) sigue sin ningún permiso.

grant usage on schema public to authenticated;
grant select on public.proyectos to authenticated;
grant select, insert, update, delete on public.miembros to authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
grant select on public.documentos_historial to authenticated;
