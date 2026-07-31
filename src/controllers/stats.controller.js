const { friends, stickers } = require('../db');

// Fechas en formato 'YYYY-MM-DD' (UTC, igual que SQLite date())
function computeStats(dates) {
  const total = dates.length;
  const days = new Set(dates);
  const now = new Date();
  const utcDay = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  // Rachas: días consecutivos con sticker, terminando hoy o ayer
  const today = utcDay(now);
  const yesterday = utcDay(new Date(now.getTime() - 86400000));
  let streak = 0;
  let day = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (day) {
    const cursor = new Date(day + 'T00:00:00Z');
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Esta semana (lunes a hoy, UTC)
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  const mondayISO = utcDay(monday);
  let thisWeek = 0;
  for (const d of days) if (d >= mondayISO) thisWeek += 1;

  return { total, this_week: thisWeek, streak };
}

// Ranking: yo + amigos aceptados, ordenados por stickers totales
async function leaderboard(req, res) {
  const me = req.user;
  const friendsList = await friends.listAccepted(req.userId);
  const members = [
    { id: me.id, username: me.username, display_name: me.display_name, avatar: me.avatar, is_me: true },
    ...friendsList.map((f) => ({
      id: f.id, username: f.username, display_name: f.display_name, avatar: f.avatar, is_me: false,
    })),
  ];

  const stats = [];
  for (const m of members) {
    stats.push({ ...m, ...computeStats(await stickers.stickerDates(m.id)) });
  }
  stats.sort((a, b) => b.total - a.total || b.streak - a.streak || b.this_week - a.this_week);

  res.json({ users: stats });
}

module.exports = { leaderboard };
