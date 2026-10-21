const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');

// @desc    Get employee dashboard metrics & summary
// @route   GET /api/dashboard/employee
// @access  Private (Employee)
const getEmployeeDashboard = async (req, res, next) => {
  try {
    const employeeId = req.user._id;

    // Fetch user with populated leave balances
    let user = await User.findById(employeeId).populate('leaveBalances.leaveType');

    // Ensure any newly created active leave types are populated in user balances
    const allActiveTypes = await LeaveType.find({ isActive: true });
    let needsSave = false;
    for (const lt of allActiveTypes) {
      const exists = (user.leaveBalances || []).some(
        (b) => b.leaveType && b.leaveType._id.toString() === lt._id.toString()
      );
      if (!exists) {
        user.leaveBalances.push({
          leaveType: lt._id,
          allocated: lt.yearlyQuota,
          used: 0
        });
        needsSave = true;
      }
    }
    if (needsSave) {
      await user.save();
      user = await User.findById(employeeId).populate('leaveBalances.leaveType');
    }

    // Counts for employee requests
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      LeaveRequest.countDocuments({ employee: employeeId, status: 'Pending' }),
      LeaveRequest.countDocuments({ employee: employeeId, status: 'Approved' }),
      LeaveRequest.countDocuments({ employee: employeeId, status: 'Rejected' })
    ]);

    // Recent 5 requests
    const recentRequests = await LeaveRequest.find({ employee: employeeId })
      .populate('leaveType', 'name yearlyQuota')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Compute balance summaries
    const balances = (user.leaveBalances || [])
      .filter((b) => b.leaveType && b.leaveType.isActive)
      .map((b) => ({
        leaveTypeId: b.leaveType._id,
        leaveTypeName: b.leaveType.name,
        allocated: b.allocated,
        used: b.used,
        available: b.allocated - b.used
      }));

    res.status(200).json({
      success: true,
      data: {
        profile: {
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          department: user.department,
          designation: user.designation,
          joiningDate: user.joiningDate
        },
        balances,
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount
        },
        recentRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get administrator dashboard metrics & company summary
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Parallel metric queries
    const [
      totalEmployees,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      activeLeaveTypesCount
    ] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      LeaveRequest.countDocuments({ status: 'Pending' }),
      LeaveRequest.countDocuments({ status: 'Approved' }),
      LeaveRequest.countDocuments({ status: 'Rejected' }),
      LeaveType.countDocuments({ isActive: true })
    ]);

    // Employees on leave today (Approved leaves covering today)
    const onLeaveTodayDocs = await LeaveRequest.find({
      status: 'Approved',
      startDate: { $lte: endOfToday },
      endDate: { $gte: today }
    })
      .populate('employee', 'name email employeeId department designation')
      .populate('leaveType', 'name');

    // Department-wise leave count aggregation (for approved leaves)
    const departmentLeaveAgg = await LeaveRequest.aggregate([
      {
        $match: { status: 'Approved' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDoc'
        }
      },
      {
        $unwind: '$employeeDoc'
      },
      {
        $group: {
          _id: '$employeeDoc.department',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      },
      {
        $project: {
          department: '$_id',
          count: 1,
          totalDays: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Recent 5 leave requests company-wide
    const recentRequests = await LeaveRequest.find()
      .populate('employee', 'name email employeeId department')
      .populate('leaveType', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          activeLeaveTypesCount,
          employeesOnLeaveTodayCount: onLeaveTodayDocs.length
        },
        employeesOnLeaveToday: onLeaveTodayDocs,
        departmentWiseLeaves: departmentLeaveAgg,
        recentRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeDashboard,
  getAdminDashboard
};
