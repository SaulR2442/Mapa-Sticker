const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');
const { auth } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');

router.get('/leaderboard', auth, wrap(ctrl.leaderboard));

module.exports = router;
