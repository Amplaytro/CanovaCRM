const express = require('express');
const router = express.Router();
const { getStats, getSalesGraph, getRecentActivity, getActiveSalespeople } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getStats);
router.get('/sales-graph', protect, getSalesGraph);
router.get('/recent-activity', protect, getRecentActivity);
router.get('/active-salespeople', protect, getActiveSalespeople);

module.exports = router;
