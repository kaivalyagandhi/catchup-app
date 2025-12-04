/**
 * Authentication Middleware
 *
 * Handles JWT-based authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  TEST_USER = 'test_user',
}

interface JWTPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return secret;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(userId: string, role: UserRole = UserRole.USER): string {
  const payload: JWTPayload = {
    userId,
    role,
  };

  const secret = getJWTSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  const secret = getJWTSecret();
  return jwt.verify(token, secret) as JWTPayload;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = verifyToken(token);

    // Attach user info to request
    req.userId = payload.userId;
    req.userRole = payload.role;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(500).json({ error: 'Authentication error' });
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const payload = verifyToken(token);

      req.userId = payload.userId;
      req.userRole = payload.role;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Authorization middleware factory
 * Checks if user has required role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Ensure user can only access their own resources
 */
export function ensureOwnResource(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestedUserId = req.params.userId || req.query.userId || req.body.userId;

  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admins can access any resource
  if (req.userRole === UserRole.ADMIN) {
    return next();
  }

  // Users can only access their own resources
  if (requestedUserId && requestedUserId !== req.userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}
