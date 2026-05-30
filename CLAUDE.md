# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (Node is not in Git Bash PATH — use full path or the user's own terminal)
"/c/Program Files/nodejs/node.exe" "./node_modules/next/dist/bin/next" dev

# Build for production
npm run build

# Start production server
npm run start

# Regenerate PWA icons
npm run generate-icons
```

There is no linter or test suite configured.

## Architecture

This is a Next.js 16 app (App Router) with Turbopack. It is a **PWA** (via `@ducanh2912/next-pwa`) for a business management system called "Área 17".

### Authentication flow

- **Session**: JWT stored in an `httpOnly` cookie (`area17_session`), signed with `jose` (HS256, 30 min expiry). Secret from `JWT_SECRET` env var, falls back to a hardcoded default in development.
- **Login**: `POST /api/auth/login` — looks up user by `identificacion` (numeric ID), verifies SHA-256 password hash, creates session cookie.
- **Registration**: `POST /api/auth/registro` — requires a `claveEspecial` to determine role (`Area172026ADM` → ADMINISTRADOR, `vendedorArea17` → VENDEDOR).
- **Guard**: Pages call `obtenerSesion()` server-side and `redirect('/login')` if null. No middleware.
- **Logout**: `POST /api/auth/logout` deletes the cookie.

### User storage

Users are persisted in `data/usuarios.txt` — a pipe-delimited flat file, one user per line:

```
id|nombreCompleto|identificacion|celular|tipoSangre|correo|contrasena_sha256|rol|activo|fotoPerfil
```

`data/usuarios.txt` is git-ignored (contains real credentials). `data/usuarios.txt.example` shows the format. All reads/writes go through `lib/fileManager.js`. Passwords are stored as plain SHA-256 (no salt).

### Key library files

- `lib/fileManager.js` — all user CRUD: `leerUsuarios`, `buscarPorIdentificacion`, `buscarPorCorreo`, `registrarUsuario`. Bootstraps the file with a hardcoded superadmin if it doesn't exist.
- `lib/auth.js` — `crearSesion`, `obtenerSesion`, `cerrarSesion`, `esAdmin`.
- `lib/security.js` — `hashSHA256`, `sanitizar` (XSS escaping), validators for email/phone/password, `determinarRol`.

### Roles

Two roles: `ADMINISTRADOR` and `VENDEDOR`. Role is embedded in the JWT and checked via `esAdmin(sesion)`.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `JWT_SECRET` | JWT signing key | hardcoded fallback (dev only) |

Set in `.env.local` (git-ignored).
