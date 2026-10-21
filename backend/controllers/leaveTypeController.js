const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');

// @desc    Get all leave types
// @route   GET /api/leave-types
// @access  Private (All authenticated users)
const getLeaveTypes = async (req, res, next) => {
  try {
    const filter = {};
    // Non-admin employees only receive active leave types
    if (req.user.role !== 'admin') {
      filter.isActive = true;
    }
    const leaveTypes = await LeaveType.find(filter).sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: leaveTypes.length,
      data: leaveTypes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single leave type by ID
// @route   GET /api/leave-types/:id
// @access  Private
const getLeaveTypeById = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    res.status(200).json({
      success: true,
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new leave type
// @route   POST /api/leave-types
// @access  Private (Admin only)
const createLeaveType = async (req, res, next) => {
  try {
    const { name, description, yearlyQuota, isActive } = req.body;

    if (!name || yearlyQuota === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name and yearly quota are required'
      });
    }

    const quotaNum = Number(yearlyQuota);
    if (isNaN(quotaNum) || quotaNum < 1 || quotaNum > 365) {
      return res.status(400).json({
        success: false,
        message: 'Yearly quota must be a number between 1 and 365'
      });
    }

    const existing = await LeaveType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Leave type with name '${name.trim()}' already exists`
      });
    }

    const leaveType = await LeaveType.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      yearlyQuota: quotaNum,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a leave type
// @route   PUT /api/leave-types/:id
// @access  Private (Admin only)
const updateLeaveType = async (req, res, next) => {
  try {
    const { name, description, yearlyQuota, isActive } = req.body;

    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    if (name && name.trim() !== leaveType.name) {
      const existing = await LeaveType.findOne({
        name: name.trim(),
        _id: { $ne: leaveType._id }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Another leave type with name '${name.trim()}' already exists`
        });
      }
      leaveType.name = name.trim();
    }

    if (description !== undefined) {
      leaveType.description = description.trim();
    }

    if (yearlyQuota !== undefined) {
      const quotaNum = Number(yearlyQuota);
      if (isNaN(quotaNum) || quotaNum < 1 || quotaNum > 365) {
        return res.status(400).json({
          success: false,
          message: 'Yearly quota must be a number between 1 and 365'
        });
      }
      leaveType.yearlyQuota = quotaNum;
    }

    if (isActive !== undefined) {
      leaveType.isActive = Boolean(isActive);
    }

    await leaveType.save();

    res.status(200).json({
      success: true,
      message: 'Leave type updated successfully',
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a leave type
// @route   DELETE /api/leave-types/:id
// @access  Private (Admin only)
const deleteLeaveType = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    // Check if any leave requests reference this leave type
    const requestCount = await LeaveRequest.countDocuments({ leaveType: leaveType._id });
    if (requestCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete '${leaveType.name}' because it has ${requestCount} associated leave request(s). Please deactivate it instead.`
      });
    }

    await LeaveType.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Leave type '${leaveType.name}' deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Sensible defaults required by the assignment (idempotent, no duplicates)
const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Casual Leave (CL)',
    description: 'Short unplanned leave for personal or domestic matters',
    yearlyQuota: 12,
    isActive: true
  },
  {
    name: 'Sick Leave (SL)',
    description: 'Medical leave for personal illness or health recovery',
    yearlyQuota: 10,
    isActive: true
  },
  {
    name: 'Earned Leave (EL)',
    description: 'Annual accrued vacation leave for planned time off',
    yearlyQuota: 15,
    isActive: true
  }
];

// Helper to initialize default leave types without duplicates
const initDefaultLeaveTypes = async () => {
  try {
    for (const def of DEFAULT_LEAVE_TYPES) {
      await LeaveType.findOneAndUpdate(
        { name: def.name },
        { $setOnInsert: def },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    const count = await LeaveType.countDocuments();
    console.log(`[Database] Default leave types initialized/verified (${count} total in database)`);
    return true;
  } catch (error) {
    console.error(`[Database Warning] Could not initialize default leave types: ${error.message}`);
    return false;
  }
};

// @desc    Admin endpoint to initialize default leave types
// @route   POST /api/leave-types/init-defaults
// @access  Private (Admin only)
const initDefaultsHandler = async (req, res, next) => {
  try {
    await initDefaultLeaveTypes();
    const leaveTypes = await LeaveType.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      message: 'Default leave types successfully initialized',
      count: leaveTypes.length,
      data: leaveTypes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  initDefaultLeaveTypes,
  initDefaultsHandler,
  DEFAULT_LEAVE_TYPES
};
