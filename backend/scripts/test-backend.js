const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { app } = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const { initDefaultLeaveTypes } = require('../controllers/leaveTypeController');

// Helper to make HTTP request to local server
function request(server, options, postData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

const runTests = async () => {
  console.log('--- STARTING BACKEND INTEGRATION TEST SUITE ---');
  await connectDB();
  await initDefaultLeaveTypes();

  // Ensure test admin exists for test suite
  const adminPasswordHash = await User.hashPassword('AdminPassword@123');
  await User.findOneAndUpdate(
    { email: 'admin@corporate.com' },
    {
      $set: {
        name: 'Test Administrator',
        role: 'admin',
        employeeId: 'ADM001',
        department: 'Human Resources',
        designation: 'Director',
        passwordHash: adminPasswordHash
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const testPort = server.address().port;
  console.log(`Test server running on port: ${testPort}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  try {
    // Test 1: Root informational endpoint
    const rootRes = await request(server, { path: '/' });
    assert(rootRes.status === 200 && rootRes.data.success === true, 'GET / returns 200 and API info');

    // Test 2: Healthcheck endpoints (/api/health and /health)
    const health = await request(server, { path: '/api/health' });
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 and ok');
    const healthAlias = await request(server, { path: '/health' });
    assert(healthAlias.status === 200 && healthAlias.data.status === 'ok', 'GET /health returns 200 and ok');

    // Test 2: Admin Login
    const adminLogin = await request(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@corporate.com', password: 'AdminPassword@123' }
    );
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeds with token');
    const adminToken = adminLogin.data.token;

    // Test 3: Invalid Login
    const invalidLogin = await request(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@corporate.com', password: 'WrongPassword' }
    );
    assert(invalidLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    // Test 4: Protected route without token returns 401
    const unauth = await request(server, { path: '/api/auth/me' });
    assert(unauth.status === 401, 'Protected route without token returns 401');

    // Test 5: Register new employee
    const randomSuffix = Date.now().toString().slice(-4);
    const newEmpEmail = `test.employee${randomSuffix}@corporate.com`;
    const regRes = await request(
      server,
      { path: '/api/auth/register', method: 'POST' },
      {
        name: `Test Employee ${randomSuffix}`,
        email: newEmpEmail,
        password: 'Password@123',
        employeeId: `EMP${randomSuffix}`,
        department: 'Engineering',
        designation: 'QA Engineer'
      }
    );
    assert(regRes.status === 201 && regRes.data.token, 'Employee registration returns 201 and token');
    const employeeToken = regRes.data.token;
    const employeeId = regRes.data.user._id;

    // Test 6: Verify passwordHash is not exposed in registration
    assert(!regRes.data.user.passwordHash, 'Password hash is not exposed in registration response');

    // Test 7: GET /api/auth/me for employee
    const meRes = await request(server, { path: '/api/auth/me', token: employeeToken });
    assert(meRes.status === 200 && meRes.data.user.email === newEmpEmail, 'GET /api/auth/me returns employee profile');

    // Test 8: Employee attempts admin-only endpoint (expect 403 Forbidden)
    const empAdminAttempt = await request(
      server,
      { path: '/api/leave-types', method: 'POST', token: employeeToken },
      { name: 'Unauthorized Leave', yearlyQuota: 5 }
    );
    assert(empAdminAttempt.status === 403, 'Employee attempting admin route returns 403 Forbidden');

    // Test 9: Get leave types
    const leaveTypesRes = await request(server, { path: '/api/leave-types', token: employeeToken });
    assert(leaveTypesRes.status === 200 && leaveTypesRes.data.data.length > 0, 'GET /api/leave-types returns list');
    const casualLeave = leaveTypesRes.data.data.find((lt) => lt.name.includes('Casual'));
    assert(Boolean(casualLeave), 'Casual leave type exists in response');

    // Test 10: Apply leave with end date before start date (validation error 400)
    const invalidDateRes = await request(
      server,
      { path: '/api/leave-requests', method: 'POST', token: employeeToken },
      {
        leaveType: casualLeave._id,
        startDate: '2026-11-10',
        endDate: '2026-11-05',
        reason: 'Backwards dates test'
      }
    );
    assert(invalidDateRes.status === 400, 'End date before start date returns 400 Bad Request');

    // Test 11: Apply leave with duration exceeding available balance
    const excessiveBalanceRes = await request(
      server,
      { path: '/api/leave-requests', method: 'POST', token: employeeToken },
      {
        leaveType: casualLeave._id,
        startDate: '2026-11-01',
        endDate: '2026-11-30', // 30 days > 12 days quota
        reason: 'Excessive duration leave'
      }
    );
    assert(excessiveBalanceRes.status === 400, 'Applying for days exceeding balance returns 400');

    // Test 12: Successfully apply for 2 days leave
    const validApplyRes = await request(
      server,
      { path: '/api/leave-requests', method: 'POST', token: employeeToken },
      {
        leaveType: casualLeave._id,
        startDate: '2026-11-12',
        endDate: '2026-11-13',
        reason: 'Personal family engagement'
      }
    );
    assert(validApplyRes.status === 201 && validApplyRes.data.data.numberOfDays === 2, 'Apply leave for 2 days succeeds (201)');
    const createdRequestId = validApplyRes.data.data._id;

    // Test 13: Overlapping leave request check (expect 409 Conflict)
    const overlapRes = await request(
      server,
      { path: '/api/leave-requests', method: 'POST', token: employeeToken },
      {
        leaveType: casualLeave._id,
        startDate: '2026-11-13', // Overlaps with 2026-11-12 to 2026-11-13
        endDate: '2026-11-14',
        reason: 'Overlapping request test'
      }
    );
    assert(overlapRes.status === 409, 'Overlapping leave request returns 409 Conflict');

    // Test 14: Employee dashboard
    const empDash = await request(server, { path: '/api/dashboard/employee', token: employeeToken });
    assert(empDash.status === 200 && empDash.data.data.counts.pending >= 1, 'GET /api/dashboard/employee returns counts and balances');

    // Test 15: Admin reviews all requests
    const adminReqList = await request(server, { path: '/api/leave-requests', token: adminToken });
    assert(adminReqList.status === 200 && adminReqList.data.data.length > 0, 'Admin can view all leave requests');

    // Test 16: Admin approves the request
    const approveRes = await request(
      server,
      { path: `/api/leave-requests/${createdRequestId}/approve`, method: 'PATCH', token: adminToken },
      { managerRemarks: 'Approved for test' }
    );
    assert(approveRes.status === 200 && approveRes.data.data.status === 'Approved', 'Admin approval succeeds (status: Approved)');

    // Test 17: Duplicate approval attempt (expect 400 / 409)
    const duplicateApprove = await request(
      server,
      { path: `/api/leave-requests/${createdRequestId}/approve`, method: 'PATCH', token: adminToken },
      { managerRemarks: 'Trying to approve again' }
    );
    assert(duplicateApprove.status >= 400, 'Duplicate approval attempt correctly rejected with 4xx');

    // Test 18: Admin dashboard
    const adminDash = await request(server, { path: '/api/dashboard/admin', token: adminToken });
    assert(
      adminDash.status === 200 &&
      adminDash.data.data.summary.totalEmployees > 0 &&
      Array.isArray(adminDash.data.data.employeesOnLeaveToday),
      'GET /api/dashboard/admin returns totalEmployees and employeesOnLeaveToday'
    );

    // Test 19: Leave type CRUD by Admin (Create, Update, Delete)
    const newLtName = `Conference Leave ${randomSuffix}`;
    const createLt = await request(
      server,
      { path: '/api/leave-types', method: 'POST', token: adminToken },
      { name: newLtName, description: 'Academic conferences', yearlyQuota: 5 }
    );
    assert(createLt.status === 201, 'Admin can create a new leave type');
    const createdLtId = createLt.data.data._id;

    const updateLt = await request(
      server,
      { path: `/api/leave-types/${createdLtId}`, method: 'PUT', token: adminToken },
      { description: 'Updated conference description', yearlyQuota: 6 }
    );
    assert(updateLt.status === 200 && updateLt.data.data.yearlyQuota === 6, 'Admin can update leave type quota');

    const deleteLt = await request(
      server,
      { path: `/api/leave-types/${createdLtId}`, method: 'DELETE', token: adminToken }
    );
    assert(deleteLt.status === 200, 'Admin can delete an unused leave type');

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unexpected test error:', err);
    server.close();
    process.exit(1);
  }
};

runTests();
