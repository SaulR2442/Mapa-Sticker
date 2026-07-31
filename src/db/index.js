// Capa de datos abstraída.
// Los controladores SIEMPRE importan repositorios desde aquí, nunca el driver
// directamente. Para migrar a PostgreSQL/Supabase solo hay que cambiar
// DB_DRIVER=postgres y DATABASE_URL en .env (los repos son async en ambos).
const { DB_DRIVER } = require('../config/env');

function load() {
  if (DB_DRIVER === 'postgres') {
    return {
      init: require('./postgres/database').init,
      users: require('./postgres/users'),
      stickers: require('./postgres/stickers'),
      friends: require('./postgres/friends'),
      likes: require('./postgres/likes'),
    };
  }
  return {
    init: async () => { require('./database'); }, // sqlite: esquema síncrono
    users: require('./repositories/users'),
    stickers: require('./repositories/stickers'),
    friends: require('./repositories/friends'),
    likes: require('./repositories/likes'),
  };
}

const db = load();

module.exports = {
  initDb: () => db.init(),
  users: db.users,
  stickers: db.stickers,
  friends: db.friends,
  likes: db.likes,
};
