# Paystack Webhook Implementation

## Overview

Webhook support has been added to handle payment confirmations server-to-server with Paystack. This provides a more robust payment handling mechanism that doesn't rely on the client completing the verification step.

## What Was Added

### 1. **Webhook Signature Verification** 
**File:** `src/services/paystackService.js`

Added `verifyWebhookSignature()` method that:
- Validates webhook authenticity using HMAC-SHA512
- Uses `x-paystack-signature` header for verification
- Prevents unauthorized webhook calls

```javascript
const isValid = paystackService.verifyWebhookSignature(req.body, signature);
```

### 2. **Webhook Handler**
**File:** `src/controllers/paymentController.js`

Added `handleWebhook()` endpoint that:
- Validates webhook signature
- Processes `charge.success` events
- Updates user plan and transactions atomically
- Handles race conditions (idempotent)
- Sends confirmation emails asynchronously
- Works independently from client `/verify` endpoint

**Key Features:**
- ✅ Server-to-server verification (more secure)
- ✅ Automatic plan activation even if client closes browser
- ✅ Idempotent - safe to receive duplicate webhooks
- ✅ Atomic database operations prevent inconsistencies
- ✅ Stores payment card details for future subscriptions

### 3. **Webhook Route**
**File:** `src/routes/payment.routes.js`

```
POST /api/payments/webhook
```

No authentication required (security via signature verification)

## Payment Flow with Webhook

```
1. User clicks "Upgrade Plan"
   ↓
2. POST /api/payments/initialize
   → Create pending Transaction
   → Return Paystack URL
   ↓
3. User completes payment on Paystack
   ↓
4. Paystack sends POST /api/payments/webhook (server-to-server)
   → Verify signature
   → Update Transaction to 'success'
   → Update User.plan and User.planExpiresAt
   → Send emails
   ↓
5. [Optional] Client also calls POST /api/payments/verify
   → Detects payment already processed
   → Returns confirmation
   ↓
6. User has access to new plan features
```

## Configuring Webhook in Paystack Dashboard

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Settings** → **API Keys & Webhooks**
3. Add webhook URL:
   ```
   https://your-api.com/api/payments/webhook
   ```
4. Select events: **Charge Successful**
5. Save

**Test Webhook:**
```bash
curl -X POST https://your-api.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: <signature>" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref_123",
      "status": "success",
      "amount": 999900,
      "customer": {
        "email": "user@example.com",
        "customer_code": "CUS_xxx"
      },
      "metadata": {
        "userId": "user_id",
        "plan": "premium",
        "duration": 30
      }
    }
  }'
```

## Webhook Event Structure

Paystack sends events in this format:

```javascript
{
  "event": "charge.success",
  "data": {
    "reference": "paystack_ref_xxx",
    "status": "success",
    "amount": 999900,        // Amount in Kobo
    "customer": {
      "email": "user@example.com",
      "customer_code": "CUS_xxx"
    },
    "authorization": {
      "authorization_code": "AUTH_xxx",
      "last4": "4081",
      "brand": "Visa"
    },
    "paid_at": "2026-02-07T10:30:00Z",
    "metadata": {
      "userId": "62d1f8c4b9e2f1a2b3c4d5e6",
      "plan": "premium",
      "duration": 30,
      "userName": "John Doe"
    }
  }
}
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 200 ✅ | Webhook processed | Payment activated |
| 400 ❌ | Invalid metadata | Check Transaction model |
| 401 ❌ | Invalid signature | Paystack request rejected |
| 404 ❌ | User not found | Check userId in metadata |

## Race Condition Protection

The webhook handler prevents double-processing:

```javascript
// Checks if payment already processed
if (transaction && transaction.status === 'success') {
  return res.status(200).json(
    new ApiResponse(200, { status: 'already_processed' })
  );
}
```

This ensures:
- Same webhook called multiple times → idempotent
- Both webhook + client verify called → no conflicts
- Concurrent requests → atomic database updates

## Client Verification Still Works

The existing `/api/payments/verify` endpoint **continues to work**:

- If webhook processed first → client verify returns "already_processed"
- If client verify first → webhook is ignored (race condition safe)
- Both are atomic and safe together

## Database Changes

Transaction model now stores additional fields:
- `paystackCustomerId` - For future subscriptions
- `authorizationCode` - For recurring charges
- `last4Digits` - Card info display
- `cardBrand` - Visa/Mastercard/etc

## Phase 1 & Beyond

### Phase 1 (Current)
- ✅ Webhook for one-time payments
- ✅ Automatic plan activation
- ✅ Payment receipt emails

### Phase 2 (Coming)
- 📱 Push notifications on payment success
- 🔄 Recurring subscriptions using authorization code
- 📊 Webhook retry logic & logging dashboard
- 🏪 Admin payment analytics

## Best Practices

1. **Always verify webhook signature** - prevents unauthorized calls
2. **Make webhook responses fast** - Paystack expects response within seconds
3. **Process webhooks asynchronously** - use queues for heavy operations
4. **Log all webhook events** - helps with debugging failed payments
5. **Test in Paystack sandbox first** - use test keys before production

## Logs to Monitor

```
// Successful webhook
INFO: Processing webhook for payment: paystack_ref_xxx
INFO: Webhook processed successfully: paystack_ref_xxx

// Duplicate webhook
INFO: Payment already processed: paystack_ref_xxx

// Invalid signature
WARN: Invalid webhook signature attempt

// Missing user
ERROR: User not found for webhook: paystack_ref_xxx
```

## Files Modified

- ✅ `src/services/paystackService.js` - Added signature verification
- ✅ `src/controllers/paymentController.js` - Added webhook handler
- ✅ `src/routes/payment.routes.js` - Added webhook route

## Testing Checklist

- [ ] Configure webhook URL in Paystack dashboard
- [ ] Test with Paystack sandbox keys
- [ ] Verify signature validation works
- [ ] Check transaction updated in database
- [ ] Confirm user plan upgraded
- [ ] Verify emails sent
- [ ] Test duplicate webhook (idempotency)
- [ ] Deploy to production with live keys

---

**Next Steps:** Push notifications and subscription management in Phase 1 update.
