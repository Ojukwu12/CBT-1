# API Documentation

All endpoints use JSON unless specified. Most routes require `Authorization: Bearer <token>`.

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`
- `POST /api/auth/verify-email`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

## Exams

- `POST /api/exams/start`
- `POST /api/exams/:examSessionId/answer`
- `GET /api/exams/:examSessionId/summary`
- `POST /api/exams/:examSessionId/submit`
- `GET /api/exams/:examSessionId/results`
- `GET /api/exams/history`
- `GET /api/exams/active`
- `POST /api/exams/:examSessionId/abandon`

Notes:
- Results can be delayed via `EXAM_RESULT_DELAY_MINUTES`.
- Expired sessions auto-submit on summary/answer paths.

## Questions

- `GET /api/questions`
- `GET /api/questions/random/:topicId`
- `GET /api/questions/:topicId`
- `GET /api/questions/stats/:topicId`
- `GET /api/questions/pending/:universityId` (admin)
- `POST /api/questions` (admin)
- `POST /api/questions/approve/:questionId` (admin)
- `POST /api/questions/reject/:questionId` (admin, deletes immediately)
- `DELETE /api/questions/:questionId` (admin)

Notes:
- Manual admin questions are auto-approved.
- AI/extracted questions are created as `pending` and require approval.

## Materials (Upload + Extraction + AI)

### Upload material

`POST /api/courses/:courseId/materials` (admin)

Multipart form fields:
- `file` (pdf, image, text)
- `title`
- `fileType` (pdf|image|text)
- `topicId`

Optional form fields:
- `fileUrl` (if you already stored the file elsewhere)
- `content` (pre-extracted text)

### List materials

- `GET /api/courses/:courseId/materials`
- `GET /api/courses/:courseId/materials/:id`

### Generate questions from material

`POST /api/courses/:courseId/materials/:materialId/generate-questions` (admin)

Body:
```json
{ "difficulty": "mixed" }
```

Behavior:
- If the material looks like a question bank, the system extracts Q/A pairs.
- If answers are missing, the call returns `400` with `extractedQuestions` so an admin can fill them.
- Otherwise, the AI generates 10 questions from the content.

### Import questions after filling missing answers

`POST /api/courses/:courseId/materials/:materialId/import-questions` (admin)

Body:
```json
{
  "questions": [
    {
      "text": "Question text",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "A",
      "difficulty": "easy"
    }
  ]
}
```

## Payments

- `POST /api/payments/init`
- `POST /api/payments/verify`
- `GET /api/payments/transactions`
- `GET /api/payments/transactions/:transactionId`
- `POST /api/payments/webhook` (Paystack)

## Analytics

- `GET /api/analytics/dashboard`
- `GET /api/analytics/topic/:topicId`
- `GET /api/analytics/course/:courseId`
- `GET /api/analytics/trends`
- `GET /api/analytics/weak-areas`
- `GET /api/analytics/strong-areas`
- `GET /api/analytics/recommendations`
- `GET /api/analytics/monthly`
- `GET /api/analytics/leaderboard/position`

## Admin Analytics

- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/users`
- `GET /api/admin/analytics/performance`
- `GET /api/admin/analytics/revenue`
- `GET /api/admin/analytics/questions`
- `GET /api/admin/analytics/exams`

## Universities / Faculties / Departments / Courses / Topics

- `GET /api/universities`
- `POST /api/universities` (admin)
- `GET /api/universities/:universityId/faculties`
- `POST /api/universities/:universityId/faculties` (admin)
- `GET /api/faculties/:facultyId/departments`
- `POST /api/faculties/:facultyId/departments` (admin)
- `GET /api/departments/:departmentId/courses`
- `POST /api/departments/:departmentId/courses` (admin)
- `GET /api/courses/:courseId/topics`
- `POST /api/courses/:courseId/topics` (admin)

## Study Plans

- `GET /api/study-plans`
- `POST /api/study-plans`
- `GET /api/study-plans/:id`
- `PATCH /api/study-plans/:id`
- `DELETE /api/study-plans/:id`

## Leaderboard

- `GET /api/leaderboards`

## Search

- `GET /api/search/questions`

## Health

- `GET /api/health`
