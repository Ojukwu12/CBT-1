# Phase 0 API - Testing Guide

This guide provides curl commands to test all Phase 0 endpoints.

**Base URL:** `http://localhost:3000`

---

## Health Check

Test if the server is running:

```bash
curl -X GET http://localhost:3000/api/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "Server is running",
    "database": "connected",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "message": "Health check successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Universities

### Create University

```bash
curl -X POST http://localhost:3000/api/universities \
  -H "Content-Type: application/json" \
  -d '{
    "code": "UNIZIK",
    "name": "Nnamdi Azikiwe University",
    "abbreviation": "UNIZIK"
  }'
```

**Response (201 Created):** Returns created university with ID

### Get All Universities

```bash
curl -X GET http://localhost:3000/api/universities
```

**Response (200 OK):** Array of universities

### Get University by ID

```bash
curl -X GET http://localhost:3000/api/universities/660f1234567890abcdef1234
```

### Update University

```bash
curl -X PUT http://localhost:3000/api/universities/660f1234567890abcdef1234 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }'
```

---

## Faculties

### Create Faculty

```bash
curl -X POST http://localhost:3000/api/universities/UNIZIK_ID/faculties \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SCI",
    "name": "Faculty of Sciences",
    "description": "Science faculty",
    "universityId": "UNIZIK_ID"
  }'
```

### Get Faculties by University

```bash
curl -X GET "http://localhost:3000/api/universities/UNIZIK_ID/faculties"
```

### Get Faculty by ID

```bash
curl -X GET http://localhost:3000/api/faculties/FACULTY_ID
```

### Update Faculty

```bash
curl -X PUT http://localhost:3000/api/faculties/FACULTY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Faculty Name"
  }'
```

---

## Departments

### Create Department

```bash
curl -X POST http://localhost:3000/api/faculties/FACULTY_ID/departments \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MATH",
    "name": "Mathematics Department",
    "universityId": "UNIZIK_ID",
    "facultyId": "FACULTY_ID"
  }'
```

### Get Departments by Faculty

```bash
curl -X GET "http://localhost:3000/api/faculties/FACULTY_ID/departments"
```

### Get Department by ID

```bash
curl -X GET http://localhost:3000/api/departments/DEPARTMENT_ID
```

---

## Courses

### Create Course

```bash
curl -X POST http://localhost:3000/api/departments/DEPARTMENT_ID/courses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MTH101",
    "title": "Introduction to Mathematics",
    "level": 100,
    "creditUnits": 3,
    "departmentId": "DEPARTMENT_ID"
  }'
```

### Get Courses by Department

```bash
curl -X GET "http://localhost:3000/api/departments/DEPARTMENT_ID/courses"
```

### Get Courses by Level

```bash
curl -X GET "http://localhost:3000/api/courses?level=200"
```

### Get Course by ID

```bash
curl -X GET http://localhost:3000/api/courses/COURSE_ID
```

### Update Course

```bash
curl -X PUT http://localhost:3000/api/courses/COURSE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Course Title"
  }'
```

---

## Topics

### Create Topic

```bash
curl -X POST http://localhost:3000/api/courses/COURSE_ID/topics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Calculus",
    "universityId": "UNIZIK_ID",
    "courseId": "COURSE_ID"
  }'
```

### Get Topics by Course

```bash
curl -X GET "http://localhost:3000/api/courses/COURSE_ID/topics"
```

### Get Topic by ID

```bash
curl -X GET http://localhost:3000/api/topics/TOPIC_ID
```

---

## Questions

### Create Question (Human-created)

```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is the capital of Nigeria?",
    "options": {
      "A": "Lagos",
      "B": "Abuja",
      "C": "Ibadan",
      "D": "Kano"
    },
    "correctAnswer": "B",
    "difficulty": "easy",
    "topicId": "TOPIC_ID",
    "accessLevel": "free",
    "source": "human"
  }'
```

### Get Random Questions by Topic

```bash
curl -X GET "http://localhost:3000/api/questions/random/TOPIC_ID?limit=5"
```

**Note:** Returned questions do NOT include `correctAnswer` (hidden for students)

### Get Pending Questions (Admin)

```bash
curl -X GET "http://localhost:3000/api/questions/pending/UNIZIK_ID"
```

### Approve Question

```bash
curl -X POST http://localhost:3000/api/questions/approve/QUESTION_ID \
  -H "Content-Type: application/json"
```

### Reject Question

```bash
curl -X POST http://localhost:3000/api/questions/reject/QUESTION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Unclear wording"
  }'
```

### Get Question Stats

```bash
curl -X GET http://localhost:3000/api/questions/QUESTION_ID/stats
```

---

## Materials

### Upload Material

```bash
curl -X POST http://localhost:3000/api/courses/COURSE_ID/materials \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chapter 1 - Calculus Basics",
    "fileType": "pdf",
    "fileUrl": "https://example.com/chapter1.pdf",
    "fileSize": 5242880,
    "uploadedBy": "ADMIN_ID",
    "courseId": "COURSE_ID"
  }'
```

### Get Materials by Course

```bash
curl -X GET "http://localhost:3000/api/courses/COURSE_ID/materials"
```

### Generate Questions from Material (Gemini)

```bash
curl -X POST http://localhost:3000/api/materials/MATERIAL_ID/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "medium",
    "count": 5
  }'
```

**Note:** Requires valid Gemini API key in .env

---

## Users

### Create User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@unizik.edu.ng",
    "firstName": "John",
    "lastName": "Doe",
    "universityId": "UNIZIK_ID",
    "plan": "free"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/users/USER_ID
```

### Upgrade Plan

```bash
curl -X POST http://localhost:3000/api/users/USER_ID/upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "newPlan": "premium"
  }'
```

### Downgrade Plan

```bash
curl -X POST http://localhost:3000/api/users/USER_ID/downgrade \
  -H "Content-Type: application/json" \
  -d '{
    "newPlan": "basic"
  }'
```

---

## Error Handling

All errors follow this format:

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "statusCode": 400,
  "data": {
    "details": ["field1 is required", "field2 must be a string"]
  },
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "statusCode": 500,
  "data": null,
  "message": "An error occurred",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Rate Limiting

The API implements rate limiting:

- **General Endpoints:** 100 requests per 15 minutes
- **Auth Endpoints:** 5 requests per 15 minutes
- **AI Endpoints:** 10 requests per hour

When rate limit is exceeded, you'll receive:

**429 Too Many Requests:**
```json
{
  "success": false,
  "statusCode": 429,
  "data": null,
  "message": "Too many requests, please try again later",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Request Headers

All requests should include:

```
Content-Type: application/json
```

All responses include:

```
x-request-id: [UUID]  (for tracking)
```

---

## Testing with Postman

1. Import the API endpoints into Postman
2. Create environment variables:
   - `BASE_URL` = `http://localhost:3000`
   - `UNIVERSITY_ID` = Created university ID
   - `FACULTY_ID` = Created faculty ID
   - `COURSE_ID` = Created course ID
   - `TOPIC_ID` = Created topic ID
   - `QUESTION_ID` = Created question ID
   - `USER_ID` = Created user ID

3. Use variables in requests: `{{BASE_URL}}/api/universities/{{UNIVERSITY_ID}}`

---

## Common Test Scenarios

### Scenario 1: Create University Hierarchy

```bash
# 1. Create University
curl -X POST http://localhost:3000/api/universities \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST", "name": "Test University", "abbreviation": "TEST"}'

# 2. Create Faculty (use UNIVERSITY_ID from response)
curl -X POST http://localhost:3000/api/universities/UNIV_ID/faculties \
  -H "Content-Type: application/json" \
  -d '{"code": "FAC", "name": "Faculty", "universityId": "UNIV_ID"}'

# 3. Create Department (use FACULTY_ID from response)
# ... and so on
```

### Scenario 2: Question Workflow

```bash
# 1. Create Course (prerequisite)
# 2. Create Topic (prerequisite)
# 3. Create Question
# 4. Approve Question
# 5. Get Random Questions (without correctAnswer)
```

### Scenario 3: AI Question Generation

```bash
# 1. Upload Material
# 2. Call generate-questions endpoint
# 3. Get generated questions in pending status
# 4. Approve questions
# 5. Questions available for students
```

---

## Notes

- Replace all `ID` placeholders with actual IDs from previous responses
- All timestamps are in ISO 8601 format
- Student requests don't see `correctAnswer` in questions
- Admin endpoints require authorization (Phase 1)
- Rate limiting uses request IP address
- Request IDs in header allow for debugging

See `PHASE0.md` for complete API documentation.
