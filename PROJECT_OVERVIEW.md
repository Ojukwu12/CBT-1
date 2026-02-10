# Project Overview

## What This Project Is

A production-ready Node.js/Express backend for a university CBT platform. It supports:
- University, faculty, department, course, and topic management
- Authentication (JWT + refresh token)
- Exams with resume, auto-submit on expiry, and delayed results
- Payments (Paystack)
- Analytics, leaderboard, and study plans
- AI-assisted question generation from course materials

The system is designed with a service layer, Joi validation, and a global error handler so controllers remain thin and consistent.

## High-Level Architecture

- Routes validate input with Joi.
- Controllers call services only (no try/catch).
- Services implement business logic and database operations.
- Errors flow into the global error middleware.

Core areas:
- Materials: upload, extract, detect question banks, AI generation
- Questions: approval workflow, access levels, search, stats
- Exams: timed sessions, delayed results, analytics update
- Payments: plan upgrade and ownership checks

## Materials, Extraction, and AI

### Upload and Storage

Materials are stored in MongoDB with metadata and extracted text. Files are stored via:
- Local storage at `/uploads` (dev)
- S3 (prod) when `STORAGE_PROVIDER=s3`

### Extraction

- PDF: `pdf-parse`
- Image OCR: `tesseract.js`
- Text: raw content

### Question Bank Detection

A regex-based detector parses question banks formatted as:
- Question lines (Q1, Question 1, or numeric prefixes)
- Options labeled A-D
- Optional `Answer: X`

If answers are missing, the API returns the extracted questions so an admin can fill them and re-import.

### AI Generation

If the material is not a question bank, AI generates exactly 10 questions. Provider selection:
- Primary: Gemini
- Fallback: OpenAI

Both providers enforce strict JSON output and per-question validation.

## Question Workflow

- Manual admin questions: auto-approved.
- Extracted or AI questions: created as `pending`.
- Rejected questions: deleted immediately.
- Approved questions: visible in exams and student flows.

## Exams

- Start exam, answer questions, submit, and get results.
- If time expires, exam auto-submits on summary or answer path.
- Results can be delayed using `EXAM_RESULT_DELAY_MINUTES`.

## Payments

- Paystack integration supports init, verify, and webhooks.
- Plan upgrades update user tier and expiration.

## Key Endpoints

See [docs/api documentation.md](docs/api%20documentation.md) for the full list.

## Environment Variables

New variables added for AI providers and storage:
- `GEMINI_MODEL`, `GEMINI_API_VERSION`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `AI_PROVIDER`, `AI_FALLBACK_PROVIDER`
- `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## Where Work Stopped

- Material ingestion tests completed for text and image OCR.
- AI generation for non-question-bank materials completed (10 questions generated, pending approval).
- Question bank extraction completed for text with missing answers handled via import.
- PDF extraction test failed due to an invalid test PDF. A real PDF file is needed to validate the PDF extraction pipeline.

## Next Steps

1) Provide a real PDF for extraction testing.
2) Confirm storage provider (local vs S3) for production.
3) Optional: switch question-bank detection to AI-based logic when ready.
