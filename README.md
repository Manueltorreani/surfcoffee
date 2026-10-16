# Surf Coffee

Web de Surf Coffee (Mar del Plata): quiénes somos, menú, sistema de puntos, delivery con chat y panel de gestión. Pensada primero para el celular y se puede instalar como app (PWA).

- **Next.js 14** (frontend y API) — se publica en **Vercel**
- **Supabase** (base de datos Postgres, login, archivos y tiempo real)

## Qué hace

**Web del cliente**
- Inicio con quiénes somos, dirección, horarios y link a Google Maps.
- Menú solo para ver.
- Mis puntos: saldo, progreso al próximo premio, premios y movimientos. Los puntos se suman solo con compras en el local.
- Delivery: mapa de cuadras, horario, chat con el café (con fotos y PDF) y armado del pedido. Si la dirección queda afuera aparece “Hasta esa dirección no llegamos”.
- Cuenta: crear cuenta (nombre y apellido, email, celular, contraseña), iniciar sesión con email o celular, recuperar contraseña por mail.

**Panel** (`/panel`, solo administradores)
- Pedidos: inbox con todas las conversaciones, estados del pedido (Confirmar → Salió → Entregado).
- Caja y puntos: registrar compras por nombre y apellido, canjear premios.
- Clientes: listado, métricas y cambio de contraseña.
- Menú, Premios y Ajustes (textos, horarios, zona de entrega, puntos).

Los precios del pedido, la zona y el horario se validan en la base de datos, no solo en el navegador.

---

## Puesta en marcha

### 1. Supabase
1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá todo `supabase/schema.sql` → **Run**.
3. (Opcional) Corré `supabase/seed.sql` para tener un menú y premios de ejemplo.
4. **Authentication → URL Configuration**
   - Site URL: la URL de tu web (por ejemplo `https://surfcoffee.vercel.app`).
   - Redirect URLs: agregá `https://TU-WEB/reset` y `https://TU-WEB/puntos` (y `http://localhost:3000/**` para probar en tu compu).
5. **Authentication → Providers → Email**: dejá activado “Confirm email” para que cada cuenta valide su correo.
6. **Mails**: el envío de Supabase de fábrica tiene un límite bajo por hora. Para uso real configurá un SMTP propio en **Authentication → SMTP Settings** (por ejemplo Resend, con tu dominio). Los textos de los mails se cambian en **Authentication → Email Templates**.

### Ingreso con Google (opcional, recomendado)
1. [console.cloud.google.com](https://console.cloud.google.com) → crear proyecto "Surf Coffee".
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre "Surf Coffee", email de soporte. Publicar la app (*En producción*).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth** → *Aplicación web*.
   - Orígenes autorizados: `https://TU-WEB`
   - URI de redireccionamiento: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
4. Copiar el **ID de cliente** y el **secreto** en Supabase → **Authentication → Sign In / Providers → Google** → activar → guardar.
5. Si tu base se creó antes de este cambio, correr `supabase/2026-10-google.sql` en el SQL Editor.

Quien entra con Google no necesita confirmar el mail (Google ya lo verificó). La primera vez la web le pide el celular.

### 2. Tu usuario administrador
1. **Authentication → Users → Add user**: tu email y contraseña, marcá “Auto confirm”.
2. En **SQL Editor**:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'TU-EMAIL@ejemplo.com';
   ```
3. Entrá a `/panel` e iniciá sesión con ese email.

### 3. Variables de entorno
Copiá `.env.example` a `.env.local` y completá con los datos de **Supabase → Project Settings → API**:

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (**secreta**, solo servidor) |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la web |
| `POS_API_KEY` | clave para tu software de ventas (`openssl rand -hex 32`) |

### 4. Probar en tu compu
```bash
npm install
npm run dev
```
Abrí http://localhost:3000

### 5. Publicar en Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → importá este repo.
2. Cargá las mismas variables de entorno (con `NEXT_PUBLIC_SITE_URL` = la URL de Vercel o tu dominio).
3. **Deploy**. Para tu dominio: **Settings → Domains**.

### 6. Instalar como app
Desde el celular, abrí la web → menú del navegador → **Agregar a pantalla de inicio**. Queda el ícono de Surf Coffee como una app.

---

## API para el software de ventas

Todas las llamadas llevan el header `x-api-key: <POS_API_KEY>`.

**Registrar una compra en el local (suma puntos; si el cliente no existe, lo crea)**
```http
POST /api/pos/compras
{ "nombre": "Juan Pérez", "monto": 12500 }
```
Respuesta: `{ "customer_id", "name", "points_added", "points", "new_customer" }`

**Buscar clientes por nombre**
```http
GET /api/pos/clientes?q=juan pe
```

**Listar premios activos**
```http
GET /api/pos/premios
```

**Canjear un premio**
```http
POST /api/pos/canjes
{ "cliente_id": "uuid", "premio_id": "uuid" }
```

Ejemplo en Node:
```js
await fetch('https://TU-WEB/api/pos/compras', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': process.env.POS_API_KEY },
  body: JSON.stringify({ nombre: 'Juan Pérez', monto: 12500 }),
});
```

---

## Estructura

```
app/                 páginas (/, /menu, /puntos, /delivery, /cuenta, /reset, /panel) y API
components/          interfaz compartida (chat, mapa, login) y panel (components/admin)
lib/                 utilidades y clientes de Supabase
supabase/schema.sql  base de datos: tablas, reglas de acceso, funciones
supabase/seed.sql    menú y premios de ejemplo
prototipo/           prototipo original en un solo HTML (referencia)
```

## Reglas de negocio
- Los puntos se identifican por **nombre y apellido** (sin tildes ni mayúsculas: “Juan Perez” = “juan pérez”).
- 1 punto cada `pesos_por_punto` pesos (Ajustes). Los pedidos por delivery no suman puntos.
- Si alguien compró en el local y después crea su cuenta con el mismo nombre, se le suman los puntos que ya tenía.
- Los archivos del chat son privados: solo los ve el cliente dueño de la conversación y el café.

## Próximos pasos posibles
- Código de verificación por WhatsApp (plantilla de autenticación de la API de WhatsApp Business).
- Notificaciones push (“Tu pedido salió”).
- Pago online del pedido.
