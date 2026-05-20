# Pillco Móvil 🚖

App de movilidad para Huánuco, Perú. PWA instalable + listo para empaquetar como app nativa iOS/Android con Capacitor.

---

## 🚀 Correr local

```bash
# Instala dependencias (opcional, solo para Capacitor)
npm install

# Levanta el servidor de desarrollo
npm run serve
# → http://localhost:8765
```

---

## 📱 Instalación como PWA (funciona AHORA en cualquier celular)

### iOS (Safari)
1. Abre el sitio en **Safari** (no Chrome — iOS solo permite PWA desde Safari)
2. Toca el botón **Compartir** (cuadrado con flecha)
3. **"Añadir a Pantalla de Inicio"**
4. La app se instala con ícono, splash y se abre en pantalla completa

### Android (Chrome/Edge)
1. Abre el sitio en Chrome
2. Menú ⋮ → **"Instalar app"** o **"Añadir a pantalla principal"**
3. Lista — funciona como app nativa

### Desktop (Chrome/Edge)
1. Ícono ⊕ en la barra de direcciones → **"Instalar Pillco Móvil"**

---

## 📦 Empaquetado nativo (Capacitor)

### Setup inicial (una sola vez)

```bash
npm install
npx cap init  # ya configurado en capacitor.config.json
```

### iOS (requiere Mac + Xcode)

```bash
npx cap add ios
npx cap sync ios
npx cap open ios   # Abre Xcode
```

En Xcode:
1. Selecciona tu **Team** (Apple Developer Account)
2. Configura el **Bundle Identifier**: `com.pillco.movil`
3. **Product → Archive** → **Distribute App → App Store Connect**

### Android (funciona en Windows)

```bash
npx cap add android
npx cap sync android
npx cap open android   # Abre Android Studio
```

En Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Crea un keystore (guárdalo seguro — perderlo = no poder actualizar la app)
3. Genera el `.aab` firmado
4. Súbelo a [Google Play Console](https://play.google.com/console)

---

## 🍎 Subir a App Store — Checklist

| # | Tarea | Quién |
|---|---|---|
| 1 | Crear cuenta en [developer.apple.com](https://developer.apple.com) | **Tú** ($99/año) |
| 2 | Tener una **Mac** con macOS Sonoma + Xcode 15+ | **Tú** |
| 3 | Generar `.ipa` con Xcode | Tú (con esta guía) |
| 4 | Crear app en [App Store Connect](https://appstoreconnect.apple.com) | Tú |
| 5 | Configurar metadata: descripción, capturas (6.5", 5.5"), categoría | Tú |
| 6 | Subir build con Xcode (botón Distribute) | Tú |
| 7 | Submit for Review | Tú |
| 8 | Esperar 1-7 días | Apple revisa |

### Información que pedirá Apple
- **Nombre:** Pillco Móvil
- **Bundle ID:** com.pillco.movil
- **Categoría:** Travel / Navigation
- **Edad:** 4+
- **Descripción** (en español): _"Pillco Móvil es la app de movilidad para Huánuco. Viajes seguros con conductores verificados, paga con efectivo, Yape, Plin o tarjeta."_
- **Privacy Policy URL** (obligatoria) — debes hospedarla en tu dominio
- **Support URL** — donde los usuarios pueden contactarte
- **Screenshots** — al menos 3 por tamaño (6.5"/6.7" y 5.5")

### Permisos que la app pedirá (declarar en Info.plist + Apple)
- `NSLocationWhenInUseUsageDescription` — "Pillco necesita tu ubicación para conectarte con conductores cercanos"
- `NSCameraUsageDescription` — (futuro: foto de perfil)
- `NSContactsUsageDescription` — (futuro: invitar amigos)

---

## 🤖 Subir a Google Play — Checklist

| # | Tarea |
|---|---|
| 1 | Crear cuenta en [Google Play Console](https://play.google.com/console) (US$25 una sola vez) |
| 2 | Instalar Android Studio (funciona en Windows ✅) |
| 3 | `npx cap add android && npx cap open android` |
| 4 | **Build → Generate Signed Bundle (.aab)** |
| 5 | Crear keystore (guárdalo en lugar seguro 🔐) |
| 6 | Subir `.aab` a Play Console → Production track |
| 7 | Esperar revisión (1-3 días) |

---

## 🗂 Estructura

```
stitch_pillco_go/
├── index.html                     # Entry point + redirect a bienvenida
├── manifest.webmanifest           # PWA manifest
├── sw.js                          # Service Worker (offline)
├── capacitor.config.json          # Config Capacitor iOS/Android
├── package.json                   # Deps + scripts
├── generate_icons.py              # Generador de íconos
├── icons/                         # 22 íconos PNG (72→1024px + Apple-touch)
├── splash/                        # Splash screens iOS
├── bienvenida_pillco_m_vil/       # Pantalla 1 — onboarding
├── registro_pillco_m_vil/         # Pantalla 2 — registro/login
├── mapa_pillco_m_vil/             # Pantalla 3 — mapa Leaflet real
└── detalles_del_viaje_pillco_m_vil/  # Pantalla 4 — detalles + chat
```

---

## ✨ Stack tecnológico

- **Frontend:** HTML5 + Tailwind CSS + Vanilla JS (sin frameworks pesados)
- **Mapa:** Leaflet.js + OpenStreetMap (gratis, sin API key)
- **Geocoding:** Nominatim (búsqueda de direcciones, gratis)
- **Persistencia:** localStorage (usuario, viajes, pagos)
- **PWA:** Service Worker + Web App Manifest
- **Nativo:** Capacitor 6 (iOS + Android) — opcional

---

## 🔥 Funcionalidad implementada

### Autenticación
- ✅ Registro con validación (nombre, teléfono PE, contraseña)
- ✅ Login con teléfono + contraseña
- ✅ Google Auth simulado
- ✅ Persistencia en localStorage

### Mapa
- ✅ OpenStreetMap real, navegable
- ✅ Búsqueda de direcciones en vivo (Nominatim)
- ✅ Geolocalización del usuario
- ✅ Conductores en movimiento (4 markers animados)
- ✅ Ruta dibujada del origen al destino
- ✅ Precio calculado por distancia real (Haversine)

### Solicitud de viaje
- ✅ 2 tipos: Pillco Básico / Premium
- ✅ Selector de destino con 11 lugares populares + búsqueda libre
- ✅ Cálculo dinámico de precio y ETA

### Detalles del viaje
- ✅ Datos del conductor (Javier L., 4.9★, Kia Soluto verde, placa W1A-452)
- ✅ Mapa real con ruta + conductor animado acercándose
- ✅ Countdown ring SVG sincronizado con ETA
- ✅ Chat con el conductor (respuestas automáticas)
- ✅ Cancelar viaje (modal de confirmación)
- ✅ Calificación de 1-5 estrellas

### Perfil & menú
- ✅ Sidebar con datos del usuario
- ✅ **Mis Viajes** — historial completo de viajes calificados
- ✅ **Pagos** — 5 métodos: Efectivo, Yape, Plin, Visa, BCP
- ✅ **Promociones** — 5 cupones con códigos aplicables
- ✅ **Ayuda** — 3 botones de contacto + 6 FAQ colapsables
- ✅ **Perfil** — stats, editar nombre, cerrar sesión

### PWA
- ✅ Instalable en iOS, Android y Desktop
- ✅ Funciona offline (Service Worker con cache inteligente)
- ✅ Splash screens iOS
- ✅ 22 íconos en todos los tamaños requeridos
- ✅ Theme color verde Yungas
- ✅ Shortcuts del manifest (atajos directos a "Viajar" y "Historial")

---

## 📝 Antes de publicar en stores — Pendientes legales

1. **Privacy Policy** — Texto legal sobre uso de datos (ubicación, teléfono). Plantilla: https://www.privacypolicytemplate.net/
2. **Términos y Condiciones**
3. **Dominio propio** — Para hospedar la web y las políticas (pillcomovil.pe o similar)
4. **HTTPS obligatorio** — Service Worker no funciona sin HTTPS en producción (gratis con [Let's Encrypt](https://letsencrypt.org/) o [Vercel](https://vercel.com))
5. **Backend real** — Actualmente todo es localStorage. Para producción necesitas:
   - API REST (Node.js + Postgres / Firebase)
   - WebSocket para chat conductor-pasajero
   - Integración con pasarela de pago (Yape, Plin, Niubiz/Visanet, MercadoPago)
   - Sistema de matching conductor-pasajero
   - Backend de notificaciones push (Firebase Cloud Messaging)

---

## 🎨 Brand

- **Primary:** `#003820` Yungas Green
- **Secondary:** `#006399` Huallaga Blue
- **Tertiary:** `#482904` Kotosh Ochre
- **Tipografía:** Montserrat (headlines) + Inter (body)
- **Inspiración:** Heritage huanuqueño + naturaleza amazónica

---

## ⚖️ Licencia

Privado — Todos los derechos reservados © 2026 Pillco Móvil
