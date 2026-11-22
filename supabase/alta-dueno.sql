-- Correr UNA vez en Supabase → SQL Editor, después de aplicar la migración
-- y de crear tu usuario en Authentication → Users → Add user.
-- Cambia el correo por el tuyo antes de correrlo.

with p as (
  insert into public.proyectos (nombre) values ('Cerco del Rancho') returning id
)
insert into public.miembros (proyecto_id, usuario_id, rol)
select p.id, u.id, 'dueno'
from p, auth.users u
where u.email = 'TU-CORREO@ejemplo.com'
returning proyecto_id, usuario_id, rol;

-- Más adelante, para dar acceso a otra persona (después de crearle su usuario):
-- insert into public.miembros (proyecto_id, usuario_id, rol)
-- select proyecto_id, (select id from auth.users where email = 'otra-persona@ejemplo.com'), 'editor'   -- o 'lector'
-- from public.miembros where rol = 'dueno' limit 1;
