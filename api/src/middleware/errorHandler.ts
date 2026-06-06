import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isDevelopment } from '../config';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = '请求参数错误') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409);
  }
}

function formatZodErrors(zodError: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  zodError.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  });

  return errors;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: formatZodErrors(err),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: '请求体格式错误',
    });
    return;
  }

  console.error('[ERROR] 未处理的异常:', err);

  res.status(500).json({
    success: false,
    message: isDevelopment
      ? err instanceof Error ? err.message : '服务器内部错误'
      : '服务器内部错误',
    ...(isDevelopment && err instanceof Error && err.stack
      ? { stack: err.stack.split('\n') }
      : {}),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `无法找到 ${req.method} ${req.originalUrl}`,
  });
}
