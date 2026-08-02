const router = require('express').Router();
const ctrl = require('../controllers/stickers.controller');
const { auth } = require('../middleware/auth');
const { uploadSticker } = require('../middleware/upload');
const wrap = require('../utils/asyncHandler');

router.post('/', auth, uploadSticker, wrap(ctrl.create));
router.get('/global', auth, wrap(ctrl.getGlobal));
router.get('/mine', auth, wrap(ctrl.listMine));
router.post('/:id/like', auth, wrap(ctrl.toggleLike));
router.get('/:id', auth, wrap(ctrl.getOne));
router.delete('/:id', auth, wrap(ctrl.remove));

module.exports = router;
