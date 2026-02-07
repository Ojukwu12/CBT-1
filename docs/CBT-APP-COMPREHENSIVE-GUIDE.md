# CBT Application - Comprehensive Usage & API Guide

**Version**: 1.0.0  
**Date**: February 5, 2026  
**Server Status**: ✅ Running on Port 3000

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Authentication](#authentication)
4. [Core Features](#core-features)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Question Handling](#question-handling)
7. [Exam/Quiz System](#exam--quiz-system)
8. [Analytics & Leaderboard](#analytics--leaderboard)
9. [Search & Filter](#search--filter)
10. [Error Handling](#error-handling)
11. [Database Seeded Data](#database-seeded-data)
12. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Starting the Server

```bash
cd backend
npm start
```

Server will run on: `http://localhost:3000`

### Testing the Server

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@unizik.edu.ng","password":"Student@123"}'
```

### Default Test Credentials

```
STUDENT ACCOUNT:
  Email: student@unizik.edu.ng
  Password: Student@123
  Role: student
  Plan: free

ADMIN ACCOUNT:
  Email: admin@unizik.edu.ng
  Password: Admin@123
  Role: admin
  Plan: premium
```

---

## System Overview

### Architecture

```
CBT Backend (Node.js/Express)
├── Authentication & Authorization
├── User Management
├── Academic Structure (Universities, Faculties, Departments, Courses)
├── Questions & Topics
├── Exam/Quiz Sessions
├── Analytics & Performance Tracking
├── Leaderboard
└── Search Functionality
```

### Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **API Documentation**: RESTful API

### Key Features Implemented

✅ User Registration & Authentication  
✅ Role-Based Access Control (Student, Admin)  
✅ Subscription Plans (Free, Basic, Premium)  
✅ Question Bank Management  
✅ Exam/Quiz Sessions with Auto-Grading  
✅ Performance Analytics  
✅ Leaderboard System  
✅ Global Search  
✅ Email Integration (Brevo)  
✅ Payment Integration (Paystack)  

---

## Authentication

### User Registration

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "SecurePassword@123",
  "universityId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "plan": "free",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### User Login

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword@123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "role": "student",
    "plan": "free",
    "isActive": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using Authentication Token

All authenticated endpoints require the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/users/profile
```

---

## Core Features

### 1. User Profile Management

#### Get User Profile
**Endpoint**: `GET /api/users/profile`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "student@unizik.edu.ng",
    "role": "student",
    "plan": "free",
    "planExpiresAt": null,
    "isActive": true,
    "stats": {
      "questionsAttempted": 45,
      "questionsCorrect": 38,
      "accuracy": 84.44,
      "topicsStudied": 8
    }
  }
}
```

#### Update User Profile
**Endpoint**: `PUT /api/users/:userId`  
**Auth**: Required  

---

### 2. Academic Structure

#### Get Universities
**Endpoint**: `GET /api/universities`  
**Auth**: Not required  

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "code": "unizik",
      "name": "Nnamdi Azikiwe University",
      "abbreviation": "UNIZIK",
      "state": "Anambra",
      "isActive": true
    }
  ]
}
```

#### Get Faculties for University
**Endpoint**: `GET /api/universities/:universityId/faculties`  
**Auth**: Not required  

#### Get Departments
**Endpoint**: `GET /api/departments`  
**Auth**: Not required  

#### Get Departments for Faculty
**Endpoint**: `GET /api/faculties/:facultyId/departments`  
**Auth**: Not required  

#### Get Courses
**Endpoint**: `GET /api/courses`  
**Auth**: Required  
**Query Parameters**:
- `departmentId` - Filter by department
- `level` - Filter by course level (100, 200, 300, 400)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "code": "CSC101",
      "title": "Introduction to Programming",
      "level": 100,
      "creditUnits": 3,
      "isActive": true
    }
  ]
}
```

#### Get Course Details
**Endpoint**: `GET /api/courses/:courseId`  
**Auth**: Required  

---

## Question Handling

### Question Structure

```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "text": "What is the output of print(2 ** 3)?",
  "options": {
    "A": "6",
    "B": "8",
    "C": "5",
    "D": "9"
  },
  "correctAnswer": "B",
  "difficulty": "easy",
  "source": "AI",
  "accessLevel": "free",
  "status": "approved",
  "stats": {
    "timesAttempted": 120,
    "correctAnswers": 95,
    "incorrectAnswers": 25,
    "accuracy": 79.17,
    "averageTimeSeconds": 45
  }
}
```

### Get Questions

**Endpoint**: `GET /api/questions`  
**Auth**: Required  
**Query Parameters**:
- `topicId` - Get questions for specific topic
- `courseId` - Get questions for specific course
- `difficulty` - Filter by difficulty (easy, medium, hard)
- `limit` - Number of questions to return (default: 10)
- `skip` - Pagination offset

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "text": "What is Python?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "difficulty": "easy",
      // correctAnswer is NOT sent to prevent cheating
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 10,
    "skip": 0,
    "pages": 25
  }
}
```

**Important**: The `correctAnswer` field is NOT returned to prevent cheating during exams.

### Get Questions by Topic

**Endpoint**: `GET /api/questions/:topicId`  
**Auth**: Required  

### Get Question Statistics

**Endpoint**: `GET /api/questions/stats/:topicId`  
**Auth**: Required  

---

## Exam / Quiz System

### How Exam Sessions Work

1. **Start Exam**: Create a new exam session
2. **Answer Questions**: Submit answers one by one
3. **Get Summary**: Check progress during exam
4. **Submit Exam**: Finalize exam and receive automatic grading
5. **Get Results**: View detailed results and breakdown

### Start an Exam

**Endpoint**: `POST /api/exams/start`  
**Auth**: Required  

**Request Body**:
```json
{
  "examType": "practice",
  "courseId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "topicIds": [],
  "totalQuestions": 10,
  "durationMinutes": 60
}
```

**Parameters Explanation**:
- `examType`: Can be "practice", "mock", or "final"
- `courseId`: ID of the course (optional if using topicIds)
- `topicIds`: Array of topic IDs to focus on specific topics (optional)
- `totalQuestions`: Number of questions in the exam (1-100)
- `durationMinutes`: Time limit in minutes

**Response**:
```json
{
  "success": true,
  "data": {
    "examSessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "examType": "practice",
    "status": "in_progress",
    "totalQuestions": 10,
    "durationMinutes": 60,
    "startedAt": "2026-02-05T18:30:00Z",
    "questions": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "text": "What is 2 + 2?",
        "options": { "A": "3", "B": "4", "C": "5", "D": "6" }
      }
      // ... more questions
    ]
  }
}
```

### Submit an Answer

**Endpoint**: `POST /api/exams/:examSessionId/answer`  
**Auth**: Required  

**Request Body**:
```json
{
  "questionId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "selectedAnswer": "B",
  "timeSpentSeconds": 30
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "questionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "selectedAnswer": "B",
    "isCorrect": true,
    "message": "Answer submitted successfully"
  }
}
```

**Key Points**:
- `selectedAnswer` must be "A", "B", "C", or "D"
- `isCorrect` indicates if the answer was right (not revealed during exam)
- `timeSpentSeconds` helps track student performance

### Get Exam Summary (During Exam)

**Endpoint**: `GET /api/exams/:examSessionId/summary`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "examSessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "status": "in_progress",
    "totalQuestions": 10,
    "answeredQuestions": 7,
    "correctAnswers": 5,
    "timeRemainingSeconds": 1200,
    "timeSpentSeconds": 600
  }
}
```

### Submit Exam (Finalize)

**Endpoint**: `POST /api/exams/:examSessionId/submit`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "examSessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "status": "graded",
    "totalQuestions": 10,
    "answeredQuestions": 9,
    "correctAnswers": 8,
    "score": 80,
    "percentage": 80,
    "isPassed": true,
    "passingScore": 60,
    "timeSpentSeconds": 1200,
    "submittedAt": "2026-02-05T18:35:00Z"
  }
}
```

**Grading Details**:
- Score is calculated as: `(correctAnswers / totalQuestions) * 100`
- Default passing score is 60%
- `isPassed` indicates if student met the passing criteria

### Get Exam Results (Detailed)

**Endpoint**: `GET /api/exams/:examSessionId/results`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "examSessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "score": 80,
    "percentage": 80,
    "isPassed": true,
    "timeSpentSeconds": 1200,
    "startedAt": "2026-02-05T18:30:00Z",
    "submittedAt": "2026-02-05T18:35:00Z",
    "questions": [
      {
        "questionId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "text": "What is 2 + 2?",
        "correctAnswer": "B",
        "selectedAnswer": "B",
        "isCorrect": true,
        "timeSpentSeconds": 30
      },
      {
        "questionId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "text": "What is 5 * 6?",
        "correctAnswer": "A",
        "selectedAnswer": "C",
        "isCorrect": false,
        "timeSpentSeconds": 45
      }
      // ... more questions with breakdown
    ]
  }
}
```

### Handling Correct and Wrong Answers

**The `isCorrect` field indicates**:
- `true` = Student selected the correct answer
- `false` = Student selected wrong answer

**Scoring Logic**:
```
Points awarded per question = 1 if isCorrect else 0
Total Score = (Sum of points / Total Questions) * 100
```

**Example Calculation**:
```
Total Questions: 10
Correct Answers: 8
Wrong Answers: 2

Score = (8 / 10) * 100 = 80%
Passed = Score (80%) >= Passing Threshold (60%) = TRUE
```

### Quiz Result Tally Verification

The system correctly handles:
- ✅ Correct answer validation against answer key
- ✅ Automatic point calculation
- ✅ Percentage score computation
- ✅ Pass/Fail determination
- ✅ Time tracking per question
- ✅ Overall exam duration calculation
- ✅ Detailed breakdown of each question

---

## Analytics & Leaderboard

### Analytics Dashboard

**Endpoint**: `GET /api/analytics/dashboard`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "totalExams": 15,
    "averageScore": 82.5,
    "totalTimeSpent": 7200,
    "strongTopics": [
      { "topicId": "...", "name": "Variables and Data Types", "accuracy": 95 },
      { "topicId": "...", "name": "Loops", "accuracy": 88 }
    ],
    "weakTopics": [
      { "topicId": "...", "name": "Object-Oriented Programming", "accuracy": 65 }
    ],
    "stats": {
      "questionsAttempted": 150,
      "questionsCorrect": 125,
      "accuracy": 83.33
    }
  }
}
```

### Topic-Specific Analytics

**Endpoint**: `GET /api/analytics/topic/:topicId`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "topicName": "Loops and Conditionals",
    "questionsAttempted": 25,
    "accuracy": 88,
    "averageTimeSeconds": 45,
    "trends": [
      { "date": "2026-02-01", "score": 75, "questionsAttempted": 5 },
      { "date": "2026-02-02", "score": 82, "questionsAttempted": 6 },
      { "date": "2026-02-05", "score": 90, "questionsAttempted": 8 }
    ]
  }
}
```

### Course-Specific Analytics

**Endpoint**: `GET /api/analytics/course/:courseId`  
**Auth**: Required  

**Response**:
```json
{
  "success": true,
  "data": {
    "courseName": "Introduction to Programming",
    "examsTaken": 5,
    "averageScore": 82,
    "progress": 65,
    "topics": [
      { "name": "Variables", "progress": 80 },
      { "name": "Loops", "progress": 85 },
      { "name": "Functions", "progress": 45 }
    ]
  }
}
```

### Leaderboard

**Endpoint**: `GET /api/leaderboards`  
**Auth**: Not required  
**Query Parameters**:
- `type` - "global", "university", "department", or "course"
- `limit` - Number of top students to return (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firstName": "John",
      "lastName": "Student",
      "email": "student@unizik.edu.ng",
      "totalScore": 4250,
      "examsTaken": 50,
      "averageScore": 85,
      "totalTimeSpent": 18000
    },
    {
      "rank": 2,
      "userId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "firstName": "Jane",
      "lastName": "Scholar",
      "email": "jane@unizik.edu.ng",
      "totalScore": 4100,
      "examsTaken": 48,
      "averageScore": 85.4,
      "totalTimeSpent": 17200
    }
  ]
}
```

---

## Search & Filter

### Global Search

**Endpoint**: `GET /api/search/global`  
**Auth**: Required  
**Query Parameters**:
- `q` - Search query (required)
- `limit` - Results per page (default: 20)
- `skip` - Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "type": "question",
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "text": "What is Python?",
      "courseId": "...",
      "topicId": "..."
    },
    {
      "type": "topic",
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Programming Basics"
    },
    {
      "type": "course",
      "id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "title": "Introduction to Programming"
    }
  ]
}
```

### Search Questions Only

**Endpoint**: `GET /api/search/questions`  
**Auth**: Required  
**Query Parameters**:
- `q` - Search query (required)
- `difficulty` - Filter by difficulty
- `topicId` - Filter by topic

### Advanced Filter

**Endpoint**: `GET /api/search/advanced`  
**Auth**: Required  

**Query Parameters**:
```
/api/search/advanced?
  difficulty=medium&
  topicId=65a1b2c3d4e5f6g7h8i9j0k1&
  courseId=65a1b2c3d4e5f6g7h8i9j0k2&
  accessLevel=free&
  status=approved
```

### Search Topics

**Endpoint**: `GET /api/search/topics`  
**Auth**: Required  
**Query Parameters**:
- `q` - Search query
- `courseId` - Filter by course

---

## API Endpoints Reference

### Authentication Routes
```
POST   /api/auth/register         - Register new user
POST   /api/auth/login            - Login user
```

### User Routes
```
GET    /api/users/profile         - Get user profile
PUT    /api/users/:userId         - Update user profile
GET    /api/users/:userId         - Get specific user
```

### Universities & Academics
```
GET    /api/universities          - List all universities
GET    /api/universities/:id      - Get university details
GET    /api/universities/:id/faculties - Get faculties

GET    /api/departments           - List all departments
GET    /api/faculties/:id/departments - Get faculties by department

GET    /api/courses               - List courses
GET    /api/courses/:id           - Get course details
GET    /api/courses/:id/topics    - Get course topics
```

### Questions
```
GET    /api/questions             - List questions
GET    /api/questions/:topicId    - Get questions by topic
GET    /api/questions/stats/:topicId - Get question statistics
```

### Exam/Quiz
```
POST   /api/exams/start           - Start new exam
POST   /api/exams/:id/answer      - Submit answer
GET    /api/exams/:id/summary     - Get exam summary
POST   /api/exams/:id/submit      - Submit and grade exam
GET    /api/exams/:id/results     - Get detailed results
```

### Analytics
```
GET    /api/analytics/dashboard   - Dashboard overview
GET    /api/analytics/topic/:id   - Topic-specific analytics
GET    /api/analytics/course/:id  - Course-specific analytics
GET    /api/analytics/trends      - Performance trends
```

### Leaderboard
```
GET    /api/leaderboards          - Global leaderboard
```

### Search
```
GET    /api/search/global         - Global search
GET    /api/search/questions      - Search questions
GET    /api/search/topics         - Search topics
GET    /api/search/advanced       - Advanced filter
```

### Health
```
GET    /api/health                - Server health check
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Invalid email or password",
    "timestamp": "2026-02-05T18:30:00Z",
    "requestId": "abc-123-def-456"
  }
}
```

### Common Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**Invalid Credentials**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password"
}
```

**Invalid Token**
```json
{
  "statusCode": 401,
  "message": "Invalid token"
}
```

**User Not Found**
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

**Insufficient Permissions**
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this resource"
}
```

---

## Database Seeded Data

### Universities
- **Nnamdi Azikiwe University** (UNIZIK)
  - Code: unizik
  - State: Anambra

### Faculties
- **School of Computing and Technology**
  - Faculty code: sct

### Departments
- **Computer Science**
  - Department code: csc

### Courses (under Computer Science)
1. **CSC101** - Introduction to Programming (Level 100)
2. **CSC201** - Data Structures (Level 200)

### Topics
1. Variables and Data Types (CSC101)
2. Loops and Conditionals (CSC101)
3. Arrays and Lists (CSC201)

### Test Users
```
Student Account:
  Email: student@unizik.edu.ng
  Password: Student@123
  Role: student
  Plan: free

Admin Account:
  Email: admin@unizik.edu.ng
  Password: Admin@123
  Role: admin
  Plan: premium
```

---

## Troubleshooting

### Server Won't Start

**Problem**: Server exits immediately after starting  
**Solution**: Check MongoDB connection string in `.env`

```bash
# Verify connection
ping -c 1 ac-iprzxua-shard-00-00.5jzq64q.mongodb.net
```

### Login Fails

**Problem**: "Invalid email or password" error  
**Solution**: 
1. Verify seeded data: `npm run seed`
2. Check database has users with password field
3. Use correct credentials: student@unizik.edu.ng / Student@123

### Routes Return 404

**Problem**: `/api/courses`, `/api/questions` return 404  
**Solution**: Ensure app.js has direct routes mounted (not just nested)

### Token Errors

**Problem**: "Invalid token" error on protected routes  
**Solutions**:
1. Include Authorization header: `Authorization: Bearer TOKEN`
2. Token may have expired (JWT tokens are valid for 24 hours)
3. Re-login to get new token

### No Questions Found

**Problem**: Starting exam returns "No questions available"  
**Solution**:
1. Run `npm run seed` to populate questions
2. Verify questions are approved in database
3. Check user tier has access to questions

### Database Connection Issues

**Problem**: MongoDB connection timeout  
**Solution**:
1. Check IP whitelist in MongoDB Atlas
2. Verify MONGO_URI in .env file
3. Check internet connection
4. Verify credentials in MONGO_URI

---

## Best Practices

### For Developers

1. **Always include Auth token** for protected endpoints
2. **Validate input** before sending to API
3. **Handle errors gracefully** with try-catch blocks
4. **Cache user data** to reduce API calls
5. **Use pagination** for large datasets

### For Students (Using the App)

1. **Start with Free Plan** to try out features
2. **Practice with Practice Exams** before mock exams
3. **Review weak topics** based on analytics
4. **Track progress** through leaderboard
5. **Manage time** - note average time per question

### Security Considerations

1. **Never expose JWT tokens** in URLs or logs
2. **Passwords** are hashed with bcryptjs (never stored in plain text)
3. **All passwords** must be at least 8 characters
4. **Tokens expire** after 24 hours - require re-login
5. **Use HTTPS** in production

---

## Example Workflows

### Workflow 1: Taking a Practice Quiz

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@unizik.edu.ng","password":"Student@123"}'

# Save the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Get courses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/courses

# 3. Start exam (10 questions, 30 minutes)
curl -X POST http://localhost:3000/api/exams/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examType":"practice",
    "courseId":"COURSE_ID_HERE",
    "totalQuestions":10,
    "durationMinutes":30
  }'

# Save examSessionId from response
EXAM_ID="65a1b2c3d4e5f6g7h8i9j0k1"

# 4. Submit answers one by one
curl -X POST http://localhost:3000/api/exams/$EXAM_ID/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId":"QUESTION_ID",
    "selectedAnswer":"B",
    "timeSpentSeconds":30
  }'

# 5. Submit exam
curl -X POST http://localhost:3000/api/exams/$EXAM_ID/submit \
  -H "Authorization: Bearer $TOKEN"

# 6. Get results
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/exams/$EXAM_ID/results
```

### Workflow 2: Checking Performance Analytics

```bash
# 1. Login (as above)

# 2. Get dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/analytics/dashboard

# 3. Get topic-specific analytics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/analytics/topic/TOPIC_ID

# 4. Check leaderboard
curl http://localhost:3000/api/leaderboards?limit=10
```

### Workflow 3: Searching for Questions

```bash
# 1. Global search
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/search/global?q=loops"

# 2. Search specific questions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/search/questions?q=programming"

# 3. Advanced filter
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/search/advanced?difficulty=medium&topicId=TOPIC_ID"
```

---

## Contact & Support

For issues or questions:
- Check server logs: `npm run dev` (watch mode)
- Review MongoDB Atlas logs
- Verify all environment variables in `.env`
- Check network connectivity

---

**Last Updated**: February 5, 2026  
**Documentation Version**: 1.0.0  
**API Version**: 1.0.0
