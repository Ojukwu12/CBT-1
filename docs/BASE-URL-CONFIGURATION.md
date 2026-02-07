# BASE_URL Configuration Guide

## Overview

The `BASE_URL` environment variable is used in email templates to generate production-ready links that point to your API endpoints. This ensures that all email links work correctly whether deployed locally, in development, or in production.

## What Changed

### 1. **Environment Configuration**
**File:** `src/config/env.js`

Added new variable:
```javascript
BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
```

Default: `http://localhost:3000` (localhost development)

### 2. **Email Service Updates**
**File:** `src/services/emailService.js`

All email sending methods now include `baseUrl` in template variables:
- `sendWelcomeEmail()` 
- `sendPlanUpgradeEmail()`
- `sendPlanDowngradeEmail()`
- `sendPaymentReceiptEmail()`
- `sendPaymentFailedEmail()`
- `sendPlanExpiryWarningEmail()`
- `sendPlanExpiredEmail()`
- `sendQuestionApprovedEmail()`
- `sendQuestionRejectedEmail()`
- `sendOTPEmail()`
- `sendResetPasswordEmail()`
- `sendContactFormEmail()`

### 3. **Email Template Links**
**Files:** `src/templates/emails/*.html`

Templates now use API endpoint URLs via `{{baseUrl}}`:

| Email Template | Link Purpose | URL Pattern |
|---|---|---|
| `plan-expiry-warning.html` | Renewal page | `{{baseUrl}}/api/payments/plans` |
| `plan-expired.html` | Renewal page | `{{baseUrl}}/api/payments/plans` |
| `question-rejected.html` | Edit question | `{{baseUrl}}/api/questions/{{id}}` |

Other templates use `{{appUrl}}` for frontend links (already existed).

## Configuration by Environment

### Development (Local)
```dotenv
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

Email links will be:
- `http://localhost:3000/api/payments/plans`
- `http://localhost:3000/api/questions/62d1f8c4b9e2f1a2b3c4d5e6`

### Staging
```dotenv
BASE_URL=https://api-staging.yourdomain.com
FRONTEND_URL=https://staging.yourdomain.com
```

Email links will be:
- `https://api-staging.yourdomain.com/api/payments/plans`
- `https://api-staging.yourdomain.com/api/questions/62d1f8c4b9e2f1a2b3c4d5e6`

### Production
```dotenv
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

Email links will be:
- `https://api.yourdomain.com/api/payments/plans`
- `https://api.yourdomain.com/api/questions/62d1f8c4b9e2f1a2b3c4d5e6`

## Email Template Link Mapping

### Current Links in Templates

**Welcome Email** - Uses `{{appUrl}}`
```html
<a href="{{appUrl}}">Get Started Now</a>
```
Purpose: Frontend homepage link (no change needed)

**Reset Password Email** - Uses `{{resetLink}}`
```html
<a href="{{resetLink}}">Reset Password →</a>
```
Purpose: Password reset token (provided by authController)

**Payment Emails** - Use `{{appUrl}}`
```html
<!-- payment-receipt.html, payment-failed.html -->
<a href="{{appUrl}}">View Dashboard</a>
```
Purpose: Frontend dashboard link

**Plan Expiry Warnings** - Use `{{renewalUrl}}`
```html
<!-- plan-expiry-warning.html, plan-expired.html -->
<a href="{{renewalUrl}}">Renew Now →</a>
```
Purpose: Payment plans endpoint
```javascript
renewalUrl: `${env.BASE_URL}/api/payments/plans`
```

**Question Rejected Email** - Uses `{{resubmitUrl}}`
```html
<a href="{{resubmitUrl}}">Edit & Resubmit →</a>
```
Purpose: Question edit endpoint
```javascript
resubmitUrl: `${env.BASE_URL}/api/questions/${question._id}`
```

## URL Format Best Practices

### For Frontend Links (use APP_URL/FRONTEND_URL)
- Login page
- Dashboard
- Home/Landing page
- User profile

### For API Endpoints (use BASE_URL)
- Payment plans: `/api/payments/plans`
- Questions: `/api/questions/:id`
- Webhooks: `/api/payments/webhook`
- Transactions: `/api/payments/transactions`

### For External Links (don't need BASE_URL)
- Support email: `mailto:support@universitycbt.com`
- Phone call: `tel:+234XXXXXXXXXX`
- Social media: Direct URLs

## Email Link Examples

### Development Email (Payment Receipt)
```
To: user@example.com
Subject: Payment Receipt
Body:
  "Thank you for your payment!
   Your plan is now active.
   Amount: ₦9,999
   Valid Until: 3/7/2026
   ...
   View Dashboard: http://localhost:3000"
```

### Production Email (Plan Expiry Warning)
```
To: user@example.com
Subject: Your Plan Expires Soon!
Body:
  "Your subscription will expire in 7 days (3/14/2026).
   Don't lose access to premium content!
   
   [Renew Now →] https://api.yourdomain.com/api/payments/plans
```

### Production Email (Question Rejected)
```
To: admin@example.com
Subject: Question Rejected
Body:
  "Your question was rejected.
   
   Reason: Grammar and clarity issues
   
   [Edit & Resubmit →] https://api.yourdomain.com/api/questions/62d1f8c4b9e2f1a2b3c4d5e6"
```

## Testing Email Links Locally

### 1. Start server with development config
```bash
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### 2. Trigger email (e.g., payment test)
```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"plan": "premium"}'
```

### 3. Check generated email (dev mode)
```
[DEV MODE] Email sent to user@example.com - Subject: Plan Expires Soon!
Renew URL: http://localhost:3000/api/payments/plans
```

### 4. Verify link works
```
curl http://localhost:3000/api/payments/plans
```
Should return: `200 OK` with plans data

## Production Deployment Checklist

- [ ] Set `BASE_URL` to your API domain in production `.env`
- [ ] Set `FRONTEND_URL` to your frontend domain
- [ ] Ensure API endpoints are accessible from the BASE_URL
- [ ] Test email links in staging before production
- [ ] Enable HTTPS for all BASE_URL endpoints
- [ ] Configure CORS to allow email provider domain (if needed)
- [ ] Monitor email deliverability and link clicks
- [ ] Set up redirects for any changed API endpoints

## Troubleshooting

### Issue: Email links point to localhost in production

**Solution:** Verify `BASE_URL` is set in production `.env`
```bash
echo $BASE_URL  # Should show https://api.yourdomain.com
```

### Issue: Links result in 404 errors

**Solution:** Verify the API endpoints exist
```bash
# Test payment plans endpoint
curl https://api.yourdomain.com/api/payments/plans

# Test questions endpoint
curl https://api.yourdomain.com/api/questions/ID
```

### Issue: Mixed HTTP/HTTPS content warnings

**Solution:** Ensure BASE_URL uses HTTPS in production
```dotenv
# ❌ Wrong
BASE_URL=http://api.yourdomain.com

# ✅ Correct
BASE_URL=https://api.yourdomain.com
```

### Issue: Email links don't work in some email clients

**Solution:** Ensure links are clickable and properly formatted
```html
<!-- ✅ Good -->
<a href="https://api.yourdomain.com/api/payments/plans">Renew Now</a>

<!-- ❌ Avoid -->
<a href="{{baseUrl}}/api/payments/plans">Renew Now</a> <!-- Not compiled -->
```

## Files Modified

✅ `src/config/env.js` - Added BASE_URL variable  
✅ `src/services/emailService.js` - Updated all methods with baseUrl  
✅ `.env.example` - Documented BASE_URL configuration  
✅ `src/templates/emails/*.html` - Already using template variables  

## Next Steps

1. **Phase 1 Update:** Add push notifications with deep links using BASE_URL
2. **Analytics:** Track which email links are clicked most
3. **A/B Testing:** Test different renewal call-to-action texts
4. **Smart Links:** Use UTM parameters for analytics
   ```
   {{baseUrl}}/api/payments/plans?utm_source=email&utm_campaign=expiry_warning
   ```

---

**Version:** 1.0  
**Updated:** February 7, 2026  
**Status:** Production Ready
