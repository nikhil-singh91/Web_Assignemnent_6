const express = require('express');
const router = express.Router();
const {
  getLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  initDefaultsHandler
} = require('../controllers/leaveTypeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Authenticated users can list and view leave types
router.get('/', protect, getLeaveTypes);
router.get('/:id', protect, getLeaveTypeById);

// Admin only routes for leave type CRUD and initialization
router.post('/init-defaults', protect, authorize('admin'), initDefaultsHandler);
router.post('/', protect, authorize('admin'), createLeaveType);
router.put('/:id', protect, authorize('admin'), updateLeaveType);
router.delete('/:id', protect, authorize('admin'), deleteLeaveType);

module.exports = router;
