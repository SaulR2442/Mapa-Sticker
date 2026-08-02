const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const wrap = require('../utils/asyncHandler');

router.put('/me', auth, uploadAvatar, wrap(ctrl.updateMe));
router.get('/me/bundle', auth, wrap(ctrl.getMyBundle));
router.get('/search', auth, wrap(ctrl.search));
router.get('/:username/bundle', auth, wrap(ctrl.getBundle));
router.get('/:username', auth, wrap(ctrl.getPublicProfile));
router.get('/:username/stickers', auth, wrap(ctrl.getStickers));
router.get('/:username/route', auth, wrap(ctrl.getRoute));

module.exports = router;
