-- Area17 – schema.sql
-- Ejecutar una vez en Neon: SQL Editor → pegar y ejecutar

CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY,
  nombre_completo TEXT    NOT NULL,
  identificacion  TEXT    UNIQUE NOT NULL,
  celular         TEXT    NOT NULL DEFAULT '',
  tipo_sangre     TEXT    NOT NULL DEFAULT '',
  correo          TEXT    UNIQUE NOT NULL,
  contrasena      TEXT    NOT NULL,
  rol             TEXT    NOT NULL DEFAULT 'VENDEDOR',
  activo          BOOLEAN NOT NULL DEFAULT true,
  foto_perfil     TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS productos (
  id             INTEGER PRIMARY KEY,
  codigo         TEXT    UNIQUE NOT NULL,
  nombre         TEXT    NOT NULL,
  precio         NUMERIC(12,2) NOT NULL DEFAULT 0,
  cantidad       INTEGER NOT NULL DEFAULT 0,
  fecha_registro TEXT    NOT NULL,
  estado         TEXT    NOT NULL DEFAULT 'ACTIVO'
);

CREATE TABLE IF NOT EXISTS ventas (
  id                   INTEGER PRIMARY KEY,
  codigo               TEXT    UNIQUE NOT NULL,
  fecha                TEXT    NOT NULL,
  hora                 TEXT    NOT NULL,
  vendedor_id          INTEGER NOT NULL,
  vendedor_nombre      TEXT    NOT NULL,
  subtotal             NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_productos  NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_tipo       TEXT    NOT NULL DEFAULT 'NINGUNO',
  total                NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado               TEXT    NOT NULL DEFAULT 'COMPLETADA',
  tipo_pago            TEXT    NOT NULL DEFAULT 'EFECTIVO',
  valor_efectivo       NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_transferencia  NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_addi           NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_adicional      NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_adicional_tipo TEXT    NOT NULL DEFAULT 'NINGUNO'
);

CREATE TABLE IF NOT EXISTS detalles_ventas (
  id               INTEGER PRIMARY KEY,
  venta_id         INTEGER NOT NULL,
  producto_codigo  TEXT    NOT NULL,
  producto_nombre  TEXT    NOT NULL,
  cantidad         INTEGER NOT NULL,
  precio_unitario  NUMERIC(12,2) NOT NULL,
  descuento_unidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS gastos (
  id                  INTEGER PRIMARY KEY,
  codigo              TEXT    UNIQUE NOT NULL,
  nombre              TEXT    NOT NULL,
  valor               NUMERIC(12,2) NOT NULL,
  fecha               TEXT    NOT NULL,
  categoria           TEXT    NOT NULL DEFAULT 'GASTO_DIARIO',
  descripcion         TEXT    NOT NULL DEFAULT '',
  estado              TEXT    NOT NULL DEFAULT 'ACTIVO',
  metodo_pago         TEXT    NOT NULL DEFAULT 'EFECTIVO', -- EFECTIVO | TRANSFERENCIA | MIXTO
  medio_pago          TEXT,                                -- BANCOLOMBIA | DAVIPLATA | NEQUI (si aplica)
  valor_efectivo      NUMERIC(12,2),                       -- usado en método MIXTO
  valor_transferencia NUMERIC(12,2)                        -- usado en método MIXTO
);

CREATE TABLE IF NOT EXISTS recomendaciones (
  id        INTEGER PRIMARY KEY,
  fecha     TEXT NOT NULL,
  vendedor  TEXT NOT NULL,
  contenido TEXT NOT NULL,
  estado    TEXT NOT NULL DEFAULT 'ACTIVA'
);
