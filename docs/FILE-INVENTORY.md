# Phase 0 Backend - Complete File Inventory

## Project Root Files

```
backend/
├── package.json ..................... npm dependencies & scripts
├── .env.example ..................... Environment variables template
├── PHASE0.md ........................ Complete system documentation (PRIMARY)
├── PHASE0-CHECKLIST.md ............. Completion checklist & metrics
├── ARCHITECTURE-REFERENCE.md ....... Architecture quick reference
├── API-TESTING.md .................. curl commands for testing all endpoints
├── quickstart.sh ................... Quick start script (Linux/Mac)
├── quickstart.bat .................. Quick start script (Windows)
├── seed.js ......................... Test data generator
├── README.md ....................... Original project README
└── scripts/
    └── validate.js ................. System validation checker
```

---

## Source Code Structure

### Application Entry Points

```
src/
├── app.js ........................... Express app setup with all middleware
│   - Helmet, compression, CORS, morgan
│   - requestId, rateLimit middleware
│   - All route registrations
│   - 404 handler
│   - Global error handler
│
└── server.js ........................ Server startup entry point
    - Validates environment
    - Connects to MongoDB
    - Creates database indexes
    - Starts HTTP server
    - Graceful shutdown handling
```

---

### Database Models (src/models/)

**9 Mongoose Schema Files:**

1. **University.js** - Root entity
   - code, name, abbreviation (unique)
   - Metadata: studentCount, courseCount, questionCount
   - Timestamps: createdAt, updatedAt

2. **Faculty.js** - Under university
   - code, name, description
   - universityId (reference)
   - Relations: departments (backref)

3. **Department.js** - Under faculty
   - code, name
   - universityId, facultyId (references)
   - Relations: courses (backref)

4. **Course.js** - Academic course
   - code, title, level (enum: 100, 200, ..., 600)
   - creditUnits
   - departmentId (reference)
   - Relations: topics, materials (backref)

5. **Topic.js** - Learning topic
   - name
   - universityId, courseId (references)
   - Relations: questions, materials (backref)

6. **Question.js** - COMPLEX MODEL
   - text: question content
   - options: {A, B, C, D: strings}
   - correctAnswer: enum [A, B, C, D]
   - difficulty: enum [easy, medium, hard]
   - topicId, universityId (references)
   - accessLevel: enum [free, basic, premium]
   - source: enum [human, AI]
   - status: enum [pending, approved, rejected]
   - stats: {attempts, correctAnswers, accuracy}
   - rejectionReason (optional)

7. **Material.js** - Study materials
   - title, fileType (pdf, image, text)
   - fileUrl, fileSize
   - courseId, topicId (references)
   - uploadedBy (user reference)
   - status: enum [uploaded, processing, processed, failed]
   - processingError (optional)

8. **User.js** - Student/Admin
   - email, firstName, lastName (unique email)
   - password_hash (ready for Phase 1)
   - universityId (reference)
   - plan: enum [free, basic, premium]
   - planExpiresAt (timestamp)
   - stats: {questionsAttempted, accuracy, topicsStudied}
   - role: enum [student, admin]

9. **AIGenerationLog.js** - Gemini API tracking
   - universityId, materialId (references)
   - prompt, response
   - tokensUsed, estimatedCost
   - status: enum [pending, success, failed]
   - errorMessage (optional)

---

### Business Logic Layer (src/services/)

**8 Service Files (No try/catch - returns data or throws ApiError):**

1. **universityService.js**
   - create(data)
   - getById(id)
   - getAll()
   - update(id, data)

2. **facultyService.js**
   - create(data)
   - getById(id)
   - getByUniversity(universityId)
   - update(id, data)

3. **departmentService.js**
   - create(data)
   - getById(id)
   - getByFaculty(facultyId)
   - update(id, data)

4. **courseService.js**
   - create(data)
   - getById(id)
   - getByDepartment(departmentId)
   - getByLevel(departmentId, level)
   - update(id, data)

5. **topicService.js**
   - create(data)
   - getById(id)
   - getByCourse(courseId)
   - update(id, data)

6. **questionService.js** - COMPLEX
   - create(data)
   - getById(id)
   - getByTopic(topicId, limit, hideCorrectAnswer)
   - getRandom(topicId, count)
   - getRandomByTopics(topicIds, count)
   - getPending(universityId)
   - approve(questionId)
   - reject(questionId, reason)
   - getStats(questionId)
   - incrementAttempt(questionId)
   - incrementCorrect(questionId)

7. **materialService.js** - With AI integration
   - create(data)
   - getById(id)
   - getByCourse(courseId)
   - getByTopic(topicId)
   - generateQuestionsFromContent(content, courseCode, topicName, difficulty)
   - trackGenerationLog(log)
   - updateStatus(materialId, status)

8. **userService.js** - Plan management
   - create(data)
   - getById(id)
   - getByEmail(email)
   - getByUniversity(universityId)
   - upgradePlan(userId, newPlan)
   - downgradePlan(userId, newPlan)
   - updateStats(userId, questionsAttempted, accuracy)
   - updateTopicsStudied(userId, topicIds)

---

### Request Handlers (src/controllers/)

**8 Controller Files (All use asyncHandler - NO try/catch):**

1. **universityController.js**
   - POST /api/universities → create
   - GET /api/universities → list
   - GET /api/universities/:id → getById
   - PUT /api/universities/:id → update

2. **facultyController.js**
   - POST /api/universities/:universityId/faculties → create
   - GET /api/universities/:universityId/faculties → list
   - GET /api/faculties/:id → getById
   - PUT /api/faculties/:id → update

3. **departmentController.js**
   - POST /api/faculties/:facultyId/departments → create
   - GET /api/faculties/:facultyId/departments → list
   - GET /api/departments/:id → getById
   - PUT /api/departments/:id → update

4. **courseController.js**
   - POST /api/departments/:departmentId/courses → create
   - GET /api/departments/:departmentId/courses → list
   - GET /api/courses/:id → getById
   - GET /api/courses?level=200 → filterByLevel
   - PUT /api/courses/:id → update

5. **topicController.js**
   - POST /api/courses/:courseId/topics → create
   - GET /api/courses/:courseId/topics → list
   - GET /api/topics/:id → getById
   - PUT /api/topics/:id → update

6. **questionController.js** - COMPLEX
   - POST /api/questions → create (human-created)
   - GET /api/questions/:id → getById
   - GET /api/questions/random/:topicId → getRandom
   - POST /api/questions/approve/:id → approve
   - POST /api/questions/reject/:id → reject
   - GET /api/questions/pending/:universityId → getPending
   - GET /api/questions/:id/stats → getStats

7. **materialController.js** - With AI
   - POST /api/courses/:courseId/materials → upload
   - GET /api/courses/:courseId/materials → list
   - GET /api/materials/:id → getById
   - POST /api/materials/:materialId/generate-questions → generateQA

8. **userController.js** - Plan management
   - POST /api/users → create
   - GET /api/users/:id → getById
   - POST /api/users/:id/upgrade → upgradePlan
   - POST /api/users/:id/downgrade → downgradePlan
   - GET /api/users/:id/stats → getStats

---

### Route Definitions (src/routes/)

**9 Route Files (RESTful endpoints with middleware):**

1. **university.routes.js** - 4 routes
   - POST /api/universities
   - GET /api/universities
   - GET /api/universities/:id
   - PUT /api/universities/:id

2. **faculty.routes.js** - 4 routes
3. **department.routes.js** - 4 routes
4. **course.routes.js** - 5 routes (includes filter by level)
5. **topic.routes.js** - 4 routes
6. **question.routes.js** - 7 routes (complex)
7. **material.routes.js** - 4 routes (with AI endpoint)
8. **user.routes.js** - 6 routes (with plan management)
9. **health.routes.js** - 1 route
   - GET /api/health (server & DB status)

**Total API Endpoints: 40+**

---

### Middleware Layer (src/middleware/)

**5 Custom Middleware Files:**

1. **error.middleware.js** - GLOBAL ERROR HANDLER
   - Catches all errors from asyncHandler
   - Logs with requestId + module name
   - Formats response (dev vs prod)
   - Returns consistent ApiError format
   - Integrates with Logger utility

2. **validate.middleware.js** - INPUT VALIDATION
   - Joi schema validator wrapper
   - Called before each controller
   - Returns 400 with validation details on failure
   - Passes to next on success

3. **requestId.middleware.js** - REQUEST TRACKING
   - Generates UUID per request
   - Adds x-request-id header
   - Passed to logger for debugging

4. **rateLimit.middleware.js** - RATE LIMITING
   - 3 tiers: general (100/15m), auth (5/15m), AI (10/h)
   - Uses express-rate-limit
   - Applied to different endpoint groups

5. **requestLogger.middleware.js** - REQUEST LOGGING
   - Logs request duration + status
   - Integration with Morgan

---

### Input Validation (src/validators/)

**7 Joi Schema Validator Files:**

1. **faculty.validator.js**
   - code: alphanumeric, required
   - name: string, required
   - description: string, optional
   - universityId: ObjectId, required

2. **department.validator.js**
   - code, name, universityId, facultyId

3. **course.validator.js**
   - code, title, level (enum), creditUnits, departmentId

4. **topic.validator.js**
   - name, universityId, courseId

5. **question.validator.js** - COMPLEX
   - text: string, required
   - options: {A, B, C, D each non-empty}, required
   - correctAnswer: enum [A, B, C, D], required
   - difficulty: enum [easy, medium, hard], required
   - topicId, universityId: ObjectId, required
   - accessLevel: enum [free, basic, premium], required
   - source: enum [human, AI], optional

6. **material.validator.js**
   - title, fileType, fileUrl, fileSize, courseId, uploadedBy

7. **user.validator.js**
   - email, firstName, lastName, universityId
   - plan upgrade/downgrade validation

---

### Utilities & Helpers (src/utils/)

**8+ Utility Files:**

1. **ApiError.js** - CUSTOM ERROR CLASS
   - statusCode, message, details[], timestamp
   - toJSON() for response formatting
   - Dev vs prod error handling

2. **asyncHandler.js** - ERROR CATCHING WRAPPER
   - Wraps async route handlers
   - Catches promise rejections
   - Passes errors to next(error)
   - Prevents unhandled promise rejections

3. **apiResponse.js** - RESPONSE BUILDER
   - Static methods: success(), created(), badRequest(), notFound(), etc.
   - Consistent response format: {success, statusCode, data, message, timestamp}
   - Used by all controllers

4. **sanitizer.js** - DATA FILTERING
   - removeCorrectAnswer(question)
   - sanitizeQuestion(question, hideAnswer)
   - sanitizeUser(user)
   - sanitizeMaterial(material)
   - sanitizeArray(items, type)

5. **logger.js** - FILE & CONSOLE LOGGING
   - Logger class with error(), warn(), info(), debug()
   - Logs to file: logs/error.log
   - Includes timestamp, module, requestId
   - Log levels: error, warn, info, debug

6. **cache.js** - CACHING LAYER
   - SimpleCache class with TTL
   - set(key, value, ttl)
   - get(key)
   - clear()
   - Singleton instances: universityCache, courseCache, questionCache
   - Ready for Redis migration in Phase 1

7. **pagination.js** - PAGINATION UTILITIES
   - getPaginationParams(query) → {page, limit, skip}
   - formatPaginatedResponse(items, total, page, limit)
   - Ready for large dataset handling

8. **gemini.js** - AI INTEGRATION
   - generateQuestions(materialContent, courseCode, topicName, difficulty)
   - Calls Google Generative AI API
   - Returns parsed JSON questions
   - Error handling + logging

9. **responseFormatter.js** - LEGACY SUPPORT
   - sendSuccess(res, data, statusCode, message)
   - sendError(res, statusCode, message, details)

10. **index.js** - CENTRAL EXPORTS
    - Exports all utilities for easy importing
    - Import: const { ApiError, asyncHandler, ... } = require('./utils')

---

### Configuration (src/config/)

**3 Configuration Files:**

1. **env.js** - ENVIRONMENT VALIDATION
   - Validates required env variables:
     - PORT (default: 3000)
     - NODE_ENV (development|production)
     - MONGO_URI (MongoDB connection)
     - GEMINI_API_KEY (Google Generative AI)
     - UNIVERSITY_ID (initial university ID)
   - Throws error if required vars missing
   - Called early in server.js

2. **database.js** - MONGODB CONNECTION
   - mongoose.connect(MONGO_URI)
   - Error handling + logging
   - Connection success callback
   - Returns mongoose instance

3. **indexes.js** - DATABASE OPTIMIZATION
   - Runs on server startup
   - Creates indexes on all models
   - Optimized for common queries:
     - Question: topicId, status, accessLevel, difficulty
     - User: email, universityId
     - Material: courseId, status
     - Course: departmentId, level
     - Topic: courseId
   - Improves query performance

---

### Constants (src/constants/)

**Configuration Constants:**

```javascript
// Enums and limits
PLAN_TYPES = ['free', 'basic', 'premium']
QUESTION_STATUS = ['pending', 'approved', 'rejected']
DIFFICULTY_LEVELS = ['easy', 'medium', 'hard']
ACCESS_LEVELS = ['free', 'basic', 'premium']
COURSE_LEVELS = [100, 200, 300, 400, 500, 600]
USER_ROLES = ['student', 'admin']
MATERIAL_FILE_TYPES = ['pdf', 'image', 'text']

// Rate limiting
RATE_LIMITS = {
  general: { windowMs: 15 * 60 * 1000, max: 100 },
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
  ai: { windowMs: 60 * 60 * 1000, max: 10 }
}

// Plan limits
PLAN_LIMITS = {
  free: { questionsPerDay: 10 },
  basic: { questionsPerDay: 50 },
  premium: { questionsPerDay: null }
}
```

---

### Supporting Files

1. **seed.js** - TEST DATA GENERATOR
   - Creates UNIZIK university
   - Creates 2 faculties, 4 departments
   - Creates 8 courses (100-600 levels)
   - Creates 16 topics
   - Creates 50 test questions
   - Creates 10 test users
   - Run with: `npm run seed`

2. **.env.example** - ENVIRONMENT TEMPLATE
   ```
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://...
   GEMINI_API_KEY=...
   UNIVERSITY_ID=...
   ```

3. **package.json** - NPM CONFIGURATION
   ```json
   {
     "dependencies": {
       "express": "^4.18.2",
       "mongoose": "^7.6.3",
       "joi": "^17.11.0",
       "@google/generative-ai": "^0.3.0",
       "helmet": "^7.1.0",
       "cors": "^2.8.5",
       "morgan": "^1.10.0",
       "compression": "^1.7.4",
       "express-rate-limit": "^7.1.5",
       "uuid": "^9.0.1"
     },
     "scripts": {
       "start": "node src/server.js",
       "dev": "nodemon src/server.js",
       "seed": "node seed.js",
       "validate": "node scripts/validate.js"
     }
   }
   ```

---

## File Count Summary

- **Models:** 9 files
- **Services:** 8 files
- **Controllers:** 8 files
- **Routes:** 9 files
- **Middleware:** 5 files
- **Validators:** 7 files
- **Utilities:** 10 files
- **Config:** 3 files
- **Scripts:** 1 file (validate.js)
- **Documentation:** 4 markdown files
- **Helpers:** 2 shell scripts (quickstart)
- **Seed/Env:** 2 files

**Total Production Files: 60+**

---

## Key Files to Understand First

1. **src/app.js** - Understand middleware chain
2. **src/middleware/error.middleware.js** - Global error handling
3. **src/utils/asyncHandler.js** - Error catching pattern
4. **src/services/questionService.js** - Complex business logic example
5. **src/controllers/questionController.js** - Controller pattern example
6. **PHASE0.md** - Complete API documentation

---

## Startup Flow

```
npm run dev
  ↓
server.js loads
  ↓
env.js validates environment
  ↓
database.js connects to MongoDB
  ↓
indexes.js creates all database indexes
  ↓
app.js initializes Express with middleware
  ↓
All routes registered
  ↓
Server listens on port 3000
  ↓
Ready for requests
```

---

## Next Phase (Phase 1)

The Phase 0 structure supports:
- Authentication (add auth routes, jwt middleware)
- Payment integration (add payment service)
- User dashboard (add new controllers)
- Real-time features (add websocket layer)
- Admin panel (add admin routes)

All without modifying existing Phase 0 code.
