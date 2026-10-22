// Pantalla del equipo (tablet del café): no aparece en buscadores.
export const metadata = {
  title: 'Equipo · Surf Coffee',
  robots: { index: false, follow: false },
};

export default function EquipoLayout({ children }) {
  return children;
}
