# ÁREA 17 — Login Next.js | Guía de Instalación

## PASO 1 — Instalar Node.js

1. Ir a: https://nodejs.org
2. Descargar la versión **LTS** (recomendada).
3. Ejecutar el instalador `.msi` → siguiente, siguiente, instalar.
4. Al terminar, **reiniciar la terminal** (PowerShell o CMD).
5. Verificar instalación:
   ```
   node --version
   npm --version
   ```
   Debe mostrar algo como: `v20.x.x` y `10.x.x`

---

## PASO 2 — Abrir la carpeta del proyecto

Abrir PowerShell o CMD en esta carpeta:

```
cd "C:\Users\Ivan Vallejo\OneDrive - Universidad Mariana\Documentos\NetBeansProjects\area17-login-nextjs"
```

O desde el Explorador de Archivos: clic derecho en la carpeta → "Abrir en Terminal".

---

## PASO 3 — Instalar dependencias

```
npm install
```

Esto instalará: Next.js, React, React-DOM y jose (JWT).
Demora ~1-2 minutos.

---

## PASO 4 — Ejecutar el servidor de desarrollo

```
npm run dev
```

Verás en la terminal:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## PASO 5 — Abrir en el navegador

Ir a: **http://localhost:3000**

La app redirige automáticamente a `/login`.

---

## CREDENCIALES DE PRUEBA

### Super Administrador (preconfigurado)
- **Identificación:** `10800449108`
- **Contraseña:** `CAMBIAR_ESTA_CONTRASENA`
- **Rol:** ADMINISTRADOR

### Para crear tu propio usuario
1. Ir a `/registro`
2. Clave especial para **Administrador:** `Area172026ADM`
3. Clave especial para **Vendedor:** `vendedorArea17`

---

## ESTRUCTURA DEL PROYECTO

```
area17-login-nextjs/
│
├── app/                          # App Router de Next.js
│   ├── layout.jsx                # Layout raíz + import CSS global
│   ├── globals.css               # Diseño dark/neon (igual al original)
│   ├── login/
│   │   └── page.jsx              # Página de login (server component)
│   ├── registro/
│   │   └── page.jsx              # Página de registro
│   ├── dashboard/
│   │   └── page.jsx              # Dashboard protegido por sesión
│   └── api/
│       └── auth/
│           ├── login/route.js    # POST → valida y crea sesión JWT
│           ├── registro/route.js # POST → valida y registra en TXT
│           ├── logout/route.js   # POST → elimina cookie de sesión
│           └── me/route.js       # GET  → devuelve usuario activo
│
├── components/
│   ├── LoginForm.jsx             # Formulario de login (client)
│   ├── RegistroForm.jsx          # Formulario de registro (client)
│   └── LogoutButton.jsx          # Botón de cerrar sesión (client)
│
├── lib/
│   ├── auth.js                   # Crear/leer/eliminar sesión JWT
│   ├── fileManager.js            # Leer/escribir usuarios.txt
│   └── security.js               # SHA-256, validaciones, sanitización
│
├── data/
│   └── usuarios.txt              # Base de datos en texto plano
│
├── middleware.js                  # Protección de rutas (JWT check)
├── next.config.js
├── jsconfig.json                  # Alias @/ para imports
├── .env.local                     # Clave secreta JWT
└── package.json
```

---

## FLUJO DE AUTENTICACIÓN

```
Usuario ingresa identificacion + contrasena
         ↓
LoginForm.jsx (cliente) valida campos vacíos
         ↓
POST /api/auth/login (servidor)
  → busca en usuarios.txt por identificacion
  → compara SHA-256(contrasena) con hash guardado
  → verifica usuario activo
         ↓
Si OK → crea JWT en cookie httpOnly (30 min)
      → redirige a /dashboard
Si Error → devuelve mensaje de error
         ↓
middleware.js intercepta TODAS las rutas
  → si no hay cookie válida → redirige a /login
  → si hay cookie válida → permite continuar
```

---

## FORMATO DEL ARCHIVO usuarios.txt

```
id|nombreCompleto|identificacion|celular|tipoSangre|correo|contrasena|rol|activo|fotoPerfil
```

Ejemplo:
```
1000|Super Administrador|10800449108|3000000000|O+|superadmin@area17.com|687d86...|ADMINISTRADOR|true|
1|Juan Pérez|1023456789|3001234567|O+|juan@correo.com|a1b2c3...|VENDEDOR|true|
```

- `contrasena` es el hash SHA-256 (nunca en texto plano)
- `activo` debe ser `true` para permitir el acceso

---

## SEGURIDAD IMPLEMENTADA

| Medida | Descripción |
|---|---|
| Hash SHA-256 | Contraseñas nunca se guardan en texto plano |
| JWT httpOnly | La cookie no es accesible desde JavaScript |
| Sanitización | Se escapan caracteres HTML en todos los inputs |
| Validación doble | Cliente (React) + Servidor (API Route) |
| Protección de rutas | middleware.js verifica JWT en cada request |
| Anti-XSS | Sanitizar() escapa `&`, `<`, `>`, `"`, `'` |
| Headers anti-caché | Logout limpia Cache-Control, Pragma, Expires |
| TXT no expuesto | La carpeta `data/` solo se accede desde el servidor |

---

## SOLUCIÓN DE PROBLEMAS

**Error: `node: command not found`**
→ Node.js no está instalado o la terminal no se reinició.

**Error: `Cannot find module 'jose'`**
→ Ejecutar `npm install` de nuevo.

**Error: `EACCES permission denied`**
→ Ejecutar la terminal como Administrador.

**Puerto 3000 ocupado**
→ `npm run dev -- --port 3001` y abrir http://localhost:3001

**No redirige al dashboard**
→ Verificar que `.env.local` existe en la raíz del proyecto.
