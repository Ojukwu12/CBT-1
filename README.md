# Backend - Phase 0 Day 1

Production-ready Node.js backend foundation with Express, MongoDB, and centralized error handling.

## Quick Start

### Prerequisites
- Node.js 14+
- MongoDB running locally or remote connection string

### Installation

```bash
npm install
```

### Environment Setup

Update `.env` file:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/mydb
NODE_ENV=development
EMAIL_REQUEST_COOLDOWN_MINUTES=10
DAILY_WELCOME_EMAIL_LIMIT=10
WELCOME_EMAIL_RANDOM_RATE=0.35
```

### Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "environment": "development"
}
```

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── app.js           # Express app setup
│   ├── server.js        # Entry point
│   ├── routes/          # API routes
│   ├── middleware/      # Global middleware
│   ├── utils/           # Utilities
│   └── modules/         # Feature modules (future)
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Features

✅ Express.js server  
✅ MongoDB with Mongoose  
✅ Global error handling  
✅ Environment validation  
✅ CORS support  
✅ Request logging (Morgan)  
✅ Production-ready structure  

## Notifications System (In-app + Push)

This backend supports dual-channel notifications to reduce email cost:

- **In-app notifications** stored in MongoDB per user
- **Push notifications** delivered through Firebase Cloud Messaging via Firebase Admin SDK

### Required Environment Variables for Push

```env
PUSH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
PUSH_FCM_BATCH_SIZE=500
NOTIFICATIONS_DEFAULT_PAGE_SIZE=20
NOTIFICATIONS_MAX_PAGE_SIZE=100
```

### User Notification API

- `GET /api/notifications?page=1&limit=20&unreadOnly=false&type=general`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:notificationId/read`
- `PATCH /api/notifications/read-all`
- `POST /api/notifications/guest/push-token` (public)
- `DELETE /api/notifications/guest/push-token` (public)
- `POST /api/notifications/push-token`
  - Supports `guestTokenId` to claim previously registered guest token after login
- `DELETE /api/notifications/push-token`

### Admin Notification API

- `POST /api/admin/analytics/notifications/send`
  - Supports channels: `in_app`, `push`
  - Supports filters: `plan`, `role`, `universityId`, `isActive`


## Maintenance Scripts

Bulk verify already-created emails:

```bash
npm run verify:emails:dry
npm run verify:emails
```

Backfill auth-expiry cleanup indexes and remove expired auth artifacts:

```bash
npm run migrate:auth-cleanup:dry
npm run migrate:auth-cleanup
```

Backfill newly added email-throttle fields for existing users:

```bash
npm run migrate:email-throttle:dry
npm run migrate:email-throttle
```

## Error Handling

All errors are handled globally through centralized middleware. Responses follow this format:

```json
{
  "success": false,
  "message": "error message"
}
```
