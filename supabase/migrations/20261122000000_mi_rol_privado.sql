-- Aviso de seguridad de Supabase: public.mi_rol se podía llamar por la API (/rest/v1/rpc/mi_rol).
-- La movemos a un esquema que la API no publica. Las políticas siguen funcionando igual.

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.mi_rol(p_proyecto uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select rol from public.miembros where proyecto_id = p_proyecto and usuario_id = (select auth.uid());
$$;
revoke execute on function privado.mi_rol(uuid) from public, anon;
grant execute on function privado.mi_rol(uuid) to authenticated;

-- Volver a crear las políticas apuntando a privado.mi_rol
drop policy "ver mis proyectos" on public.proyectos;
drop policy "ver miembros de mis proyectos" on public.miembros;
drop policy "el dueno agrega miembros" on public.miembros;
drop policy "el dueno cambia miembros" on public.miembros;
drop policy "el dueno quita miembros" on public.miembros;
drop policy "leer documentos" on public.documentos;
drop policy "crear documentos" on public.documentos;
drop policy "cambiar documentos" on public.documentos;
drop policy "borrar documentos" on public.documentos;
drop policy "el dueno ve el historial" on public.documentos_historial;

create policy "ver mis proyectos" on public.proyectos
  for select to authenticated using (privado.mi_rol(id) is not null);

create policy "ver miembros de mis proyectos" on public.miembros
  for select to authenticated using (privado.mi_rol(proyecto_id) is not null);
create policy "el dueno agrega miembros" on public.miembros
  for insert to authenticated with check (privado.mi_rol(proyecto_id) = 'dueno');
create policy "el dueno cambia miembros" on public.miembros
  for update to authenticated using (privado.mi_rol(proyecto_id) = 'dueno') with check (privado.mi_rol(proyecto_id) = 'dueno');
create policy "el dueno quita miembros" on public.miembros
  for delete to authenticated using (privado.mi_rol(proyecto_id) = 'dueno' and usuario_id <> (select auth.uid()));

create policy "leer documentos" on public.documentos
  for select to authenticated using (privado.mi_rol(proyecto_id) is not null);
create policy "crear documentos" on public.documentos
  for insert to authenticated with check (privado.mi_rol(proyecto_id) in ('dueno', 'editor'));
create policy "cambiar documentos" on public.documentos
  for update to authenticated using (privado.mi_rol(proyecto_id) in ('dueno', 'editor'))
  with check (privado.mi_rol(proyecto_id) in ('dueno', 'editor'));
create policy "borrar documentos" on public.documentos
  for delete to authenticated using (privado.mi_rol(proyecto_id) in ('dueno', 'editor'));

create policy "el dueno ve el historial" on public.documentos_historial
  for select to authenticated using (privado.mi_rol(proyecto_id) = 'dueno');

drop function public.mi_rol(uuid);
