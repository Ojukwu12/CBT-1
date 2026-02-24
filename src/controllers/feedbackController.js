const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const emailService = require('../services/emailService');
const { env } = require('../config/env');

const getSupportRecipients = () => {
  const raw = env.SUPPORT_EMAIL || '';
  const recipients = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!recipients.length) {
    throw new ApiError(500, 'Support email recipients are not configured');
  }

  return recipients;
};

const submitFeedback = asyncHandler(async (req, res) => {
  const { name, email, reason, description } = req.body;

  const recipients = getSupportRecipients();
  const subject = `User feedback (${reason})`;

  await emailService.sendBulkEmail(recipients, subject, 'feedback', {
    senderName: name,
    senderEmail: email,
    reason,
    description,
    submittedAt: new Date().toLocaleString(),
    appUrl: env.APP_URL || env.BASE_URL || 'http://localhost:3000',
  });

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
  });
});

module.exports = {
  submitFeedback,
};
