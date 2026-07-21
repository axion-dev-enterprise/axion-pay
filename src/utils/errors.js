export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'internal_error') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function isAppError(err) {
  if (!err) return false;
  if (err instanceof AppError) return true;
  return Boolean(err.isOperational);
}
