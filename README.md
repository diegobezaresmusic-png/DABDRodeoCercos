# Cerco del Rancho

Mapa y editor del cerco eléctrico. Se publica como **PWA**: una página web que se instala en Android, iPhone y tabletas sin tiendas, sin Xcode y sin costo.

- **Hosting:** Cloudflare Workers con archivos estáticos (gratis): **https://dabdrodeocercos.diegobezaresmusic.workers.dev**
- **Datos compartidos:** Supabase (gratis). Si no está configurado o no hay sesión, todo se guarda en el dispositivo, igual que antes.

## Estructura

**El cerco vive en un solo lugar.** Mapa y editor lo leen de la misma fuente, con el mismo código (`herramientas/web/cerco.js`):

1. **La nube** (Supabase, documento `cerco/red`) es la verdad. Lo que se guarda en el editor va ahí.
2. **`publicar/datos/cerco.json`**: copia de la nube al momento de publicar. La usa quien no tiene sesión o abre sin señal.
3. **Una sola copia en cada dispositivo** (`cerco-red`), compartida por mapa y editor. Recuerda de qué versión de la nube salió, así una copia vieja nunca tapa una más nueva (si pasa, se guarda aparte como respaldo).

La foto también es una sola: `publicar/datos/rancho.jpg`.

| Carpeta / archivo | Qué es |
|---|---|
| `fuente/template2.html` | Página del mapa (sin datos adentro). |
| `fuente/editor/editor3.tpl.html` | Página del editor (sin datos adentro). |
| `fuente/red-mapa.js` | Pasa la red del editor al formato del mapa (tramos, switches, puertas). |
| `fuente/rancho.jpg` | La foto del rancho, única para todas las secciones. |
| `herramientas/web/cerco.js` | Cómo se carga y guarda el cerco: la fuente única. |
| `herramientas/web/nube.js` | Conexión con Supabase (sesión y base de datos). |
| `herramientas/construir.py` | Arma las páginas y lee el cerco actual de la nube. |
| `herramientas/publicar.py` | Arma `publicar/`: páginas, `datos/`, íconos, manifest y service worker. |
| `herramientas/sb.py` | Administra el Supabase de este proyecto con el token de `.env`. |
| `herramientas/respaldo.py` | Respaldos de los datos del cerco (ver abajo). |
| `publicar/` | **Lo que sube Cloudflare.** Se genera; no editar a mano. |
| `supabase/` | Tablas, permisos y alta del dueño. |
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
