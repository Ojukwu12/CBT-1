# Quick API Reference - Admin Features

## Quick Start

All admin endpoints require:
```
Authorization: Bearer {adminToken}
Content-Type: application/json
```

---

## User Management

### List Users
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

### Get User
```bash
curl -X GET "http://localhost:3000/api/admin/users/{userId}" \
  -H "Authorization: Bearer {token}"
```

### Ban User
```bash
curl -X POST "http://localhost:3000/api/admin/users/{userId}/ban" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of terms",
    "duration": "7days"
  }'
```

### Unban User
```bash
curl -X POST "http://localhost:3000/api/admin/users/{userId}/unban" \
  -H "Authorization: Bearer {token}"
```

### Change Role
```bash
curl -X POST "http://localhost:3000/api/admin/users/{userId}/role" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "newRole": "admin"
  }'
```

### Downgrade Plan
```bash
curl -X POST "http://localhost:3000/api/admin/users/{userId}/downgrade-plan" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Admin decision"
  }'
```

### Send Notification
```bash
curl -X POST "http://localhost:3000/api/admin/users/{userId}/send-notification" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Important Update",
    "message": "Your account..."
  }'
```

---

## Bulk Notifications

### Send Announcement
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/announcement" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Features",
    "content": "We released amazing features today!"
  }'
```

### Send Maintenance Alert
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/maintenance" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Maintenance",
    "startTime": "2026-02-08T02:00:00Z",
    "endTime": "2026-02-08T04:00:00Z",
    "impact": "All services offline"
  }'
```

### Send Plan Expiry Reminder
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/plan-expiry-reminder" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "daysUntilExpiry": 7
  }'
```

### Send Bulk Email
```bash
curl -X POST "http://localhost:3000/api/admin/analytics/notifications/send-bulk" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Special Offer",
    "template": "announcement",
    "filters": {
      "plan": "free"
    },
    "variables": {
      "content": "50% off premium plans!"
    }
  }'
```

---

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {...}
  },
  "message": "Users retrieved successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Admin access required",
  "statusCode": 403
}
```

---

## Query Filters

### List Users Filters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `plan` - free, basic, or premium
- `role` - student or admin
- `isActive` - true or false
- `search` - Search email/name
- `universityId` - Filter by university

---

## Ban Duration Options
- `7days` - 7 day ban
- `30days` - 30 day ban
- `90days` - 90 day ban
- `permanent` - Permanent ban

---

## User Roles
- `student` - Regular user
- `admin` - Administrator

---

## Plan Types
- `free` - Free tier
- `basic` - Basic paid tier
- `premium` - Premium tier

---

## Email Templates
- `announcement` - General announcement
- `maintenance-notification` - Maintenance alert
- `admin-custom-notification` - Custom message
- `plan-expiry-reminder-admin` - Expiry reminder

---

## Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 403 | Admin access required | Use admin token, verify role is 'admin' |
| 404 | User not found | Check userId is valid MongoDB ObjectId |
| 400 | Invalid input | Check required fields and format |
| 500 | Email sending failed | Verify BREVO_API_KEY is set |

---

## Example JavaScript

```javascript
const axios = require('axios');

const adminToken = 'your_admin_token';

// Ban user
async function banUser(userId) {
  const response = await axios.post(
    `http://localhost:3000/api/admin/users/${userId}/ban`,
    {
      reason: 'Violation of terms',
      duration: '7days'
    },
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  return response.data;
}

// Send announcement
async function sendAnnouncement(title, content) {
  const response = await axios.post(
    'http://localhost:3000/api/admin/analytics/notifications/announcement',
    { title, content },
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  return response.data;
}
```

---

## Test Script

Run the complete test suite:
```bash
npm run test-admin-features
```

This will test all 12 admin features and show results.

---

## Troubleshooting

### "Admin access required"
- Verify token is valid
- Check user has `role: 'admin'`
- Verify Authorization header format: `Bearer {token}`

### "User not found"
- Verify userId is a valid MongoDB ObjectId
- Check user exists in database

### "Email sending failed"
- Verify `BREVO_API_KEY` is set in `.env`
- Check email format is valid
- Verify recipient exists

### Token expired
- Get new token by logging in again
- Token typically valid for 24 hours

---

## Rate Limits

All endpoints subject to:
- 100 requests per 15 minutes per IP (general)
- 5 requests per 15 minutes per IP (auth endpoints)
- No specific limit for admin endpoints (use responsibly)

---

For complete documentation, see [ADMIN_FEATURES.md](./ADMIN_FEATURES.md)
