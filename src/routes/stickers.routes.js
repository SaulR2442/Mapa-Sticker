const router = require('express').Router();
const ctrl = require('../controllers/stickers.controller');
const { auth } = require('../middleware/auth');
const { uploadSticker } = require('../middleware/upload');

router.post('/', auth, uploadSticker, ctrl.create);
router.get('/global', auth, ctrl.getGlobal);
router.get('/mine', auth, ctrl.listMine);
router.post('/:id/like', auth, ctrl.toggleLike);
router.get('/:id', auth, ctrl.getOne);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
