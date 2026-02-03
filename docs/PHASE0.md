# University AI CBT Backend - Phase 0

**Production-Ready Node.js Backend for University AI Computer-Based Testing System**

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key

# 3. Validate the system (optional)
npm run validate

# 4. Seed with test data (first time only)
npm run seed

# 5. Start the server
npm run dev
```

Server runs on `http://localhost:3000`

---

## 📋 System Overview

Phase 0 implements a complete **hierarchical university structure** with AI-powered question generation and multi-tier access control.

### Data Hierarchy
```
University
├── Faculty
│   ├── Department
│   │   ├── Course (100-600 levels)
│   │   │   ├── Topic
│   │   │   │   ├── Question (AI-generated or uploaded)
│   │   │   │   └── Material (PDF/image/text)
│   │   │   └── Material
│   │   └── ...
│   └── ...
└── ...

User (Student/Admin)
├── Plan (free/basic/premium)
└── Stats (questionsAttempted, accuracy, topicsStudied)
```

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.js                  # Express app setup
│   ├── server.js               # Server entry point
│   ├── config/
│   │   ├── database.js         # MongoDB connection
│   │   ├── env.js              # Environment validation
│   │   └── indexes.js          # Database indexes
│   ├── models/                 # 9 Mongoose schemas
│   │   ├── University.js
│   │   ├── Faculty.js
│   │   ├── Department.js
│   │   ├── Course.js
│   │   ├── Topic.js
│   │   ├── Question.js         # Complex schema with stats
│   │   ├── Material.js         # Handles AI integration
│   │   ├── User.js             # Plan & subscription ready
│   │   └── AIGenerationLog.js  # Tracks Gemini usage
│   ├── services/               # 8 service modules
│   │   ├── universityService.js
│   │   ├── facultyService.js
│   │   ├── departmentService.js
│   │   ├── courseService.js
│   │   ├── topicService.js
│   │   ├── questionService.js
│   │   ├── materialService.js
│   │   └── userService.js
│   ├── controllers/            # 8 controller modules
│   │   ├── universityController.js
│   │   ├── facultyController.js
│   │   ├── departmentController.js
│   │   ├── courseController.js
│   │   ├── topicController.js
│   │   ├── questionController.js
│   │   ├── materialController.js
│   │   └── userController.js
│   ├── routes/                 # 9 route modules
│   │   ├── university.routes.js
│   │   ├── faculty.routes.js
│   │   ├── department.routes.js
│   │   ├── course.routes.js
│   │   ├── topic.routes.js
│   │   ├── question.routes.js
│   │   ├── material.routes.js
│   │   ├── user.routes.js
│   │   └── health.routes.js
│   ├── middleware/             # 5 middleware modules
│   │   ├── error.middleware.js       # Global error handler
│   │   ├── validate.middleware.js    # Joi validation
│   │   ├── requestId.middleware.js   # UUID tracking
│   │   ├── rateLimit.middleware.js   # Rate limiting (3 tiers)
│   │   └── requestLogger.middleware.js # Request logging
│   ├── validators/             # 7 Joi schema validators
│   │   ├── faculty.validator.js
│   │   ├── department.validator.js
│   │   ├── course.validator.js
│   │   ├── topic.validator.js
│   │   ├── question.validator.js
│   │   ├── material.validator.js
│   │   └── user.validator.js
│   ├── utils/                  # 8+ utility modules
│   │   ├── ApiError.js         # Custom error class
│   │   ├── asyncHandler.js     # Error-catching wrapper
│   │   ├── apiResponse.js      # Response builder
│   │   ├── sanitizer.js        # Data filtering
│   │   ├── logger.js           # File/console logging
│   │   ├── cache.js            # In-memory cache
│   │   ├── pagination.js       # Result pagination
│   │   ├── gemini.js           # AI integration
│   │   ├── responseFormatter.js
│   │   └── index.js            # Utility exports
│   └── constants/              # Application constants
├── seed.js                     # Test data generator
├── .env.example                # Environment template
├── package.json                # Dependencies
└── README.md                   # This file
```

---

## 🔌 API Endpoints (Phase 0)

### Health Check
- `GET /api/health` - Server & DB status

### Universities
- `POST /api/universities` - Create university
- `GET /api/universities` - List all universities
- `GET /api/universities/:id` - Get university details
- `PUT /api/universities/:id` - Update university

### Faculties
- `POST /api/universities/:universityId/faculties` - Create faculty
- `GET /api/universities/:universityId/faculties` - List faculties
- `GET /api/faculties/:id` - Get faculty details
- `PUT /api/faculties/:id` - Update faculty

### Departments
- `POST /api/faculties/:facultyId/departments` - Create department
- `GET /api/faculties/:facultyId/departments` - List departments
- `GET /api/departments/:id` - Get department details
- `PUT /api/departments/:id` - Update department

### Courses
- `POST /api/departments/:departmentId/courses` - Create course
- `GET /api/departments/:departmentId/courses` - List courses
- `GET /api/courses/:id` - Get course details
- `GET /api/courses?level=200` - Filter by level
- `PUT /api/courses/:id` - Update course

### Topics
- `POST /api/courses/:courseId/topics` - Create topic
- `GET /api/courses/:courseId/topics` - List topics
- `GET /api/topics/:id` - Get topic details
- `PUT /api/topics/:id` - Update topic

### Questions
- `GET /api/questions/random/:topicId` - Get random questions
- `GET /api/questions/pending/:universityId` - Get pending questions (admin)
- `POST /api/questions/approve/:id` - Approve question
- `POST /api/questions/reject/:id` - Reject question
- `GET /api/questions/:id/stats` - Get question statistics

### Materials
- `POST /api/courses/:courseId/materials` - Upload material
- `GET /api/courses/:courseId/materials` - List materials
- `POST /api/materials/:materialId/generate-questions` - Generate from Gemini

### Users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/upgrade` - Upgrade plan (basic/premium)
- `POST /api/users/:id/downgrade` - Downgrade plan

---

## 🔒 Security Features

### Authentication Ready
- User model has `password_hash` field (ready for Phase 1 OTP/Magic Link)
- Rate limiting configured for auth endpoints

### Authorization
- Access levels: `free`, `basic`, `premium`
- Students cannot see correct answers when fetching questions
- Data sanitization removes sensitive fields automatically

### Rate Limiting (3 Tiers)
- **General:** 100 requests per 15 minutes
- **Auth:** 5 requests per 15 minutes (ready for Phase 1)
- **AI:** 10 requests per hour (for Gemini API)

### Headers & Protection
- Helmet security headers enabled
- CORS configured for all origins (restrict in production)
- Compression enabled for responses
- Request ID tracking (x-request-id header)

---

## 🗄️ Database Design

### Connection
- MongoDB 4.0+ (Atlas or local)
- Connection string in `.env` (MONGO_URI)
- Indexes created automatically on startup

### Indexes for Performance
```javascript
// Created in config/indexes.js:
Question: topicId, status, accessLevel, difficulty
User: email, universityId
Material: courseId, status
Course: departmentId, level
Topic: courseId
```

### Model Features
- Timestamps on all documents (createdAt, updatedAt)
- Nested document support (for Question.options)
- Stats aggregation (Question.stats, User.stats)
- File references (Material.fileUrl)

---

## 🤖 AI Integration (Gemini)

### Setup
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`: `GEMINI_API_KEY=your_key_here`
3. System tracks usage in `AIGenerationLog` collection

### Generate Questions
```javascript
// From material content (PDF/text)
POST /api/materials/:materialId/generate-questions
Body: {
  difficulty: "medium",  // easy, medium, hard
  count: 5
}

// Returns array of Question objects ready to approve
```

### Rate Limits
- 10 API calls per hour per university
- Tracks token usage for cost analysis
- Stores generation logs for debugging

---

## 📊 Data Validation

All endpoints use **Joi schemas** for robust validation:

### Examples
```javascript
// Create Faculty - validates:
- code: alphanumeric, required
- name: string, required
- description: string, optional
- universityId: valid ObjectId, required

// Create Course - validates:
- code: alphanumeric, required
- title: string, required
- level: enum [100, 200, 300, 400, 500, 600], required
- creditUnits: number, required
- departmentId: valid ObjectId, required

// Create Question - validates:
- text: string, required
- options: {A, B, C, D all non-empty strings}, required
- correctAnswer: enum [A, B, C, D], required
- difficulty: enum [easy, medium, hard], required
- topicId: valid ObjectId, required
- accessLevel: enum [free, basic, premium], required
```

Invalid requests return 400 with detailed error messages.

---

## 🚨 Error Handling

### Global Error Middleware
All errors are caught by middleware and formatted consistently:

```javascript
// Success Response
{
  success: true,
  statusCode: 200,
  data: {...},
  message: "Operation successful",
  timestamp: "2024-01-15T10:30:00Z"
}

// Error Response (Production)
{
  success: false,
  statusCode: 400,
  data: null,
  message: "Invalid input",
  timestamp: "2024-01-15T10:30:00Z"
}

// Error Response (Development - with stack)
{
  success: false,
  statusCode: 500,
  data: {
    details: [...],
    stack: "Error: Database connection failed..."
  },
  message: "Database error",
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Error Types
- **ValidationError (400)** - Joi validation failed
- **NotFoundError (404)** - Resource doesn't exist
- **ConflictError (409)** - Duplicate or conflicting data
- **ServerError (500)** - Unexpected server issues

### Error Logging
- Errors logged to `logs/error.log` with requestId
- Stack traces only in development mode
- Production mode shows safe error messages

---

## 📈 Scalability Features

### For Phase 1+
- **Pagination** utilities ready (`pagination.js`)
- **Caching** layer ready for Redis migration (`cache.js`)
- **Request IDs** for distributed tracing
- **Database indexes** optimized for common queries
- **Rate limiting** prevents abuse

### Performance Optimizations
- Database indexes on frequently queried fields
- Compression middleware for large responses
- Sanitization removes unnecessary data before sending
- Pagination limits large result sets
- In-memory cache (upgradeable to Redis)

---

## 🔧 Environment Variables

Create `.env` file (copy from `.env.example`):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/university-cbt

# AI Integration
GEMINI_API_KEY=your_api_key_here

# Initial Setup
UNIVERSITY_ID=660f1234567890abcdef1234
```

---

## 📝 Seed Data

Generate test data:

```bash
npm run seed
```

Creates:
- 1 University (UNIZIK)
- 2 Faculties (Sciences, Engineering)
- 4 Departments
- 8 Courses (100-600 levels)
- 16 Topics
- 50 Test Questions
- 10 Test Users

---

## 🧪 System Validation

Verify all components are in place:

```bash
npm run validate
```

Checks:
- ✓ All 9 models exist
- ✓ All 8 services exist
- ✓ All 8 controllers exist
- ✓ All 9 routes exist
- ✓ All 5 middleware modules exist
- ✓ All utilities in place
- ✓ Dependencies installed
- ✓ Code integration verified

---

## 🛠️ Development Workflow

### Start Development Server
```bash
npm run dev
```
- Auto-restarts on file changes (nodemon)
- Logs requests with Morgan
- Error messages with stack traces

### Add a New Route
1. Create model in `models/`
2. Create service in `services/`
3. Create controller in `controllers/`
4. Create Joi validator in `validators/`
5. Create routes in `routes/`
6. Import routes in `app.js`

All error handling is automatic via asyncHandler + error middleware.

---

## 📊 Request/Response Examples

### Create University
```bash
POST /api/universities
Content-Type: application/json

{
  "code": "UNIZIK",
  "name": "Nnamdi Azikiwe University",
  "abbreviation": "UNIZIK"
}

# Response 201 Created
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "660f1234567890abcdef1234",
    "code": "UNIZIK",
    "name": "Nnamdi Azikiwe University",
    "abbreviation": "UNIZIK",
    "studentCount": 0,
    "courseCount": 0,
    "questionCount": 0,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "University created successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Random Questions
```bash
GET /api/questions/random/660f5678901234abcdef5678?limit=5

# Response 200 OK
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "_id": "660f9abc123456789def9abc",
      "text": "What is the capital of Nigeria?",
      "options": {
        "A": "Lagos",
        "B": "Abuja",
        "C": "Ibadan",
        "D": "Kano"
      },
      "difficulty": "easy",
      "accessLevel": "free",
      "topicId": "660f5678901234abcdef5678",
      "stats": {
        "attempts": 150,
        "correctAnswers": 120,
        "accuracy": 0.8
      }
      // Note: correctAnswer is NOT returned for student queries
    },
    ...4 more questions
  ],
  "message": "Questions retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Create Question with Validation
```bash
POST /api/questions
Content-Type: application/json

{
  "text": "What is 2+2?",
  "options": {
    "A": "3",
    "B": "4",
    "C": "5",
    "D": "6"
  },
  "correctAnswer": "B",
  "difficulty": "easy",
  "topicId": "660f5678901234abcdef5678",
  "accessLevel": "free",
  "source": "human"
}

# Response 201 Created or 400 Bad Request if validation fails
```

---

## 🔮 Phase 1 Roadmap

Phase 0 is foundation for:

- [ ] **Authentication** (OTP, Magic Link, JWT)
- [ ] **Payment Integration** (Paystack)
- [ ] **User Dashboard** (stats, history, certificates)
- [ ] **Real-time Notifications** (Socket.io)
- [ ] **Admin Panel** (question management, analytics)
- [ ] **Mobile App** (React Native or Flutter)

---

## 📚 Architecture Principles

### No Try/Catch in Controllers
All error handling via global middleware:
```javascript
// ✗ Wrong
const controller = async (req, res) => {
  try {
    const result = await service.call();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✓ Correct (asyncHandler handles errors)
const controller = asyncHandler(async (req, res) => {
  const result = await service.call();
  res.json(result);
});
```

### Middleware Chain
```
Request
  ↓
requestId middleware (add x-request-id)
  ↓
rateLimit (check quota)
  ↓
validate (Joi schema)
  ↓
asyncHandler (catch errors)
  ↓
Controller → Service → Model → Database
  ↓
Response or Error
  ↓
error.middleware (format + log)
  ↓
Client Response
```

### Async/Await Only
No callbacks, no promise chains. Example:
```javascript
// Service
async function getQuestionsByTopic(topicId) {
  const questions = await Question.find({ topicId, status: 'approved' });
  return questions.map(q => sanitizeQuestion(q, hideCorrectAnswer: true));
}

// Controller (wrapped in asyncHandler)
const controller = asyncHandler(async (req, res) => {
  const questions = await questionService.getQuestionsByTopic(req.params.topicId);
  res.json(ApiResponse.success(questions, 'Questions retrieved'));
});
```

---

## 🤝 Contributing

Phase 0 is production-ready. For Phase 1+:
1. Follow established patterns
2. All controllers use asyncHandler
3. All routes have Joi validation
4. All errors logged with requestId
5. All responses use ApiResponse builder

---

## 📄 License

This project is part of the University AI CBT System for UNIZIK and affiliated universities.

---

## 🎯 Summary

**Phase 0 provides:**
- ✅ Complete data model for universities with hierarchies
- ✅ 9 database models with optimized indexes
- ✅ 8 service modules with business logic
- ✅ 8 controllers with async error handling
- ✅ 9 API routes with full CRUD operations
- ✅ 7 Joi validators for all inputs
- ✅ 5 middleware modules for security & logging
- ✅ 8+ utility modules for production concerns
- ✅ Gemini AI integration for question generation
- ✅ Multi-tier rate limiting
- ✅ Request tracking with IDs
- ✅ Error logging to files
- ✅ Data sanitization
- ✅ Ready for authentication in Phase 1

**Start your server with:** `npm run dev`

Enjoy building! 🚀
