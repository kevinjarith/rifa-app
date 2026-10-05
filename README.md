# Rifa 3 Cifras — Administración (000-999)

Aplicación web real (no una maqueta) para administrar la venta de una rifa de números de 3 cifras (000-999) entre un grupo cerrado de hasta 7 personas autorizadas.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (Prisma ORM), sesiones server-side (cookie httpOnly) con `connect-pg-simple`.
- **Frontend:** HTML5 + CSS3 + JavaScript puro, sin framework ni build step.
- **Seguridad:** toda la lógica crítica (roles, transiciones de estado, duplicados) se valida en el servidor y en la base de datos — nunca solo en el navegador.

## El punto más importante: no se puede vender el mismo número dos veces

Cada transición de estado de una boleta (reservar, pagar, liberar, bloquear, desbloquear, des-vender) usa un `UPDATE ... WHERE status = <estado_esperado>` atómico dentro de una transacción de Postgres (`tickets.service.js` → `atomicTransition`). Si dos personas intentan vender el mismo número al mismo tiempo, solo una transacción puede afectar la fila; la otra recibe un error 409 claro. Esto está probado explícitamente en `backend/tests/tickets.concurrency.test.js` con requests HTTP realmente simultáneos.

## Roles

| Rol | Puede |
|---|---|
| VENDEDOR | Ver, buscar, reservar, marcar pagado, liberar |
| ADMIN | Todo lo anterior + bloquear/desbloquear, des-vender, cancelar pagos |
| SUPER_ADMIN | Todo lo anterior + gestionar usuarios (máx. 7), ver auditoría completa |

El límite de **7 usuarios en total** se valida en el servidor (con un advisory lock de Postgres para que no se pueda crear un 8vo usuario ni con dos solicitudes simultáneas).

## Requisitos

- Node.js 18+
- PostgreSQL 14+ corriendo localmente (o Docker, ver más abajo)

## Puesta en marcha local (sin Docker — como se configuró en esta máquina)

```bash
# 1. Crear el rol y las bases de datos (una sola vez)
psql -d postgres -c "CREATE ROLE rifa LOGIN PASSWORD 'rifa_dev_pw' CREATEDB;"
psql -d postgres -c "CREATE DATABASE rifa_app OWNER rifa;"
psql -d postgres -c "CREATE DATABASE rifa_app_test OWNER rifa;"

# 2. Variables de entorno
cp .env.example .env
cp .env.example backend/.env

# 3. Instalar dependencias
cd backend
npm install

# 4. Aplicar el esquema de base de datos
npx prisma migrate deploy

# 5. (Opcional) Cargar datos de demostración — requiere ALLOW_SEED=true en .env
npm run seed

# 6. Arrancar el servidor
npm run dev   # o: npm start
```

Abrir `http://localhost:3000` en el navegador. Redirige a `/login.html` si no hay sesión.

**Usuarios demo** (creados por `npm run seed`, contraseña `Demo1234!` para los tres):
- `demo.superadmin@example.com` (SUPER_ADMIN)
- `demo.admin@example.com` (ADMIN)
- `demo.vendedor@example.com` (VENDEDOR)

Para limpiar los datos de demostración antes de usar la rifa real:

```bash
npm run seed:clean
```

## Puesta en marcha con Docker Compose (alternativa, si se instala Docker)

```bash
docker compose up --build
```

Esto levanta Postgres + la app en un solo comando. La primera vez, `prisma migrate deploy` se ejecuta automáticamente al iniciar el contenedor (ver `Dockerfile`).

## Pruebas

```bash
cd backend
npm test
```

Corre con Jest + Supertest contra `rifa_app_test` (ver `TEST_DATABASE_URL` en `.env`). Incluye, entre otras:
- Login, sesiones, usuarios inactivos.
- Límite de 7 usuarios (el 8vo es rechazado).
- Ciclo de vida completo de una boleta y transiciones inválidas.
- **Concurrencia:** dos y hasta diez requests simultáneos vendiendo el mismo número — exactamente uno gana.
- Pagos, cancelación de pagos.
- Auditoría (una fila por mutación, sin rutas de edición/borrado).
- Autorización: intentos de manipulación directa de requests (sin pasar por la UI) devuelven 403/401 según corresponda.

## Estructura del proyecto

```
rifa-app/
├── backend/        # API Express + Prisma + Postgres
│   ├── prisma/      # schema.prisma, migraciones, seed.js, removeDemoData.js
│   ├── src/         # app.js, server.js, middleware, módulos (auth, users, tickets, ...)
│   └── tests/       # Jest + Supertest
└── frontend/public/ # HTML/CSS/JS sin build step, servido como estático por Express
```

## Variables de entorno (`.env.example`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a Postgres (producción/desarrollo) |
| `TEST_DATABASE_URL` | Cadena de conexión a la base de datos de pruebas |
| `SESSION_SECRET` | Secreto largo y aleatorio para firmar las cookies de sesión |
| `ALLOW_SEED` | `true` solo en dev/staging para poder ejecutar `npm run seed` |
| `COOKIE_SECURE` | `true` en producción cuando se sirve sobre HTTPS |

**Nunca** se commitea `.env` (está en `.gitignore`); solo `.env.example` queda en el repositorio.

## Pendiente (a futuro, cuando se decida)

- Subir el repositorio a GitHub como público para compartirlo.
- Desplegar en Render/Railway usando `render.yaml` como referencia (requiere crear la cuenta y conectar el repo).
