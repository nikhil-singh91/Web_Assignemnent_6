const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');

// Helper to sign JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Register a new employee
// @route   POST /api/auth/register
// @access  Public (Only employee role allowed)
const register = async (req, res, next) => {
  try {
    const { name, email, password, employeeId, department, designation, joiningDate } = req.body;

    if (!name || !email || !password || !employeeId || !department || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, employeeId, department, designation'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check email uniqueness
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }

    // Check employee ID uniqueness
    const existingEmpId = await User.findOne({ employeeId: employeeId.toUpperCase().trim() });
    if (existingEmpId) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this Employee ID already exists'
      });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Fetch active leave types to initialize user leave balances
    const activeLeaveTypes = await LeaveType.find({ isActive: true });
    const initialBalances = activeLeaveTypes.map((lt) => ({
      leaveType: lt._id,
      allocated: lt.yearlyQuota,
      used: 0
    }));

    // Create user - enforce role as 'employee' for public registration
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'employee',
      employeeId: employeeId.toUpperCase().trim(),
      department: department.trim(),
      designation: designation.trim(),
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      leaveBalances: initialBalances
    });

    const token = generateToken(user._id, user.role);

    // Fetch user populated with leave types
    const populatedUser = await User.findById(user._id).populate('leaveBalances.leaveType');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user with password hash explicitly selected
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role);
    const populatedUser = await User.findById(user._id).populate('leaveBalances.leaveType');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile & balances
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id).populate('leaveBalances.leaveType');

    // Synchronize any newly added active leave types if user lacks them
    const allActiveLeaveTypes = await LeaveType.find({ isActive: true });
    let balancesUpdated = false;

    for (const lt of allActiveLeaveTypes) {
      const exists = user.leaveBalances.some(
        (b) => b.leaveType && b.leaveType._id.toString() === lt._id.toString()
      );
      if (!exists) {
        user.leaveBalances.push({
          leaveType: lt._id,
          allocated: lt.yearlyQuota,
          used: 0
        });
        balancesUpdated = true;
      }
    }

    if (balancesUpdated) {
      await user.save();
      user = await User.findById(req.user._id).populate('leaveBalances.leaveType');
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
