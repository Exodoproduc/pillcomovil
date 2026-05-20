# Pillco Móvil — Arquitectura del Sistema

Plataforma de transporte urbano bajo demanda para Huánuco, Perú.
3 módulos (Pasajero · Conductor · Admin) + backend en tiempo real.

---

## 1. Estructura del proyecto

```
stitch_pillco_go/
├── index.html                        # Entry + redirect + PWA
├── manifest.webmanifest / sw.js      # PWA (instalable, offline)
├── vercel.json / .vercelignore       # Config despliegue frontend
│
├── shared/
│   └── api.js                        # Cliente API unificado (3 apps)
│
├── bienvenida_pillco_m_vil/          # ── APP PASAJERO ──
├── registro_pillco_m_vil/            #    auth (backend + fallback)
├── mapa_pillco_m_vil/                #    mapa Leaflet + solicitud
├── detalles_del_viaje_pillco_m_vil/  #    seguimiento en vivo (Socket.IO)
│
├── conductor_pillco_m_vil/           # ── APP CONDUCTOR ──
│   └── code.html                     #    online/offline, viajes, ganancias
│
├── admin_pillco_m_vil/               # ── PANEL ADMIN ──
│   └── code.html                     #    dashboard, gestión, tarifas, logs
│
└── server/                           # ── BACKEND ──
    ├── index.js                      # Express + Socket.IO + REST
    ├── lib/
    │   ├── db.js                     # Persistencia (JSON → swappable a PostgreSQL)
    │   ├── auth.js                   # JWT (sign/verify/middleware)
    │   ├── pricing.js                # Tarifas dinámicas (surge)
    │   └── matching.js               # Matching de conductores
    └── test-e2e.js                   # Test integración tiempo real
```

---

## 2. Flujo de navegación

```
PASAJERO
  Bienvenida → Registro/Login ──┐
                                 ├─→ Mapa (elige destino, tipo)
                                 │      │
                                 │      └─→ POST /trips/request ──► MATCHING
                                 │                                     │
                                 └─→ Detalles (Socket.IO en vivo) ◄────┘
                                        ├─ viaje_aceptado
                                        ├─ driver_location (stream GPS)
                                        ├─ estado_viaje (en_camino→recogido→completado)
                                        └─ Calificación

CONDUCTOR
  Login → [toggle ONLINE] → Socket "driver_online"
        → recibe `nuevo_viaje` → Aceptar/Rechazar
        → en_camino → recogido → completado (+80% a monedero)
        → Ganancias / Historial / Perfil-Docs

ADMIN
  Login → Dashboard (KPIs live cada 10s + Socket events)
        → Viajes / Conductores (aprobar docs) / Usuarios
        → Tarifas (surge x zona) / Promos / Soporte / Logs
```

---

## 3. Base de datos relacional (modelo objetivo PostgreSQL)

El backend actual usa un store JSON con el mismo contrato (`getCollection`).
Migración directa a este esquema:

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(120) NOT NULL,
  tel           VARCHAR(9) UNIQUE NOT NULL,
  password_hash TEXT,
  oauth_provider VARCHAR(20),
  rating        NUMERIC(2,1) DEFAULT 5.0,
  viajes_total  INT DEFAULT 0,
  creado        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drivers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(120) NOT NULL,
  tel           VARCHAR(9) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  vehiculo      VARCHAR(80),
  placa         VARCHAR(10),
  tipo          VARCHAR(12) CHECK (tipo IN ('basico','premium','moto','xl','delivery')),
  rating        NUMERIC(2,1) DEFAULT 5.0,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  online        BOOLEAN DEFAULT false,
  status        VARCHAR(12) DEFAULT 'offline',  -- offline|idle|enviaje
  docs_aprobados BOOLEAN DEFAULT false,
  soat          BOOLEAN DEFAULT false,
  licencia      BOOLEAN DEFAULT false,
  antecedentes  BOOLEAN DEFAULT false,
  monedero      NUMERIC(10,2) DEFAULT 0,
  viajes_total  INT DEFAULT 0
);

CREATE TABLE trips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pasajero_id   UUID REFERENCES users(id),
  conductor_id  UUID REFERENCES drivers(id),
  origen_lat    DOUBLE PRECISION, origen_lng DOUBLE PRECISION,
  destino_lat   DOUBLE PRECISION, destino_lng DOUBLE PRECISION,
  destino_nombre VARCHAR(160),
  tipo          VARCHAR(12),
  distancia_km  NUMERIC(6,2),
  minutos       INT,
  surge         NUMERIC(3,2),
  precio        NUMERIC(8,2),
  pago          VARCHAR(20),
  estado        VARCHAR(16) DEFAULT 'buscando',
                -- buscando|aceptado|en_camino|recogido|completado|cancelado|sin_conductor
  rating_pasajero JSONB,
  rating_conductor JSONB,
  creado        TIMESTAMPTZ DEFAULT now(),
  completado    TIMESTAMPTZ
);
CREATE INDEX idx_trips_estado   ON trips(estado);
CREATE INDEX idx_trips_pasajero ON trips(pasajero_id);
CREATE INDEX idx_trips_conductor ON trips(conductor_id);

CREATE TABLE zones    (id UUID PK, nombre VARCHAR, surge NUMERIC(3,2), activa BOOL);
CREATE TABLE promos   (id UUID PK, codigo VARCHAR UNIQUE, desc NUMERIC(3,2), activo BOOL, usos INT);
CREATE TABLE tickets  (id UUID PK, de VARCHAR, rol VARCHAR, asunto VARCHAR, mensaje TEXT, estado VARCHAR, creado TIMESTAMPTZ);
CREATE TABLE logs     (id UUID PK, tipo VARCHAR, detalle TEXT, ts TIMESTAMPTZ);
```

---

## 4. Endpoints API (REST)

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/otp` | público | Envía OTP SMS (mock; prod: Twilio) |
| POST | `/api/auth/register` | público | Registro pasajero + JWT |
| POST | `/api/auth/login` | público | Login pasajero |
| POST | `/api/auth/oauth` | público | Google/Apple/Facebook |
| POST | `/api/driver/login` | público | Login conductor |
| POST | `/api/admin/login` | público | Login admin |
| POST | `/api/trips/estimate` | público | Cotiza (4 tipos, surge, distancia) |
| POST | `/api/trips/request` | passenger | Crea viaje → **dispara matching** |
| POST | `/api/trips/:id/accept` | driver | Conductor acepta |
| POST | `/api/trips/:id/reject` | driver | Rechaza → reasigna al siguiente |
| POST | `/api/trips/:id/status` | driver | en_camino/recogido/completado |
| POST | `/api/trips/:id/cancel` | ambos | Cancelar |
| POST | `/api/trips/:id/rate` | ambos | Calificación bidireccional |
| GET | `/api/trips/mine` | auth | Historial propio |
| POST | `/api/driver/status` | driver | Toggle online/offline |
| POST | `/api/driver/location` | driver | Stream GPS → viajes activos |
| GET | `/api/driver/earnings` | driver | Día/semana/total/meta/bono |
| POST | `/api/driver/withdraw` | driver | Retiro de monedero |
| GET | `/api/admin/stats` | admin | KPIs |
| GET | `/api/admin/{drivers,users,trips,logs,zones,promos,tickets}` | admin | Listados |
| POST | `/api/admin/driver/:id/approve` | admin | Aprobar/suspender docs |
| POST | `/api/admin/zones/:id/surge` | admin | Ajustar surge por zona |
| POST | `/api/admin/promos` | admin | Crear cupón |
| POST | `/api/support/ticket` | auth | Crear ticket |

**Socket.IO events:** `nuevo_viaje`, `viaje_aceptado`, `estado_viaje`,
`driver_location`, `viaje_cancelado`, `docs_status`, `trip_update`,
`driver_update`, `chat_msg`, `sos`, `sos_alert`, `nuevo_ticket`.

---

## 5. Lógica de matching de conductores

`server/lib/matching.js`

```
candidatos = drivers
  .filter(online && status='idle' && docs_aprobados && tipo coincide)
  .filter(distancia_haversine <= 8 km)
  .map(score = 0.55·(1/(1+dist)) + 0.30·(rating/5) + 0.15·disponibilidad)
  .sort(score DESC)

→ se ofrece al #1. Si rechaza/expira (15s) → al siguiente de la lista.
  ETA = round(distancia · 3 min/km)  (~20 km/h llegada urbana)
```

Escalable a producción: reemplazar el filtro lineal por
índice geoespacial **PostGIS `ST_DWithin`** o **Redis GEOSEARCH**.

---

## 6. Sistema de tarifas dinámicas (surge)

`server/lib/pricing.js`

```
precio = max(MIN, (base + km·tarifaKm + min·tarifaMin) · multTipo · surge) − descuento

surge = factorHoraPico × factorDemanda × surgeZona

factorHoraPico:  pico 7-9h/18-21h ×1.25 · nocturno 0-5h ×1.15
factorDemanda:   ratio = solicitudesActivas / conductoresLibres
                 ≥3→×2.0  ≥2→×1.7  ≥1.2→×1.4  ≥0.8→×1.2  else ×1.0
surgeZona:       configurable por el admin (slider x1.0–x3.0)

Tarifas base por tipo:
  básico  S/3.50 + 1.20/km + 0.25/min   (×1.0)
  premium S/5.00 + 1.80/km + 0.35/min   (×1.45)
  moto    S/2.00 + 0.80/km + 0.15/min   (×0.7)
  xl      S/6.00 + 2.20/km + 0.40/min   (×1.7)
Comisión plataforma: 20% (80% al conductor → monedero)
```

---

## 7. Estrategia de despliegue en producción

| Capa | Dev/Demo | Producción recomendada |
|---|---|---|
| **Frontends** (3 apps PWA) | Vercel ✅ ya desplegado | Vercel / Cloudflare Pages (CDN global) |
| **Backend** Express+Socket.IO | `node server` local | **Render / Railway / Fly.io** (soporta WebSocket persistente; Vercel serverless NO) |
| **Base de datos** | JSON file | **PostgreSQL** (Supabase/Neon/RDS) + PostGIS |
| **Cache / geo** | — | **Redis** (matching, sesiones, rate-limit) |
| **SMS OTP** | mock en consola | **Twilio** / Vonage |
| **Pagos** | simulado | **Niubiz/Culqi** (Perú), Yape/Plin API, Stripe |
| **Push** | — | **Firebase Cloud Messaging** |
| **Tiempo real escala** | Socket.IO single | Socket.IO + **Redis adapter** (multi-instancia) |
| **CI/CD** | manual `vercel deploy` | GitHub Actions → tests → deploy |
| **Observabilidad** | console logs | Sentry + Grafana/Datadog |

**Pasos para producción:**
1. Backend → Render: conectar repo, `npm start`, var `JWT_SECRET`, `PORT`
2. En `shared/api.js` cambiar la URL de prod por la de Render
3. DB: provisionar PostgreSQL, migrar esquema §3, reemplazar `lib/db.js`
4. Twilio para OTP real en `/api/auth/otp`
5. Pasarela de pago real en flujo de cobro
6. HTTPS + dominio propio (`pillcomovil.pe`)

---

## 8. Variables de entorno (backend)

```
PORT=3001
JWT_SECRET=<secreto-fuerte>
# Producción:
DATABASE_URL=postgres://...
REDIS_URL=redis://...
TWILIO_SID=... TWILIO_TOKEN=... TWILIO_FROM=...
```

---

## 9. Credenciales demo

| Rol | Usuario | Contraseña |
|---|---|---|
| Conductor (Premium) | `987111222` | `pillco2026` |
| Conductor (Básico) | `987654321` | `pillco2026` |
| Conductor (Moto, docs pend.) | `987333444` | `pillco2026` |
| Admin | `admin` | `pillco2026` |
| Pasajero | regístrate en la app | — |

---

## 10. Cómo correr todo localmente

```bash
# 1. Backend
cd server && npm install && npm start      # :3001

# 2. Frontends
cd .. && python3 -m http.server 8765       # :8765

# 3. Abrir
#   Pasajero:  http://localhost:8765/
#   Conductor: http://localhost:8765/conductor_pillco_m_vil/code.html
#   Admin:     http://localhost:8765/admin_pillco_m_vil/code.html

# 4. Test e2e del flujo en tiempo real
cd server && node test-e2e.js
```
