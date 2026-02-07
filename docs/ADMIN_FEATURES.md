# Admin Features Documentation

## Overview

The University CBT Backend now includes comprehensive admin features for managing users, sending notifications, and analyzing system performance. All admin features require admin role authentication.

---

## 1. User Management API

### Base Endpoint
```
GET/POST /api/admin/users
```

### Authentication
All endpoints require:
- Valid JWT token in `Authorization: Bearer {token}` header
- User must have `role: 'admin'`

---

## 1.1 Get All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Items per page (max: 100)
- `plan` (optional) - Filter by plan: `free`, `basic`, or `premium`
- `role` (optional) - Filter by role: `student` or `admin`
- `isActive` (optional) - Filter by active status: `true` or `false`
- `search` (optional) - Search by email or name
- `universityId` (optional) - Filter by university

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=20&plan=free" \
  -H "Authorization: Bearer {adminToken}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user_id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "plan": "free",
        "role": "student",
        "isActive": true,
        "createdAt": "2026-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  },
  "message": "Users retrieved successfully"
}
```

---

## 1.2 Get Single User

**Endpoint:** `GET /api/admin/users/{userId}`

**Parameters:**
- `userId` (required) - MongoDB ObjectId of the user

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer {adminToken}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "premium",
    "role": "student",
    "isActive": true,
    "planExpiresAt": "2026-03-15T00:00:00Z",
    "stats": {
      "questionsAttempted": 45,
      "questionsCorrect": 38,
      "accuracy": 84.4,
      "topicsStudied": 12
    }
  },
  "message": "User retrieved successfully"
}
```

---

## 1.3 Ban User

**Endpoint:** `POST /api/admin/users/{userId}/ban`

**Request Body:**
```json
{
  "reason": "String (required) - Reason for ban (5-500 characters)",
  "duration": "String (optional) - '7days', '30days', '90days', or 'permanent'"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/ban" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of terms of service - inappropriate content",
    "duration": "7days"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "isActive": false,
    "banReason": "Violation of terms of service - inappropriate content",
    "bannedAt": "2026-02-07T14:30:00Z",
    "banDuration": "7days",
    "unbanDate": "2026-02-14T14:30:00Z"
  },
  "message": "User banned successfully"
}
```

**Side Effects:**
- User receives ban notification email
- Admin receives alert email
- User cannot login or access any features

---

## 1.4 Unban User

**Endpoint:** `POST /api/admin/users/{userId}/unban`

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/unban" \
  -H "Authorization: Bearer {adminToken}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "isActive": true,
    "banReason": null,
    "bannedAt": null,
    "unbanDate": null
  },
  "message": "User unbanned successfully"
}
```

**Side Effects:**
- User receives account reactivation email
- User can login and use account again

---

## 1.5 Change User Role

**Endpoint:** `POST /api/admin/users/{userId}/role`

**Request Body:**
```json
{
  "newRole": "String (required) - 'student' or 'admin'"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/role" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "newRole": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "admin"
  },
  "message": "User role changed to admin successfully"
}
```

**Side Effects:**
- User receives role change notification email
- User gains/loses admin privileges immediately

---

## 1.6 Downgrade User Plan

**Endpoint:** `POST /api/admin/users/{userId}/downgrade-plan`

**Request Body:**
```json
{
  "reason": "String (optional, default: 'Policy violation')"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/downgrade-plan" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "User requested downgrade"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "plan": "free",
    "planExpiresAt": null
  },
  "message": "User plan downgraded to free successfully"
}
```

**Side Effects:**
- User receives plan downgrade notification email
- User loses access to premium/basic features
- User's subscription expiry date is cleared

---

## 1.7 Send Notification to User

**Endpoint:** `POST /api/admin/users/{userId}/send-notification`

**Request Body:**
```json
{
  "subject": "String (required, 5-100 characters)",
  "message": "String (required, 10-1000 characters)"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/send-notification" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Important Update",
    "message": "Your account has been flagged for review. Please update your profile information."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": true
  },
  "message": "Notification sent successfully"
}
```

**Side Effects:**
- User receives custom notification email with admin message

---

## 2. Admin Notifications API

### Base Endpoint
```
POST /api/admin/analytics/notifications
```

---

## 2.1 Send Announcement

**Endpoint:** `POST /api/admin/analytics/notifications/announcement`

**Description:** Send announcement to all active users

**Request Body:**
```json
{
  "title": "String (required, 5-100 characters)",
  "content": "String (required, 10-2000 characters)"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/announcement" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Features Released",
    "content": "We are excited to announce new AI-powered study features. Check your dashboard to get started!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipientCount": 1250,
    "messageId": "email_msg_id_123",
    "timestamp": "2026-02-07T14:30:00Z"
  },
  "message": "Announcement sent successfully"
}
```

**Side Effects:**
- All active users receive announcement email
- Email sent via Brevo API

---

## 2.2 Send Maintenance Notification

**Endpoint:** `POST /api/admin/analytics/notifications/maintenance`

**Description:** Notify all users about scheduled maintenance

**Request Body:**
```json
{
  "title": "String (required, 5-100 characters)",
  "startTime": "ISO 8601 DateTime (required)",
  "endTime": "ISO 8601 DateTime (required)",
  "impact": "String (optional, max 500 characters)"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/maintenance" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Maintenance",
    "startTime": "2026-02-08T02:00:00Z",
    "endTime": "2026-02-08T04:00:00Z",
    "impact": "All services will be offline for database migration"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipientCount": 1250,
    "messageId": "email_msg_id_456",
    "timestamp": "2026-02-07T14:30:00Z"
  },
  "message": "Maintenance notification sent successfully"
}
```

---

## 2.3 Send Plan Expiry Reminder

**Endpoint:** `POST /api/admin/analytics/notifications/plan-expiry-reminder`

**Description:** Send expiry reminders to users with expiring plans

**Request Body:**
```json
{
  "daysUntilExpiry": "Number (optional, default: 7)"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/plan-expiry-reminder" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "daysUntilExpiry": 7
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipientCount": 87,
    "messageId": "email_msg_id_789",
    "timestamp": "2026-02-07T14:30:00Z"
  },
  "message": "Plan expiry reminder sent successfully"
}
```

**Side Effects:**
- Only users with plans expiring within specified days receive email
- Email includes renewal link

---

## 2.4 Send Bulk Email

**Endpoint:** `POST /api/admin/analytics/notifications/send-bulk`

**Description:** Send custom email to user segments

**Request Body:**
```json
{
  "subject": "String (required, 5-200 characters)",
  "template": "String (required) - Email template name",
  "variables": "Object (optional) - Template variables",
  "filters": "Object (optional) - User filtering criteria"
}
```

**Supported Filters:**
```json
{
  "plan": "free|basic|premium (optional)",
  "role": "student|admin (optional)",
  "universityId": "String (optional)",
  "isActive": "Boolean (optional)"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/send-bulk" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "50% Off Premium Plan - Limited Time",
    "template": "announcement",
    "variables": {
      "content": "Get 50% off on all premium plans this month only!"
    },
    "filters": {
      "plan": "free",
      "isActive": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipientCount": 523,
    "messageId": "email_msg_id_012",
    "timestamp": "2026-02-07T14:30:00Z"
  },
  "message": "Bulk email sent successfully"
}
```

---

## 3. Email Templates

### Available Templates

1. **announcement** - General announcements
2. **maintenance-notification** - System maintenance alerts
3. **plan-expiry-reminder-admin** - Plan expiry reminders
4. **admin-custom-notification** - Custom admin notifications
5. **user-ban-notification** - User account suspension
6. **account-reactivated** - User account reactivation
7. **role-upgraded-to-admin** - User role upgrade to admin
8. **role-changed-to-student** - User role change to student
9. **plan-downgrade-admin** - Plan downgrade notification
10. **admin-notification** - Generic admin alert
11. **admin-alert** - System alert to admin

### Template Variables

Each template can include custom variables using `{{variableName}}` syntax:

```
Subject: {{title}}
Message: {{content}}
Timestamp: {{timestamp}}
```

---

## 4. Error Handling

All admin endpoints follow standard error responses:

### 403 Forbidden (Not Admin)
```json
{
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Required field missing or invalid"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to send email"
}
```

---

## 5. Rate Limiting

Admin endpoints have standard rate limits applied:
- General rate limit: 100 requests per 15 minutes per IP
- Auth rate limit: 5 requests per 15 minutes per IP
- AI rate limit: 50 requests per day per university

---

## 6. Audit Trail

All admin actions are logged with:
- Admin user ID
- Action performed
- Affected user(s)
- Timestamp
- IP address (via requestId middleware)

Access logs in: `logs/admin-actions.log` (if logging is configured)

---

## 7. Security Best Practices

1. **Admin Role Verification**
   - Always verify admin role in middleware
   - Check `req.user.role === 'admin'`

2. **Input Validation**
   - All inputs validated with Joi schemas
   - Range limits enforced (email length, message length)

3. **Email Verification**
   - Bulk emails sent via Brevo API
   - Failed emails logged for retry

4. **Activity Logging**
   - All admin actions logged
   - User notifications logged

5. **Rate Limiting**
   - Bulk email limited to prevent abuse
   - Query pagination limits enforced

---

## 8. Testing

Run the admin features test suite:

```bash
npm run test-admin-features
```

This runs 12 comprehensive tests covering:
- User management (get, ban, unban, role changes)
- Plan downgrades
- User notifications
- Bulk email (announcements, maintenance, reminders)

---

## 9. Tier-Based Access Control Summary

### User Model Fields
- `plan`: free, basic, or premium
- `planExpiresAt`: Subscription expiry date
- `role`: student or admin

### Question Access Levels
- **Free tier**: Access only `accessLevel: 'free'` questions
- **Basic tier**: Access `free` and `basic` questions
- **Premium tier**: Access all questions (free, basic, premium)

### Feature Access
Premium features:
- Advanced AI-powered study materials
- Unlimited question generation
- Priority support
- Detailed performance analytics

### Plan Enforcement
- Expired plans auto-downgrade to free
- Feature access checked on every request
- Clear error messages for tier limits

---

## 10. Support

For issues or questions:
- Email: support@universitycbt.com
- Admin documentation: `/docs/admin-features.md`
- API reference: `/docs/api.md`
