const express = require('express');
const router = express.Router();
const { getEmployees, createEmployee, updateEmployee, deleteEmployee, bulkDeleteEmployees } = require('../controllers/employeeController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getEmployees);
router.post('/', protect, adminOnly, createEmployee);
router.put('/:id', protect, adminOnly, updateEmployee);
router.delete('/:id', protect, adminOnly, deleteEmployee);
router.post('/bulk-delete', protect, adminOnly, bulkDeleteEmployees);

module.exports = router;
