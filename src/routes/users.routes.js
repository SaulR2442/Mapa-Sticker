const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.put('/me', auth, uploadAvatar, ctrl.updateMe);
router.get('/me/bundle', auth, ctrl.getMyBundle);
router.get('/search', auth, ctrl.search);
router.get('/:username/bundle', auth, ctrl.getBundle);
router.get('/:username', auth, ctrl.getPublicProfile);
router.get('/:username/stickers', auth, ctrl.getStickers);
router.get('/:username/route', auth, ctrl.getRoute);

module.exports = router;
