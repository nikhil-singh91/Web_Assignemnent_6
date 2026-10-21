const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');

const seedData = async () => {
  try {
    console.log('[Seed] Starting database seed process...');
    await connectDB();

    // 1. Seed or Upsert Standard Leave Types (Idempotent, duplicate-safe)
    const leaveTypeDefinitions = [
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
      },
      {
        name: 'Parental Leave',
        description: 'Leave for new parents upon birth or adoption of child',
        yearlyQuota: 30,
        isActive: true
      },
      {
        name: 'Bereavement Leave',
        description: 'Compassionate leave in the event of family bereavement',
        yearlyQuota: 5,
        isActive: true
      }
    ];

    const leaveTypeMap = {};
    for (const def of leaveTypeDefinitions) {
      const doc = await LeaveType.findOneAndUpdate(
        { name: def.name },
        { $set: def },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      leaveTypeMap[def.name] = doc;
    }
    console.log(`[Seed] Synced ${Object.keys(leaveTypeMap).length} standard leave types.`);

    // 2. Seed Initial Admin Account
    // In production, use create-admin.js or configure ADMIN_EMAIL and ADMIN_PASSWORD
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@corporate.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword@123';
    const adminPasswordHash = await User.hashPassword(adminPassword);

    const adminDoc = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          name: process.env.ADMIN_NAME || 'HR Administrator',
          role: 'admin',
          employeeId: process.env.ADMIN_EMPLOYEE_ID || 'ADM001',
          department: 'Human Resources',
          designation: 'HR Director',
          passwordHash: adminPasswordHash,
          joiningDate: new Date('2022-01-15')
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Seed] Admin account ready: ${adminDoc.email}`);

    // 3. Seed Realistic Sample Employees
    const employeePasswordHash = await User.hashPassword('EmployeePassword@123');
    const employeeDefinitions = [
      {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@corporate.com',
        employeeId: 'EMP101',
        department: 'Engineering',
        designation: 'Senior Software Engineer',
        joiningDate: new Date('2023-02-01')
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@corporate.com',
        employeeId: 'EMP102',
        department: 'Product',
        designation: 'Product Manager',
        joiningDate: new Date('2023-05-15')
      },
      {
        name: 'Ananya Verma',
        email: 'ananya.verma@corporate.com',
        employeeId: 'EMP103',
        department: 'Marketing',
        designation: 'Marketing Lead',
        joiningDate: new Date('2023-08-10')
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@corporate.com',
        employeeId: 'EMP104',
        department: 'Finance',
        designation: 'Senior Financial Analyst',
        joiningDate: new Date('2024-01-10')
      },
      {
        name: 'Sneha Reddy',
        email: 'sneha.reddy@corporate.com',
        employeeId: 'EMP105',
        department: 'Human Resources',
        designation: 'HR Operations Specialist',
        joiningDate: new Date('2024-03-01')
      }
    ];

    const activeLeaveTypesList = Object.values(leaveTypeMap);
    const employeeDocs = [];

    for (const empDef of employeeDefinitions) {
      let existingEmp = await User.findOne({ email: empDef.email });
      if (!existingEmp) {
        // Build initial balances
        const initialBalances = activeLeaveTypesList.map((lt) => ({
          leaveType: lt._id,
          allocated: lt.yearlyQuota,
          used: 0
        }));

        existingEmp = await User.create({
          ...empDef,
          role: 'employee',
          passwordHash: employeePasswordHash,
          leaveBalances: initialBalances
        });
      } else {
        // Ensure balances are updated for all leave types
        for (const lt of activeLeaveTypesList) {
          const hasBalance = existingEmp.leaveBalances.some(
            (b) => b.leaveType.toString() === lt._id.toString()
          );
          if (!hasBalance) {
            existingEmp.leaveBalances.push({
              leaveType: lt._id,
              allocated: lt.yearlyQuota,
              used: 0
            });
          }
        }
        await existingEmp.save();
      }
      employeeDocs.push(existingEmp);
    }
    console.log(`[Seed] Synced ${employeeDocs.length} employee accounts.`);

    // 4. Seed Realistic Leave Requests (At least 10 realistic records)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getOffsetDate = (daysOffset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const requestTemplates = [
      // Approved leaves covering today (to showcase "Employees on leave today")
      {
        employeeIndex: 0, // Rahul
        leaveTypeName: 'Casual Leave (CL)',
        startOffset: -1,
        endOffset: 1, // 3 days (yesterday to tomorrow)
        numberOfDays: 3,
        reason: 'Attending cousin’s wedding out of town',
        status: 'Approved',
        managerRemarks: 'Approved. Please share handover document before departing.'
      },
      {
        employeeIndex: 1, // Priya
        leaveTypeName: 'Sick Leave (SL)',
        startOffset: 0,
        endOffset: 1, // 2 days (today to tomorrow)
        numberOfDays: 2,
        reason: 'Severe viral fever and medical observation',
        status: 'Approved',
        managerRemarks: 'Approved. Get well soon!'
      },
      // Pending requests (for review)
      {
        employeeIndex: 2, // Ananya
        leaveTypeName: 'Earned Leave (EL)',
        startOffset: 7,
        endOffset: 11, // 5 days
        numberOfDays: 5,
        reason: 'Family vacation to Himachal Pradesh',
        status: 'Pending',
        managerRemarks: ''
      },
      {
        employeeIndex: 3, // Vikram
        leaveTypeName: 'Casual Leave (CL)',
        startOffset: 14,
        endOffset: 15, // 2 days
        numberOfDays: 2,
        reason: 'Urgent municipal document verification & registry',
        status: 'Pending',
        managerRemarks: ''
      },
      {
        employeeIndex: 0, // Rahul
        leaveTypeName: 'Sick Leave (SL)',
        startOffset: 20,
        endOffset: 20, // 1 day
        numberOfDays: 1,
        reason: 'Scheduled dental root-canal appointment',
        status: 'Pending',
        managerRemarks: ''
      },
      {
        employeeIndex: 4, // Sneha
        leaveTypeName: 'Earned Leave (EL)',
        startOffset: 12,
        endOffset: 16, // 5 days
        numberOfDays: 5,
        reason: 'Attending annual alumni reunion and travel',
        status: 'Pending',
        managerRemarks: ''
      },
      // Rejected requests
      {
        employeeIndex: 3, // Vikram
        leaveTypeName: 'Earned Leave (EL)',
        startOffset: -20,
        endOffset: -15, // 6 days
        numberOfDays: 6,
        reason: 'Planned road trip during financial year audit close',
        status: 'Rejected',
        managerRemarks: 'Rejected due to critical Quarter financial auditing period. Please reschedule.'
      },
      // Historical Approved requests
      {
        employeeIndex: 4, // Sneha
        leaveTypeName: 'Casual Leave (CL)',
        startOffset: -30,
        endOffset: -29, // 2 days
        numberOfDays: 2,
        reason: 'Relocation to new apartment in town',
        status: 'Approved',
        managerRemarks: 'Approved without issues.'
      },
      {
        employeeIndex: 2, // Ananya
        leaveTypeName: 'Sick Leave (SL)',
        startOffset: -45,
        endOffset: -44, // 2 days
        numberOfDays: 2,
        reason: 'Food poisoning recovery',
        status: 'Approved',
        managerRemarks: 'Approved. Medical certificate submitted.'
      },
      {
        employeeIndex: 1, // Priya
        leaveTypeName: 'Casual Leave (CL)',
        startOffset: -60,
        endOffset: -59, // 2 days
        numberOfDays: 2,
        reason: 'Personal family celebration',
        status: 'Approved',
        managerRemarks: 'Approved.'
      },
      // Cancelled requests
      {
        employeeIndex: 0, // Rahul
        leaveTypeName: 'Earned Leave (EL)',
        startOffset: -10,
        endOffset: -7, // 4 days
        numberOfDays: 4,
        reason: 'Conference trip that was cancelled by organizer',
        status: 'Cancelled',
        managerRemarks: 'Cancelled on employee request.'
      },
      {
        employeeIndex: 4, // Sneha
        leaveTypeName: 'Bereavement Leave',
        startOffset: -80,
        endOffset: -78, // 3 days
        numberOfDays: 3,
        reason: 'Family funeral rites ceremony',
        status: 'Approved',
        managerRemarks: 'Approved with heartfelt condolences.'
      }
    ];

    let insertedRequestsCount = 0;

    for (const tpl of requestTemplates) {
      const emp = employeeDocs[tpl.employeeIndex];
      const lt = leaveTypeMap[tpl.leaveTypeName];
      const startDate = getOffsetDate(tpl.startOffset);
      const endDate = getOffsetDate(tpl.endOffset);

      // Check for existing request with same employee, leaveType, and startDate
      const existing = await LeaveRequest.findOne({
        employee: emp._id,
        leaveType: lt._id,
        startDate
      });

      if (!existing) {
        await LeaveRequest.create({
          employee: emp._id,
          leaveType: lt._id,
          startDate,
          endDate,
          numberOfDays: tpl.numberOfDays,
          reason: tpl.reason,
          status: tpl.status,
          managerRemarks: tpl.managerRemarks,
          reviewedBy: tpl.status !== 'Pending' ? adminDoc._id : null,
          reviewedAt: tpl.status !== 'Pending' ? new Date() : null
        });

        // If Approved, deduct the balance accordingly
        if (tpl.status === 'Approved') {
          await User.updateOne(
            {
              _id: emp._id,
              'leaveBalances.leaveType': lt._id
            },
            {
              $inc: { 'leaveBalances.$.used': tpl.numberOfDays }
            }
          );
        }

        insertedRequestsCount++;
      }
    }

    console.log(`[Seed] Seeded ${insertedRequestsCount} new leave requests (Total defined: ${requestTemplates.length}).`);
    console.log('[Seed] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
