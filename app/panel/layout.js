// El panel no aparece en buscadores y tiene su propio título.
export const metadata = {
  title: 'Panel · Surf Coffee',
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }) {
  return children;
}
