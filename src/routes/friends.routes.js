const router = require('express').Router();
const ctrl = require('../controllers/friends.controller');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');

router.get('/', auth, wrap(ctrl.list));
router.post('/request', auth, wrap(ctrl.request));
router.post('/:id/:action', auth, wrap(ctrl.respond));
router.delete('/:id', auth, wrap(ctrl.remove));

module.exports = router;
