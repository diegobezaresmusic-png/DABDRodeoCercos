# Cerco del Rancho

Mapa y editor del cerco eléctrico. Se publica como **PWA**: una página web que se instala en Android, iPhone y tabletas sin tiendas, sin Xcode y sin costo.

- **Hosting:** Cloudflare Workers con archivos estáticos (gratis): **https://dabdrodeocercos.diegobezaresmusic.workers.dev**
- **Datos compartidos:** Supabase (gratis). Si no está configurado o no hay sesión, todo se guarda en el dispositivo, igual que antes.

## Estructura

| Carpeta | Qué es |
|---|---|
| `mapa/`, `editor/` | Las dos apps (generadas desde `fuente/`). |
| `fuente/` | Plantillas y scripts que generan `mapa/` y `editor/`. |
| `herramientas/construir.py` | Baja de Supabase la última red del editor, y regenera `mapa/index.html` y `editor/index.html` desde `fuente/template2.html` y `fuente/editor/editor3.tpl.html`. Los cambios a las apps se hacen en esas plantillas. |
| `fuente/red-mapa.js` | Convierte la red del editor al formato del mapa. **El cerco vive en un solo lugar: el editor.** El mapa siempre dibuja lo último que se guardó ahí (`fuente/network2.json` ya no se usa). |
| `herramientas/publicar.py` | Arma `publicar/`: envuelve las apps, agrega manifest, íconos, service worker y el conector a Supabase. |
| `herramientas/web/nube.js` | Conector a Supabase. Mapa y editor lo usan sin cambios en su código. |
| `publicar/` | **Lo que sube Cloudflare.** Se genera; no editar a mano. |
| `supabase/migrations/` | Tablas y permisos de la base. |
| `supabase/alta-dueno.sql` | Te da de alta como dueño del proyecto (una vez). |
| `herramientas/sb.py` | Administra el Supabase de este proyecto con el token de `.env` (SQL, configuración, avisos de seguridad). |
| `.env` | Token de Supabase y contraseña de la base. **No se sube a GitHub.** |

## Publicar un cambio

```powershell
python herramientas/publicar.py
```

Luego haz commit y push. Cloudflare publica solo en uno o dos minutos. `wrangler.jsonc` le indica que publique la carpeta `publicar/`.

## Configuración inicial (una sola vez)

### 1. GitHub
1. Crea un repositorio **privado** (por ejemplo `cerco-rancho`).
2. Súbelo desde esta carpeta (te ayudo con los comandos).

### 2. Cloudflare Pages
1. Workers & Pages → Create → Pages → **Connect to Git** → elige el repositorio.
2. Framework preset: **None**. Build command: *(vacío)*. Build output directory: **`publicar`**.
3. Deploy. Te da la dirección `https://<nombre>.pages.dev`.

### 3. Supabase
1. **SQL Editor** → pega y corre `supabase/migrations/20261120000000_inicio.sql`.
2. **Authentication → Sign In / Providers → Email:** deja Email activado y **desactiva "Allow new users to sign up"**. Así nadie más puede crearse cuenta.
3. **Authentication → Users → Add user:** crea tu usuario con correo y contraseña (marca "Auto Confirm User").
4. **SQL Editor** → abre `supabase/alta-dueno.sql`, cambia el correo por el tuyo y córrelo. Debe devolver una fila con `rol = dueno`.
5. **Authentication → URL Configuration:** en Site URL pon tu dirección `https://<nombre>.pages.dev`.
6. **Project Settings → API:** copia la **Project URL** y la clave **anon / publishable** (nunca la `service_role` ni `sb_secret_…`).
7. Copia `config.nube.ejemplo.json` como `config.nube.json`, pega esos dos valores, corre `python herramientas/publicar.py` y sube el cambio.

### 4. Pasar tus datos actuales a la nube
Tu última versión está en `fuente/editor/guardado-diego-ultimo.json`. Para subirla:

```powershell
python herramientas/importar.py
```

Abre `supabase/importar-datos.sql`, pega todo en Supabase → SQL Editor y córrelo. Debe devolver una fila con el número de alambres. Después, al iniciar sesión, cualquier dispositivo baja esa versión.

> Ojo: el editor compara fechas. Si un dispositivo tiene una copia local **más nueva** que la de la nube, la sube y reemplaza la de la nube.

## Instalar en los dispositivos

- **Android (celular o tableta):** abre la dirección en Chrome → menú ⋮ → **Instalar app**.
- **iPhone / iPad:** abre la dirección en **Safari** → Compartir → **Agregar a pantalla de inicio**.
- Funciona sin señal con la última versión que se abrió. Los cambios hechos sin señal se quedan en el dispositivo hasta que vuelva la conexión y se abra el editor.

## Usuarios (para después)

Ya está preparado: cada persona necesita un usuario en Supabase y una fila en `miembros` con su rol (`dueno`, `editor` o `lector`). Ver el ejemplo al final de `supabase/alta-dueno.sql`. Cada cambio queda en `documentos_historial` con quién lo hizo.

## Mantenimiento

- El plan gratis de Supabase **pausa el proyecto** si pasa varios días sin uso. Si la app dice "Guardado en el teléfono" en vez de "Guardado", entra a supabase.com y reactívalo.

## Respaldos del cerco (solo datos)

Guardan el cerco de la nube (alambres, switches, puertas, notas) y las correcciones del mapa. No guardan la app.
Quedan en `respaldos/`, solo en esta PC (no se suben a GitHub).

```powershell
python herramientas/respaldo.py guardar nombre-del-respaldo
```
```powershell
python herramientas/respaldo.py listar
```
```powershell
python herramientas/respaldo.py restaurar 2026-11-21_1916_cerco-bueno-antes-de-pruebas.json
```

`restaurar` sube solo el cerco; con `--todo` deja la nube exactamente como en el respaldo (borra correcciones nuevas).
Antes de restaurar guarda solo un respaldo `antes-de-restaurar`, así se puede deshacer.
