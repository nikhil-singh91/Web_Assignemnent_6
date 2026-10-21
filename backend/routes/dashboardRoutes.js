const express = require('express');
const router = express.Router();
const {
  getEmployeeDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/employee', protect, getEmployeeDashboard);
router.get('/admin', protect, authorize('admin'), getAdminDashboard);

module.exports = router;
