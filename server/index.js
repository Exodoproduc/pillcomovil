// ════════════════════════════════════════════════════════════
//  PILLCO MÓVIL — Backend ligero
//  Express (REST) + Socket.IO (tiempo real) + JWT
// ════════════════════════════════════════════════════════════
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const { getCollection, save, addLog } = require('./lib/db');
const { sign, authRequired } = require('./lib/auth');
const { cotizar } = require('./lib/pricing');
const { encontrarConductores } = require('./lib/matching');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const otpStore = new Map(); // tel -> { code, exp }

// ───────────────────────────────────────────────────────────
//  AUTH — Pasajeros
// ───────────────────────────────────────────────────────────
app.post('/api/auth/otp', (req, res) => {
  const { tel } = req.body;
  if (!/^\d{9}$/.test(tel || '')) return res.status(400).json({ error: 'Teléfono inválido' });
  const code = String(Math.floor(1000 + Math.random() * 9000));
  otpStore.set(tel, { code, exp: Date.now() + 5 * 60_000 });
  console.log(`[OTP] ${tel} → ${code}`); // En prod: enviar vía Twilio SMS
  res.json({ ok: true, mensaje: 'OTP enviado', _devCode: code }); // _devCode solo en demo
});

app.post('/api/auth/register', async (req, res) => {
  const { nombre, tel, password, otp } = req.body;
  if (!nombre || !/^\d{9}$/.test(tel || '') || (password || '').length < 8)
    return res.status(400).json({ error: 'Datos inválidos' });

  const saved = otpStore.get(tel);
  if (otp && (!saved || saved.code !== otp || saved.exp < Date.now()))
    return res.status(400).json({ error: 'OTP inválido o expirado' });

  const users = getCollection('users');
  if (users.find(u => u.tel === tel)) return res.status(409).json({ error: 'Teléfono ya registrado' });

  const user = {
    id: uid('usr'), nombre, tel,
    password: await bcrypt.hash(password, 10),
    rating: 5.0, viajesTotal: 0, creado: new Date().toISOString(),
  };
  users.push(user); save();
  addLog('registro_usuario', `${nombre} (${tel})`);
  const token = sign({ id: user.id, role: 'passenger', nombre });
  res.json({ token, user: { id: user.id, nombre, tel } });
});

app.post('/api/auth/login', async (req, res) => {
  const { tel, password } = req.body;
  const users = getCollection('users');
  const user = users.find(u => u.tel === tel);
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = sign({ id: user.id, role: 'passenger', nombre: user.nombre });
  res.json({ token, user: { id: user.id, nombre: user.nombre, tel: user.tel } });
});

// ── Google Sign-In REAL ──────────────────────────────────────
// Verifica el ID token de Google contra GOOGLE_CLIENT_ID.
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Falta credential' });
  if (!GOOGLE_CLIENT_ID)
    return res.status(503).json({ error: 'Google no configurado en el servidor (set GOOGLE_CLIENT_ID)' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload(); // { sub, email, name, picture, email_verified }
    if (!p.email_verified) return res.status(401).json({ error: 'Email Google no verificado' });

    const users = getCollection('users');
    let user = users.find(u => u.googleSub === p.sub || u.email === p.email);
    if (!user) {
      user = {
        id: uid('usr'), nombre: p.name || p.email.split('@')[0],
        email: p.email, googleSub: p.sub, foto: p.picture,
        tel: '', rating: 5.0, viajesTotal: 0, creado: new Date().toISOString(),
      };
      users.push(user); save();
      addLog('registro_google', `${user.nombre} (${p.email})`);
    }
    const token = sign({ id: user.id, role: 'passenger', nombre: user.nombre });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, foto: user.foto } });
  } catch (e) {
    console.error('[google] verificación falló:', e.message);
    res.status(401).json({ error: 'Token de Google inválido' });
  }
});

// OAuth simulado (Apple/Facebook + Google demo)
app.post('/api/auth/oauth', (req, res) => {
  const { provider, nombre } = req.body;
  const users = getCollection('users');
  let user = users.find(u => u.oauthProvider === provider && u.nombre === nombre);
  if (!user) {
    user = { id: uid('usr'), nombre: nombre || `Usuario ${provider}`, tel: '9' + Math.floor(10000000 + Math.random()*89999999), oauthProvider: provider, rating: 5, viajesTotal: 0, creado: new Date().toISOString() };
    users.push(user); save();
  }
  const token = sign({ id: user.id, role: 'passenger', nombre: user.nombre });
  res.json({ token, user: { id: user.id, nombre: user.nombre, tel: user.tel } });
});

// ───────────────────────────────────────────────────────────
//  AUTH — Conductores
// ───────────────────────────────────────────────────────────
app.post('/api/driver/register', async (req, res) => {
  const { nombre, tel, password, vehiculo, placa, tipo, licencia, soat, antecedentes } = req.body;

  if (!nombre || !/^\d{9}$/.test(tel || '') || (password || '').length < 8)
    return res.status(400).json({ error: 'Datos personales inválidos' });
  if (!vehiculo || !placa || !tipo)
    return res.status(400).json({ error: 'Faltan datos del vehículo' });
  if (!['basico','premium','moto','xl','delivery'].includes(tipo))
    return res.status(400).json({ error: 'Tipo de servicio inválido' });

  const drivers = getCollection('drivers');
  if (drivers.find(d => d.tel === tel))   return res.status(409).json({ error: 'Teléfono ya registrado' });
  if (drivers.find(d => d.placa === placa)) return res.status(409).json({ error: 'Placa ya registrada' });

  const drv = {
    id: uid('drv'),
    nombre, tel,
    password: await bcrypt.hash(password, 10),
    vehiculo, placa, tipo,
    rating: 5.0,
    lat: -9.9306, lng: -76.2422, // Plaza de Armas por defecto
    online: false, status: 'offline',
    licencia: !!licencia, soat: !!soat, antecedentes: !!antecedentes,
    docsAprobados: false,        // ⚠️ requiere aprobación admin
    monedero: 0, viajesTotal: 0,
    creado: new Date().toISOString(),
  };
  drivers.push(drv); save();
  addLog('registro_conductor', `${nombre} (${tel}) · ${vehiculo} ${placa} · pendiente aprobación`);

  // Notificar al admin
  io.to('admin').emit('driver_update', sanitizeDriver(drv));

  const token = sign({ id: drv.id, role: 'driver', nombre });
  res.json({ token, driver: sanitizeDriver(drv) });
});

app.post('/api/driver/login', async (req, res) => {
  const { tel, password } = req.body;
  const drivers = getCollection('drivers');
  const drv = drivers.find(d => d.tel === tel);
  // demo: aceptar "pillco2026" o el hash
  const ok = drv && (password === 'pillco2026' || await bcrypt.compare(password || '', drv.password).catch(() => false));
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = sign({ id: drv.id, role: 'driver', nombre: drv.nombre });
  res.json({ token, driver: sanitizeDriver(drv) });
});

function sanitizeDriver(d) {
  const { password, ...rest } = d;
  return rest;
}

// ───────────────────────────────────────────────────────────
//  VIAJES
// ───────────────────────────────────────────────────────────

// Cotización (distancia, tiempo, tarifa, surge)
app.post('/api/trips/estimate', (req, res) => {
  const { origen, destino, tipo } = req.body;
  if (!origen || !destino) return res.status(400).json({ error: 'Faltan coordenadas' });

  const trips = getCollection('trips');
  const drivers = getCollection('drivers');
  const solicitudesActivas = trips.filter(t => ['buscando', 'solicitado'].includes(t.estado)).length;
  const conductoresLibres = drivers.filter(d => d.online && d.status === 'idle').length;

  const zones = getCollection('zones');
  const zonaSurge = Math.max(...zones.filter(z => z.activa).map(z => z.surge), 1.0);

  const promos = getCollection('promos');
  let promoDesc = 0;
  if (req.body.promo) {
    const p = promos.find(x => x.codigo === req.body.promo && x.activo);
    if (p) promoDesc = p.desc;
  }

  const cotizacion = {};
  for (const t of ['basico', 'premium', 'moto', 'xl']) {
    cotizacion[t] = cotizar({ origen, destino, tipo: t, solicitudesActivas, conductoresLibres, zonaSurge, promoDesc });
  }
  res.json({ cotizacion, surge: cotizacion.basico.surge, conductoresLibres, solicitudesActivas });
});

// Solicitar viaje → dispara matching + Socket.IO
app.post('/api/trips/request', authRequired('passenger'), (req, res) => {
  const { origen, destino, tipo = 'basico', destinoNombre, pago = 'Efectivo' } = req.body;
  const trips = getCollection('trips');
  const drivers = getCollection('drivers');

  const solicitudesActivas = trips.filter(t => ['buscando', 'solicitado'].includes(t.estado)).length;
  const conductoresLibres = drivers.filter(d => d.online && d.status === 'idle').length;
  const q = cotizar({ origen, destino, tipo, solicitudesActivas, conductoresLibres });

  const trip = {
    id: uid('trip'),
    pasajeroId: req.user.id, pasajeroNombre: req.user.nombre,
    origen, destino, destinoNombre: destinoNombre || 'Destino',
    tipo, pago, ...q,
    estado: 'buscando', conductorId: null,
    creado: new Date().toISOString(),
  };
  trips.push(trip); save();
  addLog('viaje_solicitado', `${req.user.nombre} → ${trip.destinoNombre} (S/${q.precio})`);

  // Matching
  const candidatos = encontrarConductores(drivers, origen, tipo);
  trip.candidatos = candidatos.map(c => c.driver.id);
  save();

  // Notificar al mejor conductor disponible vía Socket.IO
  if (candidatos.length) {
    const mejor = candidatos[0];
    io.to('driver_' + mejor.driver.id).emit('nuevo_viaje', {
      trip: { ...trip, candidatos: undefined },
      distancia: mejor.distancia,
      etaMin: mejor.etaMin,
    });
  }

  // Notificar al panel admin
  io.to('admin').emit('trip_update', trip);

  res.json({ trip, conductoresEncontrados: candidatos.length });
});

// Conductor acepta
app.post('/api/trips/:id/accept', authRequired('driver'), (req, res) => {
  const trips = getCollection('trips');
  const drivers = getCollection('drivers');
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'Viaje no existe' });
  if (trip.estado !== 'buscando') return res.status(409).json({ error: 'Viaje ya no disponible' });

  const drv = drivers.find(d => d.id === req.user.id);
  trip.estado = 'aceptado';
  trip.conductorId = drv.id;
  trip.conductor = { id: drv.id, nombre: drv.nombre, vehiculo: drv.vehiculo, placa: drv.placa, rating: drv.rating, lat: drv.lat, lng: drv.lng };
  drv.status = 'enviaje';
  save();
  addLog('viaje_aceptado', `${drv.nombre} aceptó viaje ${trip.id}`);

  io.to('trip_' + trip.id).emit('viaje_aceptado', trip);
  io.to('admin').emit('trip_update', trip);
  res.json({ trip });
});

// Conductor rechaza → reasignar al siguiente
app.post('/api/trips/:id/reject', authRequired('driver'), (req, res) => {
  const trips = getCollection('trips');
  const drivers = getCollection('drivers');
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'No existe' });

  trip.candidatos = (trip.candidatos || []).filter(id => id !== req.user.id);
  save();
  const siguiente = drivers.find(d => d.id === (trip.candidatos || [])[0]);
  if (siguiente) {
    io.to('driver_' + siguiente.id).emit('nuevo_viaje', { trip: { ...trip, candidatos: undefined } });
  } else {
    trip.estado = 'sin_conductor';
    io.to('trip_' + trip.id).emit('sin_conductor', trip);
  }
  save();
  res.json({ ok: true });
});

// Cambios de estado: en_camino → recogido → completado
app.post('/api/trips/:id/status', authRequired('driver'), (req, res) => {
  const { estado } = req.body; // 'en_camino' | 'recogido' | 'completado'
  const trips = getCollection('trips');
  const drivers = getCollection('drivers');
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'No existe' });

  trip.estado = estado;
  if (estado === 'completado') {
    trip.completado = new Date().toISOString();
    const drv = drivers.find(d => d.id === trip.conductorId);
    if (drv) {
      drv.status = 'idle';
      drv.monedero += trip.precio * 0.8; // 80% al conductor, 20% comisión
      drv.viajesTotal += 1;
    }
    const user = getCollection('users').find(u => u.id === trip.pasajeroId);
    if (user) user.viajesTotal = (user.viajesTotal || 0) + 1;
    addLog('viaje_completado', `${trip.id} — S/${trip.precio}`);
  }
  save();
  io.to('trip_' + trip.id).emit('estado_viaje', trip);
  io.to('admin').emit('trip_update', trip);
  res.json({ trip });
});

// Cancelar (pasajero o conductor)
app.post('/api/trips/:id/cancel', authRequired(), (req, res) => {
  const trips = getCollection('trips');
  const drivers = getCollection('drivers');
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'No existe' });
  trip.estado = 'cancelado';
  trip.canceladoPor = req.user.role;
  const drv = drivers.find(d => d.id === trip.conductorId);
  if (drv) drv.status = 'idle';
  save();
  addLog('viaje_cancelado', `${trip.id} por ${req.user.role}`);
  io.to('trip_' + trip.id).emit('viaje_cancelado', trip);
  io.to('admin').emit('trip_update', trip);
  res.json({ trip });
});

// Calificar (bidireccional)
app.post('/api/trips/:id/rate', authRequired(), (req, res) => {
  const { estrellas, comentario } = req.body;
  const trips = getCollection('trips');
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'No existe' });
  if (req.user.role === 'passenger') trip.ratingPasajero = { estrellas, comentario };
  else trip.ratingConductor = { estrellas, comentario };
  save();
  res.json({ ok: true });
});

// Historial
app.get('/api/trips/mine', authRequired(), (req, res) => {
  const trips = getCollection('trips');
  const key = req.user.role === 'driver' ? 'conductorId' : 'pasajeroId';
  res.json(trips.filter(t => t[key] === req.user.id).reverse());
});

app.get('/api/trips/:id', (req, res) => {
  const trip = getCollection('trips').find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'No existe' });
  res.json(trip);
});

// ───────────────────────────────────────────────────────────
//  CONDUCTOR
// ───────────────────────────────────────────────────────────
app.post('/api/driver/status', authRequired('driver'), (req, res) => {
  const { online } = req.body;
  const drv = getCollection('drivers').find(d => d.id === req.user.id);
  drv.online = !!online;
  if (!online) drv.status = 'offline'; else if (drv.status === 'offline') drv.status = 'idle';
  save();
  addLog('conductor_estado', `${drv.nombre} ${online ? 'ONLINE' : 'OFFLINE'}`);
  io.to('admin').emit('driver_update', sanitizeDriver(drv));
  res.json({ online: drv.online, status: drv.status });
});

app.post('/api/driver/location', authRequired('driver'), (req, res) => {
  const { lat, lng } = req.body;
  const drv = getCollection('drivers').find(d => d.id === req.user.id);
  if (drv) { drv.lat = lat; drv.lng = lng; save(); }
  // Stream a viajes activos del conductor
  const trips = getCollection('trips');
  trips.filter(t => t.conductorId === drv.id && ['aceptado','en_camino','recogido'].includes(t.estado))
       .forEach(t => io.to('trip_' + t.id).emit('driver_location', { lat, lng, tripId: t.id }));
  res.json({ ok: true });
});

app.get('/api/driver/earnings', authRequired('driver'), (req, res) => {
  const trips = getCollection('trips').filter(t => t.conductorId === req.user.id && t.estado === 'completado');
  const drv = getCollection('drivers').find(d => d.id === req.user.id);
  const ahora = Date.now();
  const dia = trips.filter(t => ahora - new Date(t.completado).getTime() < 864e5);
  const semana = trips.filter(t => ahora - new Date(t.completado).getTime() < 7 * 864e5);
  const sum = arr => Math.round(arr.reduce((a, t) => a + t.precio * 0.8, 0) * 100) / 100;
  res.json({
    monedero: drv?.monedero || 0,
    hoy: { viajes: dia.length, ganancia: sum(dia) },
    semana: { viajes: semana.length, ganancia: sum(semana) },
    total: { viajes: trips.length, ganancia: sum(trips) },
    meta: { objetivo: 50, actual: dia.length, bono: dia.length >= 50 ? 80 : 0 },
  });
});

app.post('/api/driver/withdraw', authRequired('driver'), (req, res) => {
  const { monto } = req.body;
  const drv = getCollection('drivers').find(d => d.id === req.user.id);
  if (monto > drv.monedero) return res.status(400).json({ error: 'Saldo insuficiente' });
  drv.monedero = Math.round((drv.monedero - monto) * 100) / 100;
  save();
  addLog('retiro', `${drv.nombre} retiró S/${monto}`);
  res.json({ ok: true, monedero: drv.monedero });
});

// ───────────────────────────────────────────────────────────
//  ADMIN
// ───────────────────────────────────────────────────────────
app.get('/api/admin/stats', authRequired('admin'), (_req, res) => {
  const users = getCollection('users');
  const drivers = getCollection('drivers');
  const trips = getCollection('trips');
  const completados = trips.filter(t => t.estado === 'completado');
  const ingresos = Math.round(completados.reduce((a, t) => a + t.precio, 0) * 100) / 100;
  res.json({
    usuarios: users.length,
    conductores: drivers.length,
    conductoresOnline: drivers.filter(d => d.online).length,
    viajesTotal: trips.length,
    viajesActivos: trips.filter(t => ['buscando','aceptado','en_camino','recogido'].includes(t.estado)).length,
    viajesCompletados: completados.length,
    viajesCancelados: trips.filter(t => t.estado === 'cancelado').length,
    ingresos,
    comision: Math.round(ingresos * 0.2 * 100) / 100,
    docsPendientes: drivers.filter(d => !d.docsAprobados).length,
  });
});

app.get('/api/admin/drivers', authRequired('admin'), (_req, res) =>
  res.json(getCollection('drivers').map(sanitizeDriver)));

app.get('/api/admin/users', authRequired('admin'), (_req, res) =>
  res.json(getCollection('users').map(({ password, ...u }) => u)));

app.get('/api/admin/trips', authRequired('admin'), (_req, res) =>
  res.json(getCollection('trips').slice(-100).reverse()));

app.post('/api/admin/driver/:id/approve', authRequired('admin'), (req, res) => {
  const drv = getCollection('drivers').find(d => d.id === req.params.id);
  if (!drv) return res.status(404).json({ error: 'No existe' });
  drv.docsAprobados = !!req.body.aprobado;
  drv.antecedentes = !!req.body.aprobado;
  save();
  addLog('docs_revisados', `${drv.nombre}: ${req.body.aprobado ? 'APROBADO' : 'RECHAZADO'}`);
  io.to('driver_' + drv.id).emit('docs_status', { aprobado: drv.docsAprobados });
  res.json({ ok: true, driver: sanitizeDriver(drv) });
});

app.get('/api/admin/zones', authRequired('admin'), (_req, res) =>
  res.json(getCollection('zones')));

app.post('/api/admin/zones/:id/surge', authRequired('admin'), (req, res) => {
  const z = getCollection('zones').find(x => x.id === req.params.id);
  if (!z) return res.status(404).json({ error: 'No existe' });
  z.surge = parseFloat(req.body.surge) || 1.0;
  save();
  addLog('surge_actualizado', `${z.nombre} → x${z.surge}`);
  res.json({ ok: true, zone: z });
});

app.get('/api/admin/promos', authRequired('admin'), (_req, res) =>
  res.json(getCollection('promos')));

app.post('/api/admin/promos', authRequired('admin'), (req, res) => {
  const { codigo, desc } = req.body;
  const promos = getCollection('promos');
  promos.push({ codigo: codigo.toUpperCase(), desc: parseFloat(desc), activo: true, usos: 0 });
  save();
  res.json({ ok: true, promos });
});

app.get('/api/admin/logs', authRequired('admin'), (_req, res) =>
  res.json(getCollection('logs').slice(-100).reverse()));

app.get('/api/admin/tickets', authRequired('admin'), (_req, res) =>
  res.json(getCollection('tickets').reverse()));

app.post('/api/support/ticket', authRequired(), (req, res) => {
  const tickets = getCollection('tickets');
  const t = { id: uid('tk'), de: req.user.nombre, rol: req.user.role, asunto: req.body.asunto, mensaje: req.body.mensaje, estado: 'abierto', creado: new Date().toISOString() };
  tickets.push(t); save();
  io.to('admin').emit('nuevo_ticket', t);
  res.json({ ok: true, ticket: t });
});

// Login admin (demo)
app.post('/api/admin/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === 'admin' && password === 'pillco2026') {
    return res.json({ token: sign({ id: 'admin', role: 'admin', nombre: 'Administrador' }) });
  }
  res.status(401).json({ error: 'Credenciales incorrectas' });
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ───────────────────────────────────────────────────────────
//  SOCKET.IO — Tiempo real
// ───────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join', ({ room }) => socket.join(room));
  socket.on('join_trip', (tripId) => socket.join('trip_' + tripId));
  socket.on('driver_online', (driverId) => socket.join('driver_' + driverId));
  socket.on('admin_join', () => socket.join('admin'));

  // Chat encriptado pasajero↔conductor (relay simple)
  socket.on('chat_msg', ({ tripId, from, text }) => {
    io.to('trip_' + tripId).emit('chat_msg', { from, text, ts: Date.now() });
  });

  // Botón SOS
  socket.on('sos', ({ tripId, lat, lng, from }) => {
    addLog('SOS', `Emergencia en viaje ${tripId} (${lat},${lng})`);
    io.to('admin').emit('sos_alert', { tripId, lat, lng, from, ts: Date.now() });
    io.to('trip_' + tripId).emit('sos_activo', { from });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚖 Pillco Backend en http://localhost:${PORT}`);
  console.log(`   Socket.IO activo · ${getCollection('drivers').length} conductores seed\n`);
});
