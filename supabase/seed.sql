-- Datos de EJEMPLO para probar. Reemplazalos desde el panel (Menú y Premios).
insert into public.menu_items (name, category, price, sort, description) values
  ('Espresso', 'Café', 3500, 1, 'Doble, de origen único'),
  ('Cortado', 'Café', 3800, 2, ''),
  ('Flat white', 'Café', 4800, 3, 'Doble espresso con leche texturizada'),
  ('Latte', 'Café', 5000, 4, ''),
  ('Cold brew', 'Bebidas frías', 5500, 10, 'Extracción en frío de 18 horas'),
  ('Medialuna de manteca', 'Pastelería', 1500, 20, ''),
  ('Budín de limón', 'Pastelería', 3500, 21, 'Porción'),
  ('Tostado de jamón y queso', 'Salado', 7500, 30, 'En pan de masa madre');

insert into public.rewards (name, cost, description) values
  ('Medialuna', 150, ''),
  ('Espresso', 350, ''),
  ('Flat white', 480, ''),
  ('Tostado', 750, ''),
  ('Café en grano 250 g', 1500, 'Para llevarte a casa');
