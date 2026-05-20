// ════════════════════════════════════════════════════════════
//  Sistema de tarifas dinámicas (Surge Pricing)
//
//  tarifa = (base + km*tarifaKm + min*tarifaMin) * surge * multiplicadorTipo
//
//  El surge se calcula por:
//   - Ratio demanda/oferta (solicitudes activas / conductores libres)
//   - Hora pico (7-9am, 6-9pm)
//   - Surge configurado por zona desde el admin
// ════════════════════════════════════════════════════════════

const TARIFA = {
  basico:  { base: 3.50, km: 1.20, min: 0.25, mult: 1.0  },
  premium: { base: 5.00, km: 1.80, min: 0.35, mult: 1.45 },
  moto:    { base: 2.00, km: 0.80, min: 0.15, mult: 0.7  },
  xl:      { base: 6.00, km: 2.20, min: 0.40, mult: 1.7  },
  delivery:{ base: 4.00, km: 1.50, min: 0.20, mult: 1.1  },
};

const MIN_TARIFA = 4.0;

// Haversine — distancia en km
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Factor de hora pico
function factorHoraPico() {
  const h = new Date().getHours();
  if ((h >= 7 && h <= 9) || (h >= 18 && h <= 21)) return 1.25;
  if (h >= 0 && h <= 5) return 1.15; // recargo nocturno
  return 1.0;
}

// Surge por demanda/oferta
function factorDemanda(solicitudesActivas, conductoresLibres) {
  const libres = Math.max(1, conductoresLibres);
  const ratio = solicitudesActivas / libres;
  if (ratio >= 3)   return 2.0;
  if (ratio >= 2)   return 1.7;
  if (ratio >= 1.2) return 1.4;
  if (ratio >= 0.8) return 1.2;
  return 1.0;
}

/**
 * Cotiza un viaje.
 * @returns {{distanciaKm, minutos, surge, desglose, precio, precioSinSurge}}
 */
function cotizar({ origen, destino, tipo = 'basico', solicitudesActivas = 0, conductoresLibres = 5, zonaSurge = 1.0, promoDesc = 0 }) {
  const t = TARIFA[tipo] || TARIFA.basico;
  const dist = distanciaKm(origen.lat, origen.lng, destino.lat, destino.lng);
  const minutos = Math.max(3, Math.round(dist * 4)); // ~15 km/h promedio urbano

  const surgeBruto =
    factorHoraPico() *
    factorDemanda(solicitudesActivas, conductoresLibres) *
    (zonaSurge || 1.0);
  const surge = Math.round(surgeBruto * 100) / 100;

  const subtotal = (t.base + dist * t.km + minutos * t.min) * t.mult;
  let precio = subtotal * surge;
  precio = Math.max(MIN_TARIFA, precio);

  const descuento = precio * (promoDesc || 0);
  const precioFinal = Math.round((precio - descuento) * 100) / 100;

  return {
    distanciaKm: Math.round(dist * 100) / 100,
    minutos,
    surge,
    desglose: {
      base: t.base,
      porKm: Math.round(dist * t.km * 100) / 100,
      porMin: Math.round(minutos * t.min * 100) / 100,
      multiplicadorTipo: t.mult,
      surge,
      descuento: Math.round(descuento * 100) / 100,
    },
    precioSinSurge: Math.round(subtotal * 100) / 100,
    precio: precioFinal,
  };
}

module.exports = { cotizar, distanciaKm, TARIFA };
