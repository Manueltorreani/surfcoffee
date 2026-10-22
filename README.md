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
- Cierres: fotos y conteo de stock de cada cierre de turno, con botón para mandar los faltantes por WhatsApp.
- Stock: insumos que se cuentan al cierre, con su mínimo; lista de lo que hay que comprar.
- Turnos: dos turnos fijos (Mañana 08:30–13:00 de lunes a sábado, Tarde 15:30–20:00 todos los días); se asignan tocando el turno de cada persona y día. Muestra la hora de llegada y la foto. Los horarios se cambian desde la misma pestaña (por ejemplo en verano).
- Equipo: personas (empleados y dueños), PIN de cada uno, dispositivos autorizados, tolerancia de llegada y fotos obligatorias del cierre.

**Equipo** (`/equipo`, solo en la tablet autorizada del café)
- Cada persona elige su nombre y entra con su PIN de 4 números (Manu y Mate también, como uno más del equipo).
- Ve su turno de hoy y sus próximos turnos.
- Orden del turno: primero se marca la llegada y al final el cierre. No se puede marcar la llegada de un turno ya cerrado, ni cerrar sin haber marcado la llegada (un cierre por turno).
- Solo desde el café: la llegada y el cierre se rechazan si la tablet está fuera del radio del café o fuera del wifi del local (cuando están configurados).
- Marcar llegada: saca una foto del local y el sistema registra la hora y la compara con el turno (antes / justo / tarde). Una llegada por turno, así quien hace mañana y tarde marca las dos.
- Cierre de turno: una foto con la cámara en vivo de cada cosa (cafetera, cocina, fiambrera, baños, pisos…), estampada con nombre, fecha y hora; después el conteo de stock. Al terminar aparece un mensaje que los motiva a mejorar.
- La sesión se cierra sola a los 5 minutos sin uso.
- La apertura de caja y el arqueo se hacen en el software de ventas. Si el software de ventas llama a `/api/pos/apertura`, también registra la llegada (ver API abajo).

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

Quien entra con Google no necesita confirmar el mail (Google ya lo verificó). Se guardan su nombre y su Gmail; el celular no se pide.

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

### Sistema del equipo (tablet)
1. Si tu base se creó antes de este cambio, corré en el SQL Editor, en orden: `supabase/2026-10-equipo.sql`, `supabase/2026-10-turnos.sql`, `supabase/2026-10-ubicacion.sql` y `supabase/2026-10-fotos.sql`.
2. En el panel → **Equipo**: agregá a cada persona con su PIN (empezando por vos y Mate como dueños).
3. Desde la **tablet del café**, entrá a `/panel` con tu usuario → **Equipo → Autorizar este dispositivo**. Después cerrá sesión.
4. En la tablet abrí `/equipo` y agregala a la pantalla de inicio. Solo funciona en dispositivos autorizados.
5. **Estando en el café**, en Panel → Equipo → **Ubicación del café**: tocá *Usar mi ubicación actual* y *Guardar esta conexión como wifi del café*. Desde ahí, la llegada y el cierre solo se pueden marcar en el local (por GPS o por el wifi). No autorices como dispositivo compus o celulares personales.
6. En **Turnos** cargá los horarios de la semana (o copiá la anterior) y en **Stock** los insumos con su mínimo.

### Dominio aparte para el equipo (opcional, recomendado)
Para que la tablet y el panel no se crucen con la web de clientes:
1. Vercel → proyecto → **Settings → Domains → Add**: escribí `surfcoffee-equipo.vercel.app` (o el nombre libre que quieras, o un subdominio propio) y asignalo a **Production**.
2. **Settings → Environment Variables**: `STAFF_HOST` = ese dominio (solo Production) → **Redeploy**.
3. Desde ahí: el dominio del equipo solo muestra `/equipo` y `/panel`, y en la web de clientes esas dos rutas mandan al dominio del equipo. La API sigue funcionando en los dos.
4. Como es otro dominio, en la tablet hay que volver a iniciar sesión en el panel, autorizar el dispositivo y dar permiso de ubicación una vez.

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

**Equipo: lista de personas (para el login de cada cajero)**
```http
GET /api/pos/equipo
```
Respuesta: `[{ "id", "name", "role", "has_pin" }]`

**Equipo: verificar PIN** (el mismo PIN que usan en la tablet)
```http
POST /api/pos/staff-login
{ "staff_id": "uuid", "pin": "1234" }
```
Respuesta: `{ "ok": true, "staff": { "id", "name", "role" } }`. Con 5 intentos fallidos se bloquea 5 minutos.

**Equipo: apertura de caja** (registra la llegada y devuelve el mensaje para mostrar)
```http
POST /api/pos/apertura
{ "staff_id": "uuid" }
```
Respuesta:
```json
{ "estado": "antes | justo | tarde | sin_turno", "minutos": -8, "hora": "07:52",
  "turno": { "desde": "08:00", "hasta": "14:00" },
  "titulo": "¡8 min antes, Lucía!", "mensaje": "Así da gusto arrancar…", "ya_registrada": false }
```
Se compara con el turno cargado en el panel y la tolerancia de Equipo. Si se llama dos veces en el mismo turno, devuelve la primera llegada.

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
app/                 páginas (/, /menu, /puntos, /delivery, /cuenta, /reset, /panel, /equipo) y API
components/          interfaz compartida (chat, mapa, login), panel (components/admin) y equipo (components/equipo)
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
- Las fotos de los cierres y llegadas son privadas (bucket `equipo` de Supabase Storage): solo las ven los administradores, se achican a 1024 px y se borran solas después de `fotos_dias` días (2 por defecto; se cambia en Panel → Cierres). Los datos (horas, stock, quién cerró) quedan siempre en la base. Los PIN se guardan cifrados y nunca se leen desde el navegador.
- La llegada cuenta como “antes” si abre caja antes del horario, “justo” hasta la tolerancia (10 min por defecto) y “tarde” después.

## Próximos pasos posibles
- Código de verificación por WhatsApp (plantilla de autenticación de la API de WhatsApp Business).
- Notificaciones push (“Tu pedido salió”).
- Pago online del pedido.
