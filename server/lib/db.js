// ════════════════════════════════════════════════════════════
//  Capa de persistencia — JSON file store
//  Para producción: reemplazar por PostgreSQL + Prisma/Knex.
//  El contrato (getCollection/save) se mantiene igual.
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');

const SEED = {
  users: [],          // pasajeros
  drivers: [
    {
      id: 'drv_001', nombre: 'Javier López', tel: '987654321',
      password: '$2a$10$rZ8Q9XqK0J3vYwL5nXpHsezF.PvN1xL8K7mD2cB4aR6tY9wU3sV0i', // "pillco2026"
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

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } else {
      cache = JSON.parse(JSON.stringify(SEED));
      persist();
    }
  } catch (e) {
    console.error('[db] error cargando, usando seed:', e.message);
    cache = JSON.parse(JSON.stringify(SEED));
  }
  // Asegurar todas las colecciones
  for (const k of Object.keys(SEED)) if (!cache[k]) cache[k] = SEED[k];
  return cache;
}

let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.error('[db] error guardando:', e.message);
    }
  }, 150);
}

function getCollection(name) {
  const db = load();
  if (!db[name]) db[name] = [];
  return db[name];
}

function save() {
  persist();
}

function addLog(tipo, detalle) {
  const logs = getCollection('logs');
  logs.push({ id: 'log_' + Date.now(), tipo, detalle, ts: new Date().toISOString() });
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  save();
}

module.exports = { getCollection, save, addLog, load };
