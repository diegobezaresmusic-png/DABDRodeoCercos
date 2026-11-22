-- Esquema inicial del Cerco del Rancho.
--
-- Idea: hoy solo hay un dueño, pero todo cuelga de "proyectos" y "miembros".
-- Agregar usuarios después = insertar una fila en miembros con su rol. No hay que cambiar tablas.
--
-- Roles:  dueno  -> todo, incluido administrar miembros
--         editor -> leer y escribir el cerco y las correcciones
--         lector -> solo leer
--
-- Los datos de la app se guardan como documentos JSON (igual que hoy en el teléfono):
--   coleccion 'cerco',        doc_id 'red'   -> la red completa del editor
--   coleccion 'correcciones', doc_id <id>    -> cada corrección marcada en el mapa

create table public.proyectos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  creado_en   timestamptz not null default now()
);

create table public.miembros (
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  rol         text not null check (rol in ('dueno', 'editor', 'lector')),
  creado_en   timestamptz not null default now(),
  primary key (proyecto_id, usuario_id)
);
create index miembros_usuario_idx on public.miembros (usuario_id);

create table public.documentos (
  proyecto_id     uuid not null references public.proyectos(id) on delete cascade,
  coleccion       text not null check (coleccion ~ '^[a-z0-9_-]{1,40}$'),
  doc_id          text not null check (doc_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  datos           jsonb not null,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (proyecto_id, coleccion, doc_id)
);

-- Historial: cada cambio guarda la versión anterior (para deshacer un error o ver quién cambió qué).
create table public.documentos_historial (
  id              bigint generated always as identity primary key,
  proyecto_id     uuid not null,
  coleccion       text not null,
  doc_id          text not null,
  datos           jsonb,
  operacion       text not null,
  cambiado_en     timestamptz not null default now(),
  cambiado_por    uuid default auth.uid()
);
create index documentos_historial_doc_idx on public.documentos_historial (proyecto_id, coleccion, doc_id, cambiado_en desc);

-- ---------- funciones auxiliares (security definer para que RLS no se llame a sí misma) ----------

create or replace function public.mi_rol(p_proyecto uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select rol from public.miembros where proyecto_id = p_proyecto and usuario_id = (select auth.uid());
$$;

create or replace function public.tocar_documento()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    insert into public.documentos_historial (proyecto_id, coleccion, doc_id, datos, operacion)
    values (old.proyecto_id, old.coleccion, old.doc_id, old.datos, tg_op);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.actualizado_en := now();
  new.actualizado_por := (select auth.uid());
  return new;
end;
$$;

create trigger documentos_tocar
  before insert or update or delete on public.documentos
  for each row execute function public.tocar_documento();

-- ---------- seguridad por filas ----------

alter table public.proyectos            enable row level security;
alter table public.miembros             enable row level security;
alter table public.documentos           enable row level security;
alter table public.documentos_historial enable row level security;

create policy "ver mis proyectos" on public.proyectos
  for select to authenticated using (public.mi_rol(id) is not null);

create policy "ver miembros de mis proyectos" on public.miembros
  for select to authenticated using (public.mi_rol(proyecto_id) is not null);
create policy "el dueno agrega miembros" on public.miembros
  for insert to authenticated with check (public.mi_rol(proyecto_id) = 'dueno');
create policy "el dueno cambia miembros" on public.miembros
  for update to authenticated using (public.mi_rol(proyecto_id) = 'dueno') with check (public.mi_rol(proyecto_id) = 'dueno');
create policy "el dueno quita miembros" on public.miembros
  for delete to authenticated using (public.mi_rol(proyecto_id) = 'dueno' and usuario_id <> (select auth.uid()));

create policy "leer documentos" on public.documentos
  for select to authenticated using (public.mi_rol(proyecto_id) is not null);
create policy "crear documentos" on public.documentos
  for insert to authenticated with check (public.mi_rol(proyecto_id) in ('dueno', 'editor'));
create policy "cambiar documentos" on public.documentos
  for update to authenticated using (public.mi_rol(proyecto_id) in ('dueno', 'editor'))
  with check (public.mi_rol(proyecto_id) in ('dueno', 'editor'));
create policy "borrar documentos" on public.documentos
  for delete to authenticated using (public.mi_rol(proyecto_id) in ('dueno', 'editor'));

create policy "el dueno ve el historial" on public.documentos_historial
  for select to authenticated using (public.mi_rol(proyecto_id) = 'dueno');

-- Nadie anónimo entra a nada.
revoke all on public.proyectos, public.miembros, public.documentos, public.documentos_historial from anon;
revoke execute on function public.mi_rol(uuid) from anon, public;
grant execute on function public.mi_rol(uuid) to authenticated;
revoke execute on function public.tocar_documento() from anon, authenticated, public;

-- Cambios en vivo: el mapa se actualiza solo cuando alguien marca una corrección.
alter publication supabase_realtime add table public.documentos;
