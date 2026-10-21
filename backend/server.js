const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { initDefaultLeaveTypes } = require('./controllers/leaveTypeController');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const leaveTypeRoutes = require('./routes/leaveTypeRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware: CORS (Normalize URLs to handle optional trailing slashes)
const configuredClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, '') : null;
const allowedOrigins = [
  configuredClientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.indexOf(normalizedOrigin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: This origin is not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Middleware: Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Informational Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Employee Leave Management System (PS4) API is running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      leaveTypes: '/api/leave-types',
      leaveRequests: '/api/leave-requests',
      dashboard: '/api/dashboard'
    }
  });
});

// Health Check Endpoints (available at both /api/health and /health)
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Employee Leave Management System (PS4)',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthCheck);
app.get('/health', healthCheck);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Connect to Database first, initialize defaults, then start listening
const startServer = async () => {
  await connectDB();
  await initDefaultLeaveTypes();
  app.listen(PORT, () => {
    console.log(`[Server] PS4 Employee Leave Management API running on port ${PORT}`);
    console.log(`[Server] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
};

// Start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
