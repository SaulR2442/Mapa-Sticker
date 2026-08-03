const exifr = require('exifr');

// Extrae las coordenadas GPS de la imagen. Acepta una ruta de archivo o un
// Buffer (multer memoryStorage). Devuelve { lat, lng } o null.
async function extractGps(input) {
  try {
    const gps = await exifr.gps(input);
    if (gps && gps.latitude != null && gps.longitude != null) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    /* sin metadatos: se ignora */
  }
  return null;
}

module.exports = { extractGps };