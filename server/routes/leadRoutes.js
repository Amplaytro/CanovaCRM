const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getLeads, createLead, uploadCSV, updateLead } = require('../controllers/leadController');
const { protect, adminOnly } = require('../middleware/auth');

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

router.get('/', protect, getLeads);
router.post('/', protect, adminOnly, createLead);
router.post('/upload-csv', protect, adminOnly, upload.single('file'), uploadCSV);
router.put('/:id', protect, updateLead);

module.exports = router;
