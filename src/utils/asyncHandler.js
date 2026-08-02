// Envuelve controladores async: cualquier rechazo pasa al error handler global
// de Express (devuelve 500 JSON) en lugar de dejar la petición colgada.
module.exports = function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
