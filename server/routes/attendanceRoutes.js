const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSummary, checkIn, checkOut, toggleBreak } = require('../controllers/attendanceController');

router.get('/summary', protect, getSummary);
router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.post('/break-toggle', protect, toggleBreak);

module.exports = router;
