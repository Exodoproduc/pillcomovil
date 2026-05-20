// ════════════════════════════════════════════════════════════
//  Algoritmo de Matching de Conductores
//
//  Score = w1*(1/distancia) + w2*rating + w3*(1/cargaActual)
//  Filtra por: online, tipo de servicio, docs aprobados, radio máx.
//  Devuelve la lista ordenada de candidatos (mejor primero).
// ════════════════════════════════════════════════════════════
const { distanciaKm } = require('./pricing');

const RADIO_MAX_KM = 8;       // no ofrecer viajes a > 8 km
const PESO_DISTANCIA = 0.55;
const PESO_RATING    = 0.30;
const PESO_DISPONIB  = 0.15;

/**
 * Encuentra los mejores conductores para un viaje.
 * @param {Array} drivers  - colección de conductores
 * @param {Object} pickup  - {lat,lng}
 * @param {String} tipo    - basico|premium|moto|xl|delivery
 * @returns {Array} candidatos ordenados [{driver, distancia, score, etaMin}]
 */
function encontrarConductores(drivers, pickup, tipo = 'basico') {
  const candidatos = drivers
    .filter(d =>
      d.online &&
      d.status === 'idle' &&
      d.docsAprobados &&
      (d.tipo === tipo || tipo === 'basico') // básico lo puede tomar cualquiera
    )
    .map(d => {
      const dist = distanciaKm(pickup.lat, pickup.lng, d.lat, d.lng);
      return { driver: d, distancia: dist };
    })
    .filter(c => c.distancia <= RADIO_MAX_KM)
    .map(c => {
      const sDist = 1 / (1 + c.distancia);          // 0..1, más cerca = mayor
      const sRating = (c.driver.rating || 4) / 5;   // 0..1
      const sDisp = c.driver.status === 'idle' ? 1 : 0.3;
      const score =
        PESO_DISTANCIA * sDist +
        PESO_RATING * sRating +
        PESO_DISPONIB * sDisp;
      return {
        ...c,
        score: Math.round(score * 1000) / 1000,
        etaMin: Math.max(1, Math.round(c.distancia * 3)), // ~20 km/h llegada
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidatos;
}

module.exports = { encontrarConductores, RADIO_MAX_KM };
