/* eslint-disable no-unused-vars */

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error('[error]', err);
  }
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
