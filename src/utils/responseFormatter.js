const sendSuccess = (res, statusCode, data, message = '', count = null) => {
  const response = {
    success: true,
    statusCode,
    data,
  };

  if (message) response.message = message;
  if (count !== null) response.count = count;
  response.timestamp = new Date().toISOString();

  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) response.details = details;

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError,
};
