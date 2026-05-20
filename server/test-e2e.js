// Test end-to-end: pasajero → matching → conductor (Socket.IO) → aceptar
const { io } = require('socket.io-client');

const B = 'http://localhost:3001';
const fetchJSON = async (p, opts) => {
  const r = await fetch(B + p, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
};

(async () => {
  console.log('1. Driver login (María, drv_002)...');
  const dl = await fetchJSON('/api/driver/login', { method:'POST', body: JSON.stringify({ tel:'987111222', password:'pillco2026' }) });
  console.log('   token:', dl.token ? 'OK' : 'FAIL', '· online:', dl.driver.online);

  console.log('2. Driver conecta Socket.IO y escucha viajes...');
  const sock = io(B);
  let recibido = null;
  sock.on('connect', () => sock.emit('driver_online', dl.driver.id));
  sock.on('nuevo_viaje', (data) => { recibido = data; console.log('   📲 VIAJE RECIBIDO:', data.trip.destinoNombre, '· S/', data.trip.precio); });

  await new Promise(r => setTimeout(r, 800));

  console.log('3. Driver se pone ONLINE...');
  await fetchJSON('/api/driver/status', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+dl.token}, body: JSON.stringify({ online:true }) });

  console.log('4. Pasajero registra y solicita viaje...');
  const reg = await fetchJSON('/api/auth/register', { method:'POST', body: JSON.stringify({ nombre:'Test Pax', tel:'9'+Math.floor(10000000+Math.random()*8e7), password:'pillco2026' }) });
  const trip = await fetchJSON('/api/trips/request', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+reg.token}, body: JSON.stringify({
    origen:{lat:-9.9306,lng:-76.2422}, destino:{lat:-9.9519,lng:-76.2461}, tipo:'premium', destinoNombre:'Laguna Viña del Río', pago:'Yape'
  })});
  console.log('   trip creado:', trip.trip.id, '· conductores encontrados:', trip.conductoresEncontrados);

  await new Promise(r => setTimeout(r, 1000));

  if (recibido) {
    console.log('5. ✅ Driver RECIBIÓ el viaje en tiempo real. Aceptando...');
    const acc = await fetchJSON(`/api/trips/${trip.trip.id}/accept`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+dl.token} });
    console.log('   estado:', acc.trip.estado, '· conductor:', acc.trip.conductor?.nombre);
  } else {
    console.log('5. ⚠️  Driver NO recibió el viaje (revisar matching/socket)');
  }

  console.log('6. Admin stats:');
  const al = await fetchJSON('/api/admin/login', { method:'POST', body: JSON.stringify({ usuario:'admin', password:'pillco2026' }) });
  const st = await fetchJSON('/api/admin/stats', { headers:{'Authorization':'Bearer '+al.token} });
  console.log('  ', JSON.stringify(st));

  sock.close();
  process.exit(recibido ? 0 : 1);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
