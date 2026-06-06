import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  userId: string;
}

export function auth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json({
        success: false,
        message: '认证令牌无效',
      });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: '认证令牌已过期',
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: '认证令牌无效',
      });
      return;
    }
    res.status(401).json({
      success: false,
      message: '认证失败',
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        req.user = { userId: decoded.userId };
      }
    }
  } catch {
    // 可选认证，失败时不处理
  }
  next();
}

export function signToken(userId: string): string {
  return jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as any }
  );
}
