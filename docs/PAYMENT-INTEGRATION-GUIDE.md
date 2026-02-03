# Payment & Email Integration - Developer Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install axios nodemailer
```

### 2. Update .env
```env
# Paystack (Get from https://dashboard.paystack.com/settings/developer)
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# Email (Gmail example)
EMAIL_FROM=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password_here

APP_URL=http://localhost:3000
SUPPORT_EMAIL=support@universitycbt.com
```

### 3. Register Payment Routes in app.js
```javascript
const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payments', paymentRoutes);
```

---

## File Structure

```
src/
├── services/
│   ├── emailService.js ..................... Email sending service
│   ├── paystackService.js ................. Payment processing
│   └── userService.js (UPDATED) ......... With tier checking
├── controllers/
│   └── paymentController.js ............... Payment endpoints
├── routes/
│   └── payment.routes.js .................. Payment API routes
├── middleware/
│   └── accessControl.middleware.js ....... Tier & role checking
├── models/
│   └── Transaction.js ..................... Payment tracking
├── templates/
│   └── emails/ ............................ 12 HTML templates
│       ├── welcome.html
│       ├── plan-upgrade.html
│       ├── plan-downgrade.html
│       ├── payment-receipt.html
│       ├── payment-failed.html
│       ├── plan-expiry-warning.html
│       ├── plan-expired.html
│       ├── question-approved.html
│       ├── question-rejected.html
│       ├── otp.html
│       ├── reset-password.html
│       └── contact-form.html
└── .env (UPDATED) ........................ Payment & email config
```

---

## Available Endpoints

### Public Endpoints (No Auth Required)

#### Get Payment Plans
```
GET /api/payments/plans

Response:
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "duration": null,
      "features": ["10 questions/day", "Free questions only"]
    },
    {
      "id": "basic",
      "name": "Basic",
      "price": 2999,
      "duration": 30,
      "features": ["50 questions/day", "All free questions", ...]
    },
    {
      "id": "premium",
      "name": "Premium",
      "price": 9999,
      "duration": 30,
      "features": ["Unlimited questions", "All questions access", ...]
    }
  ]
}
```

#### Check Payment Status
```
GET /api/payments/status/paystack_reference_12345

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "paystackReference": "paystack_reference_12345",
    "status": "success",
    "plan": "premium",
    "amount": 9999,
    "planExpiryDate": "2024-02-03T...",
    ...
  }
}
```

---

### Protected Endpoints (Auth Required - Phase 1)

#### Initialize Payment (Start Checkout)
```
POST /api/payments/initialize
Headers: Authorization: Bearer token
Body: {
  "plan": "premium"
}

Response:
{
  "success": true,
  "data": {
    "reference": "paystack_reference_abc123",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "accessCode": "access_code_xyz",
    "plan": "premium",
    "amount": 9999
  }
}

Frontend Usage:
1. Get response.authorizationUrl
2. Redirect user to Paystack: window.location.href = authorizationUrl
3. After payment, user returns to app
4. Call /api/payments/verify with reference
```

#### Verify Payment (After Checkout)
```
POST /api/payments/verify
Headers: Authorization: Bearer token
Body: {
  "reference": "paystack_reference_abc123"
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "...",
    "plan": "premium",
    "planExpiresAt": "2024-02-03T...",
    "message": "Plan upgraded successfully!"
  }
}

Actions on Success:
1. User.plan updated to "premium"
2. User.planExpiresAt updated
3. Receipt email sent
4. Upgrade notification email sent
5. User gains access to premium features
```

#### Get Transaction History
```
GET /api/payments/transactions
Headers: Authorization: Bearer token

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalTransactions": 5,
      "totalSpent": 49995,
      "lastTransaction": { ... }
    },
    "transactions": [
      {
        "_id": "...",
        "plan": "premium",
        "amount": 9999,
        "status": "success",
        "completedAt": "2024-01-15T...",
        ...
      },
      ...
    ]
  }
}
```

---

## Using Access Control Middleware

### Basic Usage

```javascript
const { requireRole, requireTier, requireActive } = require('../middleware/accessControl');

// Admin-only endpoint
router.post('/admin/approve-question/:id', 
  requireRole('admin'),
  requireActive,
  controller.approveQuestion
);

// Premium-only endpoint
router.get('/premium-questions',
  requireTier('premium'),
  requireActive,
  controller.getPremiumQuestions
);

// Basic tier or higher
router.get('/basic-content',
  requireTier('basic'),
  controller.getBasicContent
);
```

### Tier Hierarchy
```javascript
free (0) → basic (1) → premium (2)

requireTier('basic') allows: basic, premium
requireTier('premium') allows: premium only
requireTier('free') allows: free, basic, premium (everyone)
```

---

## Using Email Service

### Send Welcome Email
```javascript
const emailService = require('../services/emailService');

const newUser = {
  firstName: 'John',
  email: 'john@example.com',
  // ...
};

await emailService.sendWelcomeEmail(newUser);
```

### Send Plan Upgrade Email
```javascript
const user = await User.findById(userId);
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 30);

await emailService.sendPlanUpgradeEmail(user, 'free', 'premium', expiryDate);
```

### Send Payment Receipt
```javascript
const transaction = {
  transactionId: '...',
  amount: 9999,
  plan: 'premium',
  paymentDate: new Date(),
  expiryDate: new Date(Date.now() + 30*24*60*60*1000)
};

await emailService.sendPaymentReceiptEmail(user, transaction);
```

### Send OTP (Phase 1)
```javascript
const otp = Math.random().toString().slice(2, 8); // 6-digit OTP
await emailService.sendOTPEmail(user.email, otp, 10); // 10 min expiry
```

---

## Using Paystack Service

### Initialize Payment
```javascript
const paystackService = require('../services/paystackService');

const payment = await paystackService.initializePayment(
  userId,
  userEmail,
  'premium', // plan
  { userName: 'John Doe' } // metadata
);

// payment contains:
// {
//   reference: "paystack_ref_...",
//   authorizationUrl: "https://checkout.paystack.com/...",
//   accessCode: "...",
//   plan: "premium",
//   amount: 9999
// }
```

### Verify Payment
```javascript
const result = await paystackService.verifyPayment(reference);

if (result.success) {
  // Update user plan
  user.plan = result.plan;
  user.planExpiresAt = new Date(Date.now() + result.planExpiryDays*24*60*60*1000);
  await user.save();
  
  // Send email
  await emailService.sendPaymentReceiptEmail(user, transaction);
}
```

### Get Plan Pricing
```javascript
const plans = paystackService.getPlanPricing();

// plans:
// {
//   free: { name: "Free", price: 0, duration: null, features: [...] },
//   basic: { name: "Basic", price: 2999, duration: 30, features: [...] },
//   premium: { name: "Premium", price: 9999, duration: 30, features: [...] }
// }
```

---

## Using Enhanced User Service

### Check Feature Access
```javascript
const userService = require('../services/userService');

try {
  const user = await userService.checkFeatureAccess(userId, 'premium');
  // User has premium access
} catch (error) {
  // 403: User doesn't have premium plan
  // OR: Plan has expired
}
```

### Check Question Access
```javascript
const accessCheck = await userService.canAccessQuestion(userId, 'premium');

if (!accessCheck.canAccess) {
  throw new ApiError(403, accessCheck.reason);
}
```

### Check Daily Limit
```javascript
const limitInfo = await userService.checkDailyQuestionLimit(userId);

// limitInfo:
// {
//   plan: "premium",
//   dailyLimit: null,
//   isUnlimited: true
// }
```

### Deactivate User
```javascript
await userService.deactivateUser(userId, 'Payment not received');
// User cannot access system anymore
```

---

## Frontend Integration Example

### Payment Checkout Flow
```javascript
// 1. Get plans
const plansRes = await fetch('/api/payments/plans');
const plans = await plansRes.json();

// 2. User selects plan (e.g., "premium")
const initRes = await fetch('/api/payments/initialize', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ plan: 'premium' })
});
const initData = await initRes.json();

// 3. Redirect to Paystack
window.location.href = initData.data.authorizationUrl;

// 4. After payment, Paystack redirects back with ?reference=xxx
const reference = new URLSearchParams(window.location.search).get('reference');

// 5. Verify payment
const verifyRes = await fetch('/api/payments/verify', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ reference })
});
const verifyData = await verifyRes.json();

// 6. Show success and update UI
if (verifyData.success) {
  alert('Payment successful! Premium plan activated!');
  // Redirect to dashboard or refresh page
}
```

---

## Testing (Development)

### Test Paystack (Sandbox)
```
Test card: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
OTP: Any code (it will auto-verify in test mode)
```

### Test Email (Development)
```javascript
// In development, emailService just logs to console
// In production, configure SMTP provider
const emailService = require('../services/emailService');

await emailService.sendWelcomeEmail(testUser);
// Console: Email sent to test@example.com - Subject: Welcome to...
```

---

## Troubleshooting

### Payment Fails
- Check PAYSTACK_SECRET_KEY is set correctly
- Verify user email is valid
- Check Paystack account is in test mode
- Check network connectivity

### Emails Not Sending
- Configure SMTP settings in .env (Phase 1)
- Check email provider credentials
- Verify templates exist in src/templates/emails/
- Check email syntax is valid

### Access Denied Errors
- Verify user plan is not expired
- Check tier level required vs user level
- Ensure user.role is set correctly
- Check user.isActive is true

---

## Best Practices

1. **Always wrap payments in try/catch**
   ```javascript
   try {
     await paystackService.verifyPayment(reference);
   } catch (err) {
     logger.error('Payment verification failed', err);
     // Handle gracefully
   }
   ```

2. **Send emails asynchronously**
   ```javascript
   // Don't await email - fire and forget
   emailService.sendPaymentReceiptEmail(user, transaction)
     .catch(err => logger.error('Email failed', err));
   ```

3. **Validate user tier on every request** (in Phase 1)
   ```javascript
   if (user.planExpiresAt && new Date() > user.planExpiresAt) {
     user.plan = 'free'; // Auto-downgrade expired plans
     await user.save();
   }
   ```

4. **Log all payment transactions**
   ```javascript
   const transaction = new Transaction({
     userId, paystackReference, plan, amount, status
   });
   await transaction.save();
   ```

---

## Phase 1 Integration Checklist

- [ ] Install nodemailer package
- [ ] Create auth middleware
- [ ] Add auth middleware to payment routes
- [ ] Configure SMTP in .env
- [ ] Test email sending
- [ ] Add access control to existing routes
- [ ] Implement daily question tracking
- [ ] Create plan expiry scheduler
- [ ] Add transaction logging
- [ ] Create user dashboard showing plan info
- [ ] Test full payment flow end-to-end

---

All files are ready for Phase 1 integration! 🚀
