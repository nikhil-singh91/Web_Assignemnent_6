const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaveRequests,
  getLeaveRequestById,
  cancelLeaveRequest,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} = require('../controllers/leaveRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Employee operations
router.post('/', protect, applyLeave);
router.get('/my', protect, getMyLeaveRequests);

// Admin review list
router.get('/', protect, authorize('admin'), getAllLeaveRequests);

// Individual request operations
router.get('/:id', protect, getLeaveRequestById);
router.patch('/:id/cancel', protect, cancelLeaveRequest);
router.patch('/:id/approve', protect, authorize('admin'), approveLeaveRequest);
router.patch('/:id/reject', protect, authorize('admin'), rejectLeaveRequest);

module.exports = router;
