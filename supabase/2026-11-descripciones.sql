-- Descripciones de la carta. Pegar en Supabase → SQL Editor → Run.
-- Después se corrigen una por una desde Panel → Menú → Editar.
-- Cambia solo la descripción (no toca precios, fotos ni nombres). Avocado toast queda como estaba.

update public.menu_items m set description = d.txt
from (values
  ('Ristretto',                          'El espresso más corto e intenso: menos agua, todo el sabor.'),
  ('Espresso',                           'Un shot de nuestro café de especialidad, con crema.'),
  ('Americano',                          'Espresso alargado con agua caliente. Suave y para tomar tranquilo.'),
  ('Macchiato',                          'Espresso "manchado" con un toque de espuma de leche.'),
  ('Cortado',                            'Espresso con un poco de leche caliente, mitad y mitad.'),
  ('Capuccino',                          'Espresso, leche texturizada y bastante espuma.'),
  ('Latte',                              'Espresso con mucha leche texturizada. El más suave de los con leche.'),
  ('Doppio',                             'Doble espresso, para cuando necesitás arrancar en serio.'),
  ('Long Black',                         'Doble espresso sobre agua caliente: más cuerpo que un americano.'),
  ('Doppio Macchiato',                   'Doble espresso con un toque de espuma de leche.'),
  ('Flat White',                         'Doble espresso con leche texturizada fina, sin tanta espuma.'),
  ('Iced Latte',                         'Espresso, leche fría y hielo.'),
  ('Espresso Tonic',                     'Espresso sobre agua tónica y hielo. Refrescante y con burbujas.'),
  ('Orange Coffee',                      'Espresso con jugo de naranja exprimido y hielo.'),
  ('Iced Americano',                     'Espresso con agua fría y hielo.'),
  ('Iced Flat',                          'Nuestro flat white en versión fría, con hielo.'),
  ('Submarino',                          'Leche caliente con una barra de chocolate para hundir y derretir.'),
  ('Gaseosa',                            'Lata bien fría. Preguntanos qué sabores hay.'),
  ('Jugo de naranja',                    'Exprimido en el momento.'),
  ('Medialuna rellena c/ jamón y queso', 'Medialuna de manteca rellena con jamón y queso, calentita.'),
  ('Medialuna dulce',                    'De manteca, recién horneada y con almíbar.'),
  ('Cookie Choco',                       'Cookie grande con chips de chocolate.'),
  ('Cookie Oreo',                        'Cookie grande con pedazos de Oreo.'),
  ('Cookie Nutella',                     'Cookie grande rellena de Nutella.'),
  ('Cookie Red',                         'Cookie red velvet con chips de chocolate blanco.'),
  ('Budín',                              'Porción de budín casero. Preguntanos el sabor del día.'),
  ('Banana toast',                       'Tostada con banana. Ideal para el desayuno.'),
  ('Chipá',                              'Porción de chipá recién horneado, crocante por fuera y suave por dentro.'),
  ('Tostado de chipá c/ jamón y queso',  'Pan de chipá tostado con jamón y queso derretido.'),
  ('Tostado c/ jamón y queso',           'El clásico tostado de jamón y queso.'),
  ('Tostadas c/ mermelada y queso',      'Tostadas con queso crema y mermelada.'),
  ('Leche vegetal',                      'Cambiá la leche de tu café por leche vegetal.'),
  ('Extra shot',                         'Sumale un shot de espresso a cualquier café.')
) as d(name, txt)
where m.name = d.name;
