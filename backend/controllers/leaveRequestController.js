const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');

// Helper to normalize date to midnight UTC
const normalizeToDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Apply for a leave
// @route   POST /api/leave-requests
// @access  Private (Employee)
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType: leaveTypeId, startDate, endDate, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leaveType, startDate, endDate, and reason'
      });
    }

    const start = normalizeToDate(startDate);
    const end = normalizeToDate(endDate);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate or endDate format'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date'
      });
    }

    // Inclusive day calculation (e.g., Mon to Mon = 1 day, Mon to Tue = 2 days)
    const diffTime = end.getTime() - start.getTime();
    const numberOfDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (numberOfDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Leave duration must be at least 1 day'
      });
    }

    // Verify leave type is valid and active
    const leaveTypeDoc = await LeaveType.findById(leaveTypeId);
    if (!leaveTypeDoc || !leaveTypeDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The selected leave type is invalid or currently inactive'
      });
    }

    // Check user's leave balance
    const user = await User.findById(req.user._id);
    let balanceRecord = user.leaveBalances.find(
      (b) => b.leaveType.toString() === leaveTypeId.toString()
    );

    // If no balance record exists yet, allocate default quota
    if (!balanceRecord) {
      balanceRecord = {
        leaveType: leaveTypeDoc._id,
        allocated: leaveTypeDoc.yearlyQuota,
        used: 0
      };
      user.leaveBalances.push(balanceRecord);
      await user.save();
    }

    const available = balanceRecord.allocated - balanceRecord.used;
    if (available < numberOfDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. You have ${available} day(s) available for ${leaveTypeDoc.name}, but requested ${numberOfDays} day(s).`
      });
    }

    // Check for overlapping pending or approved requests for this employee
    const overlapping = await LeaveRequest.findOne({
      employee: req.user._id,
      status: { $in: ['Pending', 'Approved'] },
      $and: [
        { startDate: { $lte: end } },
        { endDate: { $gte: start } }
      ]
    }).populate('leaveType', 'name');

    if (overlapping) {
      const fromStr = new Date(overlapping.startDate).toISOString().slice(0, 10);
      const toStr = new Date(overlapping.endDate).toISOString().slice(0, 10);
      return res.status(409).json({
        success: false,
        message: `You already have a ${overlapping.status.toLowerCase()} leave request (${overlapping.leaveType.name}) overlapping this period: ${fromStr} to ${toStr}.`
      });
    }

    // Create the leave request (Balance is deducted ONLY after admin approval)
    const newRequest = await LeaveRequest.create({
      employee: req.user._id,
      leaveType: leaveTypeDoc._id,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason: reason.trim(),
      status: 'Pending'
    });

    const populatedRequest = await LeaveRequest.findById(newRequest._id)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name yearlyQuota');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully and is pending approval',
      data: populatedRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave requests for the logged-in employee
// @route   GET /api/leave-requests/my
// @access  Private (Employee/Admin)
const getMyLeaveRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ employee: req.user._id })
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single leave request details
// @route   GET /api/leave-requests/:id
// @access  Private
const getLeaveRequestById = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Authorization: Only the owner or an admin can view the request
    if (
      req.user.role !== 'admin' &&
      request.employee._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view another employee’s leave request'
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a leave request
// @route   PATCH /api/leave-requests/:id/cancel
// @access  Private
const cancelLeaveRequest = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Authorization: Employee who created it or Admin
    if (
      req.user.role !== 'admin' &&
      request.employee.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel another employee’s leave request'
      });
    }

    if (request.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This leave request has already been cancelled'
      });
    }

    if (request.status === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a leave request that has already been rejected'
      });
    }

    // If request was approved, restore the deducted leave balance
    if (request.status === 'Approved') {
      await User.updateOne(
        {
          _id: request.employee,
          'leaveBalances.leaveType': request.leaveType
        },
        {
          $inc: { 'leaveBalances.$.used': -request.numberOfDays }
        }
      );
    }

    request.status = 'Cancelled';
    await request.save();

    const updated = await LeaveRequest.findById(request._id)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name')
      .populate('reviewedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Leave request has been successfully cancelled',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave requests across the company (with filters)
// @route   GET /api/leave-requests
// @access  Private (Admin only)
const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, department } = req.query;
    const filter = {};

    if (status && ['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(status)) {
      filter.status = status;
    }

    let requests = await LeaveRequest.find(filter)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    // Filter by department if specified
    if (department) {
      requests = requests.filter(
        (r) => r.employee && r.employee.department.toLowerCase() === department.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending leave request
// @route   PATCH /api/leave-requests/:id/approve
// @access  Private (Admin only)
const approveLeaveRequest = async (req, res, next) => {
  try {
    const { managerRemarks } = req.body;

    // Retrieve the target request
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only Pending requests can be approved
    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve this request because its status is already '${request.status}'`
      });
    }

    // Prevent employee from approving their own request even if admin
    if (request.employee.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Conflict of interest: Administrators cannot approve their own leave requests'
      });
    }

    // Check that employee still has sufficient balance before finalizing
    const employeeUser = await User.findById(request.employee);
    const balance = employeeUser.leaveBalances.find(
      (b) => b.leaveType.toString() === request.leaveType.toString()
    );

    if (!balance) {
      return res.status(400).json({
        success: false,
        message: 'Employee does not have an active leave balance for this leave type'
      });
    }

    const available = balance.allocated - balance.used;
    if (available < request.numberOfDays) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request: Insufficient balance. Employee has only ${available} day(s) left, but requested ${request.numberOfDays} day(s).`
      });
    }

    // Atomic conditional update to guard against race conditions / duplicate approvals
    const updatedRequest = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      {
        $set: {
          status: 'Approved',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          managerRemarks: managerRemarks ? managerRemarks.trim() : 'Approved by manager'
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This leave request was already updated or processed by another reviewer'
      });
    }

    // Deduct leave balance atomically
    await User.updateOne(
      {
        _id: request.employee,
        'leaveBalances.leaveType': request.leaveType
      },
      {
        $inc: { 'leaveBalances.$.used': request.numberOfDays }
      }
    );

    const populated = await LeaveRequest.findById(updatedRequest._id)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Leave request approved and balance deducted successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a pending leave request
// @route   PATCH /api/leave-requests/:id/reject
// @access  Private (Admin only)
const rejectLeaveRequest = async (req, res, next) => {
  try {
    const { managerRemarks } = req.body;

    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject this request because its status is already '${request.status}'`
      });
    }

    const updatedRequest = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      {
        $set: {
          status: 'Rejected',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          managerRemarks: managerRemarks ? managerRemarks.trim() : 'Rejected by manager'
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This leave request was already processed by another reviewer'
      });
    }

    const populated = await LeaveRequest.findById(updatedRequest._id)
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Leave request rejected successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaveRequests,
  getLeaveRequestById,
  cancelLeaveRequest,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
};
