// ════════════════════════════════════════════════════════════
//  Capa de persistencia — PostgreSQL (Supabase) con fallback JSON
//  • Si DATABASE_URL existe → PostgreSQL (producción)
//  • Si no → JSON file (desarrollo local)
//
//  Estrategia: cache en memoria + persistencia debounced.
//  El estado completo se guarda como JSONB en una sola fila.
//  Mantiene el mismo contrato getCollection / save / addLog.
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = !!DATABASE_URL;

const SEED = {
  users: [],
  drivers: [
    {
      id: 'drv_001', nombre: 'Javier López', tel: '987654321',
      password: '$2a$10$rZ8Q9XqK0J3vYwL5nXpHsezF.PvN1xL8K7mD2cB4aR6tY9wU3sV0i',
      vehiculo: 'Kia Soluto Verde', placa: 'W1A-452', rating: 4.9,
      lat: -9.9286, lng: -76.2452, online: false, status: 'idle',
      docsAprobados: true, soat: true, licencia: true, antecedentes: true,
      monedero: 248.50, viajesTotal: 312, tipo: 'basico',
    },
    {
      id: 'drv_002', nombre: 'María Quispe', tel: '987111222',
      password: '$2a$10$rZ8Q9XqK0J3vYwL5nXpHsezF.PvN1xL8K7mD2cB4aR6tY9wU3sV0i',
      vehiculo: 'Toyota Yaris Plata', placa: 'X2B-783', rating: 4.8,
      lat: -9.9342, lng: -76.2398, online: true, status: 'idle',
      docsAprobados: true, soat: true, licencia: true, antecedentes: true,
      monedero: 512.00, viajesTotal: 487, tipo: 'premium',
    },
    {
      id: 'drv_003', nombre: 'Carlos Huamán', tel: '987333444',
      password: '$2a$10$rZ8Q9XqK0J3vYwL5nXpHsezF.PvN1xL8K7mD2cB4aR6tY9wU3sV0i',
      vehiculo: 'Honda CG Moto', placa: 'M-4521', rating: 4.7,
      lat: -9.9275, lng: -76.2395, online: true, status: 'idle',
      docsAprobados: false, soat: true, licencia: true, antecedentes: false,
      monedero: 89.30, viajesTotal: 56, tipo: 'moto',
    },
    {
      id: 'drv_004', nombre: 'Lucía Rojas', tel: '987555666',
      password: '$2a$10$rZ8Q9XqK0J3vYwL5nXpHsezF.PvN1xL8K7mD2cB4aR6tY9wU3sV0i',
      vehiculo: 'Hyundai Accent Blanco', placa: 'Y3C-119', rating: 4.95,
      lat: -9.9320, lng: -76.2470, online: true, status: 'idle',
      docsAprobados: true, soat: true, licencia: true, antecedentes: true,
      monedero: 1024.75, viajesTotal: 891, tipo: 'xl',
    },
  ],
  trips: [],
  promos: [
    { codigo: 'HUANUCO15', desc: 0.15, activo: true, usos: 42 },
    { codigo: 'LUNES50',   desc: 0.50, activo: true, usos: 18 },
    { codigo: 'PILLCOPLUS', desc: 0.20, activo: true, usos: 7  },
  ],
  zones: [
    { id: 'z1', nombre: 'Centro Histórico', surge: 1.0, activa: true },
    { id: 'z2', nombre: 'Amarilis',         surge: 1.2, activa: true },
    { id: 'z3', nombre: 'Pillco Marca',     surge: 1.0, activa: true },
    { id: 'z4', nombre: 'Aeropuerto',       surge: 1.5, activa: true },
  ],
  tickets: [],
  logs: [],
};

let pool = null;
let cache = null;
let persistTimer = null;

// ────────── INICIALIZACIÓN ──────────
async function init() {
  if (USE_POSTGRES) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // requerido por Supabase
      max: 4,                              // free tier permite pocas conexiones
      idleTimeoutMillis: 30_000,
    });

    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pillco_state (
        id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const { rows } = await pool.query('SELECT data FROM pillco_state WHERE id = 1');
    if (rows.length === 0) {
      cache = JSON.parse(JSON.stringify(SEED));
      await pool.query(
        'INSERT INTO pillco_state(id, data) VALUES(1, $1::jsonb)',
        [JSON.stringify(cache)]
      );
      console.log('[db] PostgreSQL: estado inicial sembrado');
    } else {
      cache = rows[0].data;
      // Asegurar todas las colecciones requeridas
      for (const k of Object.keys(SEED)) if (!cache[k]) cache[k] = SEED[k];
    }
    console.log(`[db] PostgreSQL conectado · ${cache.drivers.length} conductores · ${cache.users.length} usuarios · ${cache.trips.length} viajes`);
  } else {
    // Modo desarrollo: archivo JSON
    if (fs.existsSync(DB_PATH)) {
      try { cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
      catch (e) { console.error('[db] error cargando JSON, usando seed'); cache = JSON.parse(JSON.stringify(SEED)); }
    } else {
      cache = JSON.parse(JSON.stringify(SEED));
    }
    for (const k of Object.keys(SEED)) if (!cache[k]) cache[k] = SEED[k];
    console.log(`[db] Modo desarrollo (JSON file) · ${cache.drivers.length} conductores`);
  }
}

// ────────── PERSISTENCIA ──────────
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (USE_POSTGRES) {
      try {
        await pool.query(
          `INSERT INTO pillco_state(id, data, updated_at) VALUES(1, $1::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = now()`,
          [JSON.stringify(cache)]
        );
      } catch (e) {
        console.error('[db] error guardando en PostgreSQL:', e.message);
      }
    } else {
      try { fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2)); }
      catch (e) { console.error('[db] error guardando JSON:', e.message); }
    }
  }, 300);
}

// ────────── API PÚBLICA ──────────
function getCollection(name) {
  if (!cache) throw new Error('[db] init() no ha sido llamado todavía');
  if (!cache[name]) cache[name] = [];
  return cache[name];
}

function save() { persist(); }

function addLog(tipo, detalle) {
  const logs = getCollection('logs');
  logs.push({ id: 'log_' + Date.now(), tipo, detalle, ts: new Date().toISOString() });
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  save();
}

// Compat: load síncrono usado por código viejo
function load() {
  if (!cache) throw new Error('[db] init() no ha sido llamado todavía');
  return cache;
}

module.exports = { init, getCollection, save, addLog, load };
