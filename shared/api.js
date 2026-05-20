// ════════════════════════════════════════════════════════════
//  Cliente API Pillco — compartido por Pasajero / Conductor / Admin
//  Auto-detecta backend: localhost en dev, configurable en prod.
// ════════════════════════════════════════════════════════════
(function (global) {
  const API_BASE =
    localStorage.getItem('pillco_api') ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://pillco-backend.onrender.com'); // cambia tras desplegar backend

  function tokenKey() {
    if (location.pathname.includes('conductor')) return 'pillco_driver_token';
    if (location.pathname.includes('admin'))     return 'pillco_admin_token';
    return 'pillco_token';
  }

  async function req(method, path, body, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const t = localStorage.getItem(tokenKey());
      if (t) headers.Authorization = 'Bearer ' + t;
    }
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  const API = {
    base: API_BASE,
    setToken: (t) => localStorage.setItem(tokenKey(), t),
    getToken: () => localStorage.getItem(tokenKey()),
    logout:   () => localStorage.removeItem(tokenKey()),
    isOnline: async () => { try { await req('GET', '/api/health', null, false); return true; } catch { return false; } },

    // Auth
    sendOtp:  (tel)            => req('POST', '/api/auth/otp', { tel }, false),
    register: (d)              => req('POST', '/api/auth/register', d, false),
    login:    (tel, password)  => req('POST', '/api/auth/login', { tel, password }, false),
    oauth:    (provider, nombre) => req('POST', '/api/auth/oauth', { provider, nombre }, false),
    googleSignIn: (credential)   => req('POST', '/api/auth/google', { credential }, false),
    driverLogin:    (tel, password) => req('POST', '/api/driver/login', { tel, password }, false),
    driverRegister: (data)          => req('POST', '/api/driver/register', data, false),
    adminLogin:  (usuario, password) => req('POST', '/api/admin/login', { usuario, password }, false),

    // Viajes
    estimate: (d)              => req('POST', '/api/trips/estimate', d, false),
    requestTrip: (d)           => req('POST', '/api/trips/request', d),
    getTrip:  (id)             => req('GET',  '/api/trips/' + id, null, false),
    myTrips:  ()               => req('GET',  '/api/trips/mine'),
    acceptTrip: (id)           => req('POST', `/api/trips/${id}/accept`),
    rejectTrip: (id)           => req('POST', `/api/trips/${id}/reject`),
    tripStatus: (id, estado)   => req('POST', `/api/trips/${id}/status`, { estado }),
    cancelTrip: (id)           => req('POST', `/api/trips/${id}/cancel`),
    rateTrip:   (id, estrellas, comentario) => req('POST', `/api/trips/${id}/rate`, { estrellas, comentario }),

    // Conductor
    driverStatus:   (online)   => req('POST', '/api/driver/status', { online }),
    driverLocation: (lat, lng) => req('POST', '/api/driver/location', { lat, lng }),
    driverEarnings: ()         => req('GET',  '/api/driver/earnings'),
    driverWithdraw: (monto)    => req('POST', '/api/driver/withdraw', { monto }),

    // Admin
    adminStats:   ()           => req('GET', '/api/admin/stats'),
    adminDrivers: ()           => req('GET', '/api/admin/drivers'),
    adminUsers:   ()           => req('GET', '/api/admin/users'),
    adminTrips:   ()           => req('GET', '/api/admin/trips'),
    adminLogs:    ()           => req('GET', '/api/admin/logs'),
    adminZones:   ()           => req('GET', '/api/admin/zones'),
    adminPromos:  ()           => req('GET', '/api/admin/promos'),
    adminTickets: ()           => req('GET', '/api/admin/tickets'),
    approveDriver:(id, aprobado) => req('POST', `/api/admin/driver/${id}/approve`, { aprobado }),
    setSurge:     (id, surge)  => req('POST', `/api/admin/zones/${id}/surge`, { surge }),
    createPromo:  (codigo, desc) => req('POST', '/api/admin/promos', { codigo, desc }),

    // Soporte
    createTicket: (asunto, mensaje) => req('POST', '/api/support/ticket', { asunto, mensaje }),
  };

  global.PillcoAPI = API;
})(window);
