class ApiResponse {
  constructor(statusCode = 200, data = null, message = '', pagination = null) {
    this.success = true;
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    
    if (pagination) {
      this.pagination = pagination;
    }
  }

  static success(data, message = '', statusCode = 200) {
    return new ApiResponse(statusCode, data, message);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static paginated(data, pagination, message = '') {
    const response = new ApiResponse(200, data, message);
    response.pagination = pagination;
    return response;
  }

  static notFound(resource = 'Resource') {
    return {
      success: false,
      statusCode: 404,
      message: `${resource} not found`,
      timestamp: new Date().toISOString(),
    };
  }

  static badRequest(message, details = null) {
    const response = {
      success: false,
      statusCode: 400,
      message,
      timestamp: new Date().toISOString(),
    };
    if (details) response.details = details;
    return response;
  }

  static conflict(message) {
    return {
      success: false,
      statusCode: 409,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static serverError(message = 'Internal server error') {
    return {
      success: false,
      statusCode: 500,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      data: this.data,
      ...(this.message && { message: this.message }),
      ...(this.pagination && { pagination: this.pagination }),
      timestamp: this.timestamp,
    };
  }
}

module.exports = ApiResponse;
