export const metadata = { title: 'Política de privacidad · Surf Coffee' };

export default function Privacidad() {
  return (
    <div className="wrap">
      <section className="sec legal" style={{ borderTop: 0 }}>
        <div className="eyebrow">Surf Coffee</div>
        <h2>Política de privacidad</h2>
        <p className="muted">Última actualización: octubre de 2026</p>

        <h3>Quiénes somos</h3>
        <p>Surf Coffee es una cafetería de especialidad ubicada en Avellaneda 1378, Mar del Plata, Buenos Aires, Argentina. Contacto: surfcoffee.cafe@gmail.com.</p>

        <h3>Qué datos guardamos</h3>
        <ul>
          <li><b>Datos de tu cuenta:</b> nombre y apellido, email y, si lo cargás, tu celular. Si entrás con Google, recibimos tu nombre y tu email de Google.</li>
          <li><b>Programa de puntos:</b> tus compras en el local (fecha y monto), los puntos sumados y los canjes.</li>
          <li><b>Delivery:</b> los pedidos, la dirección de entrega y los mensajes, fotos o comprobantes que nos mandes por el chat.</li>
        </ul>

        <h3>Para qué los usamos</h3>
        <ul>
          <li>Identificarte para sumar y canjear puntos.</li>
          <li>Preparar y entregar tus pedidos y responderte por el chat.</li>
          <li>Recuperar el acceso a tu cuenta si olvidás la contraseña.</li>
        </ul>
        <p>No vendemos ni compartimos tus datos con terceros para publicidad.</p>

        <h3>Dónde se guardan</h3>
        <p>Los datos se guardan en servicios en la nube que usamos para que la web funcione: Supabase (base de datos y archivos) y Vercel (alojamiento de la web). El acceso está protegido: cada cliente solo puede ver su propia información y solo el equipo de Surf Coffee puede ver los datos de los clientes.</p>

        <h3>Ingreso con Google</h3>
        <p>Si elegís “Continuar con Google”, solo pedimos tu nombre y tu email. No accedemos a tus contactos, correos ni a otros datos de tu cuenta de Google.</p>

        <h3>Tus derechos</h3>
        <p>Podés pedirnos ver, corregir o borrar tus datos escribiendo a surfcoffee.cafe@gmail.com o por el chat de la web. Si borramos tu cuenta, se pierden los puntos acumulados.</p>

        <h3>Cambios</h3>
        <p>Si cambiamos esta política, vamos a publicar la nueva versión en esta misma página.</p>
      </section>
    </div>
  );
}
