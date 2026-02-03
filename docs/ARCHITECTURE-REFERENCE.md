/**
 * PHASE 0 SYSTEM ARCHITECTURE - Quick Reference
 * =============================================
 * 
 * Language: JavaScript (No TypeScript)
 * Runtime: Node.js 16+
 * Framework: Express.js
 * Database: MongoDB with Mongoose
 * Validation: Joi
 * AI: Google Gemini API
 */

// ========== DATA MODEL ==========
/*
University (Root Entity)
├── Faculty
│   ├── Department
│   │   ├── Course (levels: 100, 200, ..., 600)
│   │   │   ├── Topic
│   │   │   │   ├── Question (with approval workflow)
│   │   │   │   └── Material (upload files)
│   │   │   └── Material
│   │   └── [Department N]
│   └── [Faculty N]
└── [University N]

User (Student/Admin)
├── email, firstName, lastName
├── plan: free | basic | premium (with expiry)
├── stats: questionsAttempted, accuracy, topicsStudied
└── universityId (enrolled in university)
*/

// ========== CORE CONCEPTS ==========

/* 1. ERROR HANDLING
   - NO try/catch in controllers
   - All errors caught by asyncHandler wrapper
   - Global error.middleware formats + logs responses
   - ApiError class with statusCode, details, timestamp
   - Logs with requestId for tracing
*/

/* 2. VALIDATION
   - Joi schemas on all POST/PUT endpoints
   - validate middleware applied before controller
   - Returns 400 with detailed error messages on failure
   - 7 validators created (faculty, department, course, topic, question, material, user)
*/

/* 3. RESPONSE FORMAT (Consistent Everywhere)
   {
     "success": boolean,
     "statusCode": number,
     "data": object | null,
     "message": string,
     "timestamp": ISO8601 string
   }
*/

/* 4. DATABASE INDEXES
   - Automatically created on server startup
   - Optimizes queries by topicId, status, accessLevel, etc.
   - Production-grade performance
*/

/* 5. REQUEST LIFECYCLE
   Request → requestId → rateLimit → validate → asyncHandler 
      → Controller → Service → Model → Database → Response 
      → error.middleware → client
*/

// ========== PROJECT STRUCTURE ==========

/*
backend/
├── src/
│   ├── app.js ........................... Express app with all middleware
│   ├── server.js ........................ Entry point (validates env, connects DB)
│   │
│   ├── models/ (9 files)
│   │   ├── University.js
│   │   ├── Faculty.js
│   │   ├── Department.js
│   │   ├── Course.js
│   │   ├── Topic.js
│   │   ├── Question.js ................. Complex with stats, approval, access control
│   │   ├── Material.js ................. File uploads + Gemini integration
│   │   ├── User.js ..................... Plan management ready
│   │   └── AIGenerationLog.js .......... Track Gemini API usage
│   │
│   ├── services/ (8 files) ............. Business logic layer
│   │   ├── universityService.js
│   │   ├── facultyService.js
│   │   ├── departmentService.js
│   │   ├── courseService.js
│   │   ├── topicService.js
│   │   ├── questionService.js ......... Get random, approve/reject, stats
│   │   ├── materialService.js ......... Upload + Gemini integration
│   │   └── userService.js ............ Plan upgrade/downgrade
│   │
│   ├── controllers/ (8 files) ......... HTTP request handlers
│   │   └── All follow pattern: [validate → asyncHandler → service]
│   │
│   ├── routes/ (9 files) .............. RESTful endpoints
│   │   └── All integrated in app.js
│   │
│   ├── middleware/ (5 files)
│   │   ├── error.middleware.js ........ Global error handler + logger
│   │   ├── validate.middleware.js ..... Joi validation wrapper
│   │   ├── requestId.middleware.js .... UUID tracking (x-request-id)
│   │   ├── rateLimit.middleware.js ... 3 tiers: general (100/15m), auth (5/15m), AI (10/h)
│   │   └── requestLogger.middleware.js Request duration + status logging
│   │
│   ├── validators/ (7 files) .......... Joi schemas for inputs
│   │   └── All POST/PUT routes have corresponding validator
│   │
│   ├── utils/ (8+ files)
│   │   ├── ApiError.js ................ Custom error with details + timestamp
│   │   ├── asyncHandler.js ............ Wraps async functions, catches errors
│   │   ├── apiResponse.js ............ Static builders: success(), created(), etc.
│   │   ├── sanitizer.js .............. Remove correctAnswer, sensitive fields
│   │   ├── logger.js ................. File + console logging with levels
│   │   ├── cache.js .................. SimpleCache class for Phase 1 → Redis
│   │   ├── pagination.js ............ Pagination utilities for large datasets
│   │   ├── gemini.js ................ generateQuestions() integration
│   │   └── index.js .................. Central exports
│   │
│   └── constants/ .................... Application constants (enums, limits, etc.)
│
├── seed.js ........................... Test data generator (UNIZIK + test users)
├── .env.example ...................... Environment template
├── package.json ...................... Dependencies + npm scripts
└── PHASE0.md ......................... Detailed documentation
*/

// ========== KEY FILES TO UNDERSTAND ==========

// app.js - How middleware chain is set up
/*
helmet, compression, cors, morgan          ← Security & logging
requestId, rateLimit                       ← Tracking & rate limit
body/urlencoded parser, cors               ← Request parsing
validate + routes                          ← Request routing
404 handler                                ← Not found
error.middleware                           ← Catch all errors
*/

// error.middleware.js - Global error handler
/*
Catches all errors from asyncHandler
Logs with requestId + module name
Formats dev response (with stack) vs prod response
Returns ApiResponse format
*/

// asyncHandler.js - Error catching wrapper
/*
Wraps async functions
Catches promise rejections
Passes errors to next middleware
Prevents unhandled promise rejections
*/

// ========== COMMON PATTERNS ==========

// Pattern: Create Resource
/*
POST /api/resource
1. Route calls validate(joiSchema) middleware
2. Joi validates input, returns 400 if invalid
3. Route calls asyncHandler(controller)
4. asyncHandler wraps async function
5. Controller calls service.create(input)
6. Service calls Model.create(input)
7. Model saved to DB
8. Controller returns res.json(ApiResponse.created(data))
9. If error: asyncHandler catches → error.middleware formats
*/

// Pattern: Get Multiple Resources (with pagination Phase 1+)
/*
GET /api/resources?page=1&limit=10
1. asyncHandler calls controller
2. Controller calls service.getAll(filters)
3. Service queries Model.find(filters)
4. Service calls pagination.formatPaginatedResponse()
5. Returns {data: [...], pagination: {page, limit, total}}
6. Response sent via ApiResponse.success()
*/

// Pattern: Validate Input
/*
POST /api/resource
Body: { field1, field2, ... }
1. validate middleware runs BEFORE controller
2. Joi schema validates types, formats, required fields
3. If invalid: returns 400 with details
4. If valid: passes to next middleware/controller
*/

// Pattern: Conditional Access (Phase 1)
/*
GET /api/questions (returns questions without correctAnswer)
Authorization header: Bearer <token>
1. Phase 1: verify JWT
2. Get user.plan from token
3. If free: return only free questions, hide correctAnswer
4. If premium: return all questions, hide correctAnswer
5. If admin: return with correctAnswer + stats
6. sanitizer.sanitizeQuestion() removes based on role
*/

// ========== DATABASE OPERATIONS ==========

// Service layer handles all DB operations
/*
universityService:
  - create(data) → University.create()
  - getById(id) → University.findById()
  - getAll(filters) → University.find(filters)
  - update(id, data) → University.findByIdAndUpdate()

questionService (More Complex):
  - getByTopic(topicId, limit) → Question.find({topicId, status: 'approved'})
  - getRandom(topicId, count) → aggregate with $sample
  - approve(id) → update status to 'approved'
  - reject(id) → update status to 'rejected'
  - getStats(id) → return stats object
  
materialService:
  - upload(file, courseId) → Material.create({fileUrl, ...})
  - generateQuestions(materialId) → Gemini API call → Question.create()
  - trackUsage(apiTokens) → AIGenerationLog.create()
*/

// ========== RATE LIMITING ==========

/*
General Endpoints: 100 requests per 15 minutes
  - GET, POST for regular resources
  
Auth Endpoints: 5 requests per 15 minutes
  - Phase 1: login, register, password reset
  
AI Endpoints: 10 requests per hour
  - POST /api/materials/:id/generate-questions
  - Prevents API abuse of expensive Gemini calls
*/

// ========== ENVIRONMENT VARIABLES ==========

/*
PORT=3000 ......................... Server port
NODE_ENV=development|production ... Environment
MONGO_URI=mongodb+srv://... ...... Database connection
GEMINI_API_KEY=sk_... ............ Google Gemini API key
UNIVERSITY_ID=660f... ........... Initial university ID (seed)
*/

// ========== SECURITY FEATURES ==========

/*
Helmet ........................... HTTP security headers
CORS ............................ Cross-origin requests
Compression ..................... Gzip responses
Rate Limiting ................... Prevent abuse (3 tiers)
Request ID ...................... Track requests (x-request-id header)
Data Sanitization ............... Remove sensitive fields
Error Logging ................... Structured logs with requestId
Timestamps ...................... All errors have ISO timestamp
Dev vs Prod ..................... Stack traces only in dev
*/

// ========== VALIDATION SCHEMAS ==========

/*
Faculty: code (alphanum), name, description, universityId
Department: code, name, universityId, facultyId
Course: code, title, level (enum 100-600), creditUnits, departmentId
Topic: name, universityId, courseId
Question: text, options (A-D), correctAnswer, difficulty, topicId, accessLevel
Material: title, fileType, fileUrl, fileSize, courseId, uploadedBy
User: email, firstName, lastName, universityId, plan
*/

// ========== API RESPONSE EXAMPLES ==========

// Success
/*
{
  "success": true,
  "statusCode": 201,
  "data": {...},
  "message": "University created successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
*/

// Validation Error
/*
{
  "success": false,
  "statusCode": 400,
  "data": {
    "details": ["field1 is required", "field2 must be a string"]
  },
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
*/

// Server Error (Development)
/*
{
  "success": false,
  "statusCode": 500,
  "data": {
    "details": ["Database connection failed"],
    "stack": "Error: ECONNREFUSED..."
  },
  "message": "Database error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
*/

// Server Error (Production - No Stack)
/*
{
  "success": false,
  "statusCode": 500,
  "data": null,
  "message": "An error occurred",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
*/

// ========== SCALING READINESS ==========

/*
Phase 0 is built for scale to 100k+ users:

✓ Database Indexes .............. Common queries optimized
✓ Pagination Ready ............. Results limited, offset implemented
✓ Caching Layer ................ SimpleCache → Redis migration path
✓ Rate Limiting ................ Prevents API abuse
✓ Request Tracking ............ x-request-id for debugging
✓ Error Logging ................ Structured logs for monitoring
✓ Data Sanitization ............ Remove unnecessary fields
✓ Async/Await Throughout ...... No blocking operations
✓ Service Layer ................ Business logic separation
✓ Middleware Architecture ...... Extensible for Phase 1+

Next: Add Redis, implement user authentication (Phase 1)
*/

// ========== COMMAND REFERENCE ==========

/*
npm install .................. Install dependencies
npm run validate ............. Check all files present
npm run seed ................. Generate test data
npm run dev .................. Start dev server (auto-reload)
npm start .................... Start production server

Test Endpoints:
GET http://localhost:3000/api/health - Check server

Required Setup:
1. Create .env from .env.example
2. Set MONGO_URI to your MongoDB
3. Set GEMINI_API_KEY from Google AI Studio
4. npm install
5. npm run seed (first time)
6. npm run dev
*/
