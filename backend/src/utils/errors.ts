export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string | number) {
    super(`${resource}${id ? ` with id '${id}'` : ''} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class StorageError extends AppError {
  constructor(message: string = 'Storage operation failed', details?: any) {
    super(message, 502, details);
  }
}
