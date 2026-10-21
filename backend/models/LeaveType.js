const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Leave type name cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: ''
    },
    yearlyQuota: {
      type: Number,
      required: [true, 'Yearly quota is required'],
      min: [1, 'Yearly quota must be at least 1 day'],
      max: [365, 'Yearly quota cannot exceed 365 days']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
