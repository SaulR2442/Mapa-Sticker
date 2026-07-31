const { users, friends } = require('../db');

async function list(req, res) {
  res.json({
    accepted: await friends.listAccepted(req.userId),
    incoming: await friends.listIncoming(req.userId),
    outgoing: await friends.listOutgoing(req.userId),
  });
}

async function request(req, res) {
  const username = String(req.body.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Indica el nombre de usuario' });

  const target = await users.findByUsername(username);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.id === req.userId) return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });

  const existing = await friends.getPair(req.userId, target.id);
  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Ya son amigos' });
    if (existing.requester_id === req.userId) return res.status(409).json({ error: 'Solicitud ya enviada' });
    // Existía una solicitud inversa pendiente: se acepta automáticamente
    await friends.setStatus(existing.id, 'accepted');
    return res.json({ ok: true, accepted: true, friend: await users.findPublicByUsername(target.username) });
  }

  await friends.request(req.userId, target.id);
  res.status(201).json({ ok: true, accepted: false });
}

async function respond(req, res) {
  const id = Number(req.params.id);
  const action = String(req.params.action || '');
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida' });
  }

  const existing = await friends.findById(id);
  if (!existing) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (existing.addressee_id !== req.userId) {
    return res.status(403).json({ error: 'Esta solicitud no va dirigida a ti' });
  }
  if (existing.status !== 'pending') {
    return res.status(409).json({ error: 'La solicitud ya fue respondida' });
  }

  await friends.setStatus(id, action === 'accept' ? 'accepted' : 'rejected');
  res.json({ ok: true });
}

// Eliminar amistad (o cancelar solicitud pendiente, solo por el solicitante)
async function remove(req, res) {
  const id = Number(req.params.id);
  const friendship = await friends.findById(id);

  if (!friendship) return res.status(404).json({ error: 'Amistad no encontrada' });
  if (friendship.requester_id !== req.userId && friendship.addressee_id !== req.userId) {
    return res.status(403).json({ error: 'No participas en esta amistad' });
  }
  if (friendship.status === 'pending' && friendship.requester_id !== req.userId) {
    return res.status(403).json({ error: 'Solo el solicitante puede cancelar su solicitud' });
  }

  await friends.remove(id);
  res.json({ ok: true });
}

module.exports = { list, request, respond, remove };
