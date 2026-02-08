const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middleware/error.middleware');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const { generalTimeout, timeoutHandler } = require('./middleware/timeout.middleware');
const scheduledTasksService = require('./services/scheduledTasksService');

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const paymentRoutes = require('./routes/payment.routes');
const universityRoutes = require('./routes/university.routes');
const facultyRoutes = require('./routes/faculty.routes');
const departmentRoutes = require('./routes/department.routes');
const courseRoutes = require('./routes/course.routes');
const topicRoutes = require('./routes/topic.routes');
const questionRoutes = require('./routes/question.routes');
const materialRoutes = require('./routes/material.routes');
const userRoutes = require('./routes/user.routes');
const examRoutes = require('./routes/exam.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const studyPlanRoutes = require('./routes/studyPlan.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const adminAnalyticsRoutes = require('./routes/adminAnalytics.routes');
const adminUsersRoutes = require('./routes/adminUsers.routes');
const searchRoutes = require('./routes/search.routes');

const app = express();

// Security & Performance middleware
app.use(helmet({
  // Enable CSRF protection for form submissions
  csrfProtection: true,
  // Additional security headers
  crossOriginEmbedderPolicy: false,  // Allow cross-origin resources if needed
}));
app.use(compression());
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(generalTimeout);  // Apply timeout to all requests (30s)
app.use(generalLimiter);

// Body parsers with size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration with origin whitelist
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));

// Root route (service status)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CBT backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/universities/:universityId/faculties', facultyRoutes);
app.use('/api/faculties/:facultyId/departments', departmentRoutes);
app.use('/api/departments/:departmentId/courses', courseRoutes);
// Direct routes for easy access
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/topics', topicRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses/:courseId/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/search', searchRoutes);

// Timeout error handler (must be before 404 handler)
app.use(timeoutHandler);

// Unknown route handler
app.use('*', (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
});

// Global error handler (MUST be last)
app.use(errorHandler);

// Initialize scheduled tasks (background jobs)
if (env.NODE_ENV !== 'test') {
  try {
    scheduledTasksService.initialize();
  } catch (err) {
    console.error('Warning: Failed to initialize scheduled tasks:', err.message);
    // Don't fail app startup if scheduled tasks fail
  }
}

module.exports = app;
