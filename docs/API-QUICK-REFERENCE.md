# Phase 0 Critical Features - API Quick Reference

## 🔐 Authentication Required
All endpoints below require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

---

## 📝 EXAM ENDPOINTS

### 1. Start Exam
```
POST /api/exams/start
Content-Type: application/json

{
  "examType": "practice",        // practice|mock|final (default: practice)
  "courseId": "64a3f...",        // Optional
  "topicIds": ["64b5f...", ...], // Optional array of topic IDs
  "totalQuestions": 10,          // Default: 10, Max: 100
  "durationMinutes": 60          // Default: 60, Min: 5, Max: 300
}

Response: {
  "examSessionId": "64c7f...",
  "examType": "practice",
  "totalQuestions": 10,
  "durationMinutes": 60,
  "startedAt": "2024-02-03T10:00:00Z",
  "questions": [
    {
      "questionId": "64d9f...",
      "text": "Question text here...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "difficulty": "medium"
    }
    // ... more questions
  ]
}
```

### 2. Submit Answer
```
POST /api/exams/:examSessionId/answer
Content-Type: application/json

{
  "questionId": "64d9f...",
  "selectedAnswer": "B",                // A|B|C|D
  "timeSpentSeconds": 45                // Optional, default: 0
}

Response: {
  "questionId": "64d9f...",
  "isCorrect": true,
  "feedback": "Correct!",
  "answeredQuestions": 5,
  "correctAnswers": 4
}
```

### 3. Get Exam Progress
```
GET /api/exams/:examSessionId/summary

Response: {
  "examSessionId": "64c7f...",
  "status": "in_progress",
  "totalQuestions": 10,
  "answeredQuestions": 5,
  "correctAnswers": 4,
  "remainingTimeSeconds": 2100,
  "isExpired": false,
  "startedAt": "2024-02-03T10:00:00Z"
}
```

### 4. Submit & Grade Exam
```
POST /api/exams/:examSessionId/submit

Response: {
  "examSessionId": "64c7f...",
  "score": 80,
  "percentage": 80,
  "isPassed": true,
  "summary": {
    "totalQuestions": 10,
    "answeredQuestions": 10,
    "correctAnswers": 8,
    "score": 80,
    "percentage": 80,
    "isPassed": true,
    "timeSpent": "15:30",
    "submittedAt": "2024-02-03T10:30:00Z"
  }
}
```

### 5. Get Detailed Results
```
GET /api/exams/:examSessionId/results

Response: {
  "examSessionId": "64c7f...",
  "examType": "practice",
  "score": 80,
  "percentage": 80,
  "isPassed": true,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "accuracy": "80%",
  "timeSpent": "15:30",
  "startedAt": "2024-02-03T10:00:00Z",
  "submittedAt": "2024-02-03T10:30:00Z",
  "questions": [
    {
      "questionId": "64d9f...",
      "text": "Question text...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "difficulty": "medium",
      "selectedAnswer": "B",
      "correctAnswer": "B",
      "isCorrect": true,
      "timeSpentSeconds": 45,
      "feedbackColor": "green"
    }
    // ... more questions with feedback
  ]
}
```

### 6. Get Exam History
```
GET /api/exams/history?page=1&limit=10

Response: {
  "examHistory": [
    {
      "_id": "64c7f...",
      "examType": "practice",
      "score": 85,
      "percentage": 85,
      "isPassed": true,
      "startedAt": "2024-02-03T10:00:00Z",
      "submittedAt": "2024-02-03T10:30:00Z",
      "totalQuestions": 10,
      "correctAnswers": 8,
      "courseId": "64b3f..."
    }
    // ... more exams
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### 7. Resume Active Exam
```
GET /api/exams/active

Response (if exam in progress): {
  "examSessionId": "64c7f...",
  "examType": "practice",
  "totalQuestions": 10,
  "answeredQuestions": 5,
  "remainingTimeSeconds": 2100,
  "startedAt": "2024-02-03T10:00:00Z"
}

Response (if no active exam): 404 No active exam
```

### 8. Abandon Exam
```
POST /api/exams/:examSessionId/abandon

Response: {
  "message": "Exam abandoned successfully"
}
```

---

## 📊 ANALYTICS ENDPOINTS

### 1. Dashboard
```
GET /api/analytics/dashboard

Response: {
  "totalExams": 15,
  "totalQuestions": 150,
  "correctAnswers": 120,
  "averageScore": 80,
  "accuracyRate": 80,
  "averageTimePerQuestion": 45,
  "strongTopics": [
    {
      "topicId": "64e1f...",
      "topicName": "Algebra",
      "accuracyRate": 95,
      "questionsAttempted": 20,
      "lastAttemptedAt": "2024-02-03T10:00:00Z"
    }
    // ... up to 5 topics
  ],
  "weakTopics": [
    {
      "topicId": "64e2f...",
      "topicName": "Geometry",
      "accuracyRate": 60,
      "questionsAttempted": 15,
      "lastAttemptedAt": "2024-02-02T15:00:00Z"
    }
    // ... up to 5 topics
  ],
  "currentStreak": 5,
  "longestStreak": 12,
  "recentPerformance": [/* last 7 days data */]
}
```

### 2. Topic Analytics
```
GET /api/analytics/topic/:topicId

Response: {
  "topicId": "64e1f...",
  "topicName": "Algebra",
  "questionsAttempted": 20,
  "correctAnswers": 18,
  "incorrectAnswers": 2,
  "accuracyRate": 90,
  "averageTime": 45,
  "difficulty": "medium",
  "lastAttemptedAt": "2024-02-03T10:00:00Z"
}
```

### 3. Course Analytics
```
GET /api/analytics/course/:courseId

Response: {
  "courseId": "64b3f...",
  "courseName": "Mathematics 101",
  "examsTaken": 5,
  "averageScore": 82,
  "totalQuestions": 50,
  "correctAnswers": 41,
  "completionPercentage": 75,
  "lastAttemptedAt": "2024-02-03T10:00:00Z"
}
```

### 4. Performance Trends
```
GET /api/analytics/trends?days=30

Response: {
  "period": "Last 30 days",
  "trends": [
    {
      "date": "2024-02-03",
      "examsTaken": 2,
      "totalQuestions": 20,
      "correctAnswers": 18,
      "averageScore": 90
    }
    // ... more days
  ],
  "summary": {
    "totalExams": 45,
    "totalQuestions": 450,
    "totalCorrect": 360,
    "overallAccuracy": 80,
    "averageScore": 82
  }
}
```

### 5. Weak Areas
```
GET /api/analytics/weak-areas

Response: {
  "weakTopics": [
    {
      "topicId": "64e2f...",
      "topicName": "Geometry",
      "accuracyRate": 60,
      "questionsAttempted": 15
    }
    // ... up to 5 topics
  ],
  "difficultyAnalysis": {
    "easy": { "attempted": 50, "correct": 48, "accuracy": 96 },
    "medium": { "attempted": 40, "correct": 30, "accuracy": 75 },
    "hard": { "attempted": 20, "correct": 10, "accuracy": 50 }
  },
  "recommendation": "Focus on improving: Geometry, Trigonometry"
}
```

### 6. Strong Areas
```
GET /api/analytics/strong-areas

Response: {
  "strongTopics": [
    {
      "topicId": "64e1f...",
      "topicName": "Algebra",
      "accuracyRate": 95,
      "questionsAttempted": 20
    }
    // ... up to 5 topics
  ],
  "message": "You're doing great in: Algebra, Calculus"
}
```

### 7. Recommendations
```
GET /api/analytics/recommendations

Response: {
  "recommendations": [
    {
      "type": "critical",
      "message": "Your accuracy is below 60%. Review weak topics more carefully",
      "priority": "critical"
    },
    {
      "type": "weak_areas",
      "message": "Practice more on: Geometry, Trigonometry",
      "priority": "high"
    }
    // ... more recommendations
  ],
  "overallAdvice": "You have potential. Focus on fundamentals and weak areas."
}
```

### 8. Monthly Stats
```
GET /api/analytics/monthly?month=2024-02

Response: {
  "month": "2024-02",
  "examsTaken": 10,
  "totalQuestions": 100,
  "correctAnswers": 85,
  "averageScore": 85
}
```

### 9. Leaderboard Position
```
GET /api/analytics/leaderboard/position

Response: {
  "userId": "64a1f...",
  "rank": 42,
  "score": 82,
  "percentile": 85,
  "totalUsers": 500,
  "message": "You're in the top 85%"
}
```

---

## ❓ QUESTIONS ENDPOINT

### Get Random Questions
```
GET /api/questions/random/:topicId?count=10&difficulty=medium

Response: [
  {
    "_id": "64d9f...",
    "text": "Question text...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "difficulty": "medium"
    // Note: correctAnswer NOT included for students
  }
  // ... more questions
]
```

---

## Error Responses

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": "Validation error",
  "details": ["Selected answer must be A, B, C, or D"],
  "success": false
}
```

### Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Exam session not found",
  "success": false
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "success": false
}
```

### Forbidden (403)
```json
{
  "statusCode": 403,
  "message": "You do not have permission to view this exam",
  "success": false
}
```

---

## Testing with cURL

### Start an exam
```bash
curl -X POST http://localhost:3000/api/exams/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examType": "practice",
    "totalQuestions": 10,
    "durationMinutes": 60
  }'
```

### Submit an answer
```bash
curl -X POST http://localhost:3000/api/exams/64c7f.../answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "64d9f...",
    "selectedAnswer": "B",
    "timeSpentSeconds": 45
  }'
```

### Get dashboard
```bash
curl -X GET http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Implementation Status

✅ All 4 critical features implemented and integrated  
✅ 17 total endpoints (8 exam + 9 analytics)  
✅ Full Joi validation on all inputs  
✅ Proper error handling with details  
✅ MongoDB models with indexes  
✅ Service layer architecture  
✅ Authorization checks  
✅ Tier-based access control  

**Ready for testing with MongoDB connection!**
