// ════════════════════════════════════════════════════════════
//  CONFIGURACIÓN PILLCO — edita SOLO este archivo
// ════════════════════════════════════════════════════════════
//
//  👉 Pega aquí el Client ID que generes en Google Cloud Console.
//     Termina en ".apps.googleusercontent.com"
//
//  Mientras esté el placeholder, el botón de Google usa modo DEMO.
//  Apenas pegues un Client ID válido, se activa Google Sign-In REAL.
//
window.PILLCO_CONFIG = {
  GOOGLE_CLIENT_ID: "328711529713-3u8ltmi0mcvihsdusspoph7uvbd2sbtt.apps.googleusercontent.com",
};

window.PILLCO_CONFIG.googleHabilitado = !window.PILLCO_CONFIG
  .GOOGLE_CLIENT_ID.startsWith("PEGA_TU_CLIENT_ID");
