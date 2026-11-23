-- Initial production catalog. Run manually after the schema migrations.
-- The dioceses migration supplies the ecclesiastical jurisdictions.
BEGIN;

DO $seed$
DECLARE
  colombia_id bigint;
  medellin_id bigint;
  archdiocese_id bigint;
  department_id bigint;
  location record;
BEGIN
  INSERT INTO public.countries (name, code) VALUES ('Colombia', 'CO')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO STRICT colombia_id FROM public.countries
  WHERE name = 'Colombia' AND code = 'CO';

  FOR location IN
    SELECT * FROM (VALUES
      ('Amazonas', 'Leticia'),
      ('Antioquia', 'Medellín'),
      ('Arauca', 'Arauca'),
      ('Atlántico', 'Barranquilla'),
      ('Bolívar', 'Cartagena de Indias'),
      ('Boyacá', 'Tunja'),
      ('Caldas', 'Manizales'),
      ('Caquetá', 'Florencia'),
      ('Casanare', 'Yopal'),
      ('Cauca', 'Popayán'),
      ('Cesar', 'Valledupar'),
      ('Chocó', 'Quibdó'),
      ('Córdoba', 'Montería'),
      ('Cundinamarca', 'Bogotá'),
      ('Guainía', 'Inírida'),
      ('Guaviare', 'San José del Guaviare'),
      ('Huila', 'Neiva'),
      ('La Guajira', 'Riohacha'),
      ('Magdalena', 'Santa Marta'),
      ('Meta', 'Villavicencio'),
      ('Nariño', 'Pasto'),
      ('Norte de Santander', 'Cúcuta'),
      ('Putumayo', 'Mocoa'),
      ('Quindío', 'Armenia'),
      ('Risaralda', 'Pereira'),
      ('San Andrés y Providencia', 'San Andrés'),
      ('Santander', 'Bucaramanga'),
      ('Sucre', 'Sincelejo'),
      ('Tolima', 'Ibagué'),
      ('Valle del Cauca', 'Cali'),
      ('Vaupés', 'Mitú'),
      ('Vichada', 'Puerto Carreño')
    ) AS locations(department, city)
  LOOP
    INSERT INTO public.states (name, country_id) VALUES (location.department, colombia_id)
    ON CONFLICT (name, country_id) DO NOTHING;

    SELECT id INTO STRICT department_id FROM public.states
    WHERE name = location.department AND country_id = colombia_id;

    INSERT INTO public.cities (name, country_id, state_id)
    VALUES (location.city, colombia_id, department_id)
    ON CONFLICT (name, country_id, state_id) DO NOTHING;
  END LOOP;

  SELECT c.id INTO STRICT medellin_id
  FROM public.cities c JOIN public.states s ON s.id = c.state_id
  WHERE c.name = 'Medellín' AND s.name = 'Antioquia'
    AND c.country_id = colombia_id AND s.country_id = colombia_id;

  SELECT id INTO STRICT archdiocese_id FROM public.dioceses
  WHERE name = 'Arquidiócesis de Medellín' AND type = 'arquidiocesis';

  INSERT INTO public.parishes (name, city_id, diocese_id)
  SELECT name, medellin_id, archdiocese_id
  FROM (VALUES
    ('Parroquia La Visitación'),
    ('Parroquia Santa María de los Ángeles'),
    ('Parroquia La Balbanera'),
    ('Parroquia Santuario Niño Jesús de Praga'),
    ('Parroquia Nuestra Señora del Sagrado Corazón'),
    ('Parroquia María Madre Admirable'),
    ('Parroquia El Señor de las Misericordias'),
    ('Parroquia San José de El Poblado'),
    ('Parroquia San Joaquín'),
    ('Parroquia San Cayetano'),
    ('Parroquia San Juan Bosco'),
    ('Parroquia San Antonio de Padua'),
    ('Parroquia Nuestra Señora de Chiquinquirá'),
    ('Parroquia Nuestra Señora de Belén'),
    ('Parroquia Nuestra Señora del Rosario'),
    ('Parroquia Nuestra Señora de la Candelaria'),
    ('Parroquia Nuestra Señora de Fátima'),
    ('Parroquia Nuestra Señora de Guadalupe'),
    ('Parroquia Nuestra Señora de las Lajas'),
    ('Parroquia Nuestra Señora de Lourdes')
  ) AS parishes(name)
  ON CONFLICT (name, city_id) DO NOTHING;
END
$seed$;

INSERT INTO public.step_ways (name, order_num) VALUES
  ('Precatecumenado', 1),
  ('1º Escrutinio Bautismal', 2),
  ('Shemá Israel', 3),
  ('2º Escrutinio Bautismal', 4),
  ('1ª Iniciación a la Oración', 5),
  ('Traditio Symboli', 6),
  ('Retraditio Symboli', 7),
  ('Redditio Symboli', 8),
  ('2ª Iniciación a la Oración: Padrenuestro', 9),
  ('3º Escrutinio Bautismal', 10),
  ('Renovación Promesas Bautismales', 11)
ON CONFLICT (name) DO NOTHING;

COMMIT;
