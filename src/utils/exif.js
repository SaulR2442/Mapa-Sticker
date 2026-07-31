const exifr = require('exifr');

// Extrae las coordenadas GPS de la imagen. Devuelve { lat, lng } o null.
async function extractGps(filePath) {
  try {
    const gps = await exifr.gps(filePath);
    if (gps && gps.latitude != null && gps.longitude != null) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    /* sin metadatos: se ignora */
  }
  return null;
}

module.exports = { extractGps };
