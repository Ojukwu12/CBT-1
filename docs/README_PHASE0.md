# University AI CBT System - Phase 0 Backend

## 🎯 Project Overview

Production-ready Node.js backend for a University-based AI CBT (Computer-Based Testing) & adaptive practice system. Built for Nigerian universities, starting with UNIZIK.

**Phase 0 focuses on:**
- Admin-controlled content creation
- AI-powered question generation (Gemini)
- Question approval workflows
- Randomized question sets for students
- Plan-based access control (Free/Basic/Premium)

## 🏗️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **AI:** Google Generative AI (Gemini)
- **Validation:** Joi
- **Security:** Helmet, CORS
- **Async:** async/await only
- **Error Handling:** Global error handler (no try/catch in controllers)

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Database, env, indexes config
│   ├── models/           # MongoDB Mongoose models
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── validators/       # Joi validation schemas
│   ├── utils/            # Utilities (async handler, errors, etc)
│   ├── constants/        # System-wide enums & limits
│   ├── app.js            # Express app setup
│   └── server.js         # Server startup
├── package.json
├── .env.example
└── README.md
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

**Required variables:**
- `MONGO_URI` - MongoDB connection string
- `GEMINI_API_KEY` - Google Generative AI API key
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### 3. Start Development Server

```bash
npm run dev
```

### 4. Start Production Server

```bash
npm start
```

Server will run on `http://localhost:3000`

## 📚 API Endpoints

### Health Check
```
GET /api/health
```

### Universities
```
POST   /api/universities
GET    /api/universities
GET    /api/universities/:id
PUT    /api/universities/:id
```

### Faculties
```
POST   /api/universities/:universityId/faculties
GET    /api/universities/:universityId/faculties
GET    /api/universities/:universityId/faculties/:id
PUT    /api/universities/:universityId/faculties/:id
```

### Departments
```
POST   /api/faculties/:facultyId/departments
GET    /api/faculties/:facultyId/departments
GET    /api/faculties/:facultyId/departments/:id
PUT    /api/faculties/:facultyId/departments/:id
```

### Courses
```
POST   /api/departments/:departmentId/courses
GET    /api/departments/:departmentId/courses
GET    /api/departments/:departmentId/courses/:id
PUT    /api/departments/:departmentId/courses/:id
```

### Topics
```
POST   /api/courses/:courseId/topics
GET    /api/courses/:courseId/topics
GET    /api/courses/:courseId/topics/:id
PUT    /api/courses/:courseId/topics/:id
```

### Questions
```
GET    /api/questions/:topicId                 # Get by topic
GET    /api/questions/random/:topicId          # Get random questions
GET    /api/questions/stats/:topicId           # Get topic stats
GET    /api/questions/pending/:universityId    # Get pending (admin)
POST   /api/questions/approve/:questionId      # Approve question (admin)
POST   /api/questions/reject/:questionId       # Reject question (admin)
```

### Materials
```
POST   /api/courses/:courseId/materials
GET    /api/courses/:courseId/materials
GET    /api/courses/:courseId/materials/:id
POST   /api/courses/:courseId/materials/:materialId/generate-questions
```

### Users
```
POST   /api/users
GET    /api/users/:id
GET    /api/users/email/:email
GET    /api/users/university/:universityId
POST   /api/users/:userId/upgrade-plan
POST   /api/users/:userId/downgrade-plan
```

## 🔑 Architecture Principles

### No Try/Catch in Controllers
All errors are caught by the global error handler. Controllers use `asyncHandler` wrapper:

```javascript
const handler = asyncHandler(async (req, res) => {
  const data = await service.getdata();
  res.status(200).json({ success: true, data });
});
```

### Joi Validation Middleware
All inputs are validated before reaching business logic:

```javascript
const route = [
  validate(createUserSchema),
  asyncHandler(controller.createUser)
];
```

### Service Layer Pattern
Controllers call services, services call models:

```
Route → Controller → Service → Model → Database
```

### Global Error Handler
All errors (including validation) flow to a single error handler that formats responses consistently.

## 🗄️ Database Indexes

Critical indexes are created automatically on server startup for optimal query performance:
- Question queries (topicId, status, accessLevel, difficulty)
- User lookups (email, universityId, plan)
- Course queries (departmentId, level)
- Material tracking

## 🤖 AI Integration (Gemini)

### Generate Questions from Material

```bash
POST /api/courses/:courseId/materials/:materialId/generate-questions
Body: {
  "adminId": "admin_user_id",
  "difficulty": "mixed"  // or easy, medium, hard
}
```

Response includes:
- Generated question IDs
- AI generation log with token usage
- Questions start in "pending" status

### Admin Approval Workflow

1. Questions are generated in "pending" status
2. Admin reviews via `/api/questions/pending/:universityId`
3. Admin approves or rejects with notes
4. Approved questions are visible to students

## 📊 Plan Access Control

### Free Plan
- Max 8 questions per topic per day
- Can only see "free" access level questions
- No paid content

### Basic Plan
- Max 50 questions per topic per day
- Can see "free" + "basic" questions
- Limited feature set

### Premium Plan
- Unlimited questions
- Access to all content ("free", "basic", "premium")
- Full feature access

## 🔐 Security

- **Helmet:** Security headers
- **CORS:** Cross-origin requests controlled
- **Rate Limiting:** Ready for Phase 1 auth
- **Input Validation:** Joi schemas on all endpoints
- **Error Messages:** Safe, non-revealing in production

## 📈 Scalability Features

- **Database Indexes:** Pre-created for high-volume queries
- **Pagination-Ready:** Services return limited result sets
- **Modular Architecture:** Easy to add new entities
- **Async/Await:** Non-blocking I/O throughout
- **Service Layer:** Business logic separated from HTTP layer

## 🚦 Status

**Phase 0:** ✅ Complete
- Models, services, controllers, routes
- Joi validation for all endpoints
- Global error handling
- AI integration (Gemini)
- Database optimization

**Phase 1:** 🔜 Planned
- User authentication (OTP/Magic Link)
- Paystack payment integration
- Plan enforcement middleware
- User stats tracking

## 📝 Environment Variables

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/cbt_system
NODE_ENV=development
GEMINI_API_KEY=your_api_key_here
UNIVERSITY_ID=unizik
```

## 🐛 Error Handling

All errors follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "details": ["field error 1", "field error 2"],
  "timestamp": "2026-02-02T10:30:00.000Z"
}
```

## 💾 Seeding (Coming in Phase 1)

For now, manually create data via API endpoints or use MongoDB client.

## 📞 Support

For issues, check logs and error messages in the global error handler response.

---

**Built for production. Designed to scale to hundreds of thousands of users.**
