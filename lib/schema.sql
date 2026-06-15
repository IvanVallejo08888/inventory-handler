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
  estado         TEXT    NOT NULL DEFAULT 'ACTIVO',
  precio_compra  NUMERIC(12,2), -- valor de compra unitario (registrado/actualizado desde Inversiones)
  tipo           TEXT,          -- ROPA | CALZADO | GENERAL (registrado desde Inversiones)
  sub_tipo       TEXT           -- NINO | ADULTO (si tipo es ROPA/CALZADO)
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
  costo_adicional_tipo TEXT    NOT NULL DEFAULT 'NINGUNO',
  transfer_provider        TEXT,  -- BANCOLOMBIA | NEQUI | DAVIPLATA (si tipo_pago = TRANSFERENCIA)
  mixed_transfer_provider  TEXT   -- BANCOLOMBIA | NEQUI | DAVIPLATA (si tipo_pago = MIXTO y valor_transferencia > 0)
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

-- Historial de inversiones (compras de mercancía) registradas desde Gastos → categoría "Inversión".
-- Cada inversión crea/actualiza producto(s) en `productos`, registra un gasto en `gastos`
-- (categoria='INVERSION', referenciado por gasto_id) y guarda aquí el detalle completo
-- (tallas/cantidades, productos creados o actualizados) para trazabilidad. Solo ADMINISTRADOR.
CREATE TABLE IF NOT EXISTS inversiones (
  id                  INTEGER PRIMARY KEY,
  codigo              TEXT UNIQUE NOT NULL,
  fecha               TEXT NOT NULL,
  hora                TEXT NOT NULL,
  usuario_id          INTEGER NOT NULL,
  usuario_nombre      TEXT NOT NULL,
  nombre_base         TEXT NOT NULL,
  tipo                TEXT NOT NULL,    -- ROPA | CALZADO | GENERAL
  sub_tipo            TEXT,             -- NINO | ADULTO
  valor_compra        NUMERIC(12,2) NOT NULL, -- valor de compra unitario
  valor_venta         NUMERIC(12,2) NOT NULL, -- valor de venta unitario
  total_unidades      INTEGER NOT NULL,
  total_invertido     NUMERIC(12,2) NOT NULL,
  detalle             JSONB NOT NULL,   -- { tallas | cantidad, productos: [{codigo,nombre,talla,esNuevo,cantidadAportada,cantidadTotal}] }
  metodo_pago         TEXT NOT NULL DEFAULT 'EFECTIVO', -- EFECTIVO | TRANSFERENCIA | MIXTO
  medio_pago          TEXT,                             -- BANCOLOMBIA | DAVIPLATA | NEQUI (si aplica)
  valor_efectivo      NUMERIC(12,2),                    -- usado en método MIXTO
  valor_transferencia NUMERIC(12,2),                    -- usado en método MIXTO
  gasto_id            INTEGER           -- FK lógica hacia gastos.id (registro categoria='INVERSION')
);
