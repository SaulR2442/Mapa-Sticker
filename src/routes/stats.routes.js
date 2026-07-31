const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');
const { auth } = require('../middleware/auth');

router.get('/leaderboard', auth, ctrl.leaderboard);

module.exports = router;
