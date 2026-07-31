const router = require('express').Router();
const ctrl = require('../controllers/friends.controller');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.list);
router.post('/request', auth, ctrl.request);
router.post('/:id/:action', auth, ctrl.respond);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
