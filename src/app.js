const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middleware/error.middleware');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');

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
const searchRoutes = require('./routes/search.routes');

const app = express();

// Security & Performance middleware
app.use(helmet());
app.use(compression());
app.use(requestIdMiddleware);
app.use(generalLimiter);

// Body & CORS middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/universities/:universityId/faculties', facultyRoutes);
app.use('/api/faculties/:facultyId/departments', departmentRoutes);
app.use('/api/departments/:departmentId/courses', courseRoutes);
app.use('/api/courses/:courseId/topics', topicRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/courses/:courseId/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/search', searchRoutes);

// Unknown route handler
app.use('*', (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
});

// Global error handler (MUST be last)
app.use(errorHandler);

module.exports = app;
